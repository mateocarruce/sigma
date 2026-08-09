import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';

import { DetalleServicio } from '../detalles/entities/detalle-servicio.entity';
import { DecisionAuditoriaEntity } from './entities/decision-auditoria.entity';
import { AuditLog } from '../audit-log/entities/audit-log.entity';
import { EstadoFila, DecisionAuditoria, AuditAction } from '../../common/enums';
import { DecidirAuditoriaDto } from './dto/decidir-auditoria.dto';
import { QueryAuditoriaDto } from './dto/query-auditoria.dto';

interface ContextoRequest {
  usuarioId: number;
  ipAddress?: string;
  userAgent?: string;
}

// Estados de detalles_servicios sobre los que un auditor puede actuar.
// AUDITADO y FACTURADO ya pasaron por este flujo y no deben reabrirse aquí.
const ESTADOS_AUDITABLES: EstadoFila[] = [EstadoFila.PENDIENTE, EstadoFila.RECHAZADO];

@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Lista las líneas que un auditor debe revisar: PENDIENTE (recién
   * procesadas por PlanillasService) o RECHAZADO (código no encontrado
   * en ningún catálogo, rechazo automático).
   */
  async listarPendientes(query: QueryAuditoriaDto) {
    const estados = query.estado ? [query.estado] : ESTADOS_AUDITABLES;

    const qb = this.dataSource
      .getRepository(DetalleServicio)
      .createQueryBuilder('detalle')
      .leftJoinAndSelect('detalle.expediente', 'expediente')
      .leftJoinAndSelect('expediente.tramite', 'tramite')
      .leftJoinAndSelect('detalle.tarifa', 'tarifa')
      .leftJoinAndSelect('detalle.medicamentoInsumo', 'medicamentoInsumo')
      .where('detalle.estadoFila IN (:...estados)', { estados });

    if (query.tramiteId) {
      qb.andWhere('tramite.id = :tramiteId', { tramiteId: query.tramiteId });
    }

    qb.orderBy('detalle.createdAt', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  /**
   * Registra la decisión de un auditor sobre una línea de detalle_servicio
   * y actualiza su estado. Todo dentro de una transacción: si falla
   * cualquier paso, no queda ni la decisión ni el cambio de estado a medias.
   */
  async decidir(
    detalleId: number,
    dto: DecidirAuditoriaDto,
    ctx: ContextoRequest,
  ): Promise<{ detalle: DetalleServicio; decision: DecisionAuditoriaEntity }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const detalle = await queryRunner.manager.findOne(DetalleServicio, {
        where: { id: detalleId },
        relations: ['tarifa', 'medicamentoInsumo'],
      });

      if (!detalle) {
        throw new NotFoundException(`Detalle de servicio ${detalleId} no encontrado`);
      }

      if (!ESTADOS_AUDITABLES.includes(detalle.estadoFila)) {
        throw new ConflictException(
          `El detalle ${detalleId} está en estado ${detalle.estadoFila} y ya no puede auditarse.`,
        );
      }

      const eraRechazoAutomatico = detalle.estadoFila === EstadoFila.RECHAZADO;

      this.aplicarDecision(detalle, dto, eraRechazoAutomatico);

      await queryRunner.manager.save(DetalleServicio, detalle);

      const decisionEntity = queryRunner.manager.create(DecisionAuditoriaEntity, {
        detalleServicio: detalle,
        auditor: { id: ctx.usuarioId } as any,
        decision: dto.decision,
        motivoGlosa: dto.motivoGlosa ?? null,
      });
      await queryRunner.manager.save(DecisionAuditoriaEntity, decisionEntity);

      await queryRunner.manager.save(AuditLog, {
        user: { id: ctx.usuarioId } as any,
        action: AuditAction.AUDITAR,
        file: null,
        ipAddress: ctx.ipAddress ?? null,
        userAgent: ctx.userAgent ?? null,
        resultado: `Detalle ${detalleId}: decision=${dto.decision}${
          dto.motivoGlosa ? `, motivo="${dto.motivoGlosa}"` : ''
        }`,
      });

      await queryRunner.commitTransaction();

      this.logger.log(
        `Detalle ${detalleId} auditado por usuario ${ctx.usuarioId}: ${dto.decision}`,
      );

      return { detalle, decision: decisionEntity };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Aplica las reglas de negocio de la TAREA 6.5 sobre el detalle en memoria
   * (antes de guardarlo). No toca la base de datos.
   */
  private aplicarDecision(
    detalle: DetalleServicio,
    dto: DecidirAuditoriaDto,
    eraRechazoAutomatico: boolean,
  ): void {
    switch (dto.decision) {
      case DecisionAuditoria.APROBADO: {
        if (eraRechazoAutomatico) {
          // Una línea rechazada automáticamente no tiene precio oficial
          // (valorUnitarioOficial es NULL, ver migration-fix-check-constraint.sql).
          // El auditor DEBE proveerlo manualmente para poder aprobarla.
          if (dto.valorUnitarioOficial === undefined || dto.valorSolicitado === undefined) {
            throw new BadRequestException(
              'Para aprobar una línea rechazada automáticamente debes indicar valorUnitarioOficial y valorSolicitado.',
            );
          }
        }
        if (dto.valorUnitarioOficial !== undefined) {
          detalle.valorUnitarioOficial = dto.valorUnitarioOficial;
        }
        if (dto.valorSolicitado !== undefined) {
          detalle.valorSolicitado = dto.valorSolicitado;
        }
        detalle.estadoFila = EstadoFila.AUDITADO;
        break;
      }

      case DecisionAuditoria.PARCIAL: {
        if (!dto.motivoGlosa) {
          throw new BadRequestException(
            'Una aprobación PARCIAL requiere motivoGlosa explicando el ajuste.',
          );
        }
        if (dto.valorSolicitado === undefined) {
          throw new BadRequestException(
            'Una aprobación PARCIAL requiere el nuevo valorSolicitado ajustado.',
          );
        }
        if (dto.valorUnitarioOficial !== undefined) {
          detalle.valorUnitarioOficial = dto.valorUnitarioOficial;
        }
        detalle.valorSolicitado = dto.valorSolicitado;
        detalle.estadoFila = EstadoFila.AUDITADO;
        break;
      }

      case DecisionAuditoria.RECHAZADO: {
        if (!dto.motivoGlosa) {
          throw new BadRequestException(
            'Un rechazo definitivo requiere motivoGlosa.',
          );
        }
        detalle.estadoFila = EstadoFila.RECHAZADO;
        break;
      }
    }
  }
}
