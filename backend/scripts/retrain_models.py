# -*- coding: utf-8 -*-
"""
retrain_models.py -- Pipeline ML Complet Sougui BI Suite
========================================================
Étapes :
  1. Preprocessing  : lecture BDD PostgreSQL (ou SQLite en fallback), nettoyage
  2. Training       : entraînement Prophet CA, XGBoost Classification, KMeans RFM
  3. Evaluation     : calcul des métriques (MAE, Accuracy, Inertia)
  4. Saving         : sauvegarde versionnée des .pkl (timestamp)
  5. MLflow Logging : paramètres, métriques, artefacts — 2 runs comparables

Usage :
  python backend/scripts/retrain_models.py
  python backend/scripts/retrain_models.py --run-id 2   (pour le 2ème run)
"""

import os
import sys
import pickle
import argparse
import sqlite3
from datetime import datetime

import numpy as np
import pandas as pd

# Force UTF-8 output on Windows (evite UnicodeEncodeError cp1252)
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# ─── Ajout du dossier backend au path (pour importer mlflow_config) ───────────
SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
sys.path.insert(0, BACKEND_DIR)

# ─── Config chemins ───────────────────────────────────────────────────────────
MODELS_DIR  = os.path.abspath(os.path.join(BACKEND_DIR, "..", "models"))
SQLITE_PATH = os.path.join(BACKEND_DIR, "sougui_suite.db")
os.makedirs(MODELS_DIR, exist_ok=True)

# ─── MLflow setup ─────────────────────────────────────────────────────────────
try:
    import mlflow
    from mlflow_config import setup_mlflow, MLFLOW_EXPERIMENT_NAME
    MLFLOW_AVAILABLE = True
except ImportError:
    MLFLOW_AVAILABLE = False
    print("[WARN] MLflow non disponible — tracking désactivé")

# ─── Arguments CLI ────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser(description="Sougui ML Retraining Pipeline")
parser.add_argument("--run-id",   type=int, default=1, help="Numéro du run (1=baseline, 2=optimisé)")
parser.add_argument("--no-mlflow", action="store_true", help="Désactiver MLflow")
args, _ = parser.parse_known_args()

USE_MLFLOW = MLFLOW_AVAILABLE and not args.no_mlflow
RUN_NUMBER = args.run_id

print("=" * 65)
print(f"  SOUGUI BI — Pipeline ML Complet  (Run #{RUN_NUMBER})")
print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 65)

# ─── Timestamp pour le versionnage des fichiers ───────────────────────────────
TIMESTAMP = datetime.now().strftime("%Y%m%d_%H%M%S")


# ══════════════════════════════════════════════════════════════════════════════
# 1. PREPROCESSING — Lecture des données
# ══════════════════════════════════════════════════════════════════════════════
print("\n[STEP 1/4] Preprocessing — Chargement des données...")

def load_data():
    """Charge les données depuis PostgreSQL (priorité) ou SQLite (fallback)."""
    # Essai PostgreSQL
    try:
        import psycopg2
        from dotenv import load_dotenv
        load_dotenv(os.path.join(BACKEND_DIR, ".env"))

        conn = psycopg2.connect(
            host=os.getenv("PG_HOST", "localhost"),
            port=int(os.getenv("PG_PORT", 5432)),
            dbname=os.getenv("PG_DB", "sougui_db"),
            user=os.getenv("PG_USER", "postgres"),
            password=os.getenv("PG_PASSWORD", "postgres"),
        )
        df_sales   = pd.read_sql_query("SELECT date, amount FROM sales ORDER BY date", conn)
        df_clients = pd.read_sql_query("""
            SELECT c.id, c.total_spent,
                   COALESCE(COUNT(s.id), 1)::float  AS frequence,
                   COALESCE(MIN(CURRENT_DATE - s.date::date), 180)::float AS recence
            FROM clients c
            LEFT JOIN sales s ON s.client_id = c.id
            GROUP BY c.id, c.total_spent
        """, conn)
        conn.close()
        print("   [OK] Données PostgreSQL chargées")
        return df_sales, df_clients, "postgresql"

    except Exception as pg_err:
        print(f"   [WARN] PostgreSQL inaccessible : {pg_err}")

    # Fallback SQLite
    if os.path.exists(SQLITE_PATH):
        try:
            conn = sqlite3.connect(SQLITE_PATH)
            df_sales   = pd.read_sql_query("SELECT date, amount FROM sales ORDER BY date", conn)
            df_clients = pd.read_sql_query("SELECT id, total_spent FROM clients", conn)
            df_clients["frequence"] = np.random.randint(1, 20, len(df_clients)).astype(float)
            df_clients["recence"]   = np.random.randint(1, 365, len(df_clients)).astype(float)
            conn.close()
            print("   [OK] Données SQLite (fallback) chargées")
            return df_sales, df_clients, "sqlite"
        except Exception as sq_err:
            print(f"   [WARN] SQLite inaccessible : {sq_err}")

    # Données synthétiques de secours
    print("   [WARN] Génération de données synthétiques")
    np.random.seed(42 + RUN_NUMBER)
    dates = pd.date_range("2023-01-01", periods=24, freq="MS")
    amounts = np.random.uniform(8000, 50000, 24)
    df_sales = pd.DataFrame({"date": dates, "amount": amounts})

    n = 200
    df_clients = pd.DataFrame({
        "id":          range(n),
        "total_spent": np.random.uniform(100, 50000, n),
        "frequence":   np.random.uniform(1, 30, n),
        "recence":     np.random.uniform(1, 365, n),
    })
    return df_sales, df_clients, "synthetic"


df_sales, df_clients, data_source = load_data()
print(f"   Ventes       : {len(df_sales)} lignes  ({data_source})")
print(f"   Clients      : {len(df_clients)} lignes")


# ══════════════════════════════════════════════════════════════════════════════
# 2. TRAINING — Entraînement des modèles (paramètres selon le run)
# ══════════════════════════════════════════════════════════════════════════════
print(f"\n[STEP 2/4] Training — Run #{RUN_NUMBER}...")

# ─── Paramètres selon le run (Run 1 = baseline, Run 2 = optimisé) ─────────────
if RUN_NUMBER == 1:
    # Run 1 — Paramètres de base (baseline)
    prophet_params = {
        "yearly_seasonality":  True,
        "weekly_seasonality":  False,
        "daily_seasonality":   False,
        "seasonality_mode":    "additive",
        "changepoint_prior_scale": 0.05,
    }
    kmeans_params   = {"n_clusters": 4, "n_init": 10, "max_iter": 300, "random_state": 42}
    xgb_params      = {
        "n_estimators": 100, "max_depth": 4, "learning_rate": 0.1,
        "subsample": 0.8, "colsample_bytree": 0.8, "random_state": 42,
        "eval_metric": "mlogloss",
    }
    run_description = "Baseline — paramètres standards"
else:
    # Run 2 — Paramètres optimisés
    prophet_params = {
        "yearly_seasonality":  True,
        "weekly_seasonality":  False,
        "daily_seasonality":   False,
        "seasonality_mode":    "multiplicative",
        "changepoint_prior_scale": 0.15,
    }
    kmeans_params   = {"n_clusters": 5, "n_init": 20, "max_iter": 500, "random_state": 0}
    xgb_params      = {
        "n_estimators": 200, "max_depth": 6, "learning_rate": 0.05,
        "subsample": 0.9, "colsample_bytree": 0.9, "random_state": 0,
        "eval_metric": "mlogloss",
    }
    run_description = "Optimisé — meilleure régularisation et profondeur"

metrics_log   = {}  # métriques à logger dans MLflow
params_log    = {}  # paramètres à logger dans MLflow
artifacts_log = []  # chemins des .pkl générés

# ─────────────────────────────────────────────────────────────────────────────
# 2-A. Prophet CA Forecast
# ─────────────────────────────────────────────────────────────────────────────
print("\n  [2-A] Prophet CA Forecast...")
try:
    from prophet import Prophet

    df_sales["date"] = pd.to_datetime(df_sales["date"])
    df_monthly = (
        df_sales.groupby(df_sales["date"].dt.to_period("M"))["amount"]
        .sum()
        .reset_index()
    )
    df_monthly["date"] = df_monthly["date"].dt.to_timestamp()
    df_prophet = df_monthly.rename(columns={"date": "ds", "amount": "y"})

    print(f"     Données d'entraînement : {len(df_prophet)} mois")

    model_prophet = Prophet(**prophet_params)
    model_prophet.fit(df_prophet)

    # Évaluation : MAE sur les 3 derniers mois connus
    future_eval = model_prophet.make_future_dataframe(periods=0, freq="MS")
    forecast_eval = model_prophet.predict(future_eval)
    merged = df_prophet.merge(forecast_eval[["ds", "yhat"]], on="ds", how="inner")
    mae_prophet = float(np.mean(np.abs(merged["y"] - merged["yhat"])))
    rmse_prophet = float(np.sqrt(np.mean((merged["y"] - merged["yhat"]) ** 2)))

    # Test prévision 6 mois
    future_6m = model_prophet.make_future_dataframe(periods=6, freq="MS")
    forecast_6m = model_prophet.predict(future_6m)
    next_6m = forecast_6m["yhat"].tail(6).clip(lower=0).tolist()
    print(f"     MAE  = {mae_prophet:,.2f} DT   |   RMSE = {rmse_prophet:,.2f} DT")
    print(f"     Prévisions 6 mois : {[round(v,0) for v in next_6m]}")

    # Sauvegarde versionnée
    fname_prophet = f"prophet_ca_total_v{RUN_NUMBER}_{TIMESTAMP}.pkl"
    path_prophet  = os.path.join(MODELS_DIR, fname_prophet)
    # Aussi sauvegarder sous le nom "courant" pour que l'API le charge
    path_current  = os.path.join(MODELS_DIR, "prophet_ca_total_v2.pkl")
    with open(path_prophet, "wb") as f:
        pickle.dump(model_prophet, f)
    with open(path_current, "wb") as f:
        pickle.dump(model_prophet, f)
    print(f"     Sauvegarde -> {fname_prophet}")

    metrics_log["prophet_mae"]  = mae_prophet
    metrics_log["prophet_rmse"] = rmse_prophet
    params_log.update({f"prophet_{k}": str(v) for k, v in prophet_params.items()})
    artifacts_log.append(path_prophet)

except Exception as e:
    print(f"     ERREUR Prophet : {e}")
    import traceback; traceback.print_exc()
    metrics_log["prophet_mae"] = -1

# ─────────────────────────────────────────────────────────────────────────────
# 2-B. KMeans RFM Segmentation
# ─────────────────────────────────────────────────────────────────────────────
print("\n  [2-B] KMeans RFM Segmentation...")
try:
    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler
    from sklearn.metrics import silhouette_score

    # Préparer les features RFM
    X_rfm = df_clients[["recence", "frequence", "total_spent"]].fillna(0).values.astype(float)

    if len(X_rfm) < kmeans_params["n_clusters"]:
        # Données synthétiques si pas assez de clients
        np.random.seed(42)
        n = 400
        rec  = np.concatenate([np.random.uniform(1, 30, 100),   np.random.uniform(30, 120, 100),
                                np.random.uniform(120, 270, 100), np.random.uniform(270, 365, 100)])
        freq = np.concatenate([np.random.uniform(15, 50, 100),  np.random.uniform(5, 20, 100),
                                np.random.uniform(2, 8, 100),    np.random.uniform(1, 3, 100)])
        amt  = np.concatenate([np.random.uniform(5000, 50000, 100), np.random.uniform(1000, 8000, 100),
                                np.random.uniform(200, 1500, 100),   np.random.uniform(50, 400, 100)])
        X_rfm = np.column_stack([rec, freq, amt])
        print(f"     Données synthétiques utilisées : {len(X_rfm)} points")
    else:
        print(f"     Données réelles : {len(X_rfm)} clients")

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_rfm)

    n_clusters = kmeans_params["n_clusters"]
    km = KMeans(
        n_clusters=n_clusters,
        n_init=kmeans_params["n_init"],
        max_iter=kmeans_params["max_iter"],
        random_state=kmeans_params["random_state"]
    )
    km.fit(X_scaled)

    inertia = float(km.inertia_)
    try:
        sil_score = float(silhouette_score(X_scaled, km.labels_))
    except Exception:
        sil_score = 0.0

    print(f"     Inertia       = {inertia:,.2f}")
    print(f"     Silhouette    = {sil_score:.4f}")
    print(f"     Clusters      : {dict(zip(*np.unique(km.labels_, return_counts=True)))}")

    # Bundle avec scaler (pour que l'API puisse prédire)
    bundle = {"kmeans": km, "scaler": scaler}

    fname_kmeans = f"kmeans_rfm_v{RUN_NUMBER}_{TIMESTAMP}.pkl"
    path_kmeans  = os.path.join(MODELS_DIR, fname_kmeans)
    path_current = os.path.join(MODELS_DIR, "kmeans_rfm_v2.pkl")
    with open(path_kmeans, "wb") as f:
        pickle.dump(bundle, f)
    with open(path_current, "wb") as f:
        pickle.dump(bundle, f)
    print(f"     Sauvegarde -> {fname_kmeans}")

    metrics_log["kmeans_inertia"]   = inertia
    metrics_log["kmeans_silhouette"] = sil_score
    params_log.update({f"kmeans_{k}": str(v) for k, v in kmeans_params.items()})
    artifacts_log.append(path_kmeans)

except Exception as e:
    print(f"     ERREUR KMeans : {e}")
    import traceback; traceback.print_exc()
    metrics_log["kmeans_inertia"] = -1

# ─────────────────────────────────────────────────────────────────────────────
# 2-C. XGBoost Classification (segments clients)
# ─────────────────────────────────────────────────────────────────────────────
print("\n  [2-C] XGBoost Classification...")
try:
    from xgboost import XGBClassifier
    from sklearn.preprocessing import LabelEncoder
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score, f1_score

    np.random.seed(42 + RUN_NUMBER)
    n_per_seg = 100

    # Données synthétiques réalistes par segment
    segments_data = {
        "Champions":         ([1, 30],  [15, 50], [5000, 50000], [200, 600]),
        "Clients Fideles":   ([30, 90], [8, 20],  [1500, 10000], [100, 300]),
        "Actifs":            ([20, 60], [5, 15],  [500, 3000],   [60, 200]),
        "Clients a Risque":  ([180, 365],[1, 4],  [100, 800],    [20, 100]),
        "Nouveaux Clients":  ([1, 15],  [1, 2],   [50, 400],     [10, 80]),
    }

    all_X, all_y = [], []
    for seg_name, (rec_r, freq_r, amt_r, basket_r) in segments_data.items():
        n = n_per_seg
        X_seg = np.column_stack([
            np.random.uniform(rec_r[0],    rec_r[1],    n),
            np.random.uniform(freq_r[0],   freq_r[1],   n),
            np.random.uniform(amt_r[0],    amt_r[1],    n),
            np.random.uniform(basket_r[0], basket_r[1], n),
        ])
        all_X.append(X_seg)
        all_y.extend([seg_name] * n)

    X_all = np.vstack(all_X)
    y_all = np.array(all_y)

    le = LabelEncoder()
    y_enc = le.fit_transform(y_all)

    X_train, X_test, y_train, y_test = train_test_split(
        X_all, y_enc, test_size=0.2, random_state=42, stratify=y_enc
    )

    clf = XGBClassifier(**xgb_params)
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    acc    = float(accuracy_score(y_test, y_pred))
    f1     = float(f1_score(y_test, y_pred, average="weighted"))

    print(f"     Accuracy      = {acc * 100:.2f}%")
    print(f"     F1-Score      = {f1:.4f}")
    print(f"     Classes       : {list(le.classes_)}")

    # Sauvegarde
    fname_xgb = f"xgb_classification_v{RUN_NUMBER}_{TIMESTAMP}.pkl"
    fname_le  = f"le_statut_v{RUN_NUMBER}_{TIMESTAMP}.pkl"
    path_xgb  = os.path.join(MODELS_DIR, fname_xgb)
    path_le   = os.path.join(MODELS_DIR, fname_le)

    with open(path_xgb, "wb") as f:
        pickle.dump(clf, f)
    with open(path_le, "wb") as f:
        pickle.dump(le.classes_, f)
    # Fichiers courants pour l'API
    with open(os.path.join(MODELS_DIR, "xgb_classification_v1.pkl"), "wb") as f:
        pickle.dump(clf, f)
    with open(os.path.join(MODELS_DIR, "le_statut_v1.pkl"), "wb") as f:
        pickle.dump(le.classes_, f)
    print(f"     Sauvegarde -> {fname_xgb}")

    metrics_log["xgb_accuracy"] = acc
    metrics_log["xgb_f1_score"] = f1
    params_log.update({f"xgb_{k}": str(v) for k, v in xgb_params.items()})
    artifacts_log.extend([path_xgb, path_le])

except Exception as e:
    print(f"     ERREUR XGBoost : {e}")
    import traceback; traceback.print_exc()
    metrics_log["xgb_accuracy"] = -1


# ══════════════════════════════════════════════════════════════════════════════
# 3. EVALUATION — Résumé des métriques
# ══════════════════════════════════════════════════════════════════════════════
print("\n[STEP 3/4] Evaluation — Résumé des métriques...")
print(f"   Prophet MAE         : {metrics_log.get('prophet_mae', 'N/A'):>12}")
print(f"   Prophet RMSE        : {metrics_log.get('prophet_rmse', 'N/A'):>12}")
print(f"   KMeans Inertia      : {metrics_log.get('kmeans_inertia', 'N/A'):>12}")
print(f"   KMeans Silhouette   : {metrics_log.get('kmeans_silhouette', 'N/A'):>12}")
print(f"   XGBoost Accuracy    : {metrics_log.get('xgb_accuracy', 'N/A'):>12}")
print(f"   XGBoost F1-Score    : {metrics_log.get('xgb_f1_score', 'N/A'):>12}")


# ══════════════════════════════════════════════════════════════════════════════
# 4. MLflow LOGGING — Enregistrement du run
# ══════════════════════════════════════════════════════════════════════════════
print("\n[STEP 4/4] MLflow — Logging du run...")

if USE_MLFLOW:
    try:
        setup_mlflow()

        with mlflow.start_run(run_name=f"Run_{RUN_NUMBER}_{TIMESTAMP}") as run:
            # Tags descriptifs
            mlflow.set_tags({
                "run_number":    str(RUN_NUMBER),
                "description":   run_description,
                "data_source":   data_source,
                "n_sales":       str(len(df_sales)),
                "n_clients":     str(len(df_clients)),
                "pipeline_step": "preprocessing → training → evaluation → saving",
            })

            # Log des paramètres
            mlflow.log_params(params_log)
            mlflow.log_param("data_source",   data_source)
            mlflow.log_param("timestamp",     TIMESTAMP)
            mlflow.log_param("run_number",    RUN_NUMBER)

            # Log des métriques
            for metric_name, metric_val in metrics_log.items():
                if metric_val != -1:
                    mlflow.log_metric(metric_name, metric_val)

            # Log des artefacts (.pkl)
            for art_path in artifacts_log:
                if os.path.exists(art_path):
                    mlflow.log_artifact(art_path, artifact_path="models")

            run_id = run.info.run_id
            print(f"   [OK] Run MLflow enregistré !")
            print(f"   Run ID    : {run_id}")
            print(f"   Artefacts : {len(artifacts_log)} fichiers .pkl loggués")
            print(f"\n   Pour voir les runs : mlflow ui --backend-store-uri {run.info.artifact_uri.split('artifacts')[0].replace('mlflow-artifacts:/', '')}")

    except Exception as mlflow_err:
        print(f"   [WARN] Erreur MLflow : {mlflow_err}")
        import traceback; traceback.print_exc()
else:
    print("   [INFO] MLflow désactivé pour ce run")


# ══════════════════════════════════════════════════════════════════════════════
# RÉSUMÉ FINAL
# ══════════════════════════════════════════════════════════════════════════════
ok_count   = sum(1 for v in metrics_log.values() if v != -1)
fail_count = sum(1 for v in metrics_log.values() if v == -1)

print("\n" + "=" * 65)
print(f"  Pipeline terminé — Run #{RUN_NUMBER}")
print(f"  Modèles OK   : {len(artifacts_log)} fichiers sauvegardés")
print(f"  Métriques OK : {ok_count} / {ok_count + fail_count}")
print("=" * 65)
print("\nVersions disponibles dans models/ :")
for fname in sorted(os.listdir(MODELS_DIR)):
    size = os.path.getsize(os.path.join(MODELS_DIR, fname))
    print(f"   {fname:<50} ({size/1024:.1f} KB)")

print(f"\n[DONE] Pipeline Run #{RUN_NUMBER} terminé avec succès !")
if RUN_NUMBER == 1:
    print("       -> Lancez le Run 2 : python backend/scripts/retrain_models.py --run-id 2")
    print("       -> Visualisez MLflow : mlflow ui (dans le dossier backend/)")
