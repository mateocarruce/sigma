import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Uso: @UseGuards(JwtAuthGuard) sobre un controlador o endpoint.
 * Se apoya en JwtStrategy (estrategia 'jwt' registrada por Passport).
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
