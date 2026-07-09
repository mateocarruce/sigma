"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanillasModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const lote_carga_entity_1 = require("./entities/lote-carga.entity");
const paciente_entity_1 = require("./entities/paciente.entity");
const planilla_entity_1 = require("./entities/planilla.entity");
const planillas_controller_1 = require("./planillas.controller");
const planillas_service_1 = require("./planillas.service");
let PlanillasModule = class PlanillasModule {
};
exports.PlanillasModule = PlanillasModule;
exports.PlanillasModule = PlanillasModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([planilla_entity_1.Planilla, paciente_entity_1.Paciente, lote_carga_entity_1.LoteCarga])],
        controllers: [planillas_controller_1.PlanillasController],
        providers: [planillas_service_1.PlanillasService],
        exports: [planillas_service_1.PlanillasService],
    })
], PlanillasModule);
//# sourceMappingURL=planillas.module.js.map