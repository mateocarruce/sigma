import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Planilla } from '../../planillas/entities/planilla.entity';
import { EstadoPago } from '../../../common/enums';

@Entity('facturas')
export class Factura {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Planilla, (p) => p.facturas, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'planilla_id' })
  planilla: Planilla;

  @Column({ name: 'numero_factura', type: 'varchar', length: 50, unique: true })
  numeroFactura: string;

  @Column({ name: 'fecha_emision', type: 'date' })
  fechaEmision: string;

  @Column({ name: 'valor_total', type: 'numeric', precision: 12, scale: 2 })
  valorTotal: number;

  @Column({
    name: 'estado_pago',
    type: 'enum',
    enum: EstadoPago,
    enumName: 'estado_pago_enum',
    default: EstadoPago.PENDIENTE,
  })
  estadoPago: EstadoPago;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
