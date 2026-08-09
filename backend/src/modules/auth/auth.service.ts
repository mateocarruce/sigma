import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { UserSession } from './entities/user-session.entity';
import { User } from '../users/entities/user.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';

const BCRYPT_SALT_ROUNDS = 12;

interface LoginResult {
  access_token: string;
  refresh_token: string;
  user: Omit<User, 'passwordHash'>;
}

interface RequestMetadata {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserSession)
    private readonly sessionsRepository: Repository<UserSession>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(
    email: string,
    password: string,
    meta: RequestMetadata,
  ): Promise<LoginResult> {
    const user = await this.usersService.findByEmail(email);

    // Mismo mensaje de error tanto si el usuario no existe como si la
    // contraseña es incorrecta: evita que un atacante confirme qué
    // emails están registrados (enumeration attack).
    if (!user || !user.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateAndStoreRefreshToken(user, meta);

    const { passwordHash: _passwordHash, ...safeUser } = user;

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: safeUser,
    };
  }

  async refresh(refreshToken: string): Promise<{ access_token: string }> {
    // Buscamos entre las sesiones vigentes (no revocadas, no expiradas)
    // porque el refresh token guardado está hasheado: hay que comparar
    // con bcrypt.compare contra cada candidato.
    const candidateSessions = await this.sessionsRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.user', 'user')
      .where('session.revoked = false')
      .andWhere('session.expires_at > :now', { now: new Date() })
      .getMany();

    let matchedSession: UserSession | null = null;
    for (const session of candidateSessions) {
      const isMatch = await bcrypt.compare(refreshToken, session.refreshTokenHash);
      if (isMatch) {
        matchedSession = session;
        break;
      }
    }

    if (!matchedSession) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    if (!matchedSession.user.activo) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    const accessToken = this.generateAccessToken(matchedSession.user);
    return { access_token: accessToken };
  }

  async logout(refreshToken: string): Promise<void> {
    const activeSessions = await this.sessionsRepository.find({
      where: { revoked: false },
    });

    for (const session of activeSessions) {
      const isMatch = await bcrypt.compare(refreshToken, session.refreshTokenHash);
      if (isMatch) {
        session.revoked = true;
        await this.sessionsRepository.save(session);
        return;
      }
    }

    // Si no se encontró ninguna sesión que coincida, no es un error grave:
    // el efecto deseado (que ese refresh token deje de servir) ya se cumple.
  }

  async getProfile(userId: number): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }

  private generateAccessToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      rol: user.rol,
    };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRATION') ?? '15m',
    });
  }

  private async generateAndStoreRefreshToken(
    user: User,
    meta: RequestMetadata,
  ): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      rol: user.rol,
    };
    const refreshExpiration =
      this.configService.get<string>('JWT_REFRESH_EXPIRATION') ?? '7d';

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: refreshExpiration,
    });

    const refreshTokenHash = await bcrypt.hash(refreshToken, BCRYPT_SALT_ROUNDS);

    const session = this.sessionsRepository.create({
      user,
      refreshTokenHash,
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent ?? null,
      revoked: false,
      expiresAt: this.addDaysFromExpirationString(refreshExpiration),
    });
    await this.sessionsRepository.save(session);

    return refreshToken;
  }

  // Convierte strings tipo "7d" / "15m" a una fecha futura concreta
  // para guardar en expires_at. Soporta d (días), h (horas), m (minutos).
  private addDaysFromExpirationString(expiration: string): Date {
    const match = expiration.match(/^(\d+)([dhm])$/);
    const now = new Date();
    if (!match) {
      // Fallback seguro: 7 días, igual que el default documentado en el
      // prompt original del Módulo 1.
      now.setDate(now.getDate() + 7);
      return now;
    }
    const amount = parseInt(match[1], 10);
    const unit = match[2];
    if (unit === 'd') now.setDate(now.getDate() + amount);
    if (unit === 'h') now.setHours(now.getHours() + amount);
    if (unit === 'm') now.setMinutes(now.getMinutes() + amount);
    return now;
  }
}
