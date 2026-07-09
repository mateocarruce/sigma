import { Usuario } from './usuario.entity';
export declare enum NombreRol {
    ADMIN = "admin",
    AUDITOR = "auditor",
    DIGITADOR = "digitador"
}
export declare class Rol {
    id: number;
    nombre: NombreRol;
    descripcion: string | null;
    usuarios: Usuario[];
}
