"""
SIGMA - Servicio de Machine Learning (FastAPI)
Punto de entrada del microservicio.
"""
from datetime import datetime, timezone

from fastapi import FastAPI

app = FastAPI(title="SIGMA ML Service")


@app.get("/health")
def health() -> dict:
    """
    Health check temporal del PASO 1.
    model_loaded siempre False hasta que se integre el modelo real
    (fuera del alcance del Módulo 1).
    """
    return {
        "status": "ok",
        "model_loaded": False,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
