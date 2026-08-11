import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as path from 'path';

import { DetalleServicio } from '../../detalles/entities/detalle-servicio.entity';
import { ResultadoPlanilla } from '../entities/resultado-planilla.entity';
import { GenerarConsolidadasDto } from '../dto/generar-consolidadas.dto';
import { ExportadorExcelService } from './exportador-excel.service';
import { ExportadorPdfService } from './exportador-pdf.service';
import { GestionPlantillasService } from './gestion-plantillas.service';
import { TipoResultado, FormatoArchivo, TipoPlantilla } from '../../../common/enums';
import { limpiarNombreArchivo } from '../utils/limpiar-nombre-archivo';

// ═══════════════════════════════════════════════════════════════════
// LAYOUT DE LA PLANTILLA CONSOLIDADA — VERIFICA CONTRA TU .xlsx REAL
//
// ADVERTENCIA (ver mensaje en el chat): tu VBA usa signatureStart=48
// (bloque2 tendría solo 1 fila), pero tus instrucciones de texto dicen
// "bloque2 = filas 47-73" (27 filas). Implementé según las instrucciones
// de texto. Si tu plantilla real tiene las firmas empezando en la fila
// 48, este código va a escribir datos ENCIMA de las firmas — ajusta
// BLOQUE2_FIN abajo antes de usarlo en producción.
// ═══════════════════════════════════════════════════════════════════
const NOMBRE_HOJA = 'FORMATO PLANILLA CONSOLIDADA';
const CELDA_SERVICIO = 'C8';
const BLOQUE1_INICIO = 16;
const BLOQUE1_FIN = 45; // 30 filas
const BLOQUE2_INICIO = 47;
const BLOQUE2_FIN = 73; // 27 filas -- VER ADVERTENCIA ARRIBA
const COL_IDENTIFICACION = 'C';
const COL_NOMBRE = 'D';
const COL_MONTO = 'E';

interface ContextoRequest {
  usuarioId: number;
}

interface FilaBeneficiario {
  identificacion: string;
  nombrePaciente: string;
  montoTotal: number;
}

interface GrupoConsolidado {
  servicio: string;
  beneficiarios: FilaBeneficiario[];
}

interface ResultadoGeneracion {
  generados: ResultadoPlanilla[];
  errores: { servicio: string; error: string }[];
  advertencias: { servicio: string; mensaje: string }[];
}

@Injectable()
export class GeneradorConsolidadasService {
  private readonly logger = new Logger(GeneradorConsolidadasService.name);

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
    dto: GenerarConsolidadasDto,
    _ctx: ContextoRequest,
  ): Promise<ResultadoGeneracion> {
    const grupos = await this.agruparPorServicioYBeneficiario(planillaId, dto);
    const rutaPlantilla = await this.plantillasService.obtenerRutaActiva(TipoPlantilla.CONSOLIDADA);

    const generados: ResultadoPlanilla[] = [];
    const errores: { servicio: string; error: string }[] = [];
    const advertencias: { servicio: string; mensaje: string }[] = [];

    const capacidadTotal = (BLOQUE1_FIN - BLOQUE1_INICIO + 1) + (BLOQUE2_FIN - BLOQUE2_INICIO + 1);

    for (const grupo of grupos) {
      try {
        if (grupo.beneficiarios.length > capacidadTotal) {
          const omitidos = grupo.beneficiarios.length - capacidadTotal;
          advertencias.push({
            servicio: grupo.servicio,
            mensaje: `El servicio tiene ${grupo.beneficiarios.length} beneficiarios pero la plantilla solo soporta ${capacidadTotal}. Se omitieron los últimos ${omitidos} (no se perdieron de la BD, solo no aparecen en este documento). Divide el reporte o amplía la plantilla.`,
          });
        }
        const registros = await this.generarUnGrupo(planillaId, grupo, rutaPlantilla, capacidadTotal);
        generados.push(...registros);
      } catch (error) {
        this.logger.error(
          `Error generando consolidada servicio=${grupo.servicio}: ${(error as Error).message}`,
        );
        errores.push({ servicio: grupo.servicio, error: (error as Error).message });
      }
    }

    return { generados, errores, advertencias };
  }

  private async agruparPorServicioYBeneficiario(
    planillaId: number,
    dto: GenerarConsolidadasDto,
  ): Promise<GrupoConsolidado[]> {
    const qb = this.dataSource
      .getRepository(DetalleServicio)
      .createQueryBuilder('detalle')
      .leftJoinAndSelect('detalle.expediente', 'expediente')
      .leftJoinAndSelect('expediente.tramite', 'tramite')
      .where('tramite.planilla = :planillaId', { planillaId });

    if (dto.servicios?.length) {
      qb.andWhere('tramite.tipoServicio IN (:...servicios)', { servicios: dto.servicios });
    }

    const detalles = await qb.getMany();

    // servicio -> identificacion -> acumulado
    const porServicio = new Map<string, Map<string, FilaBeneficiario>>();

    for (const detalle of detalles) {
      const servicio = detalle.expediente.tramite.tipoServicio;
      const identificacion = detalle.expediente.identificacion;

      if (!porServicio.has(servicio)) {
        porServicio.set(servicio, new Map());
      }
      const porBeneficiario = porServicio.get(servicio)!;

      if (!porBeneficiario.has(identificacion)) {
        porBeneficiario.set(identificacion, {
          identificacion,
          nombrePaciente: detalle.expediente.nombrePaciente,
          montoTotal: 0,
        });
      }
      porBeneficiario.get(identificacion)!.montoTotal += Number(detalle.valorSolicitado);
    }

    return Array.from(porServicio.entries()).map(([servicio, mapaBeneficiarios]) => ({
      servicio,
      beneficiarios: Array.from(mapaBeneficiarios.values()),
    }));
  }

  private async generarUnGrupo(
    planillaId: number,
    grupo: GrupoConsolidado,
    rutaPlantilla: string,
    capacidadTotal: number,
  ): Promise<ResultadoPlanilla[]> {
    const beneficiariosAIncluir = grupo.beneficiarios.slice(0, capacidadTotal);
    const servicioLimpio = limpiarNombreArchivo(grupo.servicio);
    const carpetaDestino = path.join(process.cwd(), 'uploads', 'consolidadas', servicioLimpio);
    const nombreBase = `Planilla_${servicioLimpio}_CONSOLIDADA`;

    // --- Excel ---
    const workbook = await this.excelService.cargarPlantilla(rutaPlantilla);
    const hoja = workbook.getWorksheet(NOMBRE_HOJA) ?? workbook.worksheets[0];

    hoja.getCell(CELDA_SERVICIO).value = grupo.servicio;

    let filaActual = BLOQUE1_INICIO;
    let totalGeneral = 0;

    for (const beneficiario of beneficiariosAIncluir) {
      // Si nos pasamos del bloque 1, saltamos directo al inicio del bloque 2.
      if (filaActual > BLOQUE1_FIN && filaActual < BLOQUE2_INICIO) {
        filaActual = BLOQUE2_INICIO;
      }

      this.excelService.escribirFila(hoja, filaActual, [
        { columna: COL_IDENTIFICACION, valor: beneficiario.identificacion },
        { columna: COL_NOMBRE, valor: beneficiario.nombrePaciente },
        { columna: COL_MONTO, valor: beneficiario.montoTotal },
      ]);

      totalGeneral += beneficiario.montoTotal;
      filaActual += 1;
    }

    const nombreXlsx = `${nombreBase}.xlsx`;
    const rutaXlsxAbsoluta = await this.excelService.guardar(workbook, nombreXlsx, carpetaDestino);
    const rutaXlsxRelativa = path.relative(process.cwd(), rutaXlsxAbsoluta);

    // --- PDF ---
    const filasPdf = beneficiariosAIncluir.map((b) => [
      b.identificacion,
      b.nombrePaciente,
      b.montoTotal.toFixed(2),
    ]);
    filasPdf.push(['', 'TOTAL', totalGeneral.toFixed(2)]);

    const bufferPdf = await this.pdfService.generarPDF(
      {
        columnas: [
          { titulo: 'Cédula / Pasaporte', ancho: 100 },
          { titulo: 'Nombre del paciente', ancho: '*' },
          { titulo: 'Monto total solicitado', ancho: 100 },
        ],
        filas: filasPdf,
      },
      `Planilla Consolidada — ${grupo.servicio}`,
    );

    const nombrePdf = `${nombreBase}.pdf`;
    const rutaPdfAbsoluta = this.pdfService.guardarBuffer(bufferPdf, nombrePdf, carpetaDestino);
    const rutaPdfRelativa = path.relative(process.cwd(), rutaPdfAbsoluta);

    const registroXlsx = this.resultadosRepository.create({
      planilla: { id: planillaId } as any,
      tipo: TipoResultado.CONSOLIDADA,
      servicio: grupo.servicio,
      tramite: null,
      rutaArchivo: rutaXlsxRelativa,
      formato: FormatoArchivo.XLSX,
      nombreArchivo: nombreXlsx,
    });
    const registroPdf = this.resultadosRepository.create({
      planilla: { id: planillaId } as any,
      tipo: TipoResultado.CONSOLIDADA,
      servicio: grupo.servicio,
      tramite: null,
      rutaArchivo: rutaPdfRelativa,
      formato: FormatoArchivo.PDF,
      nombreArchivo: nombrePdf,
    });

    return this.resultadosRepository.save([registroXlsx, registroPdf]);
  }
}
