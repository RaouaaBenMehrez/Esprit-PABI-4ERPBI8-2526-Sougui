# 📊 Monitoring MLOps — Sougui BI Suite (Semaine S13)

> Système de surveillance en production avec **Prometheus**, **Grafana** et détection de dérive des données.

## 🏗️ Architecture du Monitoring

```
Flask API (:5000)
    └── /metrics  ──────────────────→  Prometheus (:9090)
    └── /api/monitoring/drift               └──────→  Grafana (:3001)
    └── /api/simulate/*             Alertes configurées
```

## 📁 Fichiers créés

```
monitoring/
├── prometheus.yml                    # Config scraping (toutes les 10s)
├── alert_rules.yml                   # Règles d'alertes (latence, erreur, drift)
├── grafana_dashboard.json            # Dashboard Grafana complet
├── grafana_provisioning/
│   ├── datasources/datasources.yml   # Auto-config Prometheus → Grafana
│   └── dashboards/dashboards.yml     # Auto-chargement du dashboard

backend/scripts/
├── monitor_drift.py                  # Script de détection de dérive
└── retrain_models.py                 # Pipeline ML (existant, amélioré)

docker-compose-monitoring.yml         # Lance Prometheus + Grafana
start_monitoring.bat                  # Lanceur Windows (1 double-clic)
```

## 🚀 Lancement Rapide

### Option A — Script Windows (le plus simple)
```
Double-cliquez sur : start_monitoring.bat
```

### Option B — Commandes manuelles

**Étape 1** : Lancer le backend Flask (s'il ne tourne pas déjà)
```powershell
cd backend
python server.py
```

**Étape 2** : Lancer Prometheus + Grafana
```powershell
docker compose -f docker-compose-monitoring.yml up -d
```

**Étape 3** : Accéder aux interfaces
| Service     | URL                          | Identifiants        |
|-------------|------------------------------|---------------------|
| Flask API   | http://localhost:5000         | —                   |
| Métriques   | http://localhost:5000/metrics | —                   |
| Prometheus  | http://localhost:9090         | —                   |
| Grafana     | http://localhost:3001         | admin / sougui2024  |
| MLflow      | http://localhost:5001         | —                   |

## 📋 Métriques Prometheus Exposées

| Métrique                         | Type    | Description                          |
|----------------------------------|---------|--------------------------------------|
| `flask_http_request_total`       | Counter | Requêtes HTTP par endpoint/status    |
| `flask_http_request_duration_seconds` | Histogram | Latence par endpoint           |
| `sougui_model_accuracy`          | Gauge   | Accuracy par modèle (XGBoost, RF...) |
| `sougui_model_confidence`        | Gauge   | Confiance moyenne des prédictions    |
| `sougui_drift_score`             | Gauge   | Score de dérive (0=stable, 1=dérive) |
| `sougui_baseline_deviation_pct`  | Gauge   | Écart vs baseline en %               |
| `sougui_retrain_total`           | Counter | Nb total de réentraînements          |
| `sougui_retrain_errors_total`    | Counter | Nb d'erreurs de réentraînement       |
| `sougui_data_missing_values`     | Gauge   | Valeurs manquantes dans les données  |
| `sougui_data_freshness_hours`    | Gauge   | Ancienneté des données (heures)      |

## 🚨 Règles d'Alertes Configurées

| Alerte                | Condition                          | Sévérité  |
|-----------------------|------------------------------------|-----------|
| `HighAPILatency`      | P95 > 500ms pendant 30s            | warning   |
| `HighErrorRate`       | Erreurs 5xx > 5% pendant 1min      | critical  |
| `APIDown`             | API inaccessible 15s               | critical  |
| `XGBoostAccuracyDrop` | Accuracy < 92% pendant 30s         | warning   |
| `XGBoostAccuracyCritical` | Accuracy < 87% pendant 30s    | critical  |
| `LowModelConfidence`  | Confidence < 70% pendant 1min      | warning   |
| `DataDriftDetected`   | Drift score > 0.15 pendant 1min    | warning   |
| `DataDriftCritical`   | Drift score > 0.40 pendant 30s     | critical  |
| `StaleData`           | Données > 48h anciennes            | warning   |

## 🎭 Scénarios de Simulation (Obligatoires pour la soutenance)

### Via le script `.bat` (menu interactif)
Lancez `start_monitoring.bat` et choisissez dans le menu.

### Via curl / Postman
```powershell
# Scénario 1 : Pic de trafic
curl -X POST http://localhost:5000/api/simulate/high-traffic

# Scénario 2 : Erreurs API (500)
curl -X POST http://localhost:5000/api/simulate/api-errors

# Scénario 3 : Dérive des données
curl -X POST http://localhost:5000/api/simulate/drift `
     -H "Content-Type: application/json" `
     -d '{"scenario": "drift"}'

# Scénario 4 : Chute d'accuracy
curl -X POST http://localhost:5000/api/simulate/drift `
     -H "Content-Type: application/json" `
     -d '{"scenario": "accuracy_drop"}'

# Reset — retour aux valeurs normales
curl -X POST http://localhost:5000/api/simulate/drift `
     -H "Content-Type: application/json" `
     -d '{"scenario": "reset"}'
```

### Script de détection de dérive
```powershell
cd backend

# Analyse normale
python scripts/monitor_drift.py

# Avec déclenchement automatique du réentraînement si dérive
python scripts/monitor_drift.py --retrain

# Injecter une simulation de dérive
python scripts/monitor_drift.py --simulate drift
```

## 🔍 Importer le Dashboard Grafana

1. Ouvrir **http://localhost:3001**
2. Se connecter : `admin` / `sougui2024`
3. Menu gauche → **Dashboards** → **Import**
4. Cliquer **Upload JSON file**
5. Sélectionner `monitoring/grafana_dashboard.json`
6. Choisir la datasource **Prometheus**
7. Cliquer **Import**

## 📊 Panels du Dashboard Grafana

| Section                    | Panels inclus                                      |
|----------------------------|----------------------------------------------------|
| 🚦 Traffic & Disponibilité | API Status, Requêtes/s, Taux d'erreur, Latence P95 |
| ⏱️ Performance             | Latence P50/P95/P99 (courbe temporelle)            |
| 🤖 Santé des modèles ML    | Gauge accuracy XGBoost, RF, Confidence, évolution  |
| 📊 Data Health & Drift     | Drift Score gauge, évolution, déviation vs baseline|
| 🔄 MLOps Retraining        | Compteurs réentraînement, trafic par endpoint      |

## 🧪 Baselines de Référence

```python
BASELINES = {
    'xgboost_accuracy':   0.97,   # 97% — alerte si < 92%
    'rf_accuracy':        0.94,   # 94% — alerte si < 89%
    'prophet_mae':        3500.0, # MAE en DT
    'kmeans_silhouette':  0.62,   # Score silhouette
    'max_latency_ms':     500,    # 500ms P95
    'max_error_rate_pct': 5.0,    # 5% max
    'min_confidence_pct': 70.0,   # 70% min
}
```

## 📌 Points clés pour la soutenance

- **Métriques** = *ce qui se passe* (accuracy, latence, drift score)
- **Logs** = *pourquoi ça se passe* (erreurs dans les logs Flask)
- **Alertes** = *quand agir* (seuils configurés dans `alert_rules.yml`)
- **Simulation** = démontrer la détection en live devant le prof
