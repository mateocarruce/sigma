import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class RevisarRiesgoDto {
  @ApiPropertyOptional({
    description:
      'Si es true, calcula predicciones y detecta correcciones pero NO modifica la base de datos. Útil para previsualizar antes de aplicar.',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  dryRun: boolean = false;
}
