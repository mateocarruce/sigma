# Cómo probar SIGMA backend (entities + planillas + auth + auditoría)

Esto arma en un solo proyecto ejecutable todo lo que hemos construido:
las 12 entidades y `PlanillasService` de tu `sigma-backend.zip`, más el
módulo `Auth` y el módulo `Auditoría`.

## 1. Extraer y abrir en VS Code

Descomprime `sigma-backend-completo.zip` y ábrelo en VS Code (`File → Open Folder`).

## 2. Levantar solo PostgreSQL

No necesitas MinIO ni el resto del stack todavía para probar auth/auditoría.
En la terminal, dentro de la carpeta del proyecto:

```powershell
cp .env.example .env
```

Edita `.env` y cambia `POSTGRES_PASSWORD`, `JWT_SECRET` y `JWT_REFRESH_SECRET`
por valores tuyos (no dejes los `changeme_...`).

```powershell
docker compose -f docker-compose.postgres.yml up -d
```

Verifica que esté corriendo:

```powershell
docker compose -f docker-compose.postgres.yml ps
```

## 3. Aplicar el esquema SQL, en este orden exacto

```powershell
type sql\01-schema.sql | docker compose -f docker-compose.postgres.yml exec -T postgres psql -U sigma_user -d sigma_db
type sql\02-migration-fix-check-constraint.sql | docker compose -f docker-compose.postgres.yml exec -T postgres psql -U sigma_user -d sigma_db
type sql\03-migration-add-user-sessions.sql | docker compose -f docker-compose.postgres.yml exec -T postgres psql -U sigma_user -d sigma_db
type sql\04-seed.sql | docker compose -f docker-compose.postgres.yml exec -T postgres psql -U sigma_user -d sigma_db
```

(Si tu `POSTGRES_USER`/`POSTGRES_DB` en `.env` son distintos de
`sigma_user`/`sigma_db`, ajusta esos dos valores en los comandos.)

Si algún paso da error de sintaxis o de tabla ya existente, dime exactamente
qué error viste antes de seguir.

## 4. Instalar dependencias e iniciar el backend

```powershell
npm install
npm run start:dev
```

Deberías ver: `SIGMA backend corriendo en el puerto 3000` sin errores rojos.

## 5. Verificación end-to-end con curl

### 5.1. Health check

```powershell
curl http://localhost:3000/health
```

### 5.2. Login (usa el seed)

```powershell
curl -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@sigma.ec\",\"password\":\"Admin1234!\"}"
```

Si el hash del seed no corresponde a esa contraseña (ver advertencia en
`sql/04-seed.sql`), este paso responderá `401 Unauthorized` — en ese caso
regenera el hash como se explica en `INTEGRACION-AUTH.md` y actualiza el
`password_hash` directo en la tabla `users` con un `UPDATE`.

Copia el `access_token` y el `refresh_token` de la respuesta.

### 5.3. Perfil autenticado

```powershell
curl http://localhost:3000/auth/me -H "Authorization: Bearer TU_ACCESS_TOKEN"
```

### 5.4. Auditoría: listar pendientes (requiere rol AUDITOR o ADMIN)

Si hiciste login como `admin@sigma.ec`, ya tienes rol ADMIN y puedes probar directo:

```powershell
curl http://localhost:3000/auditoria/pendientes -H "Authorization: Bearer TU_ACCESS_TOKEN"
```

Deberías ver la fila con `codigo_original: "CODIGO-INEXISTENTE-999"` del seed,
en estado `RECHAZADO`.

### 5.5. Auditoría: aprobar esa línea rechazada

```powershell
curl -X POST http://localhost:3000/auditoria/2/decidir -H "Authorization: Bearer TU_ACCESS_TOKEN" -H "Content-Type: application/json" -d "{\"decision\":\"APROBADO\",\"motivoGlosa\":\"Verificado manualmente contra tarifario fisico\",\"valorUnitarioOficial\":0.15,\"valorSolicitado\":0.15}"
```

### 5.6. Confirmar que ya no aparece en pendientes

```powershell
curl http://localhost:3000/auditoria/pendientes -H "Authorization: Bearer TU_ACCESS_TOKEN"
```

Ya no debería salir el detalle id `2`.

### 5.7. Logout

```powershell
curl -X POST http://localhost:3000/auth/logout -H "Content-Type: application/json" -d "{\"refresh_token\":\"TU_REFRESH_TOKEN\"}"
```

## Si algo falla

Pégame el mensaje de error completo (de `npm run start:dev` o del `curl`
que falló) y seguimos desde ahí. Los errores más probables en esta etapa:

- **`ECONNREFUSED` al conectar a Postgres** → el contenedor no está corriendo o el `.env` no coincide con lo que pusiste en `docker-compose.postgres.yml`.
- **Error de TypeScript al compilar** → probablemente falta alguna dependencia de `npm install`, o algún import roto — cópiame el error exacto.
- **`401` en login** → el hash del seed, revisa el punto 5.2.
