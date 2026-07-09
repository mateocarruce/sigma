import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Usuario } from './usuario.entity';

export enum NombreRol {
  ADMIN = 'admin',
  AUDITOR = 'auditor',
  DIGITADOR = 'digitador',
}

@Entity('roles')
export class Rol {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  nombre: NombreRol;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @OneToMany(() => Usuario, (usuario) => usuario.rol)
  usuarios: Usuario[];
}
