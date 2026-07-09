import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../../database/entities/usuario.entity';

export enum EstadoLote {
  PROCESANDO = 'PROCESANDO',
  VALIDADO = 'VALIDADO',
  ERROR = 'ERROR',
}

@Entity('lotes_carga')
export class LoteCarga {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'nombre_archivo', type: 'varchar', length: 255 })
  nombreArchivo: string;

  @ManyToOne(() => Usuario, { eager: true, nullable: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario | null;

  @Column({ name: 'total_registros', type: 'int', nullable: true })
  totalRegistros: number;

  @Column({ name: 'registros_con_error', type: 'int', default: 0 })
  registrosConError: number;

  @Column({ type: 'varchar', length: 30, default: EstadoLote.PROCESANDO })
  estado: EstadoLote;

  @CreateDateColumn({ name: 'cargado_en' })
  cargadoEn: Date;
}
