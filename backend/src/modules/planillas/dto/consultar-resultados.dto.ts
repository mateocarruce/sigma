import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TipoResultado } from '../../../common/enums';

export class ConsultarResultadosDto {
  @ApiPropertyOptional({
    enum: TipoResultado,
    description: 'Filtra por tipo de resultado. Si se omite, trae ambos.',
  })
  @IsOptional()
  @IsEnum(TipoResultado)
  tipo?: TipoResultado;
}
