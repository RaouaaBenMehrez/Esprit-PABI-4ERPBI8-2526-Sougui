# -*- coding: utf-8 -*-
"""
monitor_drift.py — Script de surveillance de dérive des données (Data Drift)
============================================================================
Objectif (demande prof S13) :
  - Comparer la distribution ACTUELLE des données vs les valeurs baseline
  - Calculer un "Drift Score" selon plusieurs méthodes (mean/std shift, KS test)
  - Mettre à jour les métriques Prometheus via l'API Flask
  - Logger les anomalies et déclencher le réentraînement si nécessaire

Usage :
  python backend/scripts/monitor_drift.py
  python backend/scripts/monitor_drift.py --api http://localhost:5000
  python backend/scripts/monitor_drift.py --simulate drift
"""

import os
import sys
import json
import sqlite3
import argparse
import logging
from datetime import datetime

import numpy as np
import pandas as pd

# Force UTF-8
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger('drift_monitor')

# ─── Chemins ──────────────────────────────────────────────────────────────────
SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, '..'))
SQLITE_PATH = os.path.join(BACKEND_DIR, 'sougui_suite.db')

# ─── Arguments CLI ────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser(description='Sougui BI — Drift Monitor')
parser.add_argument('--api',      default='http://localhost:5000', help='URL du backend Flask')
parser.add_argument('--simulate', choices=['drift', 'accuracy_drop', 'reset'], help='Injecter un scénario de simulation')
parser.add_argument('--retrain',  action='store_true', help='Déclencher le réentraînement si dérive détectée')
args, _ = parser.parse_known_args()

print('=' * 65)
print('  SOUGUI BI — Data Drift Monitor')
print(f'  {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
print('=' * 65)

# ══════════════════════════════════════════════════════════════════════════════
# 0. SIMULATION — Injecter un scénario de test (si demandé)
# ══════════════════════════════════════════════════════════════════════════════
if args.simulate:
    try:
        import requests
        url = f'{args.api}/api/simulate/drift'
        resp = requests.post(url, json={'scenario': args.simulate}, timeout=10)
        if resp.ok:
            data = resp.json()
            logger.info(f'[SIMULATION] Scénario "{args.simulate}" activé : {data}')
            print(f'\n✅ Simulation "{args.simulate}" injectée dans Prometheus/Grafana')
        else:
            logger.warning(f'[SIMULATION] Échec : {resp.status_code} {resp.text}')
    except Exception as e:
        logger.error(f'[SIMULATION] Erreur : {e}')
    print('=' * 65)
    sys.exit(0)


# ══════════════════════════════════════════════════════════════════════════════
# 1. CHARGEMENT DES DONNÉES ACTUELLES
# ══════════════════════════════════════════════════════════════════════════════
print('\n[STEP 1/4] Chargement des données actuelles...')

df_current = None
try:
    conn = sqlite3.connect(SQLITE_PATH)
    df_current = pd.read_sql_query(
        "SELECT amount, date FROM sales ORDER BY date DESC LIMIT 200",
        conn
    )
    df_clients = pd.read_sql_query(
        "SELECT total_spent FROM clients LIMIT 200",
        conn
    )
    conn.close()
    print(f'   ✅ SQLite chargé : {len(df_current)} ventes, {len(df_clients)} clients')
except Exception as e:
    logger.warning(f'   SQLite inaccessible : {e}')
    # Données synthétiques pour demo
    np.random.seed(42)
    df_current = pd.DataFrame({'amount': np.random.uniform(5000, 45000, 100)})
    df_clients = pd.DataFrame({'total_spent': np.random.uniform(100, 50000, 100)})
    print(f'   ⚠️  Données synthétiques utilisées ({len(df_current)} points)')


# ══════════════════════════════════════════════════════════════════════════════
# 2. CALCUL DU DRIFT SCORE
# ══════════════════════════════════════════════════════════════════════════════
print('\n[STEP 2/4] Calcul du score de dérive...')

# ─── Baseline (valeurs attendues du modèle entraîné) ─────────────────────────
BASELINE = {
    'sales_mean':  25000.0,
    'sales_std':   12000.0,
    'sales_min':    1000.0,
    'sales_max':   80000.0,
    'client_mean': 15000.0,
    'client_std':   8000.0,
}

# ─── Distribution actuelle ───────────────────────────────────────────────────
amounts = df_current['amount'].dropna().values.astype(float)
current = {
    'sales_mean': float(np.mean(amounts)),
    'sales_std':  float(np.std(amounts)),
    'sales_min':  float(np.min(amounts)),
    'sales_max':  float(np.max(amounts)),
}

# ─── Score de dérive par feature ─────────────────────────────────────────────
drift_details = {}
drift_scores  = []

for feat in ['sales_mean', 'sales_std']:
    baseline_val = BASELINE[feat]
    current_val  = current[feat]
    if baseline_val != 0:
        relative_diff = abs(current_val - baseline_val) / abs(baseline_val)
    else:
        relative_diff = 0.0
    drift_details[feat] = {
        'baseline': round(baseline_val, 2),
        'current':  round(current_val, 2),
        'drift_pct': round(relative_diff * 100, 2),
        'drifted': relative_diff > 0.15
    }
    drift_scores.append(relative_diff)

# ─── Test de Kolmogorov-Smirnov (détection statistique) ─────────────────────
ks_stat = 0.0
try:
    from scipy.stats import ks_2samp
    # Données de référence synthétiques (distribution baseline)
    np.random.seed(0)
    baseline_samples = np.random.normal(BASELINE['sales_mean'], BASELINE['sales_std'], 500)
    ks_stat, ks_pvalue = ks_2samp(baseline_samples, amounts)
    drift_details['ks_test'] = {
        'statistic': round(float(ks_stat), 4),
        'p_value':   round(float(ks_pvalue), 4),
        'drifted':   ks_pvalue < 0.05
    }
    drift_scores.append(float(ks_stat))
    print(f'   KS Test  : stat={ks_stat:.4f}, p-value={ks_pvalue:.4f} {"⚠️  DÉRIVE" if ks_pvalue < 0.05 else "✅ OK"}')
except ImportError:
    print('   KS Test  : scipy non installé (pip install scipy)')

# ─── Score global ─────────────────────────────────────────────────────────────
overall_drift_score = round(float(np.mean(drift_scores)), 4)
drift_detected      = overall_drift_score > 0.15

print(f'\n   {"=" * 50}')
print(f'   DRIFT SCORE GLOBAL : {overall_drift_score:.4f}')
print(f'   SEUIL              : 0.15')
print(f'   STATUT             : {"⚠️  DÉRIVE DÉTECTÉE" if drift_detected else "✅ Données stables"}')
print(f'   {"=" * 50}')

for feat, detail in drift_details.items():
    if feat == 'ks_test':
        continue
    icon = '⚠️ ' if detail['drifted'] else '✅'
    print(f'   {icon} {feat:<20} baseline={detail["baseline"]:>10.1f}  actuel={detail["current"]:>10.1f}  écart={detail["drift_pct"]:>6.1f}%')


# ══════════════════════════════════════════════════════════════════════════════
# 3. MISE À JOUR PROMETHEUS VIA L'API
# ══════════════════════════════════════════════════════════════════════════════
print('\n[STEP 3/4] Mise à jour des métriques Prometheus...')
try:
    import requests
    url = f'{args.api}/api/monitoring/drift'
    resp = requests.get(url, timeout=10)
    if resp.ok:
        api_result = resp.json()
        print(f'   ✅ API drift : score={api_result.get("drift_score")} | '
              f'dérive={"OUI" if api_result.get("drift_detected") else "NON"}')
        print(f'   Recommandation : {api_result.get("recommendation", "N/A")}')
    else:
        print(f'   ⚠️  API non joignable ({resp.status_code})')
except Exception as e:
    print(f'   ⚠️  API Flask non joignable : {e}')
    print(f'   (Assurez-vous que python server.py tourne sur {args.api})')


# ══════════════════════════════════════════════════════════════════════════════
# 4. LOGGING & DÉCISION DE RÉENTRAÎNEMENT
# ══════════════════════════════════════════════════════════════════════════════
print('\n[STEP 4/4] Logging & décision...')

report = {
    'timestamp':          datetime.now().isoformat(),
    'drift_score':        overall_drift_score,
    'drift_detected':     drift_detected,
    'threshold':          0.15,
    'current_stats':      current,
    'baseline':           BASELINE,
    'drift_per_feature':  drift_details,
    'recommendation':     'RETRAIN' if drift_detected else 'STABLE',
}

# Sauvegarder le rapport JSON
report_path = os.path.join(BACKEND_DIR, '..', 'monitoring', 'drift_report.json')
os.makedirs(os.path.dirname(report_path), exist_ok=True)
with open(report_path, 'w', encoding='utf-8') as f:
    json.dump(report, f, indent=2, ensure_ascii=False)
print(f'   Rapport JSON sauvegardé : {os.path.abspath(report_path)}')

if drift_detected:
    logger.warning(f'[DRIFT] Score={overall_drift_score:.4f} > seuil=0.15 — Dérive détectée !')
    if args.retrain:
        print('\n   🔄 Déclenchement du réentraînement automatique...')
        try:
            import requests
            resp = requests.post(f'{args.api}/api/retrain', timeout=300)
            if resp.ok:
                print('   ✅ Réentraînement déclenché avec succès !')
            else:
                print(f'   ❌ Erreur réentraînement : {resp.status_code}')
        except Exception as re_err:
            print(f'   ❌ Impossible de déclencher le réentraînement : {re_err}')
    else:
        print('\n   💡 Pour déclencher le réentraînement automatique :')
        print('      python backend/scripts/monitor_drift.py --retrain')
else:
    logger.info(f'[DRIFT] Score={overall_drift_score:.4f} — Données stables, aucune action requise.')

print('\n' + '=' * 65)
print(f'  DRIFT MONITOR TERMINÉ — Score={overall_drift_score:.4f} | Statut={"DÉRIVE" if drift_detected else "STABLE"}')
print('=' * 65)
