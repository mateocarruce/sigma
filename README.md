# Sistema Inteligente de Gestión de Planillas Médicas
Hospital del Día Chimbacalle

## Requisitos previos
- Docker y Docker Compose instalados
- Node.js 20+ (para el backend NestJS)
- Python 3.10+ (para el ETL)
- Cliente `psql` (opcional, para revisar la base manualmente)

## Paso 1 — Configurar variables de entorno

```bash
cd hospital-glosas-system
cp .env.example .env
# abre .env y cambia DB_PASSWORD por una contraseña real
```

## Paso 2 — Levantar PostgreSQL

```bash
docker-compose up -d postgres
docker-compose ps          # confirma que "hospital_postgres" está healthy
```

Como el volumen `postgres_data` está vacío la primera vez, Postgres **ejecuta automáticamente**
todos los `.sql` que están en `db/init/` (en orden alfabético: primero `01_init.sql`,
luego `02_add_tarifario_objeciones.sql`). No necesitas correrlos a mano.

Verifica que las tablas se crearon:

```bash
docker exec -it hospital_postgres psql -U hospital_admin -d glosas_db -c "\dt"
```

Deberías ver: `roles`, `usuarios`, `pacientes`, `catalogo_cie10`, `lotes_carga`,
`planillas`, `predicciones_ia`, `auditorias`, `tarifario_nacional`,
`catalogo_motivos_objecion`.

> Si ya habías levantado Postgres antes y por eso las tablas no se crearon solas,
> corre esto en su lugar (reinicia el volumen desde cero):
> ```bash
> docker-compose down -v
> docker-compose up -d postgres
> ```
> ⚠️ `-v` borra cualquier dato que tuvieras cargado.

## Paso 3 — Cargar los datos reales (ETL)

```bash
cd scripts-etl
pip install -r requirements-etl.txt --break-system-packages

export DB_HOST=localhost
export DB_PORT=5433   # el contenedor expone Postgres en 5433 hacia afuera (ver docker-compose.yml)
export DB_NAME=glosas_db
export DB_USER=hospital_admin
export DB_PASSWORD=la_misma_password_del_.env

python etl_load_xlsm.py --file "/ruta/a/MATRIZ_FACTURACION_FINAL8_0.xlsm"
```

Esto carga: el tarifario nacional (~89 mil códigos), el catálogo de motivos de
objeción (glosas CMT/LQD/REV) y las planillas de ejemplo de la hoja MATRIZ.

## Paso 4 — Levantar el backend NestJS (Auth + RBAC)

```bash
cd ../backend-nestjs
npm install
cp .env.example .env
# ajusta DB_PASSWORD y JWT_SECRET en este .env

npm run seed:roles     # crea roles + usuario admin inicial
npm run start:dev
```

Prueba el login:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hospitalchimbacalle.gob.ec","password":"CambiarInmediatamente123!"}'
```

## Estructura del proyecto

```
hospital-glosas-system/
├── docker-compose.yml
├── .env.example
├── db/init/                 # esquema SQL (se autoejecuta en Postgres)
├── scripts-etl/             # carga del .xlsm a PostgreSQL
└── backend-nestjs/          # API transaccional (Módulo 1: Auth/RBAC ya listo)
```

## Próximos módulos (aún no incluidos en este zip)
- Módulo 2: endpoint de carga CSV/Excel del AS400
- Módulo 3: motor de reglas de negocio (Tarifario)
- Módulo 4: cliente HTTP hacia el microservicio de IA
- microservicio-ia/ (FastAPI + Scikit-learn + SHAP)
- frontend/ (React + Tailwind)
