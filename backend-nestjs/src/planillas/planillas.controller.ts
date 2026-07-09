import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { NombreRol } from '../database/entities/rol.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { PlanillasService } from './planillas.service';

const TAMANO_MAXIMO_BYTES = 25 * 1024 * 1024; // 25 MB

@Controller('planillas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlanillasController {
  constructor(private readonly planillasService: PlanillasService) {}

  @Post('cargar')
  @Roles(NombreRol.DIGITADOR, NombreRol.ADMIN)
  @UseInterceptors(
    FileInterceptor('archivo', {
      limits: { fileSize: TAMANO_MAXIMO_BYTES },
    }),
  )
  async cargar(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: JwtPayload) {
    if (!file) {
      throw new BadRequestException('Debes adjuntar un archivo en el campo "archivo".');
    }
    return this.planillasService.cargarArchivo(file, user.sub);
  }

  // Listado básico para que el auditor (o el frontend) vea lo que se cargó.
  // El detalle de riesgo/predicción de IA se agrega en el Módulo 4-5.
  @Get()
  @Roles(NombreRol.AUDITOR, NombreRol.ADMIN, NombreRol.DIGITADOR)
  async listar(@Query('loteId') loteId?: string) {
    return this.planillasService.listar(loteId ? parseInt(loteId, 10) : undefined);
  }
}
