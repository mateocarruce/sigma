import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { User } from '../../users/entities/user.entity';

// Esta estrategia es la que faltaba: JwtAuthGuard (AuthGuard('jwt')) la
// invoca automáticamente en cada ruta protegida. Passport extrae el
// token del header "Authorization: Bearer <token>", lo verifica contra
// JWT_SECRET y, si es válido, llama a validate() con el payload decodificado.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') as string,
    });
  }

  // El valor que retorna esta función queda disponible como `request.user`
  // en cualquier controller/guard posterior (ver @CurrentUser()).
  async validate(payload: JwtPayload): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.usersService.findById(payload.sub);

    if (!user || !user.activo) {
      throw new UnauthorizedException('Usuario no válido o inactivo');
    }

    // No propagamos el hash de la contraseña al resto de la aplicación.
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
