import { IsOptional, IsArray, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GenerarIndividualesDto {
  @ApiPropertyOptional({
    description: 'Filtra solo estos servicios (tipo_servicio del trámite). Si se omite, se generan TODOS los servicios detectados en la planilla.',
    example: ['TRASPLANTE', 'EMERGENCIA'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  servicios?: string[];

  @ApiPropertyOptional({
    description: 'Filtra solo estos números de trámite. Si se omite, se generan TODOS los trámites de los servicios seleccionados.',
    example: ['2', '5'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tramites?: string[];
}
