import { IsInt, IsOptional, IsString, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';

// multipart/form-data manda TODO como texto plano (incluso "true"/"false"
// y números), así que cada campo que no sea string necesita conversión
// explícita ANTES de que class-validator lo evalúe.
//
// OJO con @Type(() => Boolean): según la versión de class-transformer,
// a veces solo hace `Boolean(valor)` — y Boolean('false') da `true`
// (cualquier string no vacío es "truthy" en JS). Por eso para booleans
// se usa @Transform explícito comparando el string real, no @Type().
const aBooleano = ({ value }: { value: unknown }): boolean | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  return value === 'true' || value === '1' || value === 1;
};

export class ProcesarPlanillaDto {
  @Type(() => Number)
  @IsInt()
  planillaId: number;

  @IsOptional()
  @IsString()
  revisadoNombre?: string;

  @IsOptional()
  @IsString()
  revisadoIdentificacion?: string;

  @IsOptional()
  @IsString()
  revisadoCargo?: string;

  @IsOptional()
  @Transform(aBooleano)
  @IsBoolean()
  revisadoSello?: boolean;

  @IsOptional()
  @IsString()
  aprobadoNombre?: string;

  @IsOptional()
  @IsString()
  aprobadoIdentificacion?: string;

  @IsOptional()
  @IsString()
  aprobadoCargo?: string;

  @IsOptional()
  @Transform(aBooleano)
  @IsBoolean()
  aprobadoSello?: boolean;
}
