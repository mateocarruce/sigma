import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { DetalleServicio } from '../../detalles/entities/detalle-servicio.entity';

@Entity('tarifas')
export class Tarifa {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'codigo_tpsns', type: 'varchar', length: 50, unique: true })
  codigoTpsns: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ name: 'valor_oficial', type: 'numeric', precision: 12, scale: 4 })
  valorOficial: number;

  @Column({ name: 'fecha_vigencia_desde', type: 'date' })
  fechaVigenciaDesde: string;

  @Column({ name: 'fecha_vigencia_hasta', type: 'date', nullable: true })
  fechaVigenciaHasta: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @OneToMany(() => DetalleServicio, (d) => d.tarifa)
  detalles: DetalleServicio[];
}
