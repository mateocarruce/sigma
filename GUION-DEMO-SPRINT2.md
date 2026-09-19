# Guión de demo — Sprint 2 + corrección automática

Reunión con Mateo. Objetivo: mostrar que el modelo ML detecta anomalías con
explicación y que el sistema corrige automáticamente valores mal puestos
contra catálogo, sin romper el flujo de auditoría humana que ya existía.

Antes de empezar, dejá corriendo (en 2 terminales separadas):
```powershell
cd ml; .venv\Scripts\python.exe -m uvicorn main:app --port 8000
cd backend; npm run start:dev
```
Y abrí `sigma\panel.html` en el navegador.

---

## 1. Contexto rápido (30 seg, hablado, sin pantalla)

"El Sprint 2 original era: dataset sintético + modelo entrenado + endpoint
que devuelve score y explicación. Eso está. Lo que agregué hoy, arriba de lo
planeado, es la integración con el backend: el sistema ahora corre el modelo
sobre cada línea de una planilla real, y si detecta un valor mal puesto
contra catálogo con riesgo alto, lo corrige solo — dejando todo registrado
para auditoría."

## 2. Mostrar el login (10 seg)

Panel → sección 1 → clic "Iniciar sesión". Mostrá que ya está autenticado.

Decir: "Esto habla directo contra los mismos endpoints de NestJS que va a
usar el frontend real cuando lo construyamos — no es un mock."

## 3. Procesar una planilla con un error real (1 min)

Panel → sección 2 → ID `3` → seleccionar `pruebas_ml\Planilla_DANADA_VALOR.xlsx`
→ Procesar.

Decir mientras carga: "Esta planilla de prueba tiene 2 líneas con el mismo
código TPSNS real de catálogo (99201, nivel II, valor oficial $8.71) — una
beneficiaria pidió el valor correcto, la otra pidió $45.00, 5 veces más."

Mostrar el mensaje verde: "OK — detalles insertados: 2".

## 4. Correr el modelo (1 min — el momento fuerte)

Panel → sección 3 → ID `3` → sin dryRun → clic "Revisar riesgo".

Mostrar la tabla resultante. Señalar:
- **Score 94.7%, etiqueta CRITICO** en la línea del valor incorrecto.
- **Valor anterior $45.00 → Valor corregido $8.71** — corregido solo.
- La línea del beneficiario normal no aparece ahí — el modelo no la tocó.

Decir: "El modelo no inventa el valor corregido — eso lo saca el motor de
tarifas que ya teníamos, de las 23,269 tarifas reales. El modelo solo dice
'esto es sospechoso, con esta confianza, por este motivo' — la sustitución
por el valor de catálogo es lógica determinística del backend."

## 5. Mostrar el rastro de auditoría (30 seg)

Panel → sección 4 → ID `3` → "Cargar correcciones".

Decir: "Todo cambio automático queda en una tabla separada
(`correcciones_automaticas`) con el valor anterior, el nuevo, el score, y la
fecha exacta. El estado de la fila sigue en PENDIENTE — el auditor humano
todavía tiene que aprobar o rechazar, solo que ahora revisa un valor ya
alineado a catálogo en vez del error original."

## 6. Caso de contraste — repetición sin corrección (opcional, si hay tiempo)

Repetir pasos 3-4 con `Planilla_DANADA_REPETICION.xlsx` (ID de esa planilla,
o cualquiera con detalles pendientes de esa carga). Señalar que ahí **no**
hubo corrección aunque el riesgo salió alto — porque el precio en sí
coincidía con catálogo, solo estaba repetido. El sistema no corrige lo que
no tiene un "valor correcto" objetivo, solo lo deja marcado para revisión
humana.

Esto demuestra criterio: el sistema no "corrige todo", corrige lo que puede
verificar objetivamente.

## 7. Cierre — qué falta (30 seg)

"Con esto, Sprint 2 más la corrección automática están cerrados y
verificados de punta a punta. Lo que sigue del Sprint 3 original es
conectar esto a una pantalla real de React en vez de este panel de pruebas,
y el login/wizard con MinIO real del Sprint 1."

---

## Si algo falla en vivo

- **"fetch failed" en los logs del backend:** el servicio ML no está
  corriendo o `FASTAPI_URL` en `backend\.env` apunta a `localhost` en vez de
  `127.0.0.1` (bug de Windows con IPv6, ya solucionado, pero si tocás el
  `.env` de nuevo revisalo).
- **"Planilla X no encontrada":** el ID que pusiste en el panel no existe en
  la tabla `planillas`. Los IDs de prueba ya cargados son 3 (VALOR), 4
  (CANTIDAD), 5 (REPETICION).
- **El panel no reconoce el archivo:** hay que volver a seleccionarlo cada
  vez que recargás la página (F5) — el navegador borra la selección.
