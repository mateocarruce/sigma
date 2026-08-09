import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryRunner } from 'typeorm';
import * as ExcelJS from 'exceljs';
import * as crypto from 'crypto';

import { Planilla } from './entities/planilla.entity';
import { Tramite } from '../tramites/entities/tramite.entity';
import { Expediente } from '../expedientes/entities/expediente.entity';
import { DetalleServicio } from '../detalles/entities/detalle-servicio.entity';
import { Tarifa } from '../tarifas/entities/tarifa.entity';
import { MedicamentoInsumo } from '../medicamentos/entities/medicamento-insumo.entity';
import { DecisionAuditoriaEntity } from '../auditoria/entities/decision-auditoria.entity';
import { AuditLog } from '../audit-log/entities/audit-log.entity';
import { User } from '../users/entities/user.entity';

import { EstadoFila, TipoItem, PlanillaEstado, DecisionAuditoria, AuditAction } from '../../common/enums';
import { detectarFilaCabeceraYMapa, MapaColumnas } from './utils/matriz-header-mapper';
import { ResultadoProcesamiento, FilaRechazada } from './interfaces/resultado-procesamiento.interface';
import { ProcesarPlanillaDto } from './dto/procesar-planilla.dto';

interface ContextoRequest {
  usuarioId: number;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class PlanillasService {
  private readonly logger = new Logger(PlanillasService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Punto de entrada principal: recibe el buffer del .xlsm, la planilla ya
   * registrada en BD (nombre_archivo, minio_path, hash, firmas, etc.) y
   * procesa toda la matriz dentro de una única transacción.
   */
  async procesarMatriz(
    fileBuffer: Buffer,
    dto: ProcesarPlanillaDto,
    ctx: ContextoRequest,
  ): Promise<ResultadoProcesamiento> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const resultado: ResultadoProcesamiento = {
      planillaId: dto.planillaId,
      tramitesCreados: 0,
      tramitesActualizados: 0,
      expedientesCreados: 0,
      detallesInsertados: 0,
      detallesRechazados: 0,
      filasRechazadas: [],
      valorTotalSolicitado: 0,
    };

    try {
      const planilla = await queryRunner.manager.findOne(Planilla, {
        where: { id: dto.planillaId },
      });
      if (!planilla) {
        throw new NotFoundException(`Planilla ${dto.planillaId} no encontrada`);
      }

      // Actualiza firmas si vienen en el DTO, y marca la planilla como PROCESANDO.
      this.aplicarFirmasSiVienen(planilla, dto);
      planilla.estado = PlanillaEstado.PROCESANDO;
      await queryRunner.manager.save(Planilla, planilla);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer as any);

      const worksheet = workbook.worksheets.find((ws) => /MATRIZ/i.test(ws.name)) ?? workbook.worksheets[0];
      if (!worksheet) {
        throw new BadRequestException('El archivo no contiene hojas legibles.');
      }

      const { filaCabecera, mapa } = detectarFilaCabeceraYMapa(worksheet);
      this.validarColumnasMinimas(mapa);

      // Caché en memoria de tramites y expedientes ya vistos en esta corrida,
      // para no golpear la BD repetidas veces ni duplicar filas (ver 6.2).
      const tramitesCache = new Map<string, Tramite>();
      const expedientesCache = new Map<string, Expediente>(); // clave: `${tramiteId}:${cedula}`

      let filaActual = filaCabecera + 1;
      const totalFilas = worksheet.rowCount;

      while (filaActual <= totalFilas) {
        const row = worksheet.getRow(filaActual);
        if (this.filaEstaVacia(row, mapa)) {
          filaActual++;
          continue;
        }

        await this.procesarFila({
          queryRunner,
          row,
          numeroFila: filaActual,
          mapa,
          planilla,
          tramitesCache,
          expedientesCache,
          resultado,
        });

        filaActual++;
      }

      // Actualiza totales de cada trámite tocado en esta corrida.
      for (const tramite of tramitesCache.values()) {
        const totales = await queryRunner.manager
          .createQueryBuilder(DetalleServicio, 'd')
          .innerJoin('d.expediente', 'e')
          .where('e.tramite_id = :tramiteId', { tramiteId: tramite.id })
          .select('COALESCE(SUM(d.valor_solicitado), 0)', 'total')
          .getRawOne<{ total: string }>();

        const cantidadExpedientes = await queryRunner.manager.count(Expediente, {
          where: { tramite: { id: tramite.id } },
        });

        tramite.valorSolicitadoTotal = Number(totales?.total ?? 0);
        tramite.cantidadExpedientes = cantidadExpedientes;
        await queryRunner.manager.save(Tramite, tramite);
      }

      planilla.estado = PlanillaEstado.COMPLETADA;
      await queryRunner.manager.save(Planilla, planilla);

      await this.registrarAuditLog(queryRunner, {
        userId: ctx.usuarioId,
        action: AuditAction.PROCESS,
        fileId: planilla.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        resultado: `OK: ${resultado.detallesInsertados} detalles insertados, ${resultado.detallesRechazados} rechazados.`,
      });

      await queryRunner.commitTransaction();
      return resultado;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error procesando planilla ${dto.planillaId}: ${error.message}`, error.stack);

      // La actualización de estado a ERROR se hace en una transacción nueva,
      // separada, porque la transacción principal ya fue revertida.
      await this.marcarPlanillaComoError(dto.planillaId, ctx, error.message);

      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Error procesando la matriz: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  // -------------------------------------------------------------------
  // Procesamiento de una fila individual
  // -------------------------------------------------------------------
  private async procesarFila(params: {
    queryRunner: QueryRunner;
    row: ExcelJS.Row;
    numeroFila: number;
    mapa: MapaColumnas;
    planilla: Planilla;
    tramitesCache: Map<string, Tramite>;
    expedientesCache: Map<string, Expediente>;
    resultado: ResultadoProcesamiento;
  }): Promise<void> {
    const { queryRunner, row, numeroFila, mapa, planilla, tramitesCache, expedientesCache, resultado } = params;

    const leer = (clave: string): string => this.leerCelda(row, mapa[clave]);

    const numeroTramite = leer('numeroTramite');
    const cedula = leer('identificacion');

    if (!numeroTramite || !cedula) {
      // Fila sin datos clave: se ignora silenciosamente (probablemente una
      // fila de separación o de totales al final de la matriz).
      return;
    }

    // --- 1. Trámite: crear si es la primera vez que se ve en esta corrida ---
    let tramite = tramitesCache.get(numeroTramite);
    if (!tramite) {
      tramite =
        (await queryRunner.manager.findOne(Tramite, { where: { numeroTramite } })) ?? undefined;

      if (!tramite) {
        tramite = queryRunner.manager.create(Tramite, {
          numeroTramite,
          tipoServicio: leer('tipoServicio') || 'NO ESPECIFICADO',
          mesAnoServicio: this.parsearFecha(leer('mesAnoServicio')) ?? this.primerDiaDelMesActual(),
          planilla,
        });
        tramite = await queryRunner.manager.save(Tramite, tramite);
        resultado.tramitesCreados++;
      } else {
        resultado.tramitesActualizados++;
      }
      tramitesCache.set(numeroTramite, tramite);
    }

    // --- 2. Expediente: mismo trámite + misma cédula => reutilizar (6.2) ---
    const claveExpediente = `${tramite.id}:${cedula}`;
    let expediente = expedientesCache.get(claveExpediente);
    if (!expediente) {
      expediente =
        (await queryRunner.manager.findOne(Expediente, {
          where: { tramite: { id: tramite.id }, identificacion: cedula },
        })) ?? undefined;

      if (!expediente) {
        expediente = queryRunner.manager.create(Expediente, {
          tramite,
          nombrePaciente: leer('nombrePaciente') || 'SIN NOMBRE',
          codigoValidacion: leer('codigoValidacion') || null,
          identificacion: cedula,
          identificacionHash: this.hashCedula(cedula),
          cie10Codigo: leer('cie10') || 'S/N',
          honorarioServicioInstitucional: leer('honorarioServicioInstitucional') || null,
        });
        expediente = await queryRunner.manager.save(Expediente, expediente);
        resultado.expedientesCreados++;
      }
      expedientesCache.set(claveExpediente, expediente);
    }

    // --- 3. Determinar tipo de ítem (3.2) ---
    const honorarioServicio = normalizarTexto(
      leer('honorarioServicioInstitucional') || expediente.honorarioServicioInstitucional || '',
    );
    const esMedicamento = honorarioServicio.includes('INSUMO/MEDICAMENTO');
    const tipoItem: TipoItem = esMedicamento ? TipoItem.MEDICAMENTO : TipoItem.TPSNS;

    const codigoOriginal = leer('codigoTpsns');
    if (!codigoOriginal) {
      // Sin código no hay nada que validar en esta fila.
      return;
    }

    const descripcionFila = esMedicamento
      ? leer('descripcionMedicamentos') || leer('descripcion')
      : leer('descripcion');

    const cantidad = this.parsearNumero(leer('cantidad')) ?? 1;
    const valorUnitarioSolicitado = this.parsearNumero(leer('valorUnitarioSolicitado')) ?? 0;
    const porcentajeModificador = this.parsearNumero(leer('porcentajeModificador')) ?? 0;
    const clasificador = leer('clasificador') || null;
    const fechaAtencion =
      this.parsearFecha(leer('fechaAtencion')) ?? tramite.mesAnoServicio;

    // --- 4. Validación contra el catálogo correspondiente (3.1) ---
    let tarifa: Tarifa | null = null;
    let medicamento: MedicamentoInsumo | null = null;

    if (esMedicamento) {
      medicamento = await queryRunner.manager.findOne(MedicamentoInsumo, {
        where: { codigoAs400: codigoOriginal },
      });
    } else {
      tarifa = await queryRunner.manager.findOne(Tarifa, {
        where: { codigoTpsns: codigoOriginal },
      });
    }

    const encontrado = esMedicamento ? !!medicamento : !!tarifa;

    if (!encontrado) {
      // Código no encontrado: se inserta la fila como RECHAZADA (sin FK a
      // catálogo, ver migration-fix-check-constraint.sql) y se registra la
      // decisión automática para que el auditor investigue.
      const detalleRechazado = queryRunner.manager.create(DetalleServicio, {
        expediente,
        tipoItem,
        tarifa: null,
        medicamentoInsumo: null,
        fechaAtencion,
        codigoOriginal,
        descripcion: descripcionFila || null,
        cantidad,
        valorUnitarioSolicitado,
        valorUnitarioOficial: null,
        subtotal: 0,
        clasificador,
        porcentajeModificador,
        valorModificador: 0,
        valorSolicitado: 0,
        estadoFila: EstadoFila.RECHAZADO,
      });
      const guardado = await queryRunner.manager.save(DetalleServicio, detalleRechazado);

      const decisionAutomatica = queryRunner.manager.create(DecisionAuditoriaEntity, {
        detalleServicio: guardado,
        auditor: null,
        decision: DecisionAuditoria.RECHAZADO,
        motivoGlosa: 'Código no encontrado en catálogo (AS-400/TPSNS)',
      });
      await queryRunner.manager.save(DecisionAuditoriaEntity, decisionAutomatica);

      resultado.detallesRechazados++;
      const rechazo: FilaRechazada = {
        fila: numeroFila,
        tramite: numeroTramite,
        cedula,
        codigoOriginal,
        tipoItem,
        motivo: 'Código no encontrado en catálogo (AS-400/TPSNS)',
      };
      resultado.filasRechazadas.push(rechazo);
      return;
    }

    // --- 5. Código válido: calcular montos con el precio oficial ---
    const valorUnitarioOficial = esMedicamento
      ? Number(medicamento!.precioOficial)
      : Number(tarifa!.valorOficial);

    const subtotal = round2(cantidad * valorUnitarioSolicitado);
    const valorModificador = round2(subtotal * (porcentajeModificador / 100));
    const valorSolicitado = round2(subtotal + valorModificador);

    const detalle = queryRunner.manager.create(DetalleServicio, {
      expediente,
      tipoItem,
      tarifa: esMedicamento ? null : tarifa,
      medicamentoInsumo: esMedicamento ? medicamento : null,
      fechaAtencion,
      codigoOriginal,
      descripcion: descripcionFila || (esMedicamento ? medicamento!.descripcion : tarifa!.descripcion),
      cantidad,
      valorUnitarioSolicitado,
      valorUnitarioOficial,
      subtotal,
      clasificador,
      porcentajeModificador,
      valorModificador,
      valorSolicitado,
      estadoFila: EstadoFila.PENDIENTE,
    });

    await queryRunner.manager.save(DetalleServicio, detalle);
    resultado.detallesInsertados++;
    resultado.valorTotalSolicitado = round2(resultado.valorTotalSolicitado + valorSolicitado);
  }

  // -------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------

  private aplicarFirmasSiVienen(planilla: Planilla, dto: ProcesarPlanillaDto): void {
    if (dto.revisadoNombre !== undefined) planilla.revisadoNombre = dto.revisadoNombre;
    if (dto.revisadoIdentificacion !== undefined)
      planilla.revisadoIdentificacion = dto.revisadoIdentificacion;
    if (dto.revisadoSello !== undefined) planilla.revisadoSello = dto.revisadoSello;
    if (dto.aprobadoNombre !== undefined) planilla.aprobadoNombre = dto.aprobadoNombre;
    if (dto.aprobadoIdentificacion !== undefined)
      planilla.aprobadoIdentificacion = dto.aprobadoIdentificacion;
    if (dto.aprobadoSello !== undefined) planilla.aprobadoSello = dto.aprobadoSello;
  }

  private validarColumnasMinimas(mapa: MapaColumnas): void {
    const requeridas = ['numeroTramite', 'identificacion', 'honorarioServicioInstitucional', 'codigoTpsns'];
    const faltantes = requeridas.filter((clave) => mapa[clave] === undefined);
    if (faltantes.length > 0) {
      throw new BadRequestException(
        `No se pudieron ubicar las siguientes columnas obligatorias en la matriz: ${faltantes.join(', ')}`,
      );
    }
  }

  private filaEstaVacia(row: ExcelJS.Row, mapa: MapaColumnas): boolean {
    const colTramite = mapa['numeroTramite'];
    const colCedula = mapa['identificacion'];
    const valTramite = this.leerCelda(row, colTramite);
    const valCedula = this.leerCelda(row, colCedula);
    return !valTramite && !valCedula;
  }

  private leerCelda(row: ExcelJS.Row, colNumber: number | undefined): string {
    if (colNumber === undefined) return '';
    const cell = row.getCell(colNumber);
    if (cell.value === null || cell.value === undefined) return '';
    // Excel a veces trae errores de fórmula heredados de la matriz original
    // (#REF!, "INGRESE VALOR", etc. - ver sección 3 del prompt). SIGMA no
    // depende de esas fórmulas: simplemente se ignoran como celda vacía.
    const texto = (cell.text ?? '').toString().trim();
    if (/#REF!|#N\/A|#VALUE!|INGRESE VALOR|NO EXISTE CODIGO/i.test(texto)) {
      return '';
    }
    return texto;
  }

  private parsearNumero(valor: string): number | null {
    if (!valor) return null;
    const limpio = valor.replace(/[^0-9,.-]/g, '').replace(',', '.');
    const num = parseFloat(limpio);
    return Number.isFinite(num) ? num : null;
  }

  private parsearFecha(valor: string): string | null {
    if (!valor) return null;
    const fecha = new Date(valor);
    if (isNaN(fecha.getTime())) return null;
    return fecha.toISOString().slice(0, 10);
  }

  private primerDiaDelMesActual(): string {
    const ahora = new Date();
    return new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().slice(0, 10);
  }

  private hashCedula(cedula: string): string {
    return crypto.createHash('sha256').update(cedula.trim()).digest('hex');
  }

  private async registrarAuditLog(
    queryRunner: QueryRunner,
    entrada: {
      userId: number;
      action: AuditAction;
      fileId?: number;
      ipAddress?: string;
      userAgent?: string;
      resultado?: string;
    },
  ): Promise<void> {
    const log = queryRunner.manager.create(AuditLog, {
      user: { id: entrada.userId } as User,
      action: entrada.action,
      file: entrada.fileId ? ({ id: entrada.fileId } as Planilla) : null,
      ipAddress: entrada.ipAddress ?? null,
      userAgent: entrada.userAgent ?? null,
      resultado: entrada.resultado ?? null,
    });
    await queryRunner.manager.save(AuditLog, log);
  }

  private async marcarPlanillaComoError(
    planillaId: number,
    ctx: ContextoRequest,
    motivo: string,
  ): Promise<void> {
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.update(Planilla, { id: planillaId }, { estado: PlanillaEstado.ERROR });
        const log = manager.create(AuditLog, {
          user: { id: ctx.usuarioId } as User,
          action: AuditAction.PROCESS,
          file: { id: planillaId } as Planilla,
          ipAddress: ctx.ipAddress ?? null,
          userAgent: ctx.userAgent ?? null,
          resultado: `ERROR: ${motivo}`,
        });
        await manager.save(AuditLog, log);
      });
    } catch (e) {
      this.logger.error(`No se pudo marcar la planilla ${planillaId} como ERROR: ${e.message}`);
    }
  }
}

function normalizarTexto(texto: string): string {
  return texto
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

function round2(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}
