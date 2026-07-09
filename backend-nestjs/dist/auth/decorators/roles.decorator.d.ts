import { NombreRol } from '../../database/entities/rol.entity';
export declare const ROLES_KEY = "roles";
export declare const Roles: (...roles: NombreRol[]) => import("@nestjs/common").CustomDecorator<string>;
