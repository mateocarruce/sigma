# Contexto del proyecto SIGMA — para pegar en otro chat de IA

Soy Mateo, estudiante de tesis. Estoy construyendo **SIGMA**, un sistema de
auditoría de planillas médicas para un hospital en Ecuador, que detecta y
corrige automáticamente valores facturados incorrectamente usando Machine
Learning. Te paso todo el contexto de lo ya construido para que puedas
ayudarme a seguir avanzando sin que tenga que explicarte todo desde cero.

## Stack tecnológico

- **Backend**: NestJS + TypeScript, TypeORM, PostgreSQL (nativo en Windows,
  sin Docker), autenticación JWT con roles (ADMIN, AUDITOR, DIGITADOR),
  Swagger/OpenAPI, class-validator para DTOs.
- **Base de datos**: PostgreSQL 17, esquema aplicado con archivos `.sql`
  secuenciales (`backend/sql/01-...` a `09-...`).
- **Microservicio ML**: Python + FastAPI + scikit-learn (RandomForest) + SHAP
  para explicabilidad. Corre por separado con `uvicorn`, se comunica con el
  backend por HTTP.
- **Frontend**: React (planeado para Sprint 3, aún no construido — hoy se
  prueba todo con un panel HTML standalone).
- **Almacenamiento de archivos**: MinIO (planeado, aún no integrado — hoy la
  carga de planillas de prueba se hace por INSERT SQL directo).
- Todo corre nativo en Windows (no Docker) por decisión práctica durante el
  desarrollo: Postgres instalado directo, ML con venv + uvicorn, backend con
  `npm run start:dev`.

## Qué se construyó en esta sesión (Sprint 2 + extra)

### 1. Microservicio de Machine Learning (`ml/`)

- `train_model.py`: genera un **dataset sintético** (3000 filas normales +
  1000 anómalas repartidas en 4 reglas de negocio: valor alterado, cantidad
  alterada, repetición de beneficiario, combinaciones) y entrena un
  `RandomForestClassifier` (scikit-learn, `n_estimators=200`, `max_depth=6`,
  `class_weight="balanced"`). Guarda el modelo con `joblib` en `model.pkl`.
- `main.py`: API FastAPI con dos endpoints:
  - `GET /health`
  - `POST /predecir-riesgo`: recibe `cantidad`, `valor_unitario_solicitado`,
    `valor_unitario_oficial`, `veces_repetido_beneficiario`; devuelve
    `score` (0–1), `label` (`BAJO` <0.25, `MEDIO` <0.50, `ALTO` <0.75,
    `CRITICO` ≥0.75) y `shap_values` (contribución de cada feature a esa
    predicción puntual, vía SHAP `TreeExplainer`).
- **3 features** que resumen cada línea de detalle de una planilla:
  `ratio_valor` (solicitado/oficial), `cantidad`, y
  `veces_repetido_beneficiario`.
- **Limitación conocida y documentada**: el dataset es sintético porque el
  hospital no tiene planillas históricas etiquetadas como fraude/error real.
  Es trabajo futuro reentrenar con datos reales una vez existan auditorías
  etiquetadas.
- Documentado en `ml/README.md` (qué hace el modelo, cómo correrlo, cómo
  reentrenar, ejemplos de curl/Invoke-RestMethod).

### 2. Módulo de corrección automática en el backend (`backend/src/modules/predicciones/`)

Esta fue la parte que se agregó **más allá del Sprint 2 original**: que el
sistema no solo prediga riesgo, sino que **corrija automáticamente** los
valores mal puestos cuando puede verificarlos contra catálogo.

- **Tabla nueva** `correcciones_automaticas` (migración
  `backend/sql/09-migration-correcciones-automaticas.sql`): guarda
  `detalle_servicio_id`, valor anterior/corregido, subtotal anterior/
  corregido, score de riesgo, nivel de riesgo, motivo y fecha. Es el rastro
  de auditoría de cada corrección automática.
- **`PrediccionesService`**: por cada planilla, recorre los detalles
  `PENDIENTE`, calcula las features, llama al microservicio FastAPI, y:
  - Si el nivel es `ALTO` o `CRITICO` **y** el valor solicitado no coincide
    con el valor oficial de catálogo (tolerancia $0.01) → corrige
    automáticamente (`detalle_servicio` se actualiza con el valor de
    catálogo, se recalcula subtotal, se guarda en
    `correcciones_automaticas` dentro de una transacción TypeORM).
  - Si coincide con catálogo pero el riesgo es alto por otra razón (ej.
    código repetido en exceso) → **no corrige nada**, solo deja la
    predicción guardada para revisión humana. No hay un "valor correcto"
    objetivo que inventar ahí.
  - La corrección **nunca cambia `estado_fila`** — sigue `PENDIENTE`, el
    auditor humano sigue aprobando/rechazando, solo que ahora revisa un
    valor ya alineado a catálogo.
  - Soporta modo `dryRun` (solo evalúa, no corrige).
- **`PrediccionesController`**: rutas `POST /planillas/:id/revisar-riesgo`
  (roles ADMIN, AUDITOR) y `GET /planillas/:id/correcciones`.
- **Decisión de diseño clave**: el modelo ML **nunca inventa el valor
  corregido** — eso lo saca el motor de tarifas ya existente en el backend
  (23,269 registros de catálogo real). El modelo solo dice "esto es
  sospechoso, con esta confianza, por este motivo"; la sustitución por el
  valor de catálogo es lógica determinística separada.

### 3. Decisión arquitectónica importante

El pedido original era "que el modelo analice y corrija los PDFs de
planillas consolidadas". Al revisar el código existente
(`generador-consolidadas.service.ts`, vista SQL `vista_planilla_consolidada`)
confirmé que los PDFs consolidados se **generan a partir de** las filas de
`detalles_servicios` en la base de datos — no son la fuente de verdad. Por
eso la corrección automática opera directamente sobre esos registros de
BD (vía el flujo normal de carga de planillas `.xlsm`/`.xlsx`), y al
regenerar el consolidado después, el PDF ya refleja los valores corregidos
automáticamente. No hizo falta construir parsing de PDF.

### 4. Herramientas de prueba

- `sigma/panel.html`: panel HTML/JS standalone (sin dependencias) con 4
  secciones — login, procesar planilla, revisar riesgo, ver correcciones —
  para probar todo el flujo sin usar Swagger UI directamente. Habla contra
  `http://localhost:3000`.
- 3 archivos de planilla de prueba "dañados" (`Planilla_DANADA_VALOR.xlsx`,
  `_CANTIDAD.xlsx`, `_REPETICION.xlsx`) con errores intencionales para
  validar cada regla de anomalía.

## Resultado validado en vivo

Caso de prueba real: código TPSNS 99201 (Nivel II), valor oficial de
catálogo $8.71, una beneficiaria solicitó $45.00 (5x el valor esperado). El
modelo lo marcó **CRITICO con score 94.7%** (factor dominante: `ratio_valor`),
el backend corrigió automáticamente el valor a $8.71, recalculó el subtotal,
y quedó registrado en `correcciones_automaticas`. La fila permaneció
`PENDIENTE` para revisión del auditor humano.

## Configuración de entorno (por si es relevante)

- `backend/.env` con Postgres nativo (`POSTGRES_HOST=localhost`),
  `FASTAPI_URL=http://127.0.0.1:8000` (importante: **IP explícita, no
  "localhost"** — en Windows, `fetch()` de Node a veces resuelve
  `localhost` a IPv6 primero mientras uvicorn solo escucha en IPv4, lo que
  causaba errores "fetch failed").
- CORS en `backend/src/main.ts` configurado como `origin: true` — esto es
  **solo para desarrollo local** (permite que `panel.html` como `file://`
  hable con el backend); **hay que restringirlo a `FRONTEND_URL` antes de
  cualquier uso en producción**.

## Estado actual / pendientes conocidos (no urgentes, solo para contexto)

- Sprint 1 (wizard de carga real con MinIO) sigue pendiente — hoy la carga
  de prueba es INSERT manual por SQL.
- Sprint 3 (frontend React real) sigue pendiente — hoy se prueba todo con
  `panel.html`.
- `backend/Dockerfile` no existe todavía.
- Inconsistencia de finales de línea CRLF/LF en el repo, no resuelta.
- Documentación completa en `ml/README.md` y guión de demo en
  `GUION-DEMO-SPRINT2.md` (ambos en la raíz del proyecto).

---

Con este contexto, ya sabes qué es SIGMA, qué se construyó en el Sprint 2
más la corrección automática, cómo está estructurado el código, y cuáles son
las decisiones de diseño que ya se tomaron (y por qué). Pregúntame lo que
necesites si algo no queda claro.
