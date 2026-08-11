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

  @Column({ name: 'codigo_tpsns', type: 'varchar', length: 50 })
  codigoTpsns: string;

  // Nivel de atención (I/II/III) — el mismo código TPSNS puede tener un
  // valor oficial distinto según el nivel del establecimiento. Junto con
  // codigoTpsns forman la clave única real (ver migración 06).
  @Column({ type: 'varchar', length: 10 })
  nivel: string;

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

  // Lado inverso de DetalleServicio.tarifa (@ManyToOne(() => Tarifa, (t) => t.detalles)).
  // Se me había olvidado al reescribir esta entidad para agregar `nivel`.
  @OneToMany(() => DetalleServicio, (d) => d.tarifa)
  detalles: DetalleServicio[];
}
