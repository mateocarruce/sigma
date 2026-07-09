import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hashIdentificador } from '../common/utils/hash.util';
import { EstadoLote, LoteCarga } from './entities/lote-carga.entity';
import { Paciente } from './entities/paciente.entity';
import { EstadoPlanilla, Planilla, ReglasEstado } from './entities/planilla.entity';
import { parseArchivoPlanillas, RegistroPlanillaCrudo } from './planillas.parser';

const EXTENSIONES_PERMITIDAS = ['.xlsx', '.xlsm', '.csv'];

@Injectable()
export class PlanillasService {
  constructor(
    @InjectRepository(Planilla)
    private readonly planillasRepo: Repository<Planilla>,
    @InjectRepository(Paciente)
    private readonly pacientesRepo: Repository<Paciente>,
    @InjectRepository(LoteCarga)
    private readonly lotesRepo: Repository<LoteCarga>,
    private readonly config: ConfigService,
  ) {}

  async cargarArchivo(file: Express.Multer.File, usuarioId: number) {
    this.validarExtension(file.originalname);

    const registros = parseArchivoPlanillas(file.buffer, file.originalname);

    if (registros.length === 0) {
      throw new BadRequestException(
        'No se encontraron filas de datos válidas en el archivo (revisa que tenga la hoja/formato esperado).',
      );
    }

    const lote = await this.lotesRepo.save(
      this.lotesRepo.create({
        nombreArchivo: file.originalname,
        usuario: { id: usuarioId } as any,
        totalRegistros: registros.length,
        estado: EstadoLote.PROCESANDO,
      }),
    );

    let errores = 0;
    for (const registro of registros) {
      const { planilla, tieneError } = await this.procesarRegistro(registro, lote);
      await this.planillasRepo.save(planilla);
      if (tieneError) errores++;
    }

    lote.registrosConError = errores;
    lote.estado = EstadoLote.VALIDADO;
    await this.lotesRepo.save(lote);

    return {
      loteId: lote.id,
      totalRegistros: registros.length,
      registrosConError: errores,
      estado: lote.estado,
    };
  }

  private async procesarRegistro(registro: RegistroPlanillaCrudo, lote: LoteCarga) {
    const salt = this.config.get<string>('hashSalt', 'cambiar_este_salt_en_produccion');
    const hash = hashIdentificador(registro.cedula, salt);

    let paciente = await this.pacientesRepo.findOne({ where: { hashIdentificador: hash } });
    if (!paciente) {
      paciente = await this.pacientesRepo.save(
        this.pacientesRepo.create({ hashIdentificador: hash }),
      );
    }

    // --- Motor de reglas simple (Módulo 3 lo hará más completo con el Tarifario) ---
    const reglasDetalle: string[] = [];
    if (!registro.codigoCie10) reglasDetalle.push('CIE-10 ausente');
    if (!registro.valorFacturado || registro.valorFacturado === 0) {
      reglasDetalle.push('Valor facturado en cero');
    }
    if (!registro.codigoPrestacion) reglasDetalle.push('Código de prestación ausente');

    const reglasEstado = reglasDetalle.length > 0 ? ReglasEstado.ERROR_CRITICO : ReglasEstado.OK;

    const planilla = this.planillasRepo.create({
      lote,
      paciente,
      numeroFactura: registro.cedula, // placeholder: el archivo no trae nro. de factura formal
      codigoCie10: registro.codigoCie10,
      codigoPrestacion: registro.codigoPrestacion,
      especialidad: registro.especialidad,
      valorFacturado: registro.valorFacturado,
      cantidad: registro.cantidad,
      fechaAtencion: registro.fechaAtencion,
      tipoSeguro: registro.tipoServicio,
      reglasEstado,
      reglasDetalle,
      estadoPlanilla: EstadoPlanilla.CARGADA,
      motivoObjecionReal: registro.motivoObjecionReal,
    });

    return { planilla, tieneError: reglasDetalle.length > 0 };
  }

  private validarExtension(nombreArchivo: string) {
    const valido = EXTENSIONES_PERMITIDAS.some((ext) =>
      nombreArchivo.toLowerCase().endsWith(ext),
    );
    if (!valido) {
      throw new BadRequestException(
        `Extensión no soportada. Formatos permitidos: ${EXTENSIONES_PERMITIDAS.join(', ')}`,
      );
    }
  }

  async listar(loteId?: number) {
    return this.planillasRepo.find({
      where: loteId ? { lote: { id: loteId } } : {},
      relations: ['paciente'],
      order: { creadoEn: 'DESC' },
      take: 200,
    });
  }
}
