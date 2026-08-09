import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { Planilla } from '../../planillas/entities/planilla.entity';
import { Expediente } from '../../expedientes/entities/expediente.entity';

@Entity('tramites')
export class Tramite {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'numero_tramite', type: 'varchar', length: 50, unique: true })
  numeroTramite: string;

  @Column({ name: 'tipo_servicio', type: 'varchar', length: 100 })
  tipoServicio: string;

  @Column({ name: 'mes_ano_servicio', type: 'date' })
  mesAnoServicio: string;

  @Column({ name: 'cantidad_expedientes', type: 'int', default: 0 })
  cantidadExpedientes: number;

  @Column({
    name: 'valor_solicitado_total',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  valorSolicitadoTotal: number;

  @ManyToOne(() => Planilla, (p) => p.tramites, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'planilla_id' })
  planilla: Planilla | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @OneToMany(() => Expediente, (e) => e.tramite)
  expedientes: Expediente[];
}
