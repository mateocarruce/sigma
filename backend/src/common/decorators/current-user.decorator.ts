import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../modules/users/entities/user.entity';

// Uso: miEndpoint(@CurrentUser() user: Omit<User, 'passwordHash'>)
// Requiere que la ruta esté protegida con JwtAuthGuard (que es quien
// deja el usuario en request.user, ver JwtStrategy.validate()).
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Omit<User, 'passwordHash'> => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
