import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { DetalleServicio } from '../../detalles/entities/detalle-servicio.entity';
import { TipoMedicamentoInsumo } from '../../../common/enums';

@Entity('medicamentos_insumos')
export class MedicamentoInsumo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'codigo_as400', type: 'varchar', length: 20, unique: true })
  codigoAs400: string;

  @Column({ type: 'text' })
  descripcion: string;

  // CHECK (tipo IN ('MEDICAMENTO','INSUMO')) ya definido a nivel de BD.
  @Column({ type: 'varchar', length: 50 })
  tipo: TipoMedicamentoInsumo;

  @Column({ name: 'precio_oficial', type: 'numeric', precision: 12, scale: 4 })
  precioOficial: number;

  @Column({ name: 'unidad_medida', type: 'varchar', length: 20, nullable: true })
  unidadMedida: string | null;

  @Column({ name: 'fecha_vigencia_desde', type: 'date' })
  fechaVigenciaDesde: string;

  @Column({ name: 'fecha_vigencia_hasta', type: 'date', nullable: true })
  fechaVigenciaHasta: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @OneToMany(() => DetalleServicio, (d) => d.medicamentoInsumo)
  detalles: DetalleServicio[];
}
