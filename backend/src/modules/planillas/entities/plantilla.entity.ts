import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TipoPlantilla } from '../../../common/enums';

@Entity('plantillas')
export class Plantilla {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({
    type: 'enum',
    enum: TipoPlantilla,
    enumName: 'tipo_plantilla_enum',
  })
  tipo: TipoPlantilla;

  // Ruta relativa, ej. "plantillas/individual_v2.xlsx"
  @Column({ name: 'ruta_archivo', type: 'text' })
  rutaArchivo: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  // Solo puede haber UNA plantilla activa por tipo a la vez — se aplica
  // en GestionPlantillasService.subir(), no con un CHECK de BD (más simple).
  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
