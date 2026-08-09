import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Req,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiExtraModels,
  ApiBody,
  
} from '@nestjs/swagger';
import { PlanillasService } from './planillas.service';
import { ProcesarPlanillaDto } from './dto/procesar-planilla.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Multer } from 'multer';

interface RequestConUsuario extends Request {
  user: { id: number };
}

@ApiTags('planillas')
@ApiBearerAuth() 
@ApiExtraModels(ProcesarPlanillaDto) 
@UseGuards(JwtAuthGuard)
@Controller('planillas')
export class PlanillasController {
  constructor(private readonly planillasService: PlanillasService) {}

  /**
   * Recibe el .xlsm ya subido (planilla_id debe existir previamente, creado
   * por el endpoint de subida a MinIO que no se detalla aquí) y dispara el
   * parseo completo dentro de una transacción.
   */
  @Post('procesar')
  @ApiOperation({
    summary: 'Procesar una planilla existente',
    description:
      'Sube un archivo .xlsm y envía los datos de firma (opcionales) para procesar la planilla. ' +
      'El archivo debe corresponder a una planilla previamente registrada (el ID se envía en el DTO).',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Archivo .xlsm y datos de firma',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo .xlsm de la planilla',
        },
        planillaId: {
          type: 'number',
          example: 42,
          description: 'ID de la planilla registrada',
        },
        revisadoNombre: {
          type: 'string',
          example: 'Juan Pérez',
          description: 'Nombre del revisor (opcional)',
        },
        revisadoIdentificacion: {
          type: 'string',
          example: '12345678',
          description: 'Identificación del revisor (opcional)',
        },
        revisadoSello: {
          type: 'boolean',
          example: true,
          description: '¿Incluye sello del revisor? (opcional)',
        },
        aprobadoNombre: {
          type: 'string',
          example: 'María Gómez',
          description: 'Nombre del aprobador (opcional)',
        },
        aprobadoIdentificacion: {
          type: 'string',
          example: '87654321',
          description: 'Identificación del aprobador (opcional)',
        },
        aprobadoSello: {
          type: 'boolean',
          example: true,
          description: '¿Incluye sello del aprobador? (opcional)',
        },
      },
      required: ['file', 'planillaId'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Planilla procesada exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos inválidos o archivo corrupto',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autenticado',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sin permisos para procesar planillas',
  })
  @UseInterceptors(FileInterceptor('file'))
  async procesar(
    @UploadedFile() file: Express.Multer.File,    
    @Body() dto: ProcesarPlanillaDto,
    @Req() req: RequestConUsuario,
  ) {
    return this.planillasService.procesarMatriz(file.buffer, dto, {
      usuarioId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}