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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Planilla = exports.EstadoPlanilla = exports.ReglasEstado = void 0;
const typeorm_1 = require("typeorm");
const lote_carga_entity_1 = require("./lote-carga.entity");
const paciente_entity_1 = require("./paciente.entity");
var ReglasEstado;
(function (ReglasEstado) {
    ReglasEstado["OK"] = "OK";
    ReglasEstado["ADVERTENCIA"] = "ADVERTENCIA";
    ReglasEstado["ERROR_CRITICO"] = "ERROR_CRITICO";
})(ReglasEstado || (exports.ReglasEstado = ReglasEstado = {}));
var EstadoPlanilla;
(function (EstadoPlanilla) {
    EstadoPlanilla["CARGADA"] = "CARGADA";
    EstadoPlanilla["PRE_VALIDADA"] = "PRE_VALIDADA";
    EstadoPlanilla["AUDITADA"] = "AUDITADA";
    EstadoPlanilla["ENVIADA"] = "ENVIADA";
})(EstadoPlanilla || (exports.EstadoPlanilla = EstadoPlanilla = {}));
let Planilla = class Planilla {
};
exports.Planilla = Planilla;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Planilla.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => lote_carga_entity_1.LoteCarga, { eager: false }),
    (0, typeorm_1.JoinColumn)({ name: 'lote_id' }),
    __metadata("design:type", lote_carga_entity_1.LoteCarga)
], Planilla.prototype, "lote", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => paciente_entity_1.Paciente, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'paciente_id' }),
    __metadata("design:type", paciente_entity_1.Paciente)
], Planilla.prototype, "paciente", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'numero_factura', type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], Planilla.prototype, "numeroFactura", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'codigo_cie10', type: 'varchar', length: 10, nullable: true }),
    __metadata("design:type", Object)
], Planilla.prototype, "codigoCie10", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'codigo_prestacion', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], Planilla.prototype, "codigoPrestacion", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 150, nullable: true }),
    __metadata("design:type", Object)
], Planilla.prototype, "especialidad", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'valor_facturado', type: 'numeric', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Planilla.prototype, "valorFacturado", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'valor_unitario', type: 'numeric', precision: 12, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], Planilla.prototype, "valorUnitario", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], Planilla.prototype, "cantidad", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'fecha_atencion', type: 'date', nullable: true }),
    __metadata("design:type", Object)
], Planilla.prototype, "fechaAtencion", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tipo_seguro', type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", Object)
], Planilla.prototype, "tipoSeguro", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reglas_estado', type: 'varchar', length: 30, default: ReglasEstado.OK }),
    __metadata("design:type", String)
], Planilla.prototype, "reglasEstado", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reglas_detalle', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Planilla.prototype, "reglasDetalle", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'estado_planilla', type: 'varchar', length: 30, default: EstadoPlanilla.CARGADA }),
    __metadata("design:type", String)
], Planilla.prototype, "estadoPlanilla", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'motivo_objecion_real', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], Planilla.prototype, "motivoObjecionReal", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'creado_en' }),
    __metadata("design:type", Date)
], Planilla.prototype, "creadoEn", void 0);
exports.Planilla = Planilla = __decorate([
    (0, typeorm_1.Entity)('planillas')
], Planilla);
//# sourceMappingURL=planilla.entity.js.map