# SIGMA — Microservicio de Machine Learning

Servicio en Python/FastAPI que evalúa el riesgo de anomalía de cada línea de
detalle de una planilla médica, explica por qué la marcó así (SHAP), y le da
al backend NestJS lo necesario para corregir automáticamente los valores que
no coinciden con el catálogo oficial.

## Qué hace el modelo

El modelo **no sabe nada de fraude médico real**. Es un `RandomForestClassifier`
(scikit-learn) entrenado sobre un **dataset sintético** generado a partir de 3
reglas de negocio conocidas de anomalía — no sobre datos históricos reales del
hospital, porque no existen etiquetados (ver "Limitación conocida" abajo).

Cada línea de detalle se resume en 3 números (features):

| Feature | Qué mide | Normal | Anómalo |
|---|---|---|---|
| `ratio_valor` | `valor_unitario_solicitado / valor_unitario_oficial` | ≈ 1.0 | muy por arriba o abajo de 1 |
| `cantidad` | unidades solicitadas en esa línea | 1–6 | decenas o cientos |
| `veces_repetido_beneficiario` | cuántas veces se repite ese mismo código para el mismo beneficiario | 1–2 | varias veces |

Con esas 3 features, el modelo devuelve:

- **`score`**: probabilidad (0 a 1) de que la línea sea anómala.
- **`label`**: el score traducido a una categoría — `BAJO` (<0.25), `MEDIO`
  (<0.50), `ALTO` (<0.75), `CRITICO` (≥0.75). Son las mismas categorías que
  usa la tabla `predicciones_riesgo` del backend.
- **`shap_values`**: para esa predicción puntual, cuánto empujó cada feature
  el resultado hacia "anómalo" — la parte explicable, para que un auditor
  humano sepa *por qué* el modelo sospecha de esa línea y no tenga que
  confiar en una caja negra.

### Corrección automática (a cargo del backend, no del modelo)

El modelo **no inventa el valor correcto** — eso ya lo sabe el motor de
tarifas de NestJS (23,269 registros de catálogo). Cuando una línea tiene
`label` en `ALTO` o `CRITICO` **y** su valor solicitado no coincide con el
valor oficial de catálogo, el backend (`PrediccionesService`, módulo
`predicciones`) reemplaza automáticamente el valor solicitado por el oficial,
recalcula subtotal/total, y deja el cambio registrado en la tabla
`correcciones_automaticas` (quién, cuándo, valor anterior/nuevo, score).

Importante: si el valor solicitado ya coincide con catálogo pero el riesgo es
alto por otra razón (ej. código repetido en exceso), el sistema **no corrige
nada** — no hay un "valor correcto" objetivo que inventar ahí, solo se deja
la predicción guardada para que un auditor humano lo revise. La corrección
automática nunca cambia `estado_fila`: el auditor sigue aprobando/rechazando
como siempre, solo que revisa un valor ya alineado a catálogo.

## Limitación conocida (documentar en la tesis)

El hospital no tiene planillas históricas etiquetadas como "esto era un
error/fraude" — sin esas etiquetas no hay forma de entrenar con datos reales.
El dataset se genera sintéticamente con `train_model.py` codificando en
reglas lo que un auditor humano ya sabe que es sospechoso. Es una limitación
real y debe quedar explícita: trabajo futuro es reentrenar con datos reales
una vez existan auditorías etiquetadas.

## Estructura de archivos

```
ml/
├── main.py              # FastAPI: /health y /predecir-riesgo
├── train_model.py        # Genera el dataset sintético y entrena el modelo
├── requirements.txt       # Dependencias Python
├── Dockerfile             # Entrena el modelo en build time
├── model.pkl              # Generado por train_model.py (no va al repo)
└── dataset_sintetico.csv  # Generado por train_model.py (no va al repo)
```

## Cómo correrlo (Windows, sin Docker)

```powershell
cd ml
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt

# Entrena el modelo y genera model.pkl (tarda unos segundos)
.venv\Scripts\python.exe train_model.py

# Levanta el servicio
.venv\Scripts\python.exe -m uvicorn main:app --port 8000
```

Si ves `Uvicorn running on http://127.0.0.1:8000`, ya está arriba.

**Gotcha de Windows:** cuando el backend NestJS le hable a este servicio, usá
`http://127.0.0.1:8000` en vez de `http://localhost:8000` en el `.env` del
backend (`FASTAPI_URL`). En Windows, `fetch()` de Node a veces resuelve
`localhost` a IPv6 (`::1`) primero, y `uvicorn` por defecto solo escucha en
IPv4 — eso causa errores de "fetch failed" sin explicación clara.

### Con Docker

El `Dockerfile` ya entrena el modelo en build time (`RUN python
train_model.py`), así que no hace falta correr nada manualmente si usás
`docker compose up`.

## Probarlo con curl / Invoke-RestMethod

Health check:
```powershell
curl http://localhost:8000/health
```

Predicción (caso claramente anómalo — 5x el valor esperado):
```powershell
Invoke-RestMethod -Uri http://localhost:8000/predecir-riesgo -Method Post -ContentType "application/json" -Body '{"cantidad":1,"valor_unitario_solicitado":45.00,"valor_unitario_oficial":8.71,"veces_repetido_beneficiario":1}'
```

Respuesta esperada (aproximada, depende del entrenamiento):
```json
{
  "score": 0.947,
  "label": "CRITICO",
  "shap_values": [
    { "feature": "ratio_valor", "valor": 5.16, "contribucion": 0.38 },
    { "feature": "cantidad", "valor": 1.0, "contribucion": 0.02 },
    { "feature": "veces_repetido_beneficiario", "valor": 1.0, "contribucion": 0.01 }
  ]
}
```

## Reentrenar el modelo

Si cambiás las reglas del dataset sintético en `train_model.py` (rangos,
proporciones, features nuevas), volvé a correr:
```powershell
.venv\Scripts\python.exe train_model.py
```
Esto sobreescribe `model.pkl` y `dataset_sintetico.csv`. Reiniciá `uvicorn`
después para que cargue el modelo nuevo (lo carga una sola vez al arrancar).

## Flujo completo con el backend

1. `POST /planillas/procesar` (NestJS) — sube y procesa la matriz `.xlsm`,
   crea trámites/expedientes/detalles con su valor oficial de catálogo.
2. `POST /planillas/:id/revisar-riesgo` (NestJS) — por cada detalle
   `PENDIENTE`, calcula las 3 features, llama a este servicio
   (`/predecir-riesgo`), guarda la predicción de mayor riesgo por
   expediente, y corrige automáticamente lo que corresponda.
3. `GET /planillas/:id/correcciones` (NestJS) — lista qué se corrigió y por
   qué, para auditoría.
4. `POST /planillas/:id/generar-consolidadas` (NestJS, ya existente) —
   regenera el reporte consolidado, que ahora refleja los valores
   corregidos automáticamente (no requiere cambios, lee directo de la BD).
