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
exports.Paciente = void 0;
const typeorm_1 = require("typeorm");
let Paciente = class Paciente {
};
exports.Paciente = Paciente;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Paciente.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'hash_identificador', type: 'varchar', length: 64, unique: true }),
    __metadata("design:type", String)
], Paciente.prototype, "hashIdentificador", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'char', length: 1, nullable: true }),
    __metadata("design:type", Object)
], Paciente.prototype, "sexo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'rango_edad', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], Paciente.prototype, "rangoEdad", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tipo_seguro', type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", Object)
], Paciente.prototype, "tipoSeguro", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'creado_en' }),
    __metadata("design:type", Date)
], Paciente.prototype, "creadoEn", void 0);
exports.Paciente = Paciente = __decorate([
    (0, typeorm_1.Entity)('pacientes')
], Paciente);
//# sourceMappingURL=paciente.entity.js.map