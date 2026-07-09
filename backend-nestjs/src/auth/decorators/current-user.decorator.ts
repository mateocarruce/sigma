import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Uso: async miEndpoint(@CurrentUser() user: JwtPayload) { ... }
 * Devuelve el payload que JwtStrategy.validate() adjuntó a request.user
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
