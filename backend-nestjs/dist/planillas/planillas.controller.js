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
exports.PlanillasController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const rol_entity_1 = require("../database/entities/rol.entity");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const planillas_service_1 = require("./planillas.service");
const TAMANO_MAXIMO_BYTES = 25 * 1024 * 1024;
let PlanillasController = class PlanillasController {
    constructor(planillasService) {
        this.planillasService = planillasService;
    }
    async cargar(file, user) {
        if (!file) {
            throw new common_1.BadRequestException('Debes adjuntar un archivo en el campo "archivo".');
        }
        return this.planillasService.cargarArchivo(file, user.sub);
    }
    async listar(loteId) {
        return this.planillasService.listar(loteId ? parseInt(loteId, 10) : undefined);
    }
};
exports.PlanillasController = PlanillasController;
__decorate([
    (0, common_1.Post)('cargar'),
    (0, roles_decorator_1.Roles)(rol_entity_1.NombreRol.DIGITADOR, rol_entity_1.NombreRol.ADMIN),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('archivo', {
        limits: { fileSize: TAMANO_MAXIMO_BYTES },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PlanillasController.prototype, "cargar", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(rol_entity_1.NombreRol.AUDITOR, rol_entity_1.NombreRol.ADMIN, rol_entity_1.NombreRol.DIGITADOR),
    __param(0, (0, common_1.Query)('loteId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PlanillasController.prototype, "listar", null);
exports.PlanillasController = PlanillasController = __decorate([
    (0, common_1.Controller)('planillas'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [planillas_service_1.PlanillasService])
], PlanillasController);
//# sourceMappingURL=planillas.controller.js.map