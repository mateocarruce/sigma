"""
SIGMA - Entrenamiento del modelo de deteccion de anomalias (Sprint 2 / US-05, US-06)

Genera un dataset SINTETICO (no hay datos historicos reales etiquetados del
hospital) a partir de reglas de negocio conocidas de anomalia:

  1. Valor solicitado muy alejado del valor oficial      -> ratio_valor
  2. Cantidad atipica en una sola linea                   -> cantidad
  3. Codigo repetido en exceso para el mismo beneficiario -> veces_repetido_beneficiario

Entrena un RandomForestClassifier binario (0 = normal, 1 = anomalo) y lo
guarda en model.pkl junto con la lista de features, para que main.py lo
cargue sin tener que reentrenar en cada arranque.

LIMITACION CONOCIDA (documentar en la tesis): el hospital no cuenta con
datos historicos reales etiquetados de fraude/error, por lo que el modelo
se entrena sobre datos sinteticos generados con estas reglas. Trabajo
futuro: reentrenar con datos reales una vez existan auditorias etiquetadas.

Uso:
    python train_model.py
"""
from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split

RANDOM_STATE = 42
OUT_DIR = Path(__file__).parent
MODEL_PATH = OUT_DIR / "model.pkl"
DATASET_PATH = OUT_DIR / "dataset_sintetico.csv"

FEATURES = ["ratio_valor", "cantidad", "veces_repetido_beneficiario"]

rng = np.random.default_rng(RANDOM_STATE)


def _normales(n: int) -> pd.DataFrame:
    return pd.DataFrame({
        "ratio_valor": np.clip(rng.normal(1.0, 0.05, n), 0.85, 1.15),
        "cantidad": (rng.poisson(2, n) + 1).astype(float),
        "veces_repetido_beneficiario": rng.integers(1, 3, n).astype(float),
        "label": 0,
    })


def _anomalas_valor(n: int) -> pd.DataFrame:
    """Valor solicitado muy alejado del valor oficial (por arriba o por abajo)."""
    mitad = n // 2
    alto = rng.uniform(3.0, 12.0, mitad)
    bajo = rng.uniform(0.05, 0.3, n - mitad)
    return pd.DataFrame({
        "ratio_valor": np.concatenate([alto, bajo]),
        "cantidad": (rng.poisson(2, n) + 1).astype(float),
        "veces_repetido_beneficiario": rng.integers(1, 3, n).astype(float),
        "label": 1,
    })


def _anomalas_cantidad(n: int) -> pd.DataFrame:
    """Cantidad atipica en una sola linea de detalle."""
    return pd.DataFrame({
        "ratio_valor": np.clip(rng.normal(1.0, 0.05, n), 0.85, 1.15),
        "cantidad": rng.uniform(30, 150, n),
        "veces_repetido_beneficiario": rng.integers(1, 3, n).astype(float),
        "label": 1,
    })


def _anomalas_repeticion(n: int) -> pd.DataFrame:
    """Codigo repetido en exceso para el mismo beneficiario."""
    return pd.DataFrame({
        "ratio_valor": np.clip(rng.normal(1.0, 0.05, n), 0.85, 1.15),
        "cantidad": (rng.poisson(2, n) + 1).astype(float),
        "veces_repetido_beneficiario": rng.uniform(8, 30, n),
        "label": 1,
    })


def _anomalas_combinadas(n: int) -> pd.DataFrame:
    """Caso mas evidente: los tres factores fuera de rango a la vez."""
    return pd.DataFrame({
        "ratio_valor": rng.uniform(4.0, 15.0, n),
        "cantidad": rng.uniform(40, 200, n),
        "veces_repetido_beneficiario": rng.uniform(10, 30, n),
        "label": 1,
    })


def generar_dataset(n_normal: int = 3000, n_anomalo_por_tipo: int = 250) -> pd.DataFrame:
    df = pd.concat([
        _normales(n_normal),
        _anomalas_valor(n_anomalo_por_tipo),
        _anomalas_cantidad(n_anomalo_por_tipo),
        _anomalas_repeticion(n_anomalo_por_tipo),
        _anomalas_combinadas(n_anomalo_por_tipo),
    ], ignore_index=True)
    return df.sample(frac=1, random_state=RANDOM_STATE).reset_index(drop=True)


def main() -> None:
    df = generar_dataset()
    df.to_csv(DATASET_PATH, index=False)
    print(f"Dataset sintetico generado: {len(df)} filas -> {DATASET_PATH.name}")
    print(df["label"].value_counts().rename({0: "normal", 1: "anomalo"}))

    X = df[FEATURES]
    y = df["label"]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=RANDOM_STATE
    )

    modelo = RandomForestClassifier(
        n_estimators=200,
        max_depth=6,
        random_state=RANDOM_STATE,
        class_weight="balanced",
    )
    modelo.fit(X_train, y_train)

    y_pred = modelo.predict(X_test)
    print("\n--- Reporte de clasificacion (holdout 20%) ---")
    print(classification_report(y_test, y_pred, target_names=["normal", "anomalo"]))

    joblib.dump({"modelo": modelo, "features": FEATURES}, MODEL_PATH)
    print(f"Modelo guardado en {MODEL_PATH.name}")


if __name__ == "__main__":
    main()
