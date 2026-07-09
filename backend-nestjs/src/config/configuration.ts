export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'glosas_db',
    user: process.env.DB_USER || 'hospital_admin',
    password: process.env.DB_PASSWORD || 'changeme_en_env',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'cambiar_este_secreto_en_produccion',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },
  iaServiceUrl: process.env.IA_SERVICE_URL || 'http://localhost:8000',
  hashSalt: process.env.HASH_SALT || 'cambiar_este_salt_en_produccion',
});
