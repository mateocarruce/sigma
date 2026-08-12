"""
SIGMA - Servicio de Machine Learning (FastAPI)
Punto de entrada del microservicio.

Sprint 2 (US-07): endpoint /predecir-riesgo que carga el modelo entrenado
(model.pkl, generado por train_model.py) y explica cada prediccion con SHAP
(TreeExplainer, el mas simple/rapido para Random Forest).

Corre `python train_model.py` antes de levantar este servicio si model.pkl
todavia no existe (o si el Dockerfile no lo hace por vos en el build).
"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
import shap
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="SIGMA ML Service")

MODEL_PATH = Path(__file__).parent / "model.pkl"

_modelo = None
_features: list[str] = []
_explainer = None


def _cargar_modelo() -> None:
    global _modelo, _features, _explainer
    if not MODEL_PATH.exists():
        return
    data = joblib.load(MODEL_PATH)
    _modelo = data["modelo"]
    _features = data["features"]
    _explainer = shap.TreeExplainer(_modelo)


_cargar_modelo()


# ---- Contratos de entrada/salida ----------------------------------------

class DetalleParaPrediccion(BaseModel):
    codigo_tpsns: Optional[str] = Field(
        None, description="Solo referencia para logs, no se usa como feature"
    )
    cantidad: float = Field(..., gt=0)
    valor_unitario_solicitado: float = Field(..., ge=0)
    valor_unitario_oficial: Optional[float] = Field(
        None, description="Null si el codigo fue rechazado o no tiene catalogo"
    )
    veces_repetido_beneficiario: int = Field(
        1, ge=1, description="Cuantas veces aparece este codigo para el mismo beneficiario"
    )


class ShapContribucion(BaseModel):
    feature: str
    valor: float
    contribucion: float


class PrediccionRiesgoResponse(BaseModel):
    score: float
    label: str
    shap_values: list[ShapContribucion]


# ---- Feature engineering --------------------------------------------------

# Sin valor oficial (codigo rechazado / sin catalogo) ya es sospechoso de por
# si -> se castiga con un ratio alto en vez de romper la division.
RATIO_SIN_OFICIAL = 5.0


def _construir_features(detalle: DetalleParaPrediccion) -> dict:
    if detalle.valor_unitario_oficial and detalle.valor_unitario_oficial > 0:
        ratio_valor = detalle.valor_unitario_solicitado / detalle.valor_unitario_oficial
    else:
        ratio_valor = RATIO_SIN_OFICIAL
    return {
        "ratio_valor": ratio_valor,
        "cantidad": detalle.cantidad,
        "veces_repetido_beneficiario": float(detalle.veces_repetido_beneficiario),
    }


def _label_desde_score(score: float) -> str:
    """Mapea la probabilidad de anomalia al enum NivelRiesgo del backend."""
    if score < 0.25:
        return "BAJO"
    if score < 0.50:
        return "MEDIO"
    if score < 0.75:
        return "ALTO"
    return "CRITICO"


def _extraer_contribuciones_shap(shap_raw, features: list[str]) -> np.ndarray:
    """
    Normaliza la salida de shap.TreeExplainer.shap_values(), que varia segun
    version de la libreria: puede ser una lista [clase0, clase1] o un array
    (n_samples, n_features, n_clases).
    """
    if isinstance(shap_raw, list):
        return np.asarray(shap_raw[1][0])
    shap_raw = np.asarray(shap_raw)
    if shap_raw.ndim == 3:
        return shap_raw[0, :, 1]
    return shap_raw[0]


# ---- Endpoints -------------------------------------------------------------

@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "model_loaded": _modelo is not None,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/predecir-riesgo", response_model=PrediccionRiesgoResponse)
def predecir_riesgo(detalle: DetalleParaPrediccion) -> PrediccionRiesgoResponse:
    if _modelo is None or _explainer is None:
        raise HTTPException(
            status_code=503,
            detail="Modelo no cargado. Corre train_model.py para generar model.pkl.",
        )

    feats = _construir_features(detalle)
    X = np.array([[feats[f] for f in _features]])

    score = float(_modelo.predict_proba(X)[0][1])
    label = _label_desde_score(score)

    shap_raw = _explainer.shap_values(X)
    contribuciones = _extraer_contribuciones_shap(shap_raw, _features)

    shap_values = [
        ShapContribucion(
            feature=feature,
            valor=feats[feature],
            contribucion=float(contribuciones[i]),
        )
        for i, feature in enumerate(_features)
    ]
    shap_values.sort(key=lambda s: abs(s.contribucion), reverse=True)

    return PrediccionRiesgoResponse(score=score, label=label, shap_values=shap_values)
