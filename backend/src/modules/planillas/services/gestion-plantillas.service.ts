import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
import { Plantilla } from '../entities/plantilla.entity';
import { TipoPlantilla } from '../../../common/enums';

const CARPETA_PLANTILLAS = path.join(process.cwd(), 'plantillas');

@Injectable()
export class GestionPlantillasService {
  constructor(
    @InjectRepository(Plantilla)
    private readonly plantillasRepository: Repository<Plantilla>,
  ) {}

  async listarActivas(tipo?: TipoPlantilla): Promise<Plantilla[]> {
    return this.plantillasRepository.find({
      where: tipo ? { activo: true, tipo } : { activo: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Sube una nueva plantilla: valida que sea un .xlsx real (intenta abrirlo
   * con exceljs), la guarda en disco y desactiva cualquier plantilla previa
   * del mismo tipo (solo una activa por tipo a la vez).
   */
  async subir(
    nombre: string,
    tipo: TipoPlantilla,
    archivo: Express.Multer.File,
  ): Promise<Plantilla> {
    if (!archivo) {
      throw new BadRequestException('Debes adjuntar el archivo de la plantilla (.xlsx)');
    }

    const extensionValida = archivo.originalname.toLowerCase().endsWith('.xlsx');
    if (!extensionValida) {
      throw new BadRequestException('La plantilla debe ser un archivo .xlsx');
    }

    // Validación real: intentamos abrirlo con exceljs. Si el buffer no es
    // un xlsx válido, esto lanza y evitamos guardar un archivo corrupto.
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(archivo.buffer);
    } catch {
      throw new BadRequestException('El archivo no es un .xlsx válido o está corrupto');
    }

    fs.mkdirSync(CARPETA_PLANTILLAS, { recursive: true });

    const version = (await this.contarVersionesPorTipo(tipo)) + 1;
    const nombreArchivoDisco = `${tipo.toLowerCase()}_v${version}_${Date.now()}.xlsx`;
    const rutaAbsoluta = path.join(CARPETA_PLANTILLAS, nombreArchivoDisco);
    fs.writeFileSync(rutaAbsoluta, archivo.buffer);

    // Desactivar cualquier plantilla activa previa del mismo tipo.
    await this.plantillasRepository.update({ tipo, activo: true }, { activo: false });

    const rutaRelativa = path.join('plantillas', nombreArchivoDisco);
    const plantilla = this.plantillasRepository.create({
      nombre,
      tipo,
      rutaArchivo: rutaRelativa,
      version,
      activo: true,
    });

    return this.plantillasRepository.save(plantilla);
  }

  async desactivar(id: number): Promise<void> {
    const plantilla = await this.plantillasRepository.findOne({ where: { id } });
    if (!plantilla) {
      throw new NotFoundException(`Plantilla ${id} no encontrada`);
    }
    plantilla.activo = false;
    await this.plantillasRepository.save(plantilla);
  }

  /**
   * Devuelve la ruta ABSOLUTA de la plantilla activa de un tipo, o lanza
   * si no hay ninguna configurada (los generadores dependen de esto).
   */
  async obtenerRutaActiva(tipo: TipoPlantilla): Promise<string> {
    const plantilla = await this.plantillasRepository.findOne({
      where: { tipo, activo: true },
      order: { createdAt: 'DESC' },
    });
    if (!plantilla) {
      throw new NotFoundException(
        `No hay ninguna plantilla activa de tipo ${tipo}. Sube una con POST /plantillas.`,
      );
    }
    return path.join(process.cwd(), plantilla.rutaArchivo);
  }

  private async contarVersionesPorTipo(tipo: TipoPlantilla): Promise<number> {
    return this.plantillasRepository.count({ where: { tipo } });
  }
}
