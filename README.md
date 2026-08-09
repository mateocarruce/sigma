# SIGMA — Sistema de Gestión de Planillas Médicas

Proyecto de tesis académica. Hospital público en Ecuador.

## Stack

- Frontend: React 18 + TypeScript + Tailwind + Vite
- Backend: NestJS + TypeScript
- ML Service: Python 3.11 + FastAPI
- Base de datos: PostgreSQL 15
- Storage: MinIO
- Orquestación: Docker Compose

## Levantar el proyecto

```bash
cp .env.example .env
# Editar .env con valores propios (contraseñas, secretos JWT, etc.)
docker compose up --build
```

Servicios expuestos:

| Servicio        | URL                          |
|-----------------|-------------------------------|
| Frontend        | http://localhost:5173         |
| NestJS API      | http://localhost:3000/health  |
| FastAPI ML      | http://localhost:8000/health  |
| MinIO Console   | http://localhost:9001         |
| PostgreSQL      | localhost:5432                |

## Estado del Módulo 1

- [x] PASO 1 — Infraestructura base (Docker Compose, estructura de carpetas)
- [ ] PASO 2 — PostgreSQL: entidades TypeORM + migration + seed
- [ ] PASO 3 — MinIO: MinioService + minio-init
- [ ] PASO 4 — Auth NestJS (JWT)
- [ ] PASO 5 — React: Login + layout autenticado
- [ ] PASO 6 — Health checks completos + verificación end-to-end
