import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Se conecta a la estrategia 'jwt' de Passport definida en
// src/modules/auth/strategies/jwt.strategy.ts (JwtStrategy).
// Uso: @UseGuards(JwtAuthGuard) en cualquier controller/endpoint protegido.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
