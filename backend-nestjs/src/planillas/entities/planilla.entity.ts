import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LoteCarga } from './lote-carga.entity';
import { Paciente } from './paciente.entity';

export enum ReglasEstado {
  OK = 'OK',
  ADVERTENCIA = 'ADVERTENCIA',
  ERROR_CRITICO = 'ERROR_CRITICO',
}

export enum EstadoPlanilla {
  CARGADA = 'CARGADA',
  PRE_VALIDADA = 'PRE_VALIDADA',
  AUDITADA = 'AUDITADA',
  ENVIADA = 'ENVIADA',
}

@Entity('planillas')
export class Planilla {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => LoteCarga, { eager: false })
  @JoinColumn({ name: 'lote_id' })
  lote: LoteCarga;

  @ManyToOne(() => Paciente, { eager: true })
  @JoinColumn({ name: 'paciente_id' })
  paciente: Paciente;

  @Column({ name: 'numero_factura', type: 'varchar', length: 50 })
  numeroFactura: string;

  @Column({ name: 'codigo_cie10', type: 'varchar', length: 10, nullable: true })
  codigoCie10: string | null;

  @Column({ name: 'codigo_prestacion', type: 'varchar', length: 20, nullable: true })
  codigoPrestacion: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  especialidad: string | null;

  @Column({ name: 'valor_facturado', type: 'numeric', precision: 10, scale: 2, nullable: true })
  valorFacturado: number;

  @Column({ name: 'valor_unitario', type: 'numeric', precision: 12, scale: 2, nullable: true })
  valorUnitario: number | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  cantidad: number | null;

  @Column({ name: 'fecha_atencion', type: 'date', nullable: true })
  fechaAtencion: Date | null;

  @Column({ name: 'tipo_seguro', type: 'varchar', length: 50, nullable: true })
  tipoSeguro: string | null;

  @Column({ name: 'reglas_estado', type: 'varchar', length: 30, default: ReglasEstado.OK })
  reglasEstado: ReglasEstado;

  @Column({ name: 'reglas_detalle', type: 'jsonb', nullable: true })
  reglasDetalle: string[] | null;

  @Column({ name: 'estado_planilla', type: 'varchar', length: 30, default: EstadoPlanilla.CARGADA })
  estadoPlanilla: EstadoPlanilla;

  @Column({ name: 'motivo_objecion_real', type: 'varchar', length: 20, nullable: true })
  motivoObjecionReal: string | null;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;
}
