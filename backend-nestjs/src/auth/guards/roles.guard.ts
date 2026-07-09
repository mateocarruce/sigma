import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { NombreRol } from '../../database/entities/rol.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Debe usarse SIEMPRE después de JwtAuthGuard:
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles(NombreRol.AUDITOR)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesPermitidos = this.reflector.getAllAndOverride<NombreRol[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si el endpoint no declaró @Roles(), no restringe por rol
    if (!rolesPermitidos || rolesPermitidos.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !rolesPermitidos.includes(user.rol)) {
      throw new ForbiddenException(
        `Su rol (${user?.rol ?? 'desconocido'}) no tiene permiso para esta acción.`,
      );
    }

    return true;
  }
}
