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
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

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
    """Prépare toutes les tables/colonnes nécessaires au démarrage."""
    try:
        conn = get_db()
        cur = conn.cursor()
        # Colonne visage
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS face_descriptor JSONB")
        # Colonne email
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(150)")
        # Colonne avatar (base64 ou URL)
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT")
        # Colonne permissions (JSONB) — droits granulaires par utilisateur
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB")
        # Table notifications
        cur.execute("""
            CREATE TABLE IF NOT EXISTS notifications (
                id          SERIAL PRIMARY KEY,
                user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title       VARCHAR(200) NOT NULL,
                message     TEXT NOT NULL,
                type        VARCHAR(30) DEFAULT 'info',
                is_read     BOOLEAN DEFAULT FALSE,
                created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # Table paramètres application (clé/valeur)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS app_settings (
                key   VARCHAR(100) PRIMARY KEY,
                value TEXT
            )
        """)
        conn.commit()
        conn.close()
        logger.info('[Setup] Schéma DB vérifié (notifications, app_settings, face_descriptor).')
    except Exception as e:
        logger.warning(f'[Setup] Erreur schéma DB: {e}')


# ─── Configuration PostgreSQL (app DB) ───────────────────────────────────────
DB_CONFIG = {
    "host":     os.getenv("PG_HOST",     "localhost"),
    "port":     int(os.getenv("PG_PORT", 5432)),
    "dbname":   os.getenv("PG_DB",       "sougui_db"),
    "user":     os.getenv("PG_USER",     "postgres"),
    "password": os.getenv("PG_PASSWORD", "postgres"),
}

# ─── Configuration PostgreSQL (DWH Constellation) ────────────────────────────
DWH_CONFIG = {
    "host":     os.getenv("DWH_HOST",     "localhost"),
    "port":     int(os.getenv("DWH_PORT", 5432)),
    "dbname":   os.getenv("DWH_DB",       "Sougui_DWH"),
    "user":     os.getenv("DWH_USER",     "postgres"),
    "password": os.getenv("DWH_PASSWORD", "postgres"),
}

def get_db():
    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = False
    return conn

def get_dwh():
    """Connexion vers le Data Warehouse Constellation Sougui_DWH."""
    conn = psycopg2.connect(**DWH_CONFIG)
    conn.autocommit = True
    return conn

def fetch_dwh(query, params=None):
    """Exécute une requête analytique sur le DWH et retourne un DataFrame."""
    conn = get_dwh()
    try:
        return pd.read_sql_query(query, conn, params=params)
    except Exception as e:
        logger.warning(f'[DWH] Requete echouee: {e}')
        return pd.DataFrame()
    finally:
        conn.close()

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


# ─── Helpers Email Gmail ─────────────────────────────────────────────────────
def _get_email_config():
    try:
        rows = fetch_rows("SELECT key, value FROM app_settings WHERE key IN ('gmail_sender','gmail_password')")
        return {r['key']: r['value'] for r in rows}
    except Exception:
        return {}

def _send_gmail(to_email, subject, body_html):
    cfg      = _get_email_config()
    sender   = cfg.get('gmail_sender')
    password = cfg.get('gmail_password')
    if not sender or not password or not to_email:
        logger.warning('[Email] Config Gmail incomplète — email non envoyé')
        return False
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From']    = sender
        msg['To']      = to_email
        msg.attach(MIMEText(body_html, 'html', 'utf-8'))
        with smtplib.SMTP_SSL('smtp.gmail.com', 465, timeout=10) as srv:
            srv.login(sender, password)
            srv.sendmail(sender, to_email, msg.as_string())
        logger.info(f'[Email] Envoyé à {to_email}: {subject}')
        return True
    except Exception as e:
        logger.error(f'[Email] Erreur: {e}')
        return False

def _push_notification(user_id, title, message, notif_type='info', send_email=True):
    """Crée une notif en DB + envoie email si l'user a un Gmail configuré."""
    try:
        conn = get_db()
        cur  = conn.cursor()
        cur.execute(
            "INSERT INTO notifications (user_id, title, message, type) VALUES (%s,%s,%s,%s)",
            (user_id, title, message, notif_type)
        )
        conn.commit()
        if send_email:
            cur.execute("SELECT email, username FROM users WHERE id = %s", (user_id,))
            row = cur.fetchone()
            if row and row[0]:
                body = f"""<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;
background:#05080f;color:#e8eef8;padding:32px;border-radius:12px;">
  <h1 style="color:#4d7fff;font-size:24px;margin:0 0 8px;">Sougui BI Suite</h1>
  <p style="color:#4d6080;font-size:11px;margin:0 0 24px;">Notification automatique</p>
  <div style="background:rgba(30,90,255,0.08);border:1px solid rgba(30,90,255,0.2);
border-radius:10px;padding:24px;">
    <h2 style="color:#e8eef8;margin:0 0 12px;">{title}</h2>
    <p style="color:#a0b0cc;line-height:1.7;margin:0;">{message}</p>
  </div>
  <p style="color:#2d3f5e;font-size:10px;text-align:center;margin-top:20px;">
  Ne pas répondre · Sougui BI · ESPRIT 4ERPBI8</p>
</div>"""
                _send_gmail(row[0], f'[Sougui] {title}', body)
        conn.close()
    except Exception as e:
        logger.error(f'[Notification] {e}')


# ─── Notifications ────────────────────────────────────────────────────────────
@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    user_id = request.args.get('user_id', type=int)
    if not user_id:
        return jsonify([])
    rows = fetch_rows(
        "SELECT id, title, message, type, is_read, created_at FROM notifications "
        "WHERE user_id = %s ORDER BY created_at DESC LIMIT 50",
        (user_id,)
    )
    return jsonify([{
        'id':         r['id'],
        'title':      r['title'],
        'message':    r['message'],
        'type':       r['type'],
        'is_read':    r['is_read'],
        'created_at': r['created_at'].isoformat() if r['created_at'] else None,
    } for r in rows])

@app.route('/api/notifications/<int:nid>/read', methods=['PUT'])
def mark_notif_read(nid):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("UPDATE notifications SET is_read=TRUE WHERE id=%s", (nid,))
        conn.commit()
    finally:
        conn.close()
    return jsonify({'success': True})

@app.route('/api/notifications/read-all', methods=['PUT'])
def mark_all_notif_read():
    user_id = (request.json or {}).get('user_id')
    if not user_id:
        return jsonify({'success': False}), 400
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("UPDATE notifications SET is_read=TRUE WHERE user_id=%s", (user_id,))
        conn.commit()
    finally:
        conn.close()
    return jsonify({'success': True})


# ─── Users Management ─────────────────────────────────────────────────────────
@app.route('/api/users', methods=['GET'])
def list_users():
    rows = fetch_rows("SELECT id, username, role, email, created_at FROM users ORDER BY id")
    return jsonify([{
        'id':         r['id'],
        'username':   r['username'],
        'role':       r['role'] or 'admin',
        'email':      r.get('email') or '',
        'created_at': r['created_at'].isoformat() if r['created_at'] else None,
    } for r in rows])

@app.route('/api/users', methods=['POST'])
def create_user():
    data     = request.json or {}
    username = (data.get('username') or '').strip()
    password = (data.get('password') or '').strip()
    role     = (data.get('role') or 'commercial').strip()
    email    = (data.get('email') or '').strip()
    if not username or not password:
        return jsonify({'success': False, 'message': 'username et password requis'}), 400
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO users (username, password, role, email) VALUES (%s,%s,%s,%s) RETURNING id",
            (username, hashed, role, email or None)
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        _push_notification(new_id, 'Bienvenue sur Sougui BI',
            f'Votre compte «{username}» (rôle : {role}) a été créé.', 'success')
        return jsonify({'success': True, 'id': new_id})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400
    finally:
        conn.close()

@app.route('/api/users/<int:uid>', methods=['DELETE'])
def delete_user(uid):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM users WHERE id=%s", (uid,))
        conn.commit()
    finally:
        conn.close()
    return jsonify({'success': True})

@app.route('/api/users/<int:uid>/role', methods=['PUT'])
def change_user_role(uid):
    data       = request.json or {}
    new_role   = (data.get('role') or '').strip()
    changed_by = (data.get('changed_by') or 'CEO').strip()
    if not new_role:
        return jsonify({'success': False, 'message': 'role manquant'}), 400
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT username, role FROM users WHERE id=%s", (uid,))
        row = cur.fetchone()
        if not row:
            return jsonify({'success': False, 'message': 'Utilisateur introuvable'}), 404
        old_role = row[1]
        cur.execute("UPDATE users SET role=%s WHERE id=%s", (new_role, uid))
        conn.commit()
        _push_notification(
            uid,
            'Votre rôle a été modifié',
            f'Votre rôle a été changé de «{old_role}» vers «{new_role}» par {changed_by}.',
            'warning'
        )
    finally:
        conn.close()
    return jsonify({'success': True})


# ─── Profile (tous rôles) ─────────────────────────────────────────────────────
@app.route('/api/profile/update', methods=['PUT'])
def update_profile():
    data    = request.json or {}
    user_id = data.get('user_id')
    email   = (data.get('email') or '').strip()
    if not user_id:
        return jsonify({'success': False, 'message': 'user_id manquant'}), 400
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("UPDATE users SET email=%s WHERE id=%s", (email or None, user_id))
        conn.commit()
    finally:
        conn.close()
    return jsonify({'success': True})

@app.route('/api/profile/avatar', methods=['PUT'])
def update_avatar():
    """Met à jour la photo de profil (base64) d'un utilisateur."""
    data       = request.json or {}
    user_id    = data.get('user_id')
    avatar_b64 = (data.get('avatar') or '').strip()
    if not user_id:
        return jsonify({'success': False, 'message': 'user_id manquant'}), 400
    # Validation taille : max ~2MB base64
    if len(avatar_b64) > 2_800_000:
        return jsonify({'success': False, 'message': 'Image trop lourde (max 2 MB)'}), 400
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("UPDATE users SET avatar_url=%s WHERE id=%s", (avatar_b64 or None, user_id))
        conn.commit()
    finally:
        conn.close()
    return jsonify({'success': True})

@app.route('/api/profile/<int:user_id>', methods=['GET'])
def get_profile(user_id):
    """Retourne le profil complet d'un utilisateur (sans mot de passe)."""
    rows = fetch_rows(
        "SELECT id, username, role, email, avatar_url, permissions, created_at FROM users WHERE id=%s",
        (user_id,)
    )
    if not rows:
        return jsonify({'success': False, 'message': 'Introuvable'}), 404
    r = rows[0]
    return jsonify({
        'id':          r['id'],
        'username':    r['username'],
        'role':        r['role'] or 'admin',
        'email':       r.get('email') or '',
        'avatar_url':  r.get('avatar_url') or '',
        'permissions': r.get('permissions') or {},
        'created_at':  r['created_at'].isoformat() if r['created_at'] else None,
    })

@app.route('/api/users/<int:uid>/permissions', methods=['PUT'])
def update_user_permissions(uid):
    """Met à jour les permissions granulaires d'un utilisateur (CEO/admin only)."""
    data = request.json or {}
    perms = data.get('permissions', {})
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT username FROM users WHERE id=%s", (uid,))
        row = cur.fetchone()
        if not row:
            return jsonify({'success': False, 'message': 'Utilisateur introuvable'}), 404
        cur.execute("UPDATE users SET permissions=%s WHERE id=%s", (json.dumps(perms), uid))
        conn.commit()
        _push_notification(
            uid,
            'Vos permissions ont été mises à jour',
            f'Vos droits d\'accès ont été modifiés par l\'administrateur.',
            'info'
        )
    finally:
        conn.close()
    return jsonify({'success': True})

@app.route('/api/users/list', methods=['GET'])
def list_users_full():
    """Liste tous les utilisateurs avec avatar et permissions."""
    rows = fetch_rows(
        "SELECT id, username, role, email, avatar_url, permissions, created_at FROM users ORDER BY id"
    )
    return jsonify([{
        'id':          r['id'],
        'username':    r['username'],
        'role':        r['role'] or 'admin',
        'email':       r.get('email') or '',
        'avatar_url':  r.get('avatar_url') or '',
        'permissions': r.get('permissions') or {},
        'created_at':  r['created_at'].isoformat() if r['created_at'] else None,
    } for r in rows])

@app.route('/api/profile/password', methods=['PUT'])
def change_password():
    data         = request.json or {}
    user_id      = data.get('user_id')
    old_password = (data.get('old_password') or '').strip()
    new_password = (data.get('new_password') or '').strip()
    if not user_id or not old_password or not new_password:
        return jsonify({'success': False, 'message': 'Données incomplètes'}), 400
    rows = fetch_rows("SELECT password FROM users WHERE id=%s", (user_id,))
    if not rows:
        return jsonify({'success': False, 'message': 'Utilisateur introuvable'}), 404
    stored = rows[0]['password']
    if isinstance(stored, str):
        stored = stored.encode('utf-8')
    if not bcrypt.checkpw(old_password.encode(), stored):
        return jsonify({'success': False, 'message': 'Ancien mot de passe incorrect'}), 401
    new_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("UPDATE users SET password=%s WHERE id=%s", (new_hash, user_id))
        conn.commit()
        _push_notification(user_id, 'Mot de passe modifié',
            'Votre mot de passe a été changé avec succès.', 'success', send_email=True)
    finally:
        conn.close()
    return jsonify({'success': True})


# ─── App Settings (Power BI URLs, Gmail SMTP) ─────────────────────────────────
@app.route('/api/settings', methods=['GET'])
def get_settings():
    rows = fetch_rows("SELECT key, value FROM app_settings")
    return jsonify({r['key']: r['value'] for r in rows})

@app.route('/api/settings', methods=['PUT'])
def update_settings():
    data = request.json or {}
    conn = get_db()
    try:
        cur = conn.cursor()
        for key, value in data.items():
            cur.execute(
                "INSERT INTO app_settings (key, value) VALUES (%s,%s) "
                "ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value",
                (key, str(value))
            )
        conn.commit()
    finally:
        conn.close()
    return jsonify({'success': True})

@app.route('/api/settings/test-email', methods=['POST'])
def test_email():
    data     = request.json or {}
    to_email = (data.get('to') or '').strip()
    if not to_email:
        return jsonify({'success': False, 'message': 'Email destinataire manquant'}), 400
    ok = _send_gmail(
        to_email,
        '[Sougui] Test de notification email',
        '<div style="font-family:Arial;padding:24px;background:#05080f;color:#e8eef8;border-radius:10px;">'
        '<h2 style="color:#4d7fff;">✅ Configuration Gmail OK</h2>'
        '<p>Votre configuration email Sougui BI fonctionne correctement.</p></div>'
    )
    if ok:
        return jsonify({'success': True, 'message': 'Email test envoyé !'})
    return jsonify({'success': False, 'message': 'Échec — vérifiez la config Gmail'}), 500


# ─── Dashboard (données réelles DWH Constellation) ───────────────────────────
@app.route('/api/dashboard', methods=['GET'])
def get_dashboard_data():
    try:
        # ── Fact_Vente × Dim_Canal_Distribution ──────────────────────────────
        df = fetch_dwh("""
            SELECT
                fv.revenue,
                fv.montant_ht,
                fv.montant_ttc,
                fv.quantite,
                fv.date_key,
                COALESCE(cd.type_canal, 'B2C') AS type_canal,
                COALESCE(cd.libelle_canal, 'Autre') AS canal
            FROM fact_vente fv
            LEFT JOIN dim_canal_distribution cd ON fv.canal_key = cd.canal_key
            WHERE fv.revenue > 0
        """)

        if df.empty:
            return jsonify({"error": "Aucune donnee DWH"}), 204

        # Convertir date_key (YYYYMMDD) en datetime
        df['date'] = pd.to_datetime(df['date_key'].astype(str), format='%Y%m%d', errors='coerce')
        df = df.dropna(subset=['date'])

        # ── KPIs globaux ─────────────────────────────────────────────────────
        total_ca     = float(df['revenue'].sum())
        total_orders = len(df)
        b2b_df       = df[df['type_canal'] == 'B2B']
        b2c_df       = df[df['type_canal'] == 'B2C']
        b2b_revenue  = float(b2b_df['revenue'].sum())
        b2c_revenue  = float(b2c_df['revenue'].sum())

        # ── Évolution CA mensuelle ────────────────────────────────────────────
        monthly = (
            df.set_index('date')
              .resample('ME')['revenue']
              .sum()
              .reset_index()
        )
        monthly['name'] = monthly['date'].dt.strftime('%b %Y')
        main_chart = monthly[['name', 'revenue']].rename(columns={'revenue': 'value'}).to_dict('records')

        # ── Répartition par canal ─────────────────────────────────────────────
        canal_data = (
            df.groupby('canal')['revenue']
              .sum()
              .reset_index()
              .rename(columns={'canal': 'name', 'revenue': 'value'})
              .sort_values('value', ascending=False)
              .to_dict('records')
        )

        # ── Saisonnalité (top 5 mois par CA) ─────────────────────────────────
        df['month_name'] = df['date'].dt.strftime('%B')
        season_data = (
            df.groupby('month_name')['revenue']
              .sum()
              .reset_index()
              .rename(columns={'month_name': 'name', 'revenue': 'value'})
              .sort_values('value', ascending=False)
              .head(5)
              .to_dict('records')
        )

        ratio = round(b2b_revenue / total_ca, 2) if total_ca > 0 else 0

        return jsonify({
            "source": "Sougui_DWH",
            "kpis": [
                {"label": "CA Total",     "value": f"{total_ca/1000:,.1f}",    "unit": "K DT", "icon": "Gift"},
                {"label": "Transactions", "value": str(total_orders),          "unit": "",     "icon": "Handshake"},
                {"label": "Revenue B2B",  "value": f"{b2b_revenue/1000:,.2f}", "unit": "K DT", "icon": "Users"},
                {"label": "Revenue B2C",  "value": f"{b2c_revenue/1000:,.2f}", "unit": "K DT", "icon": "ShieldCheck"},
            ],
            "total_ca":    total_ca,
            "ratio":       ratio,
            "mainChart":   main_chart,
            "canalData":   canal_data,
            "seasonality": season_data,
            "insights": [
                {"label": "Pic Saisonnier", "text": f"Meilleur mois : {season_data[0]['name']} ({season_data[0]['value']:,.0f} DT)."},
                {"label": "Performance",    "text": f"B2C represente {(b2c_revenue/total_ca*100):.1f}% de l'activite."},
                {"label": "Alerte",         "text": f"Ratio dependance B2B : {ratio:.2f}. Diversifiez vers B2C."}
            ]
        })
    except Exception as e:
        logger.error(f'[Dashboard DWH] {e}')
        return jsonify({"error": str(e)}), 500


# ─── Ventes (Fact_Vente DWH) ─────────────────────────────────────────────────
@app.route('/api/sales', methods=['GET'])
def get_sales():
    try:
        df = fetch_dwh("""
            SELECT
                fv.vente_key          AS id,
                fv.date_key,
                fv.revenue            AS amount,
                COALESCE(cd.libelle_canal, 'Autre') AS channel,
                fv.client_key         AS client_id,
                fv.montant_ht         AS profit,
                fv.quantite,
                fv.montant_ttc
            FROM fact_vente fv
            LEFT JOIN dim_canal_distribution cd ON fv.canal_key = cd.canal_key
            WHERE fv.revenue > 0
            ORDER BY fv.date_key DESC
            LIMIT 300
        """)
        if df.empty:
            return jsonify([])
        df['date'] = pd.to_datetime(df['date_key'].astype(str), format='%Y%m%d', errors='coerce').dt.strftime('%Y-%m-%d')
        df = df.drop(columns=['date_key'])
        return jsonify(df.where(pd.notnull(df), None).to_dict('records'))
    except Exception as e:
        logger.error(f'[Sales DWH] {e}')
        return jsonify([])


# ─── Clients (Dim_Client DWH) ────────────────────────────────────────────────
@app.route('/api/clients', methods=['GET'])
def get_clients():
    try:
        df = fetch_dwh("""
            SELECT
                dc.client_key         AS id,
                dc.nom_client         AS name,
                dc.type_client        AS type,
                dc.ville,
                dc.gouvernorat,
                dc.secteur_activite,
                dc.mode_paiement,
                COALESCE(SUM(fv.revenue), 0) AS total_spent
            FROM dim_client dc
            LEFT JOIN fact_vente fv ON dc.client_key = fv.client_key
            GROUP BY dc.client_key, dc.nom_client, dc.type_client,
                     dc.ville, dc.gouvernorat, dc.secteur_activite, dc.mode_paiement
            ORDER BY total_spent DESC
        """)
        if df.empty:
            return jsonify([])
        # Simuler rfm_segment depuis total_spent
        def rfm_label(spent):
            if spent > 20000: return 'Champions'
            if spent > 5000:  return 'Clients Fideles'
            if spent > 1000:  return 'Actifs'
            if spent > 100:   return 'Nouveaux Clients'
            return 'Clients a Risque'
        df['rfm_segment'] = df['total_spent'].apply(rfm_label)
        return jsonify(df.where(pd.notnull(df), None).to_dict('records'))
    except Exception as e:
        logger.error(f'[Clients DWH] {e}')
        return jsonify([])


# ─── Produits (Dim_Produit DWH) ──────────────────────────────────────────────
@app.route('/api/products', methods=['GET'])
def get_products():
    try:
        df = fetch_dwh("""
            SELECT
                dp.produit_key   AS id,
                dp.code_produit  AS code,
                dp.libelle       AS name,
                dp.categorie     AS category,
                dp.prix_vente    AS price,
                COALESCE(SUM(fv.quantite), 0) AS total_sold
            FROM dim_produit dp
            LEFT JOIN fact_vente fv ON dp.produit_key = fv.produit_key
            WHERE dp.prix_vente > 0
            GROUP BY dp.produit_key, dp.code_produit, dp.libelle, dp.categorie, dp.prix_vente
            ORDER BY total_sold DESC
        """)
        if df.empty:
            return jsonify([])
        df['stock'] = (df['total_sold'] > 0).astype(int) * 10  # stock estimé
        df['is_active'] = True
        return jsonify(df.where(pd.notnull(df), None).to_dict('records'))
    except Exception as e:
        logger.error(f'[Products DWH] {e}')
        return jsonify([])


# ─── DWH Stats (endpoint diagnostic) ────────────────────────────────────────
@app.route('/api/dwh/stats', methods=['GET'])
def get_dwh_stats():
    """Expose les statistiques globales du Data Warehouse Constellation."""
    try:
        stats = {}

        # CA total & nb transactions
        r = fetch_dwh("SELECT COUNT(*) AS nb, SUM(revenue) AS ca FROM fact_vente WHERE revenue > 0")
        stats['transactions'] = int(r['nb'].iloc[0]) if not r.empty else 0
        stats['ca_total']     = float(r['ca'].iloc[0]) if not r.empty else 0

        # Nb achats fournisseurs
        r2 = fetch_dwh("SELECT COUNT(*) AS nb, SUM(revenue) AS total FROM fact_achat")
        stats['achats']       = int(r2['nb'].iloc[0]) if not r2.empty else 0
        stats['achats_total'] = float(r2['total'].iloc[0]) if not r2.empty else 0

        # Nb clients et fournisseurs
        r3 = fetch_dwh("SELECT COUNT(*) AS nb FROM dim_client")
        stats['clients'] = int(r3['nb'].iloc[0]) if not r3.empty else 0

        r4 = fetch_dwh("SELECT COUNT(*) AS nb FROM dim_fournisseur")
        stats['fournisseurs'] = int(r4['nb'].iloc[0]) if not r4.empty else 0

        # Top 5 clients B2B par CA
        top_b2b = fetch_dwh("""
            SELECT dc.nom_client AS name, SUM(fv.revenue) AS ca
            FROM fact_vente fv
            JOIN dim_client dc ON fv.client_key = dc.client_key
            WHERE dc.type_client = 'B2B' AND fv.revenue > 0
            GROUP BY dc.nom_client
            ORDER BY ca DESC LIMIT 5
        """)
        stats['top_clients_b2b'] = top_b2b.to_dict('records') if not top_b2b.empty else []

        # Top 5 produits vendus
        top_prod = fetch_dwh("""
            SELECT dp.libelle AS name, dp.categorie AS category,
                   SUM(fv.quantite) AS qty_sold, SUM(fv.revenue) AS ca
            FROM fact_vente fv
            JOIN dim_produit dp ON fv.produit_key = dp.produit_key
            WHERE fv.revenue > 0 AND dp.produit_key > 0
            GROUP BY dp.libelle, dp.categorie
            ORDER BY ca DESC LIMIT 5
        """)
        stats['top_produits'] = top_prod.to_dict('records') if not top_prod.empty else []

        return jsonify({"source": "Sougui_DWH", "stats": stats})
    except Exception as e:
        logger.error(f'[DWH Stats] {e}')
        return jsonify({"error": str(e)}), 500


# ─── RFM Segmentation depuis DWH ─────────────────────────────────────────────
@app.route('/api/dwh/rfm', methods=['GET'])
def get_dwh_rfm():
    """Calcule la segmentation RFM reelle depuis fact_vente + dim_client."""
    try:
        df = fetch_dwh("""
            SELECT
                dc.client_key,
                dc.nom_client         AS nom,
                dc.type_client        AS type,
                dc.gouvernorat,
                COUNT(fv.vente_key)   AS frequence,
                SUM(fv.revenue)       AS montant_total,
                MAX(fv.date_key)      AS derniere_vente
            FROM fact_vente fv
            JOIN dim_client dc ON fv.client_key = dc.client_key
            WHERE fv.revenue > 0
            GROUP BY dc.client_key, dc.nom_client, dc.type_client, dc.gouvernorat
            HAVING SUM(fv.revenue) > 0
            ORDER BY montant_total DESC
        """)
        if df.empty:
            return jsonify([])

        # Calcul recence (jours depuis derniere vente)
        today_key = int(pd.Timestamp.now().strftime('%Y%m%d'))
        df['recence'] = df['derniere_vente'].apply(
            lambda k: max(0, today_key - int(k)) if k else 999
        )
        df['panier_moyen'] = (df['montant_total'] / df['frequence']).round(2)

        # Segmentation simplifiee
        def segment(row):
            m, f = row['montant_total'], row['frequence']
            if m > 20000 and f > 5: return 'Champions'
            if m > 5000 and f > 3:  return 'Clients Fideles'
            if m > 1000:            return 'Actifs'
            if f == 1:              return 'Nouveaux'
            return 'A Risque'
        df['segment'] = df.apply(segment, axis=1)

        return jsonify({
            "source": "Sougui_DWH",
            "total": len(df),
            "segments": df['segment'].value_counts().to_dict(),
            "clients": df.where(pd.notnull(df), None).to_dict('records')
        })
    except Exception as e:
        logger.error(f'[RFM DWH] {e}')
        return jsonify({"error": str(e)}), 500


# ─── BCG Matrix depuis DWH ───────────────────────────────────────────────────
@app.route('/api/dwh/bcg', methods=['GET'])
def get_dwh_bcg():
    """Calcule la matrice BCG produits (part de marche vs croissance CA)."""
    try:
        df = fetch_dwh("""
            SELECT
                dp.produit_key,
                dp.libelle        AS produit,
                dp.categorie,
                dp.prix_vente,
                SUM(fv.quantite)  AS qty_totale,
                SUM(fv.revenue)   AS ca_total,
                COUNT(fv.vente_key) AS nb_transactions
            FROM dim_produit dp
            JOIN fact_vente fv ON dp.produit_key = fv.produit_key
            WHERE fv.revenue > 0 AND dp.produit_key > 0
            GROUP BY dp.produit_key, dp.libelle, dp.categorie, dp.prix_vente
            HAVING SUM(fv.revenue) > 0
            ORDER BY ca_total DESC
        """)
        if df.empty:
            return jsonify([])

        total_ca = df['ca_total'].sum()
        median_ca = df['ca_total'].median()
        median_qty = df['qty_totale'].median()

        def bcg_quadrant(row):
            high_share  = row['ca_total']  > median_ca
            high_growth = row['qty_totale'] > median_qty
            if high_share and high_growth:  return 'Stars'
            if high_share and not high_growth: return 'Cash Cows'
            if not high_share and high_growth: return 'Question Marks'
            return 'Dogs'

        df['quadrant']    = df.apply(bcg_quadrant, axis=1)
        df['part_marche'] = (df['ca_total'] / total_ca * 100).round(2)

        return jsonify({
            "source": "Sougui_DWH",
            "total_produits": len(df),
            "ca_total": float(total_ca),
            "quadrants": df['quadrant'].value_counts().to_dict(),
            "produits": df.where(pd.notnull(df), None).to_dict('records')
        })
    except Exception as e:
        logger.error(f'[BCG DWH] {e}')
        return jsonify({"error": str(e)}), 500


# ─── Analyse Logistique depuis DWH ───────────────────────────────────────────
@app.route('/api/dwh/logistique', methods=['GET'])
def get_dwh_logistique():
    """KPIs logistiques : livraisons par gouvernorat, risque par zone."""
    try:
        df = fetch_dwh("""
            SELECT
                TRIM(INITCAP(dc.gouvernorat)) AS gouvernorat,
                COUNT(fv.vente_key)  AS nb_commandes,
                SUM(fv.revenue)      AS ca_zone
            FROM fact_vente fv
            JOIN dim_client dc ON fv.client_key = dc.client_key
            WHERE fv.revenue > 0
              AND dc.gouvernorat IS NOT NULL
              AND TRIM(dc.gouvernorat) != ''
            GROUP BY TRIM(INITCAP(dc.gouvernorat))
            ORDER BY nb_commandes DESC
        """)
        if df.empty:
            return jsonify({"zones": [], "risk_map": {}})

        # Normaliser côté Python en backup
        df['gouvernorat'] = df['gouvernorat'].str.strip().str.title()

        # Agréger pour fusionner éventuels doublons résiduels
        by_gov = df.groupby('gouvernorat').agg(
            nb_commandes=('nb_commandes', 'sum'),
            ca_zone=('ca_zone', 'sum'),
        ).reset_index().sort_values('nb_commandes', ascending=False)

        # Calculer risk_score APRÈS agrégation
        max_cmds = by_gov['nb_commandes'].max()
        by_gov['risk_score'] = (1 - by_gov['nb_commandes'] / max_cmds).round(2)
        by_gov['risk_level'] = by_gov['risk_score'].apply(
            lambda s: 'Haut' if s > 0.7 else ('Moyen' if s > 0.3 else 'Bas')
        )

        return jsonify({
            "source": "Sougui_DWH",
            "total_zones": len(by_gov),
            "zones": by_gov.where(pd.notnull(by_gov), None).to_dict('records'),
            "kpis": {
                "nb_commandes_total": int(by_gov['nb_commandes'].sum()),
                "ca_total":           float(by_gov['ca_zone'].sum()),
                "zones_risque_haut":  int((by_gov['risk_level'] == 'Haut').sum()),
                "zones_risque_bas":   int((by_gov['risk_level'] == 'Bas').sum()),
            }
        })
    except Exception as e:
        logger.error(f'[Logistique DWH] {e}')
        return jsonify({"error": str(e)}), 500


# ─── Evolution CA mensuelle (DWH) ────────────────────────────────────────────
@app.route('/api/dwh/evolution-ca', methods=['GET'])
def get_dwh_evolution_ca():
    """Evolution du CA mensuel reel depuis Fact_Vente."""
    try:
        df = fetch_dwh("""
            SELECT
                date_key,
                SUM(revenue)      AS ca,
                COUNT(vente_key)  AS nb_transactions,
                SUM(montant_ht)   AS ca_ht
            FROM fact_vente
            WHERE revenue > 0
            GROUP BY date_key
            ORDER BY date_key
        """)
        if df.empty:
            return jsonify([])

        df['date'] = pd.to_datetime(df['date_key'].astype(str), format='%Y%m%d', errors='coerce')
        df = df.dropna(subset=['date'])
        monthly = (
            df.set_index('date')
              .resample('ME')[['ca', 'nb_transactions', 'ca_ht']]
              .sum()
              .reset_index()
        )
        monthly['mois'] = monthly['date'].dt.strftime('%b %Y')
        monthly = monthly.drop(columns=['date'])

        return jsonify({
            "source": "Sougui_DWH",
            "data": monthly.where(pd.notnull(monthly), None).to_dict('records')
        })
    except Exception as e:
        logger.error(f'[Evolution CA DWH] {e}')
        return jsonify({"error": str(e)}), 500


# ─── Top Produits (DWH) ──────────────────────────────────────────────────────
@app.route('/api/dwh/top-produits', methods=['GET'])
def get_dwh_top_produits():
    """Top 20 produits par CA avec categorie et performance."""
    try:
        limit = request.args.get('limit', 20, type=int)
        df = fetch_dwh(f"""
            SELECT
                dp.libelle       AS produit,
                dp.categorie,
                dp.prix_vente,
                SUM(fv.quantite) AS qty_vendue,
                SUM(fv.revenue)  AS ca,
                COUNT(DISTINCT fv.client_key) AS nb_clients
            FROM dim_produit dp
            JOIN fact_vente fv ON dp.produit_key = fv.produit_key
            WHERE fv.revenue > 0 AND dp.produit_key > 0
            GROUP BY dp.libelle, dp.categorie, dp.prix_vente
            ORDER BY ca DESC
            LIMIT {limit}
        """)
        if df.empty:
            return jsonify([])
        return jsonify({
            "source": "Sougui_DWH",
            "produits": df.where(pd.notnull(df), None).to_dict('records')
        })
    except Exception as e:
        logger.error(f'[Top Produits DWH] {e}')
        return jsonify({"error": str(e)}), 500





# ═══════════════════════════════════════════════════════════════════════════════
# ─── NOUVEAUX ENDPOINTS ML PRÉDICTIFS ─────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

import math as _math

def _load_pkl(name):
    """Charger un fichier .pkl depuis le dossier models."""
    try:
        path = os.path.join(MODELS_DIR, name)
        with open(path, 'rb') as f:
            return pickle.load(f)
    except Exception as e:
        logger.warning(f'[PKL] Cannot load {name}: {e}')
        return None

def _load_json_model(name):
    """Charger un fichier JSON depuis le dossier models."""
    try:
        path = os.path.join(MODELS_DIR, name)
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.warning(f'[JSON] Cannot load {name}: {e}')
        return None


# ─── 1. Best Seller B2C ───────────────────────────────────────────────────────
@app.route('/api/predict/best-seller-b2c', methods=['POST'])
def predict_best_seller_b2c():
    """Prédit si un produit sera Best Seller en B2C (formulaire: categorie, matiere, prix, nb_commandes)."""
    try:
        data = request.get_json() or {}
        model   = _load_pkl('best_seller_b2c_v1.pkl')
        enc     = _load_pkl('best_seller_b2c_encoders_v1.pkl')
        meta    = _load_json_model('best_seller_b2c_metadata.json')

        if not model or not enc:
            return jsonify({"error": "Modèle Best Seller non disponible"}), 503

        # Encoder les inputs
        categorie   = data.get('categorie', 'Non catalogué')
        matiere     = data.get('matiere', 'Autre')
        prix        = float(data.get('prix', 0))
        nb_commandes= float(data.get('nb_commandes', 1))

        # Encoder avec fallback sur valeur inconnue
        cats = enc['categories']
        mats = enc['matieres']
        cat_enc = cats.index(categorie) if categorie in cats else 0
        mat_enc = mats.index(matiere)   if matiere   in mats else 0
        log_prix = __import__('numpy').log1p(prix)

        X = [[cat_enc, mat_enc, log_prix, nb_commandes]]
        proba = model.predict_proba(X)[0]
        pred  = int(model.predict(X)[0])
        score = round(float(proba[1]) * 100, 1)

        niveau = 'Très Probable' if score >= 70 else ('Probable' if score >= 50 else 'Peu Probable')
        couleur= '#22c55e' if score >= 70 else ('#f59e0b' if score >= 50 else '#ef4444')

        return jsonify({
            "prediction":   pred,
            "is_best_seller": bool(pred),
            "score_pct":    score,
            "niveau":       niveau,
            "couleur":      couleur,
            "accuracy_modele": meta.get('accuracy', 0) if meta else 0,
            "interpretation": f"Ce produit a {score}% de chances d'être un Best Seller B2C.",
            "recommandation": "Mettre en avant sur le site web et les réseaux sociaux." if pred else "Optimiser le prix ou la catégorie pour améliorer les ventes."
        })
    except Exception as e:
        logger.error(f'[Best Seller B2C] {e}')
        return jsonify({"error": str(e)}), 500


@app.route('/api/predict/best-seller-b2c/metadata', methods=['GET'])
def get_best_seller_metadata():
    """Retourne les métadonnées du modèle Best Seller (catégories, matières disponibles)."""
    meta = _load_json_model('best_seller_b2c_metadata.json')
    if not meta:
        return jsonify({"error": "Métadonnées non disponibles"}), 503
    return jsonify(meta)


# ─── 2. B2B Demand Prediction ─────────────────────────────────────────────────
@app.route('/api/predict/b2b-demand', methods=['POST'])
def predict_b2b_demand():
    """Prédit la demande B2B (revenue) pour une configuration client donnée."""
    try:
        data    = request.get_json() or {}
        model   = _load_pkl('b2b_demand_xgb_v1.pkl')
        enc     = _load_pkl('b2b_demand_encoders_v1.pkl')
        meta    = _load_json_model('b2b_demand_metadata.json')

        if not model or not enc:
            return jsonify({"error": "Modèle B2B Demand non disponible"}), 503

        gouvernorat = str(data.get('gouvernorat', 'Tunis')).strip().title()
        secteur     = str(data.get('secteur', 'Banque'))
        paiement    = str(data.get('paiement', 'Virement'))
        saison      = str(data.get('saison', 'Ete'))
        mois        = int(data.get('mois', 6))
        trimestre   = int(data.get('trimestre', 2))
        quantite    = float(data.get('quantite', 10))
        is_ramadan  = int(data.get('is_ramadan', 0))
        nb_cmd_hist = float(data.get('nb_cmd_historique', 5))
        ca_cumul    = float(data.get('ca_cumul', 5000))

        import numpy as np
        def safe_enc(le, val, classes):
            if val in classes: return classes.index(val)
            return 0

        govs  = enc['gouvernorats']
        secs  = enc['secteurs']
        pays  = enc['paiements']
        sais  = enc['saisons']

        gov_enc   = safe_enc(None, gouvernorat, govs)
        sec_enc   = safe_enc(None, secteur, secs)
        pay_enc   = safe_enc(None, paiement, pays)
        sais_enc  = safe_enc(None, saison, sais)
        canal_enc = 0
        qty_log   = np.log1p(quantite)

        X = [[gov_enc, sec_enc, pay_enc, canal_enc, sais_enc,
              mois, trimestre, is_ramadan,
              quantite, qty_log, ca_cumul, nb_cmd_hist]]

        pred_revenue = float(model.predict(X)[0])
        pred_revenue = max(0, pred_revenue)

        # Prédiction sur 3 mois avec variation saisonnière
        predictions_3mois = []
        for i in range(3):
            m_i = ((mois - 1 + i) % 12) + 1
            t_i = (m_i - 1) // 3 + 1
            X_i = [[gov_enc, sec_enc, pay_enc, canal_enc, sais_enc,
                    m_i, t_i, is_ramadan,
                    quantite, qty_log, ca_cumul + pred_revenue * i, nb_cmd_hist + i]]
            p_i = max(0, float(model.predict(X_i)[0]))
            predictions_3mois.append({
                "mois": m_i,
                "label": ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'][m_i-1],
                "revenue_predit": round(p_i, 2)
            })

        return jsonify({
            "revenue_predit":      round(pred_revenue, 2),
            "predictions_3mois":   predictions_3mois,
            "ca_3mois_total":      round(sum(p['revenue_predit'] for p in predictions_3mois), 2),
            "mae_modele":          meta.get('mae', 0) if meta else 0,
            "interpretation":      f"Demande B2B estimée à {pred_revenue:.0f} DT pour {gouvernorat} — secteur {secteur}.",
            "recommandation":      "Préparer les stocks et l'équipe commerciale en conséquence."
        })
    except Exception as e:
        logger.error(f'[B2B Demand] {e}')
        return jsonify({"error": str(e)}), 500


@app.route('/api/predict/b2b-demand/metadata', methods=['GET'])
def get_b2b_demand_metadata():
    meta = _load_json_model('b2b_demand_metadata.json')
    if not meta: return jsonify({"error": "Métadonnées non disponibles"}), 503
    return jsonify(meta)


# ─── 3. Churn Prediction ──────────────────────────────────────────────────────
@app.route('/api/predict/churn', methods=['POST'])
def predict_churn():
    """Prédit le risque de churn (départ) d'un client basé sur ses métriques RFM."""
    try:
        data  = request.get_json() or {}
        model = _load_pkl('churn_prediction_v1.pkl')
        enc   = _load_pkl('churn_encoders_v1.pkl')
        meta  = _load_json_model('churn_metadata.json')

        if not model or not enc:
            return jsonify({"error": "Modèle Churn non disponible"}), 503

        import numpy as np

        recency       = float(data.get('recency', 90))
        frequency     = float(data.get('frequency', 3))
        monetary      = float(data.get('monetary', 1000))
        gouvernorat   = str(data.get('gouvernorat', 'Tunis')).strip().title()
        secteur       = str(data.get('secteur', 'Particulier'))
        type_client   = str(data.get('type_client', 'B2C'))
        tenure_days   = float(data.get('tenure_days', 180))

        # Encoder
        govs = enc['gouvernorats']
        secs = enc['secteurs']
        typs = enc['types']

        gov_enc = govs.index(gouvernorat) if gouvernorat in govs else 0
        sec_enc = secs.index(secteur)     if secteur in secs     else 0
        typ_enc = typs.index(type_client) if type_client in typs else 0

        avg_order = monetary / max(frequency, 1)
        purchase_rate = frequency / max(tenure_days, 1) * 30
        r_score = min(5, max(1, round((1 - recency / 400) * 5)))
        f_score = min(5, max(1, round(frequency / 2)))
        m_score = min(5, max(1, round(monetary / 5000 * 5)))

        X_raw = [[recency, frequency, monetary,
                  r_score, f_score, m_score,
                  tenure_days, avg_order, purchase_rate,
                  gov_enc, sec_enc, typ_enc]]

        scaler = enc.get('scaler')
        X = scaler.transform(X_raw) if scaler else X_raw

        proba = model.predict_proba(X)[0]
        churn_pct = round(float(proba[1]) * 100, 1)

        if churn_pct >= 70:
            segment = "Client Perdu";    couleur = '#ef4444'; action = "Contact urgent — offrir une remise de fidélisation."
        elif churn_pct >= 40:
            segment = "À Risque";        couleur = '#f59e0b'; action = "Envoyer une campagne email personnalisée dans les 7 jours."
        else:
            segment = "Client Fidèle";   couleur = '#22c55e'; action = "Maintenir la relation — proposer une offre premium."

        return jsonify({
            "churn_probabilite": churn_pct,
            "segment":           segment,
            "couleur":           couleur,
            "action_recommandee":action,
            "rfm": {"recency": recency, "frequency": frequency, "monetary": monetary,
                    "r_score": r_score, "f_score": f_score, "m_score": m_score},
            "auc_modele":        meta.get('auc', 0) if meta else 0,
            "interpretation":    f"Probabilité de départ : {churn_pct}% — Segment : {segment}"
        })
    except Exception as e:
        logger.error(f'[Churn] {e}')
        return jsonify({"error": str(e)}), 500


@app.route('/api/predict/churn/metadata', methods=['GET'])
def get_churn_metadata():
    meta = _load_json_model('churn_metadata.json')
    if not meta: return jsonify({"error": "Métadonnées non disponibles"}), 503
    return jsonify(meta)


# ─── 4. Supplier Scoring ──────────────────────────────────────────────────────
@app.route('/api/predict/supplier-scoring', methods=['GET'])
def get_supplier_scoring():
    """Retourne le classement complet des fournisseurs avec scores de performance."""
    try:
        suppliers = _load_json_model('suppliers_scored.json')
        if not suppliers:
            return jsonify({"error": "Données fournisseurs non disponibles"}), 503

        # Filtres optionnels
        classe_filter = request.args.get('classe', None)
        if classe_filter:
            suppliers = [s for s in suppliers if str(s.get('classe','')) == classe_filter]

        # Tri par score global
        suppliers = sorted(suppliers, key=lambda s: float(s.get('score_global', 0)), reverse=True)

        distribution = {}
        all_s = _load_json_model('suppliers_scored.json') or []
        for s in all_s:
            c = str(s.get('classe', 'Standard'))
            distribution[c] = distribution.get(c, 0) + 1

        return jsonify({
            "source":       "Sougui_DWH",
            "total":        len(all_s),
            "distribution": distribution,
            "fournisseurs": suppliers[:50]
        })
    except Exception as e:
        logger.error(f'[Supplier Scoring] {e}')
        return jsonify({"error": str(e)}), 500


# ─── 5. Delivery Analysis ─────────────────────────────────────────────────────
@app.route('/api/predict/delivery-analysis', methods=['GET'])
def get_delivery_clients():
    """Retourne la liste des clients avec distance et coût estimé depuis l'entrepôt Sougui."""
    try:
        clients = _load_json_model('delivery_clients.json')
        if not clients:
            return jsonify({"error": "Données livraison non disponibles"}), 503

        meta = _load_json_model('delivery_metadata.json') or {}
        search = request.args.get('q', '').lower()
        if search:
            clients = [c for c in clients if search in str(c.get('Nom_client','')).lower()
                       or search in str(c.get('Gouvernorat','')).lower()]

        return jsonify({
            "entrepot":  meta.get('sougui_warehouse', {"lat": 36.8065, "lng": 10.1815}),
            "total":     len(clients),
            "clients":   clients[:200]
        })
    except Exception as e:
        logger.error(f'[Delivery] {e}')
        return jsonify({"error": str(e)}), 500


@app.route('/api/predict/delivery-analysis/calculate', methods=['POST'])
def calculate_delivery():
    """Calcule la distance et le coût de livraison pour un client donné."""
    try:
        data = request.get_json() or {}
        SOUGUI_LAT, SOUGUI_LNG = 36.8065, 10.1815

        client_lat = float(data.get('lat', SOUGUI_LAT))
        client_lng = float(data.get('lng', SOUGUI_LNG))
        client_nom = str(data.get('nom', 'Client'))
        gouvernorat= str(data.get('gouvernorat', 'Tunis'))

        # Haversine
        R = 6371
        dlat = _math.radians(client_lat - SOUGUI_LAT)
        dlng = _math.radians(client_lng - SOUGUI_LNG)
        a = (_math.sin(dlat/2)**2 +
             _math.cos(_math.radians(SOUGUI_LAT)) *
             _math.cos(_math.radians(client_lat)) *
             _math.sin(dlng/2)**2)
        distance_km = round(R * 2 * _math.asin(_math.sqrt(a)), 2)

        # Estimation coût
        if distance_km <= 5:
            cout = round(1.5 + distance_km * 0.2, 2);   zone = "Proximité"
        elif distance_km <= 20:
            cout = round(3.0 + distance_km * 0.15, 2);  zone = "Grand Tunis"
        elif distance_km <= 100:
            cout = round(8.0 + distance_km * 0.12, 2);  zone = "Régionale"
        else:
            cout = round(15.0 + distance_km * 0.10, 2); zone = "Nationale"

        return jsonify({
            "client":       client_nom,
            "gouvernorat":  gouvernorat,
            "distance_km":  distance_km,
            "cout_estime":  cout,
            "zone":         zone,
            "entrepot":     {"lat": SOUGUI_LAT, "lng": SOUGUI_LNG, "nom": "Entrepôt Sougui — Tunis"},
            "client_coords":{"lat": client_lat,  "lng": client_lng},
            "description":  f"Distance de {distance_km} km · Coût estimé : {cout} DT · Zone {zone}"
        })
    except Exception as e:
        logger.error(f'[Delivery Calc] {e}')
        return jsonify({"error": str(e)}), 500


# ─── 6. Price Simulator ───────────────────────────────────────────────────────
@app.route('/api/predict/price-simulator', methods=['POST'])
def simulate_price():
    """Simule l'impact d'un changement de prix sur les ventes et le CA."""
    try:
        data      = request.get_json() or {}
        artifacts = _load_pkl('price_simulator_v1.pkl')
        meta      = _load_json_model('price_metadata.json')

        if not artifacts:
            return jsonify({"error": "Modèle Price Simulator non disponible"}), 503

        import numpy as np

        categorie     = str(data.get('categorie', 'Arts de la table'))
        matiere       = str(data.get('matiere', 'Cuivre'))
        prix_actuel   = float(data.get('prix_actuel', 50))
        prix_nouveau  = float(data.get('prix_nouveau', 55))
        mois          = int(data.get('mois', 6))
        trimestre     = ((mois - 1) // 3) + 1
        saison        = data.get('saison', 'Ete')
        qty_actuelle  = float(data.get('qty_actuelle', 10))

        le_cat = artifacts['le_cat']
        le_mat = artifacts['le_mat']
        le_sai = artifacts['le_sai']
        scaler = artifacts['scaler']
        model  = artifacts['model_ridge']
        elasticites = artifacts.get('elasticites', {})

        cats = list(le_cat.classes_)
        mats = list(le_mat.classes_)
        sais = list(le_sai.classes_)

        cat_enc = cats.index(categorie) if categorie in cats else 0
        mat_enc = mats.index(matiere)   if matiere   in mats else 0
        sai_enc = sais.index(saison)    if saison    in sais else 0

        # Prédiction avec prix actuel
        X_act = [[np.log1p(prix_actuel),  cat_enc, mat_enc, sai_enc, mois, trimestre]]
        X_new = [[np.log1p(prix_nouveau), cat_enc, mat_enc, sai_enc, mois, trimestre]]

        X_act_s = scaler.transform(X_act)
        X_new_s = scaler.transform(X_new)

        qty_pred_act = max(0.1, float(np.expm1(model.predict(X_act_s)[0])))
        qty_pred_new = max(0.1, float(np.expm1(model.predict(X_new_s)[0])))

        # Utiliser l'élasticité par catégorie si disponible
        elasticite = elasticites.get(categorie, -1.2)
        delta_prix_pct = (prix_nouveau - prix_actuel) / prix_actuel * 100 if prix_actuel > 0 else 0
        delta_qty_pct  = elasticite * delta_prix_pct

        # Ajustement combiné modèle + élasticité
        qty_nouvelle = max(0, qty_actuelle * (1 + delta_qty_pct / 100))

        ca_actuel  = round(prix_actuel  * qty_actuelle,  2)
        ca_nouveau = round(prix_nouveau * qty_nouvelle, 2)
        delta_ca   = round(ca_nouveau - ca_actuel, 2)
        delta_ca_pct = round((ca_nouveau - ca_actuel) / max(ca_actuel, 1) * 100, 1)

        if delta_ca > 0:
            recommandation = f"Hausse de prix recommandee : +{delta_ca:.0f} DT de CA supplementaire."
            couleur = '#22c55e'
        else:
            recommandation = f"Attention : cette hausse pourrait reduire le CA de {abs(delta_ca):.0f} DT."
            couleur = '#ef4444'

        return jsonify({
            "prix_actuel":      prix_actuel,
            "prix_nouveau":     prix_nouveau,
            "delta_prix_pct":   round(delta_prix_pct, 1),
            "qty_actuelle":     qty_actuelle,
            "qty_nouvelle":     round(qty_nouvelle, 1),
            "delta_qty_pct":    round(delta_qty_pct, 1),
            "ca_actuel":        ca_actuel,
            "ca_nouveau":       ca_nouveau,
            "delta_ca":         delta_ca,
            "delta_ca_pct":     delta_ca_pct,
            "elasticite":       round(elasticite, 2),
            "couleur":          couleur,
            "recommandation":   recommandation,
            "r2_modele":        meta.get('r2', 0) if meta else 0
        })
    except Exception as e:
        logger.error(f'[Price Simulator] {e}')
        return jsonify({"error": str(e)}), 500


@app.route('/api/predict/price-simulator/products', methods=['GET'])
def get_price_products():
    """Retourne la liste des produits avec leur prix pour le simulateur."""
    products = _load_json_model('price_products.json')
    if not products: return jsonify({"error": "Données prix non disponibles"}), 503
    meta = _load_json_model('price_metadata.json') or {}
    return jsonify({"produits": products, "categories": meta.get('categories', []),
                    "matieres": meta.get('matieres', []), "saisons": meta.get('saisons', [])})


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
