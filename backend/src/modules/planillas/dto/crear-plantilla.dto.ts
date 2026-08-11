import { IsString, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TipoPlantilla } from '../../../common/enums';

export class CrearPlantillaDto {
  @ApiProperty({ example: 'Formato individual 2026', description: 'Nombre descriptivo de la plantilla' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ enum: TipoPlantilla, example: TipoPlantilla.INDIVIDUAL })
  @IsEnum(TipoPlantilla)
  tipo: TipoPlantilla;
}
