import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('pacientes')
export class Paciente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'hash_identificador', type: 'varchar', length: 64, unique: true })
  hashIdentificador: string;

  @Column({ type: 'char', length: 1, nullable: true })
  sexo: string | null;

  @Column({ name: 'rango_edad', type: 'varchar', length: 20, nullable: true })
  rangoEdad: string | null;

  @Column({ name: 'tipo_seguro', type: 'varchar', length: 50, nullable: true })
  tipoSeguro: string | null;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;
}
