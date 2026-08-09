import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsBoolean } from 'class-validator';

export class ProcesarPlanillaDto {
  @ApiProperty({
    description: 'ID de la planilla que se desea procesar',
    example: 42,
    type: Number,
  })
  @IsInt()
  planillaId: number;

  @ApiPropertyOptional({
    description:
      'Nombre de la persona que revisa la planilla (opcional, se actualiza en el registro antes del parseo)',
    example: 'Juan Pérez',
  })
  @IsOptional()
  @IsString()
  revisadoNombre?: string;

  @ApiPropertyOptional({
    description:
      'Identificación (cédula, RUC, etc.) de la persona que revisa',
    example: '12345678',
  })
  @IsOptional()
  @IsString()
  revisadoIdentificacion?: string;

  @ApiPropertyOptional({
    description: 'Indica si la revisión incluye sello (opcional)',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  revisadoSello?: boolean;

  @ApiPropertyOptional({
    description:
      'Nombre de la persona que aprueba la planilla (opcional, se actualiza en el registro antes del parseo)',
    example: 'María Gómez',
  })
  @IsOptional()
  @IsString()
  aprobadoNombre?: string;

  @ApiPropertyOptional({
    description:
      'Identificación (cédula, RUC, etc.) de la persona que aprueba',
    example: '87654321',
  })
  @IsOptional()
  @IsString()
  aprobadoIdentificacion?: string;

  @ApiPropertyOptional({
    description: 'Indica si la aprobación incluye sello (opcional)',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  aprobadoSello?: boolean;
}