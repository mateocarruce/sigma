import { SetMetadata } from '@nestjs/common';
import { NombreRol } from '../../database/entities/rol.entity';

export const ROLES_KEY = 'roles';

/**
 * Uso: @Roles(NombreRol.AUDITOR, NombreRol.ADMIN)
 * Se combina con RolesGuard para restringir el acceso a un endpoint.
 */
export const Roles = (...roles: NombreRol[]) => SetMetadata(ROLES_KEY, roles);
