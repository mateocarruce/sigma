import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ApiExtraModels, /* ... */ } from '@nestjs/swagger'; 

@ApiTags('auth')
@ApiExtraModels(LoginDto, RefreshTokenDto)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión',
    description: 'Autentica a un usuario con email y contraseña. Devuelve un access_token y un refresh_token.',
  })
  @ApiBody({
    type: LoginDto,
    examples: {
      'credenciales-prueba': {
        summary: 'Credenciales de administrador',
        value: {
          email: 'usuario@sigma.ec',
          password: 'Security123.',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Login exitoso, devuelve tokens',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        refresh_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            email: { type: 'string', example: 'usuario@example.com' },
            nombre: { type: 'string', example: 'Juan Pérez' },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Datos inválidos (email o contraseña incorrectos)' })
  @ApiUnauthorizedResponse({ description: 'Credenciales incorrectas' })
  async login(@Body() loginDto: LoginDto, @Req() request: Request) {
    return this.authService.login(loginDto.email, loginDto.password, {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refrescar access token',
    description: 'Envía un refresh_token válido para obtener un nuevo access_token.',
  })
  @ApiBody({
    type: RefreshTokenDto,
    examples: {
      'refresh-ejemplo': {
        summary: 'Refresh token de ejemplo',
        value: {
          refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Nuevo access_token generado',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Refresh_token inválido o expirado' })
  @ApiBadRequestResponse({ description: 'Falta el refresh_token' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto.refresh_token);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Cerrar sesión',
    description: 'Revoca el refresh_token proporcionado, invalidando la sesión.',
  })
  @ApiBody({
    type: RefreshTokenDto,
    examples: {
      'logout-ejemplo': {
        summary: 'Revocar refresh token',
        value: {
          refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiNoContentResponse({ description: 'Sesión cerrada exitosamente' })
  @ApiUnauthorizedResponse({ description: 'Refresh_token inválido' })
  @ApiBadRequestResponse({ description: 'Falta el refresh_token' })
  async logout(@Body() refreshTokenDto: RefreshTokenDto): Promise<void> {
    await this.authService.logout(refreshTokenDto.refresh_token);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener perfil del usuario autenticado',
    description: 'Devuelve los datos del usuario actual (sin passwordHash). Requiere token JWT.',
  })
  @ApiOkResponse({
    description: 'Datos del usuario autenticado',
    type: User,
  })
  @ApiUnauthorizedResponse({ description: 'Token JWT inválido o ausente' })
  async me(@CurrentUser() user: Omit<User, 'passwordHash'>) {
    return user;
  }
}