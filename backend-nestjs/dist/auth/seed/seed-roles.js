"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const typeorm_1 = require("typeorm");
const bcrypt = require("bcrypt");
const rol_entity_1 = require("../../database/entities/rol.entity");
const usuario_entity_1 = require("../../database/entities/usuario.entity");
async function seed() {
    const dataSource = new typeorm_1.DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USER || 'hospital_admin',
        password: process.env.DB_PASSWORD || 'changeme_en_env',
        database: process.env.DB_NAME || 'glosas_db',
        entities: [rol_entity_1.Rol, usuario_entity_1.Usuario],
    });
    await dataSource.initialize();
    const rolRepo = dataSource.getRepository(rol_entity_1.Rol);
    const usuarioRepo = dataSource.getRepository(usuario_entity_1.Usuario);
    const descripciones = {
        [rol_entity_1.NombreRol.ADMIN]: 'Administrador del sistema, gestiona usuarios y configuración',
        [rol_entity_1.NombreRol.AUDITOR]: 'Revisa planillas pre-validadas y toma la decisión final (HITL)',
        [rol_entity_1.NombreRol.DIGITADOR]: 'Carga los archivos exportados del AS400',
    };
    for (const nombre of Object.values(rol_entity_1.NombreRol)) {
        const existe = await rolRepo.findOne({ where: { nombre } });
        if (!existe) {
            await rolRepo.save(rolRepo.create({ nombre, descripcion: descripciones[nombre] }));
            console.log(`Rol creado: ${nombre}`);
        }
    }
    const emailAdmin = 'admin@hospitalchimbacalle.gob.ec';
    const existeAdmin = await usuarioRepo.findOne({ where: { email: emailAdmin } });
    if (!existeAdmin) {
        const rolAdmin = await rolRepo.findOne({ where: { nombre: rol_entity_1.NombreRol.ADMIN } });
        if (!rolAdmin) {
            throw new Error('No se encontró el rol admin: revisa que el bloque anterior lo haya creado.');
        }
        const passwordTemporal = 'CambiarInmediatamente123!';
        const passwordHash = await bcrypt.hash(passwordTemporal, 12);
        await usuarioRepo.save(usuarioRepo.create({
            email: emailAdmin,
            passwordHash,
            nombreCompleto: 'Administrador Inicial',
            rol: rolAdmin,
            activo: true,
        }));
        console.log(`Usuario admin creado: ${emailAdmin} / password temporal: ${passwordTemporal}`);
    }
    else {
        console.log('El usuario admin ya existe, no se crea de nuevo.');
    }
    await dataSource.destroy();
}
seed().catch((err) => {
    console.error('Error en el seed:', err);
    process.exit(1);
});
//# sourceMappingURL=seed-roles.js.map