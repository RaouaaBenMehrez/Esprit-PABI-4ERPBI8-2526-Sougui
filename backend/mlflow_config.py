# -*- coding: utf-8 -*-
"""
mlflow_config.py — Configuration centralisée MLflow pour Sougui BI Suite
Tracking URI : dossier local mlruns/ (pas de serveur distant requis)
"""

import os
import mlflow

# ─── Chemins ─────────────────────────────────────────────────────────────────
# Répertoire racine du backend (là où ce fichier se trouve)
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))

# Dossier de tracking MLflow (sera créé automatiquement s'il n'existe pas)
MLFLOW_TRACKING_DIR = os.path.join(BACKEND_DIR, "mlruns")

# Dossier des modèles ML
MODELS_DIR = os.path.abspath(os.path.join(BACKEND_DIR, "..", "models"))

# ─── Configuration MLflow ─────────────────────────────────────────────────────
MLFLOW_EXPERIMENT_NAME = "Sougui_BI_ML_Pipeline"

def setup_mlflow():
    """Configure MLflow avec le tracking URI local et retourne l'experiment_id."""
    # URI locale — pas besoin d'un serveur MLflow externe
    mlflow.set_tracking_uri(f"file:///{MLFLOW_TRACKING_DIR.replace(os.sep, '/')}")
    
    # Créer ou récupérer l'expérience
    experiment = mlflow.get_experiment_by_name(MLFLOW_EXPERIMENT_NAME)
    if experiment is None:
        experiment_id = mlflow.create_experiment(
            MLFLOW_EXPERIMENT_NAME,
            tags={
                "project": "Sougui BI Suite",
                "team": "4BI8",
                "version": "1.0"
            }
        )
    else:
        experiment_id = experiment.experiment_id

    mlflow.set_experiment(MLFLOW_EXPERIMENT_NAME)
    return experiment_id


def get_tracking_uri():
    """Retourne l'URI de tracking MLflow configuré."""
    return f"file:///{MLFLOW_TRACKING_DIR.replace(os.sep, '/')}"


def get_latest_run(model_name: str = None):
    """Retourne les infos du dernier run MLflow (ou du dernier run pour un modèle donné)."""
    try:
        client = mlflow.tracking.MlflowClient(tracking_uri=get_tracking_uri())
        experiment = client.get_experiment_by_name(MLFLOW_EXPERIMENT_NAME)
        if experiment is None:
            return None

        runs = client.search_runs(
            experiment_ids=[experiment.experiment_id],
            order_by=["start_time DESC"],
            max_results=1
        )
        if runs:
            run = runs[0]
            return {
                "run_id":    run.info.run_id,
                "status":    run.info.status,
                "start_time": run.info.start_time,
                "metrics":   dict(run.data.metrics),
                "params":    dict(run.data.params),
                "tags":      dict(run.data.tags),
            }
    except Exception as e:
        print(f"[MLflow] Erreur get_latest_run: {e}")
    return None
