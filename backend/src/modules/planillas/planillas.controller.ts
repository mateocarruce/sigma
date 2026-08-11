import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';

import { PlanillasService } from './planillas.service';
import { ProcesarPlanillaDto } from './dto/procesar-planilla.dto';
import { GenerarIndividualesDto } from './dto/generar-individuales.dto';
import { GenerarConsolidadasDto } from './dto/generar-consolidadas.dto';
import { ConsultarResultadosDto } from './dto/consultar-resultados.dto';
import { GeneradorIndividualesService } from './services/generador-individuales.service';
import { GeneradorConsolidadasService } from './services/generador-consolidadas.service';
import { ResultadoPlanilla } from './entities/resultado-planilla.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

interface RequestConUsuario extends Request {
  user: { id: number };
}

@ApiTags('planillas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('planillas')
export class PlanillasController {
  constructor(
    private readonly planillasService: PlanillasService,
    private readonly generadorIndividuales: GeneradorIndividualesService,
    private readonly generadorConsolidadas: GeneradorConsolidadasService,
    @InjectRepository(ResultadoPlanilla)
    private readonly resultadosRepository: Repository<ResultadoPlanilla>,
  ) {}

  /**
   * Recibe el .xlsm ya subido (planilla_id debe existir previamente, creado
   * por el endpoint de subida a MinIO que no se detalla aquí) y dispara el
   * parseo completo dentro de una transacción.
   */
  @Post('procesar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['planillaId', 'file'],
      properties: {
        planillaId: { type: 'integer', example: 1 },
        file: { type: 'string', format: 'binary', description: 'Archivo .xlsm de la matriz' },
        revisadoNombre: { type: 'string', example: 'Ana Torres' },
        revisadoIdentificacion: { type: 'string', example: '1712345678' },
        revisadoCargo: { type: 'string', example: 'MÉDICO AUDITOR' },
        revisadoSello: { type: 'boolean', example: false },
        aprobadoNombre: { type: 'string', example: 'Carlos Vega' },
        aprobadoIdentificacion: { type: 'string', example: '1798765432' },
        aprobadoCargo: { type: 'string', example: 'SUBDIRECTOR MÉDICO' },
        aprobadoSello: { type: 'boolean', example: false },
      },
    },
  })
  @ApiOperation({ summary: 'Procesa un archivo .xlsm de matriz y guarda trámites/expedientes/detalles' })
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

  @Post(':id/generar-individuales')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.AUDITOR)
  @ApiOperation({ summary: 'Genera las planillas individuales (Excel + PDF) por trámite y servicio' })
  @ApiResponse({ status: 201, description: 'Lista de archivos generados, con errores y advertencias si hubo' })
  async generarIndividuales(
    @Param('id', ParseIntPipe) planillaId: number,
    @Body() dto: GenerarIndividualesDto,
    @Req() req: RequestConUsuario,
  ) {
    return this.generadorIndividuales.generar(planillaId, dto, { usuarioId: req.user.id });
  }

  @Post(':id/generar-consolidadas')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.AUDITOR)
  @ApiOperation({ summary: 'Genera las planillas consolidadas (Excel + PDF) por servicio' })
  @ApiResponse({ status: 201, description: 'Lista de archivos generados, con errores y advertencias si hubo' })
  async generarConsolidadas(
    @Param('id', ParseIntPipe) planillaId: number,
    @Body() dto: GenerarConsolidadasDto,
    @Req() req: RequestConUsuario,
  ) {
    return this.generadorConsolidadas.generar(planillaId, dto, { usuarioId: req.user.id });
  }

  @Get(':id/resultados')
  @ApiOperation({ summary: 'Lista los archivos (individuales/consolidadas) ya generados para una planilla' })
  async resultados(
    @Param('id', ParseIntPipe) planillaId: number,
    @Query() query: ConsultarResultadosDto,
  ) {
    return this.resultadosRepository.find({
      where: query.tipo ? { planilla: { id: planillaId }, tipo: query.tipo } : { planilla: { id: planillaId } },
      order: { createdAt: 'DESC' },
    });
  }
}
