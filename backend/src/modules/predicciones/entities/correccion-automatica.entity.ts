import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { DetalleServicio } from '../../detalles/entities/detalle-servicio.entity';

// Rastro de auditoría de cada corrección automática aplicada por el
// modelo ML (ver 09-migration-correcciones-automaticas.sql). La fila en
// detalles_servicios ya queda con el valor corregido; acá se guarda de
// dónde venía y por qué.
@Entity('correcciones_automaticas')
export class CorreccionAutomatica {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => DetalleServicio, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'detalle_servicio_id' })
  detalleServicio: DetalleServicio;

  @Column({ name: 'valor_unitario_solicitado_anterior', type: 'numeric', precision: 12, scale: 4 })
  valorUnitarioSolicitadoAnterior: number;

  @Column({ name: 'valor_unitario_solicitado_corregido', type: 'numeric', precision: 12, scale: 4 })
  valorUnitarioSolicitadoCorregido: number;

  @Column({ name: 'subtotal_anterior', type: 'numeric', precision: 12, scale: 2 })
  subtotalAnterior: number;

  @Column({ name: 'subtotal_corregido', type: 'numeric', precision: 12, scale: 2 })
  subtotalCorregido: number;

  @Column({ name: 'score_riesgo', type: 'numeric', precision: 5, scale: 4 })
  scoreRiesgo: number;

  @Column({ name: 'nivel_riesgo', type: 'varchar', length: 20 })
  nivelRiesgo: string;

  @Column({ type: 'text' })
  motivo: string;

  @CreateDateColumn({ name: 'fecha_correccion', type: 'timestamp' })
  fechaCorreccion: Date;
}
