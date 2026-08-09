import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Expediente } from '../../expedientes/entities/expediente.entity';
import { NivelRiesgo } from '../../../common/enums';

@Entity('predicciones_riesgo')
export class PrediccionRiesgo {
  @PrimaryGeneratedColumn()
  id: number;

  // El SQL no declara UNIQUE en expediente_id, pero el negocio trata la
  // predicción como 1:1 por expediente (la vista consolidada usa MAX()).
  // Si en el futuro se necesita historial de predicciones, cambiar a @ManyToOne.
  @OneToOne(() => Expediente, (e) => e.prediccionRiesgo, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'expediente_id' })
  expediente: Expediente;

  @Column({
    name: 'nivel_riesgo',
    type: 'enum',
    enum: NivelRiesgo,
    enumName: 'nivel_riesgo_enum',
  })
  nivelRiesgo: NivelRiesgo;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  puntaje: number;

  @Column({ name: 'explicacion_shap', type: 'jsonb', nullable: true })
  explicacionShap: Record<string, any> | null;

  @CreateDateColumn({ name: 'fecha_prediccion', type: 'timestamp' })
  fechaPrediccion: Date;
}
