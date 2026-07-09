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
exports.LoteCarga = exports.EstadoLote = void 0;
const typeorm_1 = require("typeorm");
const usuario_entity_1 = require("../../database/entities/usuario.entity");
var EstadoLote;
(function (EstadoLote) {
    EstadoLote["PROCESANDO"] = "PROCESANDO";
    EstadoLote["VALIDADO"] = "VALIDADO";
    EstadoLote["ERROR"] = "ERROR";
})(EstadoLote || (exports.EstadoLote = EstadoLote = {}));
let LoteCarga = class LoteCarga {
};
exports.LoteCarga = LoteCarga;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], LoteCarga.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'nombre_archivo', type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], LoteCarga.prototype, "nombreArchivo", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => usuario_entity_1.Usuario, { eager: true, nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'usuario_id' }),
    __metadata("design:type", Object)
], LoteCarga.prototype, "usuario", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_registros', type: 'int', nullable: true }),
    __metadata("design:type", Number)
], LoteCarga.prototype, "totalRegistros", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'registros_con_error', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], LoteCarga.prototype, "registrosConError", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 30, default: EstadoLote.PROCESANDO }),
    __metadata("design:type", String)
], LoteCarga.prototype, "estado", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'cargado_en' }),
    __metadata("design:type", Date)
], LoteCarga.prototype, "cargadoEn", void 0);
exports.LoteCarga = LoteCarga = __decorate([
    (0, typeorm_1.Entity)('lotes_carga')
], LoteCarga);
//# sourceMappingURL=lote-carga.entity.js.map