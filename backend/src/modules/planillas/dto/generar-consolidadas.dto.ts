import { IsOptional, IsArray, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GenerarConsolidadasDto {
  @ApiPropertyOptional({
    description: 'Filtra solo estos servicios. Si se omite, se generan TODOS los servicios detectados en la planilla.',
    example: ['TRASPLANTE'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  servicios?: string[];
}
