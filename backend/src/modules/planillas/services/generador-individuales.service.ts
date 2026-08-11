import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, In } from 'typeorm';
import * as path from 'path';

import { DetalleServicio } from '../../detalles/entities/detalle-servicio.entity';
import { ResultadoPlanilla } from '../entities/resultado-planilla.entity';
import { GenerarIndividualesDto } from '../dto/generar-individuales.dto';
import { ExportadorExcelService } from './exportador-excel.service';
import { ExportadorPdfService } from './exportador-pdf.service';
import { GestionPlantillasService } from './gestion-plantillas.service';
import { TipoResultado, FormatoArchivo, TipoPlantilla } from '../../../common/enums';
import { limpiarNombreArchivo } from '../utils/limpiar-nombre-archivo';

// ═══════════════════════════════════════════════════════════════════
// LAYOUT DE LA PLANTILLA INDIVIDUAL — AJUSTA ESTO CONTRA TU .xlsx REAL
// Inferido del VBA: datos desde fila 13, columnas A:I, cabecera con
// trámite en B5 y servicio en B6. No tengo el archivo real para
// verificar los nombres exactos de columna, así que confírmalo.
// ═══════════════════════════════════════════════════════════════════
const NOMBRE_HOJA = 'FORMATO PLANILLA INDIVIDUAL';
const FILA_TRAMITE = 5; // B5
const FILA_SERVICIO = 6; // B6
const COLUMNA_ENCABEZADO = 'B';
const FILA_INICIO_DATOS = 13;
const FILA_FIN_DATOS = 53; // igual que el rango que oculta/borra el VBA (13..53)
const COLUMNAS = {
  numero: 'A',
  fecha: 'B',
  codigo: 'C',
  descripcion: 'D',
  cantidad: 'E',
  valorUnitario: 'F',
  subtotal: 'G',
  modificador: 'H',
  valorTotal: 'I',
} as const;

interface ContextoRequest {
  usuarioId: number;
}

interface GrupoIndividual {
  servicio: string;
  tramite: string;
  detalles: DetalleServicio[];
}

interface ResultadoGeneracion {
  generados: ResultadoPlanilla[];
  errores: { servicio: string; tramite: string; error: string }[];
}

@Injectable()
export class GeneradorIndividualesService {
  private readonly logger = new Logger(GeneradorIndividualesService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(ResultadoPlanilla)
    private readonly resultadosRepository: Repository<ResultadoPlanilla>,
    private readonly excelService: ExportadorExcelService,
    private readonly pdfService: ExportadorPdfService,
    private readonly plantillasService: GestionPlantillasService,
  ) {}

  async generar(
    planillaId: number,
    dto: GenerarIndividualesDto,
    _ctx: ContextoRequest,
  ): Promise<ResultadoGeneracion> {
    const grupos = await this.agruparPorServicioYTramite(planillaId, dto);

    if (grupos.length === 0) {
      this.logger.warn(`Planilla ${planillaId}: no hay detalles que coincidan con el filtro.`);
    }

    const rutaPlantilla = await this.plantillasService.obtenerRutaActiva(TipoPlantilla.INDIVIDUAL);

    const generados: ResultadoPlanilla[] = [];
    const errores: { servicio: string; tramite: string; error: string }[] = [];

    for (const grupo of grupos) {
      try {
        const registros = await this.generarUnGrupo(planillaId, grupo, rutaPlantilla);
        generados.push(...registros);
      } catch (error) {
        this.logger.error(
          `Error generando individual servicio=${grupo.servicio} tramite=${grupo.tramite}: ${(error as Error).message}`,
        );
        errores.push({
          servicio: grupo.servicio,
          tramite: grupo.tramite,
          error: (error as Error).message,
        });
      }
    }

    return { generados, errores };
  }

  private async agruparPorServicioYTramite(
    planillaId: number,
    dto: GenerarIndividualesDto,
  ): Promise<GrupoIndividual[]> {
    const qb = this.dataSource
      .getRepository(DetalleServicio)
      .createQueryBuilder('detalle')
      .leftJoinAndSelect('detalle.expediente', 'expediente')
      .leftJoinAndSelect('expediente.tramite', 'tramite')
      .leftJoinAndSelect('detalle.tarifa', 'tarifa')
      .leftJoinAndSelect('detalle.medicamentoInsumo', 'medicamentoInsumo')
      .where('tramite.planilla = :planillaId', { planillaId })
      .orderBy('tramite.numeroTramite', 'ASC')
      .addOrderBy('detalle.fechaAtencion', 'ASC');

    if (dto.servicios?.length) {
      qb.andWhere('tramite.tipoServicio IN (:...servicios)', { servicios: dto.servicios });
    }
    if (dto.tramites?.length) {
      qb.andWhere('tramite.numeroTramite IN (:...tramites)', { tramites: dto.tramites });
    }

    const detalles = await qb.getMany();

    const mapa = new Map<string, GrupoIndividual>();
    for (const detalle of detalles) {
      const servicio = detalle.expediente.tramite.tipoServicio;
      const tramite = detalle.expediente.tramite.numeroTramite;
      const clave = `${servicio}::${tramite}`;
      if (!mapa.has(clave)) {
        mapa.set(clave, { servicio, tramite, detalles: [] });
      }
      mapa.get(clave)!.detalles.push(detalle);
    }

    return Array.from(mapa.values());
  }

  private async generarUnGrupo(
    planillaId: number,
    grupo: GrupoIndividual,
    rutaPlantilla: string,
  ): Promise<ResultadoPlanilla[]> {
    const capacidad = FILA_FIN_DATOS - FILA_INICIO_DATOS + 1;
    if (grupo.detalles.length > capacidad) {
      throw new Error(
        `El trámite ${grupo.tramite} tiene ${grupo.detalles.length} líneas, pero la plantilla solo soporta ${capacidad} (filas ${FILA_INICIO_DATOS}-${FILA_FIN_DATOS}). Divide el trámite o amplía la plantilla.`,
      );
    }

    const servicioLimpio = limpiarNombreArchivo(grupo.servicio);
    const tramiteLimpio = limpiarNombreArchivo(grupo.tramite);
    const carpetaDestino = path.join(
      process.cwd(),
      'uploads',
      'individuales',
      servicioLimpio,
      tramiteLimpio,
    );
    const nombreBase = `Planilla_${tramiteLimpio}_${servicioLimpio}`;

    // --- Excel ---
    const workbook = await this.excelService.cargarPlantilla(rutaPlantilla);
    const hoja = workbook.getWorksheet(NOMBRE_HOJA) ?? workbook.worksheets[0];

    hoja.getCell(`${COLUMNA_ENCABEZADO}${FILA_TRAMITE}`).value = grupo.tramite;
    hoja.getCell(`${COLUMNA_ENCABEZADO}${FILA_SERVICIO}`).value = grupo.servicio;

    let filaActual = FILA_INICIO_DATOS;
    let totalGeneral = 0;
    let numero = 1;

    for (const detalle of grupo.detalles) {
      const descripcion =
        detalle.tarifa?.descripcion ?? detalle.medicamentoInsumo?.descripcion ?? detalle.descripcion ?? '';

      this.excelService.escribirFila(hoja, filaActual, [
        { columna: COLUMNAS.numero, valor: numero },
        { columna: COLUMNAS.fecha, valor: detalle.fechaAtencion },
        { columna: COLUMNAS.codigo, valor: detalle.codigoOriginal },
        { columna: COLUMNAS.descripcion, valor: descripcion },
        { columna: COLUMNAS.cantidad, valor: Number(detalle.cantidad) },
        { columna: COLUMNAS.valorUnitario, valor: Number(detalle.valorUnitarioSolicitado) },
        { columna: COLUMNAS.subtotal, valor: Number(detalle.subtotal) },
        { columna: COLUMNAS.modificador, valor: Number(detalle.porcentajeModificador) },
        { columna: COLUMNAS.valorTotal, valor: Number(detalle.valorSolicitado) },
      ]);

      totalGeneral += Number(detalle.valorSolicitado);
      filaActual += 1;
      numero += 1;
    }

    // Fila de TOTAL inmediatamente después del último dato.
    // AJUSTA la columna/posición exacta contra tu plantilla real.
    this.excelService.escribirFila(hoja, filaActual, [
      { columna: COLUMNAS.descripcion, valor: 'TOTAL' },
      { columna: COLUMNAS.valorTotal, valor: totalGeneral },
    ]);

    const nombreXlsx = `${nombreBase}.xlsx`;
    const rutaXlsxAbsoluta = await this.excelService.guardar(workbook, nombreXlsx, carpetaDestino);
    const rutaXlsxRelativa = path.relative(process.cwd(), rutaXlsxAbsoluta);

    // --- PDF (reporte tabular equivalente, no el layout exacto del Excel) ---
    const filasPdf = grupo.detalles.map((d, i) => [
      i + 1,
      d.fechaAtencion,
      d.codigoOriginal,
      d.tarifa?.descripcion ?? d.medicamentoInsumo?.descripcion ?? d.descripcion ?? '',
      Number(d.cantidad),
      Number(d.valorUnitarioSolicitado).toFixed(4),
      Number(d.subtotal).toFixed(2),
      `${Number(d.porcentajeModificador)}%`,
      Number(d.valorSolicitado).toFixed(2),
    ]);
    filasPdf.push(['', '', '', '', '', '', '', 'TOTAL', totalGeneral.toFixed(2)]);

    const bufferPdf = await this.pdfService.generarPDF(
      {
        columnas: [
          { titulo: '#', ancho: 20 },
          { titulo: 'Fecha', ancho: 55 },
          { titulo: 'Código', ancho: 60 },
          { titulo: 'Descripción', ancho: '*' },
          { titulo: 'Cant.', ancho: 35 },
          { titulo: 'V. Unit.', ancho: 50 },
          { titulo: 'Subtotal', ancho: 50 },
          { titulo: 'Modif.', ancho: 40 },
          { titulo: 'Total', ancho: 50 },
        ],
        filas: filasPdf,
      },
      `Planilla Individual — Trámite ${grupo.tramite}`,
      [`Servicio: ${grupo.servicio}`],
    );

    const nombrePdf = `${nombreBase}.pdf`;
    const rutaPdfAbsoluta = this.pdfService.guardarBuffer(bufferPdf, nombrePdf, carpetaDestino);
    const rutaPdfRelativa = path.relative(process.cwd(), rutaPdfAbsoluta);

    // --- Registrar en BD ---
    const registroXlsx = this.resultadosRepository.create({
      planilla: { id: planillaId } as any,
      tipo: TipoResultado.INDIVIDUAL,
      servicio: grupo.servicio,
      tramite: grupo.tramite,
      rutaArchivo: rutaXlsxRelativa,
      formato: FormatoArchivo.XLSX,
      nombreArchivo: nombreXlsx,
    });
    const registroPdf = this.resultadosRepository.create({
      planilla: { id: planillaId } as any,
      tipo: TipoResultado.INDIVIDUAL,
      servicio: grupo.servicio,
      tramite: grupo.tramite,
      rutaArchivo: rutaPdfRelativa,
      formato: FormatoArchivo.PDF,
      nombreArchivo: nombrePdf,
    });

    return this.resultadosRepository.save([registroXlsx, registroPdf]);
  }
}
