import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { DetalleServicio } from '../detalles/entities/detalle-servicio.entity';
import { PrediccionRiesgo } from './entities/prediccion-riesgo.entity';
import { CorreccionAutomatica } from './entities/correccion-automatica.entity';
import { EstadoFila, NivelRiesgo } from '../../common/enums';
import { RevisarRiesgoDto } from './dto/revisar-riesgo.dto';

interface ShapContribucion {
  feature: string;
  valor: number;
  contribucion: number;
}

interface PrediccionFastApi {
  score: number;
  label: string;
  shap_values: ShapContribucion[];
}

interface CorreccionResumen {
  detalleId: number;
  codigoOriginal: string;
  valorAnterior: number;
  valorCorregido: number;
  nivelRiesgo: string;
  score: number;
}

interface ResumenRevision {
  detallesEvaluados: number;
  prediccionesGuardadas: number;
  corregidos: number;
  errores: string[];
  correcciones: CorreccionResumen[];
  dryRun: boolean;
}

// Solo se corrige automáticamente cuando el modelo marca el riesgo más
// alto de la escala. BAJO/MEDIO se quedan como predicción informativa
// para el auditor, sin tocar el valor solicitado.
const NIVELES_CORREGIBLES = new Set<string>([NivelRiesgo.ALTO, NivelRiesgo.CRITICO]);

// Diferencia mínima (en $) para considerar que valor_unitario_solicitado
// "no coincide" con valor_unitario_oficial. Evita corregir por
// redondeos de centavos que no son un error real.
const TOLERANCIA_VALOR = 0.01;

@Injectable()
export class PrediccionesService {
  private readonly logger = new Logger(PrediccionesService.name);
  private readonly fastapiUrl: string;
  private readonly fastapiTimeoutMs = 5000;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {
    this.fastapiUrl = this.config.get<string>('FASTAPI_URL') ?? 'http://localhost:8000';
  }

  /**
   * Evalúa con el modelo ML cada detalle PENDIENTE de una planilla, guarda
   * la predicción por expediente (la de mayor score, ver comentario en
   * PrediccionRiesgo) y corrige automáticamente los detalles cuyo valor
   * solicitado no coincide con el catálogo Y el modelo marcó ALTO/CRITICO.
   *
   * Con dryRun=true calcula todo pero no escribe nada en la base — sirve
   * para previsualizar qué se corregiría antes de aplicarlo de verdad.
   */
  async revisarPlanilla(planillaId: number, dto: RevisarRiesgoDto): Promise<ResumenRevision> {
    const detalles = await this.dataSource
      .getRepository(DetalleServicio)
      .createQueryBuilder('detalle')
      .leftJoinAndSelect('detalle.expediente', 'expediente')
      .leftJoinAndSelect('expediente.tramite', 'tramite')
      .where('tramite.planilla = :planillaId', { planillaId })
      .andWhere('detalle.estadoFila = :estado', { estado: EstadoFila.PENDIENTE })
      .getMany();

    const resumen: ResumenRevision = {
      detallesEvaluados: detalles.length,
      prediccionesGuardadas: 0,
      corregidos: 0,
      errores: [],
      correcciones: [],
      dryRun: dto.dryRun,
    };

    if (detalles.length === 0) {
      return resumen;
    }

    // Cuenta cuántas veces se repite el mismo código para el mismo
    // beneficiario dentro de esta planilla (feature "veces_repetido_beneficiario").
    const repeticiones = new Map<string, number>();
    for (const d of detalles) {
      const clave = `${d.expediente.id}:${d.codigoOriginal}`;
      repeticiones.set(clave, (repeticiones.get(clave) ?? 0) + 1);
    }

    // Mejor (mayor score) predicción por expediente — predicciones_riesgo
    // es 1:1 por expediente, ver comentario en la entidad.
    const mejorPorExpediente = new Map<
      number,
      { score: number; nivelRiesgo: string; shap: ShapContribucion[] }
    >();

    for (const detalle of detalles) {
      const clave = `${detalle.expediente.id}:${detalle.codigoOriginal}`;
      const vecesRepetido = repeticiones.get(clave) ?? 1;

      let prediccion: PrediccionFastApi;
      try {
        prediccion = await this.predecir({
          codigo_tpsns: detalle.codigoOriginal,
          cantidad: Number(detalle.cantidad),
          valor_unitario_solicitado: Number(detalle.valorUnitarioSolicitado),
          valor_unitario_oficial:
            detalle.valorUnitarioOficial !== null ? Number(detalle.valorUnitarioOficial) : null,
          veces_repetido_beneficiario: vecesRepetido,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`No se pudo predecir riesgo del detalle ${detalle.id}: ${message}`);
        resumen.errores.push(`Detalle ${detalle.id} (código ${detalle.codigoOriginal}): ${message}`);
        continue;
      }

      const mejorActual = mejorPorExpediente.get(detalle.expediente.id);
      if (!mejorActual || prediccion.score > mejorActual.score) {
        mejorPorExpediente.set(detalle.expediente.id, {
          score: prediccion.score,
          nivelRiesgo: prediccion.label,
          shap: prediccion.shap_values,
        });
      }

      const requiereCorreccion =
        detalle.valorUnitarioOficial !== null &&
        NIVELES_CORREGIBLES.has(prediccion.label) &&
        Math.abs(Number(detalle.valorUnitarioSolicitado) - Number(detalle.valorUnitarioOficial)) >
          TOLERANCIA_VALOR;

      if (requiereCorreccion) {
        resumen.correcciones.push({
          detalleId: detalle.id,
          codigoOriginal: detalle.codigoOriginal,
          valorAnterior: Number(detalle.valorUnitarioSolicitado),
          valorCorregido: Number(detalle.valorUnitarioOficial),
          nivelRiesgo: prediccion.label,
          score: prediccion.score,
        });

        if (!dto.dryRun) {
          await this.corregirDetalle(detalle, prediccion);
          resumen.corregidos++;
        }
      }
    }

    if (!dto.dryRun) {
      for (const [expedienteId, mejor] of mejorPorExpediente.entries()) {
        await this.guardarPrediccionExpediente(expedienteId, mejor);
        resumen.prediccionesGuardadas++;
      }
    } else {
      resumen.prediccionesGuardadas = mejorPorExpediente.size;
    }

    return resumen;
  }

  /** Lista las correcciones automáticas aplicadas a una planilla (rastro de auditoría). */
  async listarCorrecciones(planillaId: number): Promise<CorreccionAutomatica[]> {
    return this.dataSource
      .getRepository(CorreccionAutomatica)
      .createQueryBuilder('correccion')
      .leftJoinAndSelect('correccion.detalleServicio', 'detalle')
      .leftJoinAndSelect('detalle.expediente', 'expediente')
      .leftJoinAndSelect('expediente.tramite', 'tramite')
      .where('tramite.planilla = :planillaId', { planillaId })
      .orderBy('correccion.fechaCorreccion', 'DESC')
      .getMany();
  }

  // -------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------

  private async predecir(payload: {
    codigo_tpsns: string;
    cantidad: number;
    valor_unitario_solicitado: number;
    valor_unitario_oficial: number | null;
    veces_repetido_beneficiario: number;
  }): Promise<PrediccionFastApi> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.fastapiTimeoutMs);
    try {
      const response = await fetch(`${this.fastapiUrl}/predecir-riesgo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!response.ok) {
        const texto = await response.text();
        throw new Error(`FastAPI respondió ${response.status}: ${texto}`);
      }
      return (await response.json()) as PrediccionFastApi;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async corregirDetalle(detalle: DetalleServicio, prediccion: PrediccionFastApi): Promise<void> {
    const valorAnterior = Number(detalle.valorUnitarioSolicitado);
    const subtotalAnterior = Number(detalle.subtotal);
    const valorCorregido = Number(detalle.valorUnitarioOficial);

    const subtotalCorregido = round2(Number(detalle.cantidad) * valorCorregido);
    const valorModificador = round2(subtotalCorregido * (Number(detalle.porcentajeModificador) / 100));
    const valorSolicitadoCorregido = round2(subtotalCorregido + valorModificador);

    await this.dataSource.transaction(async (manager) => {
      await manager.update(DetalleServicio, detalle.id, {
        valorUnitarioSolicitado: valorCorregido,
        subtotal: subtotalCorregido,
        valorModificador,
        valorSolicitado: valorSolicitadoCorregido,
      });

      const correccion = manager.create(CorreccionAutomatica, {
        detalleServicio: { id: detalle.id } as DetalleServicio,
        valorUnitarioSolicitadoAnterior: valorAnterior,
        valorUnitarioSolicitadoCorregido: valorCorregido,
        subtotalAnterior,
        subtotalCorregido,
        scoreRiesgo: prediccion.score,
        nivelRiesgo: prediccion.label,
        motivo:
          `Valor solicitado (${valorAnterior}) no coincide con el valor oficial de catálogo ` +
          `(${valorCorregido}). Modelo ML: ${prediccion.label} (score ${prediccion.score.toFixed(2)}).`,
      });
      await manager.save(CorreccionAutomatica, correccion);
    });
  }

  private async guardarPrediccionExpediente(
    expedienteId: number,
    mejor: { score: number; nivelRiesgo: string; shap: ShapContribucion[] },
  ): Promise<void> {
    const repo = this.dataSource.getRepository(PrediccionRiesgo);
    const existente = await repo.findOne({ where: { expediente: { id: expedienteId } } });

    const datos = {
      expediente: { id: expedienteId } as any,
      nivelRiesgo: mejor.nivelRiesgo as NivelRiesgo,
      puntaje: round2(mejor.score * 100), // 0-100, más legible en pantalla que 0-1
      explicacionShap: mejor.shap as unknown as Record<string, any>,
    };

    if (existente) {
      await repo.update(existente.id, datos);
    } else {
      await repo.save(repo.create(datos));
    }
  }
}

function round2(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}
