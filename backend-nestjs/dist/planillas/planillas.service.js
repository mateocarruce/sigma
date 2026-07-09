"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanillasService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const hash_util_1 = require("../common/utils/hash.util");
const lote_carga_entity_1 = require("./entities/lote-carga.entity");
const paciente_entity_1 = require("./entities/paciente.entity");
const planilla_entity_1 = require("./entities/planilla.entity");
const planillas_parser_1 = require("./planillas.parser");
const EXTENSIONES_PERMITIDAS = ['.xlsx', '.xlsm', '.csv'];
let PlanillasService = class PlanillasService {
    constructor(planillasRepo, pacientesRepo, lotesRepo, config) {
        this.planillasRepo = planillasRepo;
        this.pacientesRepo = pacientesRepo;
        this.lotesRepo = lotesRepo;
        this.config = config;
    }
    async cargarArchivo(file, usuarioId) {
        this.validarExtension(file.originalname);
        const registros = (0, planillas_parser_1.parseArchivoPlanillas)(file.buffer, file.originalname);
        if (registros.length === 0) {
            throw new common_1.BadRequestException('No se encontraron filas de datos válidas en el archivo (revisa que tenga la hoja/formato esperado).');
        }
        const lote = await this.lotesRepo.save(this.lotesRepo.create({
            nombreArchivo: file.originalname,
            usuario: { id: usuarioId },
            totalRegistros: registros.length,
            estado: lote_carga_entity_1.EstadoLote.PROCESANDO,
        }));
        let errores = 0;
        for (const registro of registros) {
            const { planilla, tieneError } = await this.procesarRegistro(registro, lote);
            await this.planillasRepo.save(planilla);
            if (tieneError)
                errores++;
        }
        lote.registrosConError = errores;
        lote.estado = lote_carga_entity_1.EstadoLote.VALIDADO;
        await this.lotesRepo.save(lote);
        return {
            loteId: lote.id,
            totalRegistros: registros.length,
            registrosConError: errores,
            estado: lote.estado,
        };
    }
    async procesarRegistro(registro, lote) {
        const salt = this.config.get('hashSalt', 'cambiar_este_salt_en_produccion');
        const hash = (0, hash_util_1.hashIdentificador)(registro.cedula, salt);
        let paciente = await this.pacientesRepo.findOne({ where: { hashIdentificador: hash } });
        if (!paciente) {
            paciente = await this.pacientesRepo.save(this.pacientesRepo.create({ hashIdentificador: hash }));
        }
        const reglasDetalle = [];
        if (!registro.codigoCie10)
            reglasDetalle.push('CIE-10 ausente');
        if (!registro.valorFacturado || registro.valorFacturado === 0) {
            reglasDetalle.push('Valor facturado en cero');
        }
        if (!registro.codigoPrestacion)
            reglasDetalle.push('Código de prestación ausente');
        const reglasEstado = reglasDetalle.length > 0 ? planilla_entity_1.ReglasEstado.ERROR_CRITICO : planilla_entity_1.ReglasEstado.OK;
        const planilla = this.planillasRepo.create({
            lote,
            paciente,
            numeroFactura: registro.cedula,
            codigoCie10: registro.codigoCie10,
            codigoPrestacion: registro.codigoPrestacion,
            especialidad: registro.especialidad,
            valorFacturado: registro.valorFacturado,
            cantidad: registro.cantidad,
            fechaAtencion: registro.fechaAtencion,
            tipoSeguro: registro.tipoServicio,
            reglasEstado,
            reglasDetalle,
            estadoPlanilla: planilla_entity_1.EstadoPlanilla.CARGADA,
            motivoObjecionReal: registro.motivoObjecionReal,
        });
        return { planilla, tieneError: reglasDetalle.length > 0 };
    }
    validarExtension(nombreArchivo) {
        const valido = EXTENSIONES_PERMITIDAS.some((ext) => nombreArchivo.toLowerCase().endsWith(ext));
        if (!valido) {
            throw new common_1.BadRequestException(`Extensión no soportada. Formatos permitidos: ${EXTENSIONES_PERMITIDAS.join(', ')}`);
        }
    }
    async listar(loteId) {
        return this.planillasRepo.find({
            where: loteId ? { lote: { id: loteId } } : {},
            relations: ['paciente'],
            order: { creadoEn: 'DESC' },
            take: 200,
        });
    }
};
exports.PlanillasService = PlanillasService;
exports.PlanillasService = PlanillasService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(planilla_entity_1.Planilla)),
    __param(1, (0, typeorm_1.InjectRepository)(paciente_entity_1.Paciente)),
    __param(2, (0, typeorm_1.InjectRepository)(lote_carga_entity_1.LoteCarga)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        config_1.ConfigService])
], PlanillasService);
//# sourceMappingURL=planillas.service.js.map