import { Rol } from './rol.entity';
export declare class Usuario {
    id: number;
    email: string;
    passwordHash: string;
    nombreCompleto: string;
    rol: Rol;
    activo: boolean;
    creadoEn: Date;
}
