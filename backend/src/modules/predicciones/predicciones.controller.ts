import { Controller, Post, Get, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

import { PrediccionesService } from './predicciones.service';
import { RevisarRiesgoDto } from './dto/revisar-riesgo.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('predicciones')
@ApiBearerAuth()
@Controller('planillas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PrediccionesController {
  constructor(private readonly prediccionesService: PrediccionesService) {}

  // POST /planillas/:id/revisar-riesgo?dryRun=true
  @Post(':id/revisar-riesgo')
  @Roles(UserRole.ADMIN, UserRole.AUDITOR)
  @ApiOperation({
    summary: 'Corre el modelo ML sobre los detalles PENDIENTE de una planilla',
    description:
      'Llama a FastAPI /predecir-riesgo por cada detalle PENDIENTE, guarda la predicción de mayor ' +
      'riesgo por expediente, y corrige automáticamente los detalles cuyo valor solicitado no ' +
      'coincide con el catálogo y el modelo marcó riesgo ALTO o CRITICO. Con dryRun=true no escribe ' +
      'nada, solo devuelve lo que se corregiría.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID de la planilla' })
  @ApiResponse({ status: 201, description: 'Resumen de la revisión (predicciones guardadas, correcciones aplicadas, errores)' })
  async revisarRiesgo(@Param('id', ParseIntPipe) planillaId: number, @Query() dto: RevisarRiesgoDto) {
    return this.prediccionesService.revisarPlanilla(planillaId, dto);
  }

  // GET /planillas/:id/correcciones
  @Get(':id/correcciones')
  @ApiOperation({ summary: 'Lista las correcciones automáticas aplicadas a una planilla (rastro de auditoría)' })
  @ApiParam({ name: 'id', type: Number, description: 'ID de la planilla' })
  async listarCorrecciones(@Param('id', ParseIntPipe) planillaId: number) {
    return this.prediccionesService.listarCorrecciones(planillaId);
  }
}
