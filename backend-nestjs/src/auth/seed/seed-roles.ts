/**
 * Script de un solo uso para poblar roles y crear el primer usuario admin.
 * Correr con: npm run seed:roles
 *
 * IMPORTANTE: cambiar el password del admin inmediatamente después del primer login.
 */
import { config } from 'dotenv';
config(); // carga backend-nestjs/.env -- sin esto, process.env.* queda undefined y usa los defaults

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Rol, NombreRol } from '../../database/entities/rol.entity';
import { Usuario } from '../../database/entities/usuario.entity';

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'hospital_admin',
    password: process.env.DB_PASSWORD || 'changeme_en_env',
    database: process.env.DB_NAME || 'glosas_db',
    entities: [Rol, Usuario],
  });

  await dataSource.initialize();
  const rolRepo = dataSource.getRepository(Rol);
  const usuarioRepo = dataSource.getRepository(Usuario);

  const descripciones: Record<NombreRol, string> = {
    [NombreRol.ADMIN]: 'Administrador del sistema, gestiona usuarios y configuración',
    [NombreRol.AUDITOR]: 'Revisa planillas pre-validadas y toma la decisión final (HITL)',
    [NombreRol.DIGITADOR]: 'Carga los archivos exportados del AS400',
  };

  for (const nombre of Object.values(NombreRol)) {
    const existe = await rolRepo.findOne({ where: { nombre } });
    if (!existe) {
      await rolRepo.save(rolRepo.create({ nombre, descripcion: descripciones[nombre] }));
      console.log(`Rol creado: ${nombre}`);
    }
  }

  const emailAdmin = 'admin@hospitalchimbacalle.gob.ec';
  const existeAdmin = await usuarioRepo.findOne({ where: { email: emailAdmin } });

  if (!existeAdmin) {
    const rolAdmin = await rolRepo.findOne({ where: { nombre: NombreRol.ADMIN } });
    if (!rolAdmin) {
      throw new Error('No se encontró el rol admin: revisa que el bloque anterior lo haya creado.');
    }
    const passwordTemporal = 'CambiarInmediatamente123!';
    const passwordHash = await bcrypt.hash(passwordTemporal, 12);

    await usuarioRepo.save(
      usuarioRepo.create({
        email: emailAdmin,
        passwordHash,
        nombreCompleto: 'Administrador Inicial',
        rol: rolAdmin,
        activo: true,
      }),
    );

    console.log(`Usuario admin creado: ${emailAdmin} / password temporal: ${passwordTemporal}`);
  } else {
    console.log('El usuario admin ya existe, no se crea de nuevo.');
  }

  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Error en el seed:', err);
  process.exit(1);
});
