import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { Expediente } from '../../expedientes/entities/expediente.entity';
import { Tarifa } from '../../tarifas/entities/tarifa.entity';
import { MedicamentoInsumo } from '../../medicamentos/entities/medicamento-insumo.entity';
import { DecisionAuditoriaEntity } from '../../auditoria/entities/decision-auditoria.entity';
import { EstadoFila, TipoItem } from '../../../common/enums';

@Entity('detalles_servicios')
export class DetalleServicio {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Expediente, (e) => e.detalles, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'expediente_id' })
  expediente: Expediente;

  @Column({ name: 'tipo_item', type: 'varchar', length: 30, default: TipoItem.TPSNS })
  tipoItem: TipoItem;

  @ManyToOne(() => Tarifa, (t) => t.detalles, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'tarifa_id' })
  tarifa: Tarifa | null;

  @ManyToOne(() => MedicamentoInsumo, (m) => m.detalles, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'medicamento_insumo_id' })
  medicamentoInsumo: MedicamentoInsumo | null;

  @Column({ name: 'fecha_atencion', type: 'date' })
  fechaAtencion: string;

  @Column({ name: 'codigo_original', type: 'varchar', length: 50 })
  codigoOriginal: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 1 })
  cantidad: number;

  @Column({
    name: 'valor_unitario_solicitado',
    type: 'numeric',
    precision: 12,
    scale: 4,
  })
  valorUnitarioSolicitado: number;

  // Nullable a nivel de BD tras la migración: en filas RECHAZADAS no hay precio oficial.
  @Column({
    name: 'valor_unitario_oficial',
    type: 'numeric',
    precision: 12,
    scale: 4,
    nullable: true,
  })
  valorUnitarioOficial: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  clasificador: string | null;

  @Column({
    name: 'porcentaje_modificador',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 0,
  })
  porcentajeModificador: number;

  @Column({
    name: 'valor_modificador',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  valorModificador: number;

  @Column({
    name: 'valor_solicitado',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  valorSolicitado: number;

  @Column({
    name: 'estado_fila',
    type: 'enum',
    enum: EstadoFila,
    enumName: 'estado_fila_enum',
    default: EstadoFila.PENDIENTE,
  })
  estadoFila: EstadoFila;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @OneToMany(() => DecisionAuditoriaEntity, (d) => d.detalleServicio)
  decisiones: DecisionAuditoriaEntity[];

  /**
   * Refleja en TypeScript el CHECK `chk_tipo_item_fk` (ver migration-fix-check-constraint.sql):
   * - Fila RECHAZADA (código no encontrado en catálogo) -> ambas FKs deben ser null.
   * - Fila TPSNS -> tarifa_id obligatorio, medicamento_insumo_id null.
   * - Fila MEDICAMENTO -> medicamento_insumo_id obligatorio, tarifa_id null.
   * Se valida aquí para fallar rápido antes de golpear la BD, pero el CHECK
   * de PostgreSQL sigue siendo la garantía definitiva de integridad.
   */
  @BeforeInsert()
  @BeforeUpdate()
validarConsistenciaFk() {
    // "Sin catálogo vinculado" (ambas FK null) es válido en cualquier
    // estado: RECHAZADO (TPSNS no encontrado), PENDIENTE (insumo sin
    // catálogo AS-400 disponible, recién procesado) o AUDITADO (el
    // auditor lo aprobó manualmente sin vincular un registro real de
    // catálogo, porque no existe uno). Coincide con chk_tipo_item_fk
    // en la base de datos (ver migración 08).
    if (!this.tarifa && !this.medicamentoInsumo) {
      return;
    }

    if (this.tipoItem === TipoItem.TPSNS) {
      if (!this.tarifa || this.medicamentoInsumo) {
        throw new Error(
          'Un detalle TPSNS debe tener tarifa_id asignado y medicamento_insumo_id nulo.',
        );
      }
    } else if (this.tipoItem === TipoItem.MEDICAMENTO) {
      if (!this.medicamentoInsumo || this.tarifa) {
        throw new Error(
          'Un detalle MEDICAMENTO debe tener medicamento_insumo_id asignado y tarifa_id nulo.',
        );
      }
    }
  }

}
