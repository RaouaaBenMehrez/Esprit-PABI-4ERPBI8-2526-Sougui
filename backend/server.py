from flask import Flask, jsonify, request
from flask_cors import CORS
import psycopg2
import psycopg2.extras
import pandas as pd
import bcrypt
import os
import sys
import pickle
import numpy as np
from datetime import datetime, timedelta
import time
import logging
import random
import json
import math

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# ─── Logging structuré ───────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger('sougui')

# ─── Prometheus Metrics (via prometheus_client direct) ───────────────────────
# On n'utilise PAS prometheus_flask_exporter pour éviter les conflits
# de double-initialisation avec debug=True. On expose /metrics manuellement.
from prometheus_client import (
    Gauge, Counter, Histogram, Summary,
    CONTENT_TYPE_LATEST, generate_latest, REGISTRY,
    CollectorRegistry
)
from flask import Response as FlaskResponse

# ─── Compteurs HTTP (remplacent flask_exporter) ───────────────────────────────
HTTP_REQUESTS = Counter(
    'flask_http_request_total',
    'Nombre total de requêtes HTTP',
    ['method', 'path', 'status']
)
HTTP_LATENCY = Histogram(
    'flask_http_request_duration_seconds',
    'Durée des requêtes HTTP en secondes',
    ['method', 'path'],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)

# ─── Métriques ML ─────────────────────────────────────────────────────────────
MODEL_ACCURACY     = Gauge('sougui_model_accuracy',        'Accuracy courante du modèle',              ['model_name'])
MODEL_CONFIDENCE   = Gauge('sougui_model_confidence',      'Confidence moyenne des prédictions',       ['model_name'])
DRIFT_SCORE        = Gauge('sougui_drift_score',           'Score de dérive des données (0=stable)')
BASELINE_DEVIATION = Gauge('sougui_baseline_deviation_pct','Déviation vs baseline en %',               ['model_name'])
RETRAIN_COUNTER    = Counter('sougui_retrain_total',       'Nb total de réentraînements')
RETRAIN_ERRORS     = Counter('sougui_retrain_errors_total','Nb d\'erreurs de réentraînement')
DATA_MISSING_VALUES  = Gauge('sougui_data_missing_values', 'Valeurs manquantes détectées')
DATA_FRESHNESS_HOURS = Gauge('sougui_data_freshness_hours','Ancienneté des données (heures)')
APP_INFO           = Gauge('sougui_app_info',              'Informations sur l\'application', ['version', 'project'])

# Initialisation des valeurs baseline
MODEL_ACCURACY.labels(model_name='xgboost').set(0.97)
MODEL_ACCURACY.labels(model_name='random_forest').set(0.94)
MODEL_ACCURACY.labels(model_name='prophet').set(0.89)
MODEL_CONFIDENCE.labels(model_name='xgboost').set(0.95)
MODEL_CONFIDENCE.labels(model_name='kmeans').set(0.88)
DRIFT_SCORE.set(0.0)
BASELINE_DEVIATION.labels(model_name='xgboost').set(0.0)
BASELINE_DEVIATION.labels(model_name='prophet').set(0.0)
DATA_MISSING_VALUES.set(0)
DATA_FRESHNESS_HOURS.set(0)
APP_INFO.labels(version='1.0.0', project='Sougui-BI').set(1)
PROMETHEUS_AVAILABLE = True
logger.info('[Prometheus] Métriques initialisées — endpoint : /metrics')

# ─── Middleware : enregistrer chaque requête HTTP ─────────────────────────────
@app.before_request
def before_request_timer():
    request._start_time = time.time()

@app.after_request
def after_request_metrics(response):
    try:
        duration = time.time() - getattr(request, '_start_time', time.time())
        path = request.path
        # Simplifier les chemins dynamiques pour éviter l'explosion de labels
        if path.startswith('/api/predict/'):
            path = '/api/predict/*'
        HTTP_REQUESTS.labels(
            method=request.method, path=path, status=str(response.status_code)
        ).inc()
        HTTP_LATENCY.labels(method=request.method, path=path).observe(duration)
    except Exception:
        pass
    return response

# ─── Baselines de référence ───────────────────────────────────────────────────
BASELINES = {
    'xgboost_accuracy':   0.97,
    'rf_accuracy':        0.94,
    'prophet_mae':        3500.0,
    'kmeans_silhouette':  0.62,
    'max_latency_ms':     500,
    'max_error_rate_pct': 5.0,
    'min_confidence_pct': 70.0,
}

# ─── MLflow (optionnel) ───────────────────────────────────────────────────────
try:
    import mlflow
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from mlflow_config import setup_mlflow, get_tracking_uri, MLFLOW_EXPERIMENT_NAME
    MLFLOW_AVAILABLE = True
except ImportError:
    MLFLOW_AVAILABLE = False

# ─── Reconnaissance Faciale — Helpers ───────────────────────────────────────
def _normalize_face_descriptor(descriptor):
    """Valide et normalise un vecteur facial (128 dimensions attendues)."""
    if isinstance(descriptor, str):
        try:
            descriptor = json.loads(descriptor)
        except (TypeError, ValueError):
            return None
    if not isinstance(descriptor, list) or len(descriptor) < 64:
        return None
    normalized = []
    for value in descriptor:
        try:
            normalized.append(float(value))
        except (TypeError, ValueError):
            return None
    return normalized


def _face_distance(desc_a, desc_b):
    """Distance euclidienne entre deux vecteurs faciaux."""
    a = np.array(desc_a, dtype=np.float32)
    b = np.array(desc_b, dtype=np.float32)
    if a.shape != b.shape:
        return math.inf
    return float(np.linalg.norm(a - b))


def ensure_face_auth_schema():
    """Ajoute la colonne face_descriptor à la table users si elle n'existe pas."""
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS face_descriptor JSONB"
        )
        conn.commit()
        conn.close()
        logger.info('[FaceAuth] Colonne face_descriptor vérifiée dans users.')
    except Exception as e:
        logger.warning(f'[FaceAuth] Impossible de préparer face_descriptor: {e}')


# ─── Configuration PostgreSQL ────────────────────────────────────────────────
DB_CONFIG = {
    "host":     os.getenv("PG_HOST",     "localhost"),
    "port":     int(os.getenv("PG_PORT", 5432)),
    "dbname":   os.getenv("PG_DB",       "sougui_db"),
    "user":     os.getenv("PG_USER",     "postgres"),
    "password": os.getenv("PG_PASSWORD", "postgres"),
}

def get_db():
    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = False
    return conn

def fetch_df(query, params=None):
    conn = get_db()
    try:
        df = pd.read_sql_query(query, conn, params=params)
        return df
    finally:
        conn.close()

def fetch_rows(query, params=None):
    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(query, params or [])
        return cur.fetchall()
    finally:
        conn.close()

# ─── Chargement des modèles ML ───────────────────────────────────────────────
# Chemin absolu vers le dossier Modeles (à la racine du projet)
MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'models'))

print(f"[INFO] Dossier des modèles : {MODELS_DIR}")

def load_model(filename):
    path = os.path.join(MODELS_DIR, filename)
    if not os.path.exists(path):
        print(f"[WARN] Fichier introuvable : {path}")
        return None
    try:
        with open(path, 'rb') as f:
            model = pickle.load(f)
        print(f"[OK] Modèle chargé : {filename}")
        return model
    except Exception as e:
        print(f"[WARN] Impossible de charger {filename}: {e}")
        return None

models = {}
_models_loaded = False

def get_models():
    global models, _models_loaded
    if not _models_loaded:
        models = {
            "prophet_ca":         load_model("prophet_ca_total_v2.pkl"),
            "rf_regression":      load_model("rf_regression_v1.pkl"),
            "rf_classification":  load_model("rf_classification_v1.pkl"),
            "xgb_regression":     load_model("xgb_regression_v1.pkl"),
            "xgb_classification": load_model("xgb_classification_v1.pkl"),
            "kmeans_rfm":         load_model("kmeans_rfm_v2.pkl"),
            "scaler_regression":  load_model("scaler_regression_v1.pkl"),
            "le_statut":          load_model("le_statut_v1.pkl"),
        }
        _models_loaded = True
        ok = sum(1 for v in models.values() if v is not None)
        print(f"[INFO] {ok}/{len(models)} modèles ML chargés avec succès.")
    return models

# Préchauffage au démarrage
with app.app_context():
    ensure_face_auth_schema()
    get_models()

# ─── Accueil ─────────────────────────────────────────────────────────────────
@app.route('/', methods=['GET'])
def index():
    return jsonify({
        "api":     "Sougui BI Suite — Backend Flask",
        "version": "1.0.0",
        "status":  "✅ en ligne",
        "routes": [
            "POST /api/login",
            "GET  /api/dashboard",
            "GET  /api/sales",
            "GET  /api/clients",
            "GET  /api/products",
            "GET  /api/predict/ca",
            "POST /api/predict/client",
            "POST /api/predict/ca-regression",
            "POST /api/predict/rfm",
            "GET  /api/predict/diagnostic",
            "GET  /api/health",
        ]
    })

# ─── Auth ────────────────────────────────────────────────────────────────────
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    if not data:
        return jsonify({"success": False, "message": "Données manquantes"}), 400

    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    rows = fetch_rows("SELECT id, password, role FROM users WHERE username = %s", (username,))
    if not rows:
        return jsonify({"success": False, "message": "Identifiants invalides"}), 401

    row = rows[0]
    stored_hash = row['password']
    if isinstance(stored_hash, str):
        stored_hash = stored_hash.encode('utf-8')

    if bcrypt.checkpw(password.encode('utf-8'), stored_hash):
        return jsonify({
            "success": True,
            "user": {"id": row['id'], "username": username, "role": row['role'] or 'admin'}
        })
    return jsonify({"success": False, "message": "Identifiants invalides"}), 401


# ─── Face Auth — Enrôlement ───────────────────────────────────────────────────
@app.route('/api/face/enroll', methods=['POST'])
def enroll_face():
    """Enregistre le descripteur facial d'un utilisateur après vérification par mot de passe."""
    data = request.json or {}
    username   = (data.get('username') or '').strip()
    password   = (data.get('password') or '').strip()
    descriptor = _normalize_face_descriptor(data.get('descriptor'))

    if not username or not password or descriptor is None:
        return jsonify({"success": False, "message": "Données invalides (username, password, descriptor requis)"}), 400

    rows = fetch_rows("SELECT id, password, role FROM users WHERE username = %s", (username,))
    if not rows:
        return jsonify({"success": False, "message": "Utilisateur introuvable"}), 404

    row = rows[0]
    stored_hash = row['password']
    if isinstance(stored_hash, str):
        stored_hash = stored_hash.encode('utf-8')

    if not bcrypt.checkpw(password.encode('utf-8'), stored_hash):
        return jsonify({"success": False, "message": "Mot de passe invalide"}), 401

    # Enregistrer le descripteur facial
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE users SET face_descriptor = %s::jsonb WHERE id = %s",
            (json.dumps(descriptor), row['id'])
        )
        conn.commit()
        logger.info(f'[FaceAuth] Visage enrôlé pour {username} (role={row["role"]})')
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": f"Erreur DB : {str(e)}"}), 500
    finally:
        conn.close()

    return jsonify({"success": True, "message": f"Visage enregistré avec succès pour {username}"})


# ─── Face Auth — Login facial ─────────────────────────────────────────────────
@app.route('/api/login/face', methods=['POST'])
def login_face():
    """Authentifie un utilisateur par reconnaissance faciale (tous rôles supportés)."""
    data = request.json or {}
    expected_role = (data.get('role') or '').strip()  # Optionnel : filtrer par rôle
    descriptor    = _normalize_face_descriptor(data.get('descriptor'))

    if descriptor is None:
        return jsonify({"success": False, "message": "Empreinte faciale invalide ou absente"}), 400

    # Récupérer tous les utilisateurs ayant un visage enrôlé
    rows = fetch_rows(
        "SELECT id, username, role, face_descriptor FROM users WHERE face_descriptor IS NOT NULL"
    )

    # Filtrer par rôle si spécifié
    if expected_role:
        rows = [r for r in rows if (r.get('role') or 'admin') == expected_role]

    if not rows:
        return jsonify({"success": False, "message": "Aucun visage enregistré"}), 404

    # Trouver le visage le plus proche
    best_user     = None
    best_distance = math.inf

    for row in rows:
        stored_desc = row.get('face_descriptor')
        if stored_desc is None:
            continue
        stored_desc = _normalize_face_descriptor(stored_desc)
        if stored_desc is None:
            continue
        distance = _face_distance(descriptor, stored_desc)
        if distance < best_distance:
            best_distance = distance
            best_user = row

    # Seuil empirique compatible avec face-api.js (embeddings 128D)
    MAX_DISTANCE = 0.50
    if best_user is None or best_distance > MAX_DISTANCE:
        logger.warning(f'[FaceAuth] Visage non reconnu — distance={best_distance:.3f} (seuil={MAX_DISTANCE})')
        return jsonify({"success": False, "message": "Visage non reconnu"}), 401

    logger.info(f'[FaceAuth] Login réussi pour {best_user["username"]} (distance={best_distance:.3f})')
    return jsonify({
        "success": True,
        "user": {
            "id":       best_user['id'],
            "username": best_user['username'],
            "role":     best_user.get('role') or 'admin'
        }
    })


# ─── Dashboard ───────────────────────────────────────────────────────────────
@app.route('/api/dashboard', methods=['GET'])
def get_dashboard_data():
    sales_df = fetch_df("SELECT amount, channel, date FROM sales")

    if sales_df.empty:
        return jsonify({"error": "Aucune donnée de vente"}), 204

    total_ca     = float(sales_df['amount'].sum())
    total_orders = len(sales_df)
    b2b_revenue  = float(sales_df[sales_df['channel'] == 'B2B']['amount'].sum())
    b2c_revenue  = float(sales_df[sales_df['channel'].isin(['E-commerce', 'Vente Physique'])]['amount'].sum())

    sales_df['date'] = pd.to_datetime(sales_df['date'])
    monthly_sa = (
        sales_df.set_index('date')
                .resample('ME')['amount']
                .sum()
                .reset_index()
    )
    monthly_sa['name'] = monthly_sa['date'].dt.strftime('%b %Y')
    main_chart = monthly_sa[['name', 'amount']].rename(columns={'amount': 'value'}).to_dict('records')

    canal_summary = sales_df.groupby('channel')['amount'].sum().reset_index()
    canal_summary.columns = ['name', 'value']
    canal_data = canal_summary.to_dict('records')

    season_df = sales_df.copy()
    season_df['month_name'] = season_df['date'].dt.strftime('%B')
    seasonality = (
        season_df.groupby('month_name')['amount']
                 .sum()
                 .reset_index()
                 .sort_values('amount', ascending=False)
    )
    seasonality.columns = ['name', 'value']
    season_data = seasonality.head(5).to_dict('records')

    ratio = round(b2b_revenue / total_ca, 2) if total_ca > 0 else 0

    return jsonify({
        "kpis": [
            {"label": "CA Total",          "value": f"{total_ca/1000:,.1f}",     "unit": "K DT",  "icon": "Gift"},
            {"label": "Transactions",      "value": str(total_orders),           "unit": "",      "icon": "Handshake"},
            {"label": "Revenue B2B",       "value": f"{b2b_revenue/1000:,.2f}",  "unit": "K DT",  "icon": "Users"},
            {"label": "Revenue B2C",       "value": f"{b2c_revenue/1000:,.2f}",  "unit": "K DT",  "icon": "ShieldCheck"},
        ],
        "total_ca":    total_ca,
        "ratio":       ratio,
        "mainChart":   main_chart,
        "canalData":   canal_data,
        "seasonality": season_data,
        "insights": [
            {"label": "Pic Saisonnier",  "text": f"Meilleur mois : {season_data[0]['name']} ({season_data[0]['value']:,.0f} DT)."},
            {"label": "Performance",     "text": f"B2C représente {(b2c_revenue/total_ca*100):.1f}% de l'activité."},
            {"label": "Alerte",          "text": f"Ratio dépendance B2B : {ratio}. Diversifiez vers B2C."}
        ]
    })

# ─── Ventes ──────────────────────────────────────────────────────────────────
@app.route('/api/sales', methods=['GET'])
def get_sales():
    rows = fetch_rows(
        "SELECT id, date::text, amount, channel, client_id, profit FROM sales ORDER BY date DESC LIMIT 200"
    )
    return jsonify([dict(r) for r in rows])

# ─── Clients ─────────────────────────────────────────────────────────────────
@app.route('/api/clients', methods=['GET'])
def get_clients():
    rows = fetch_rows(
        "SELECT id, name, type, total_spent, rfm_segment FROM clients ORDER BY total_spent DESC"
    )
    return jsonify([dict(r) for r in rows])

# ─── Produits ────────────────────────────────────────────────────────────────
@app.route('/api/products', methods=['GET'])
def get_products():
    rows = fetch_rows(
        "SELECT id, code, name, category, price, stock FROM products WHERE price > 0 AND is_active = TRUE"
    )
    return jsonify([dict(r) for r in rows])

# ─── Prédictions ML ──────────────────────────────────────────────────────────
@app.route('/api/predict/ca', methods=['GET'])
def predict_ca():
    """Prévision du CA mensuel avec Prophet sur les 6 prochains mois."""
    m = get_models()
    prophet_model = m.get("prophet_ca")

    if prophet_model is None:
        return jsonify({"error": "Modèle Prophet non disponible. Vérifiez le dossier Modeles/."}), 503

    try:
        # Générer 6 mois futurs à partir de la dernière date connue du modèle
        last_date = prophet_model.history['ds'].max()
        future = prophet_model.make_future_dataframe(periods=6, freq='MS')
        forecast = prophet_model.predict(future)

        # Sélectionner uniquement les 6 lignes strictement après la dernière date d'entraînement
        future_only = forecast[forecast['ds'] > last_date][['ds', 'yhat', 'yhat_lower', 'yhat_upper']].head(6)

        if future_only.empty:
            # Fallback : prendre les 6 dernières lignes du forecast
            future_only = forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].tail(6)

        result = []
        for _, row in future_only.iterrows():
            result.append({
                "mois":       row['ds'].strftime('%b %Y'),
                "prediction": round(max(0, float(row['yhat'])), 2),
                "min":        round(max(0, float(row['yhat_lower'])), 2),
                "max":        round(max(0, float(row['yhat_upper'])), 2),
            })

        return jsonify({"model": "Prophet", "predictions": result, "horizon": "6 mois"})
    except Exception as e:
        return jsonify({"error": f"Erreur Prophet : {str(e)}"}), 500

@app.route('/api/predict/client', methods=['POST'])
def predict_client():
    """Prédit le statut/segment d'un client via XGBoost Classification."""
    data = request.json or {}
    m = get_models()
    model = m.get("xgb_classification")
    le    = m.get("le_statut")

    if model is None:
        return jsonify({"error": "Modèle XGBoost Classification non disponible. Vérifiez Modeles/xgb_classification_v1.pkl"}), 503

    try:
        features = np.array([[
            float(data.get("recence", 30)),
            float(data.get("frequence", 5)),
            float(data.get("montant_total", 500)),
            float(data.get("panier_moyen", 100)),
        ]])
        pred = model.predict(features)[0]

        # Décoder le label
        # le_statut_v1.pkl contient soit le.classes_ (array), soit un LabelEncoder
        if le is not None:
            try:
                import numpy as _np
                if isinstance(le, _np.ndarray):
                    # C'est directement le tableau des classes
                    idx = int(pred)
                    label = str(le[idx]) if idx < len(le) else str(pred)
                elif hasattr(le, 'inverse_transform'):
                    label = str(le.inverse_transform([int(pred)])[0])
                else:
                    label = str(pred)
            except Exception:
                label = str(pred)
        else:
            label = str(pred)

        # Probabilités
        try:
            proba = model.predict_proba(features)[0]
            confidence = round(float(max(proba)) * 100, 1)
        except Exception:
            confidence = None

        return jsonify({
            "model":       "XGBoost Classification",
            "segment":     label,
            "confidence":  confidence,
            "input":       data,
        })
    except Exception as e:
        return jsonify({"error": f"Erreur XGBoost : {str(e)}"}), 500

@app.route('/api/predict/ca-regression', methods=['POST'])
def predict_ca_regression():
    """Prédit le CA d'une vente via RandomForest Regression."""
    data = request.json or {}
    m = get_models()
    model  = m.get("rf_regression")
    scaler = m.get("scaler_regression")

    if model is None:
        return jsonify({"error": "Modèle RF Regression non disponible. Vérifiez Modeles/rf_regression_v1.pkl"}), 503

    try:
        features = np.array([[
            float(data.get("recence", 30)),
            float(data.get("frequence", 5)),
            float(data.get("montant_total", 500)),
        ]])
        # Vérifier que le scaler est bien un objet sklearn (pas un numpy array)
        if scaler is not None and hasattr(scaler, 'transform'):
            try:
                features = scaler.transform(features)
            except Exception as se:
                print(f"[WARN] Scaler non applicable : {se}")
        pred = float(model.predict(features)[0])

        return jsonify({
            "model":       "RandomForest Regression",
            "ca_predit":   round(pred, 2),
            "input":       data,
        })
    except Exception as e:
        return jsonify({"error": f"Erreur RF Regression : {str(e)}"}), 503

@app.route('/api/predict/rfm', methods=['POST'])
def predict_rfm():
    """Segmentation RFM KMeans."""
    data = request.json or {}
    m = get_models()
    bundle = m.get("kmeans_rfm")
    
    if bundle is None:
        return jsonify({"error": "Modèle KMeans RFM non disponible. Vérifiez Modeles/kmeans_rfm_v2.pkl"}), 503

    try:
        features = np.array([[
            float(data.get("recence", 30)),
            float(data.get("frequence", 5)),
            float(data.get("montant_total", 500)),
        ]])
        
        if isinstance(bundle, dict):
            km = bundle.get('kmeans')
            scaler = bundle.get('scaler')
            if scaler is not None:
                features = scaler.transform(features)
            cluster = int(km.predict(features)[0])
        else:
            cluster = int(bundle.predict(features)[0])

        segments = {
            0: "Clients Fidèles",
            1: "Clients à Risque",
            2: "Nouveaux Clients",
            3: "Champions",
            4: "Actifs",
        }
        label = segments.get(cluster, f"Segment {cluster}")

        return jsonify({
            "model":   "KMeans RFM",
            "cluster": cluster,
            "segment": label,
            "input":   data,
        })
    except Exception as e:
        return jsonify({"error": f"Erreur KMeans : {str(e)}"}), 500

# ─── Diagnostic des modèles ───────────────────────────────────────────────────
@app.route('/api/predict/diagnostic', methods=['GET'])
def predict_diagnostic():
    """Vérifie l'état de chaque modèle avec détails."""
    m = get_models()
    details = {}
    for name, mod in m.items():
        if mod is None:
            path = os.path.join(MODELS_DIR, f"{name}.pkl")
            # Chercher le bon nom de fichier
            details[name] = {
                "loaded": False,
                "error": f"Non chargé — vérifiez que le fichier .pkl existe dans {MODELS_DIR}",
                "type": None,
            }
        else:
            details[name] = {
                "loaded": True,
                "type": type(mod).__name__,
                "error": None,
            }

    all_ok = all(v["loaded"] for v in details.values())
    loaded_count = sum(1 for v in details.values() if v["loaded"])
    total = len(details)

    return jsonify({
        "all_ok": all_ok,
        "summary": f"{loaded_count}/{total} modèles disponibles",
        "models_dir": MODELS_DIR,
        "dir_exists": os.path.exists(MODELS_DIR),
        "models": details,
    })

# ─── Predict status (simple) ──────────────────────────────────────────────────
@app.route('/api/predict/status', methods=['GET'])
def predict_status():
    """Vérifie la disponibilité de tous les modèles."""
    m = get_models()
    status = {name: (mod is not None) for name, mod in m.items()}
    all_ok = all(status.values())
    return jsonify({"all_ok": all_ok, "models": status})

# ─── Rechargement forcé des modèles ──────────────────────────────────────────
@app.route('/api/reload-models', methods=['POST'])
def reload_models_endpoint():
    """Force le rechargement de tous les modèles ML depuis le disque."""
    global models, _models_loaded
    _models_loaded = False
    m = get_models()
    ok = sum(1 for v in m.values() if v is not None)
    return jsonify({
        "success":       True,
        "message":       f"{ok}/{len(m)} modèles rechargés depuis {MODELS_DIR}",
        "models_loaded": f"{ok}/{len(m)}",
        "status":        {name: (type(mod).__name__ if mod is not None else None) for name, mod in m.items()},
    })

# ─── Health ───────────────────────────────────────────────────────────────────
@app.route('/api/health', methods=['GET'])
def health():
    try:
        conn = get_db()
        conn.close()
        db_ok = True
    except Exception as e:
        db_ok = False

    m = get_models()
    models_ok = sum(1 for v in m.values() if v is not None)

    return jsonify({
        "status":         "ok" if db_ok else "degraded",
        "database":       "PostgreSQL ✅" if db_ok else "❌ Non connecté",
        "models_loaded":  f"{models_ok}/{len(m)}",
        "models_dir":     MODELS_DIR,
    })

@app.route('/api/retrain', methods=['POST'])
def retrain_models():
    """Pipeline ML complet : preprocessing → training → evaluation → saving → MLflow logging.
    Lance 2 runs successifs (baseline + optimisé) pour comparaison MLflow.
    """
    import subprocess

    script_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        'scripts', 'retrain_models.py'
    )

    if not os.path.exists(script_path):
        return jsonify({'success': False, 'error': f'Script introuvable : {script_path}'}), 404

    results = []
    try:
        for run_id in [1, 2]:  # Run 1 = baseline, Run 2 = optimisé
            res = subprocess.run(
                [sys.executable, script_path, '--run-id', str(run_id)],
                capture_output=True,
                text=True,
                cwd=os.path.dirname(os.path.abspath(__file__)),
                timeout=300
            )
            results.append({
                'run_id':    run_id,
                'success':   res.returncode == 0,
                'stdout':    res.stdout[-3000:] if res.stdout else '',
                'stderr':    res.stderr[-1000:] if res.stderr else '',
                'exit_code': res.returncode,
            })

        # Recharger les modèles en mémoire après réentraînement
        global _models_loaded
        _models_loaded = False
        get_models()

        all_ok = all(r['success'] for r in results)
        return jsonify({
            'success':   all_ok,
            'message':   'Pipeline ML terminé — 2 runs MLflow enregistrés' if all_ok else 'Certains runs ont échoué',
            'runs':      results,
            'mlflow_ui': 'Lancez : mlflow ui  dans le dossier backend/',
        })

    except subprocess.TimeoutExpired:
        return jsonify({'success': False, 'error': 'Timeout (>5min) — réentraînement trop long'}), 504
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ─── MLflow — Liste des runs ───────────────────────────────────────────────────
@app.route('/api/mlflow-runs', methods=['GET'])
def get_mlflow_runs():
    """Retourne les derniers runs MLflow (max 20) pour comparaison."""
    if not MLFLOW_AVAILABLE:
        return jsonify({'error': 'MLflow non disponible', 'runs': []}), 200

    try:
        setup_mlflow()
        client = mlflow.tracking.MlflowClient(tracking_uri=get_tracking_uri())
        experiment = client.get_experiment_by_name(MLFLOW_EXPERIMENT_NAME)

        if experiment is None:
            return jsonify({'runs': [], 'message': 'Aucun run MLflow — lancez /api/retrain'})

        runs = client.search_runs(
            experiment_ids=[experiment.experiment_id],
            order_by=['start_time DESC'],
            max_results=20
        )

        runs_data = []
        for r in runs:
            runs_data.append({
                'run_id':      r.info.run_id,
                'run_name':    r.data.tags.get('mlflow.runName', r.info.run_id[:8]),
                'status':      r.info.status,
                'start_time':  r.info.start_time,
                'description': r.data.tags.get('description', ''),
                'run_number':  r.data.tags.get('run_number', '?'),
                'data_source': r.data.tags.get('data_source', '?'),
                'metrics':     dict(r.data.metrics),
                'params':      {k: v for k, v in r.data.params.items() if not k.startswith('xgb_')},
            })

        return jsonify({
            'experiment': MLFLOW_EXPERIMENT_NAME,
            'total_runs': len(runs_data),
            'runs':       runs_data,
            'mlflow_ui':  f'mlflow ui --backend-store-uri {get_tracking_uri()}',
        })

    except Exception as e:
        return jsonify({'error': str(e), 'runs': []}), 500


# ─── Versions des modèles ─────────────────────────────────────────────────────
@app.route('/api/models/versions', methods=['GET'])
def get_model_versions():
    """Liste toutes les versions de modèles disponibles dans le dossier models/."""
    if not os.path.exists(MODELS_DIR):
        return jsonify({'error': f'Dossier models/ introuvable : {MODELS_DIR}'}), 404

    files = []
    for fname in sorted(os.listdir(MODELS_DIR)):
        if not fname.endswith('.pkl'):
            continue
        fpath = os.path.join(MODELS_DIR, fname)
        stat  = os.stat(fpath)
        # Déterminer le type de modèle
        model_type = 'unknown'
        for key in ['prophet', 'kmeans', 'xgb', 'rf', 'scaler', 'le_statut']:
            if key in fname.lower():
                model_type = key
                break
        # Extraire la version et le timestamp depuis le nom
        parts = fname.replace('.pkl', '').split('_')
        version_tag = next((p for p in parts if p.startswith('v') and p[1:].isdigit()), 'v?')
        timestamp   = '_'.join(p for p in parts if p.isdigit() and len(p) >= 6) or 'current'

        files.append({
            'filename':    fname,
            'model_type':  model_type,
            'version':     version_tag,
            'timestamp':   timestamp,
            'size_kb':     round(stat.st_size / 1024, 1),
            'modified':    datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S'),
            'is_current':  not any(c.isdigit() and len(c) == 8 for c in parts),
        })

    # Grouper par type de modèle
    by_type = {}
    for f in files:
        mt = f['model_type']
        by_type.setdefault(mt, []).append(f)

    return jsonify({
        'models_dir':    MODELS_DIR,
        'total_files':   len(files),
        'files':         files,
        'by_type':       by_type,
    })

# ─── Monitoring / Drift Detection ────────────────────────────────────────────
@app.route('/api/monitoring/drift', methods=['GET'])
def monitoring_drift():
    """
    Calcule un score de dérive des données en comparant la distribution
    actuelle des ventes aux valeurs de référence (baseline).
    """
    try:
        import sqlite3
        SQLITE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sougui_suite.db')
        conn = sqlite3.connect(SQLITE_PATH)
        df = pd.read_sql_query("SELECT amount FROM sales ORDER BY date DESC LIMIT 100", conn)
        conn.close()

        if df.empty:
            return jsonify({'drift_detected': False, 'reason': 'Pas de données', 'drift_score': 0.0})

        # Valeurs baseline (issues du 1er run d'entraînement)
        baseline_mean = 25000.0
        baseline_std  = 12000.0

        current_mean = float(df['amount'].mean())
        current_std  = float(df['amount'].std())

        # Score de dérive : écart normalisé entre baseline et actuel
        mean_drift = abs(current_mean - baseline_mean) / baseline_mean
        std_drift  = abs(current_std  - baseline_std)  / baseline_std
        drift_score = round((mean_drift + std_drift) / 2, 4)
        drift_detected = drift_score > 0.15  # Seuil : 15%

        if PROMETHEUS_AVAILABLE:
            DRIFT_SCORE.set(drift_score)

        if drift_detected:
            logger.warning(f'[DRIFT] Score={drift_score:.3f} — Dérive détectée ! mean={current_mean:.0f} vs baseline={baseline_mean:.0f}')
        else:
            logger.info(f'[DRIFT] Score={drift_score:.3f} — Données stables')

        return jsonify({
            'drift_detected':  drift_detected,
            'drift_score':     drift_score,
            'threshold':       0.15,
            'current_mean':    round(current_mean, 2),
            'current_std':     round(current_std, 2),
            'baseline_mean':   baseline_mean,
            'baseline_std':    baseline_std,
            'mean_drift_pct':  round(mean_drift * 100, 2),
            'std_drift_pct':   round(std_drift * 100, 2),
            'recommendation':  'Réentraîner les modèles' if drift_detected else 'Modèles stables — aucune action requise',
            'timestamp':       datetime.now().isoformat(),
        })
    except Exception as e:
        logger.error(f'[DRIFT] Erreur analyse : {e}')
        return jsonify({'error': str(e)}), 500


@app.route('/api/monitoring/metrics-summary', methods=['GET'])
def metrics_summary():
    """Résumé JSON des métriques clés pour Grafana (complément de /metrics)."""
    m = get_models()
    models_ok = sum(1 for v in m.values() if v is not None)
    return jsonify({
        'timestamp':         datetime.now().isoformat(),
        'models_loaded':     models_ok,
        'models_total':      len(m),
        'baselines':         BASELINES,
        'prometheus_active': PROMETHEUS_AVAILABLE,
    })


@app.route('/api/simulate/drift', methods=['POST'])
def simulate_drift():
    """
    Scénario de simulation : injecte une dérive artificielle dans les métriques
    pour démontrer le système d'alertes Prometheus/Grafana.
    """
    data = request.json or {}
    scenario = data.get('scenario', 'drift')  # 'drift' | 'accuracy_drop' | 'high_latency'

    if scenario == 'drift':
        if PROMETHEUS_AVAILABLE:
            DRIFT_SCORE.set(0.45)
            BASELINE_DEVIATION.labels(model_name='prophet').set(22.0)
        logger.warning('[SIMULATION] Scénario DRIFT activé — Score=0.45 (seuil=0.15)')
        return jsonify({'scenario': 'drift', 'drift_score': 0.45, 'message': 'Dérive simulée injectée'})

    elif scenario == 'accuracy_drop':
        if PROMETHEUS_AVAILABLE:
            MODEL_ACCURACY.labels(model_name='xgboost').set(0.71)  # chute de 97% → 71%
            BASELINE_DEVIATION.labels(model_name='xgboost').set(26.0)
        logger.warning('[SIMULATION] Scénario ACCURACY_DROP — XGBoost 97%→71%')
        return jsonify({'scenario': 'accuracy_drop', 'accuracy': 0.71, 'message': 'Chute d\'accuracy simulée'})

    elif scenario == 'reset':
        if PROMETHEUS_AVAILABLE:
            MODEL_ACCURACY.labels(model_name='xgboost').set(0.97)
            MODEL_ACCURACY.labels(model_name='random_forest').set(0.94)
            DRIFT_SCORE.set(0.0)
            BASELINE_DEVIATION.labels(model_name='xgboost').set(0.0)
            BASELINE_DEVIATION.labels(model_name='prophet').set(0.0)
        logger.info('[SIMULATION] Reset — retour aux valeurs baseline')
        return jsonify({'scenario': 'reset', 'message': 'Métriques remises aux valeurs baseline'})

    return jsonify({'error': f'Scénario inconnu : {scenario}. Valeurs : drift | accuracy_drop | reset'}), 400


@app.route('/api/simulate/high-traffic', methods=['POST'])
def simulate_high_traffic():
    """
    Simule un pic de trafic en faisant 50 prédictions rapides.
    Cela génère des métriques de latence élevées dans Prometheus.
    """
    m = get_models()
    results = []
    start = time.time()
    for i in range(50):
        t0 = time.time()
        try:
            xgb = m.get('xgb_classification')
            if xgb:
                feat = np.array([[random.uniform(1,365), random.uniform(1,30),
                                  random.uniform(100,50000), random.uniform(10,500)]])
                pred = xgb.predict(feat)[0]
                results.append({'ok': True, 'pred': int(pred), 'ms': round((time.time()-t0)*1000, 1)})
        except Exception as ex:
            results.append({'ok': False, 'error': str(ex)})
    total_ms = round((time.time() - start) * 1000, 1)
    logger.info(f'[SIMULATION] High Traffic — 50 prédictions en {total_ms}ms')
    return jsonify({
        'scenario':     'high_traffic',
        'requests':     50,
        'total_ms':     total_ms,
        'avg_ms':       round(total_ms / 50, 1),
        'success_rate': f"{sum(1 for r in results if r.get('ok'))/50*100:.0f}%",
    })


@app.route('/api/simulate/api-errors', methods=['POST'])
def simulate_api_errors():
    """
    Simule des erreurs API — 30% des requêtes retournent 500.
    Visible comme spike dans Grafana (http_requests_total{status=~'5..'}).
    """
    logger.error('[SIMULATION] API Error simulée — code 500 injecté')
    return jsonify({'error': 'Erreur simulée pour test Grafana', 'scenario': 'api_errors'}), 500


@app.route('/metrics', methods=['GET'])
def prometheus_metrics():
    """Endpoint Prometheus — exposé pour scraping toutes les 10s."""
    return FlaskResponse(generate_latest(REGISTRY), mimetype=CONTENT_TYPE_LATEST)


if __name__ == '__main__':
    # debug=False pour éviter la double-initialisation des métriques Prometheus
    app.run(port=5000, debug=False, use_reloader=False)
