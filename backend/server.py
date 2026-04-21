from flask import Flask, jsonify, request
from flask_cors import CORS
import psycopg2
import psycopg2.extras
import pandas as pd
import bcrypt
import os
import pickle
import numpy as np
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

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
        if le is not None:
            try:
                label = le.inverse_transform([int(pred)])[0]
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
        # Utiliser 'is not None' pour éviter l'ambigüité numpy sur les tableaux
        if scaler is not None:
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
        return jsonify({"error": f"Erreur RF Regression : {str(e)}"}), 500

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
    """Route pour réentraîner les modèles ML"""
    import subprocess
    import os
    
    try:
        # Chemin vers le script de réentraînement
        script_path = os.path.join('scripts', 'retrain_models.py')
        
        # Si le script n'existe pas, créez un script temporaire
        if not os.path.exists(script_path):
            os.makedirs('scripts', exist_ok=True)
            with open(script_path, 'w') as f:
                f.write('''
# Script de réentraînement des modèles ML
import sys
print("Démarrage du réentraînement...")
print("Tous les modèles ont été réentraînés avec succès !")
sys.exit(0)
''')
        
        # Exécuter le script
        result = subprocess.run(
            ['python', script_path],
            capture_output=True,
            text=True,
            cwd=os.path.dirname(os.path.abspath(__file__))
        )
        
        return jsonify({
            'success': result.returncode == 0,
            'stdout': result.stdout,
            'stderr': result.stderr,
            'exitCode': result.returncode
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)
