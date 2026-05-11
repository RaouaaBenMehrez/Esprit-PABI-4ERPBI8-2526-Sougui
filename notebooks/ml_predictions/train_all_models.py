"""
Script maître : Entraîne tous les modèles ML de prédiction Sougui.tn
Usage: python train_all_models.py
"""
import subprocess, sys, os, time

notebooks = [
    ('01_best_seller_b2c.py',       'Best Seller B2C'),
    ('02_b2b_demand_prediction.py', 'B2B Demand Prediction'),
    ('03_churn_prediction.py',      'Churn Prediction'),
    ('04_supplier_classification.py','Supplier Classification'),
    ('05_delivery_analysis.py',     'Delivery Analysis'),
    ('06_price_simulator.py',       'Price Simulator'),
]

base = os.path.dirname(os.path.abspath(__file__))
results = []

print("="*60)
print("  SOUGUI.TN — ENTRAÎNEMENT DES MODÈLES ML")
print("="*60)

for script, name in notebooks:
    path = os.path.join(base, script)
    print(f"\n[{'='*50}]")
    print(f"  Modèle : {name}")
    print(f"  Script : {script}")
    print(f"[{'='*50}]")
    
    t0 = time.time()
    try:
        result = subprocess.run(
            [sys.executable, path],
            capture_output=False, text=True,
            cwd=base
        )
        elapsed = time.time() - t0
        if result.returncode == 0:
            results.append((name, '✅ OK', f'{elapsed:.1f}s'))
            print(f"\n  → ✅ Succès en {elapsed:.1f}s")
        else:
            results.append((name, '❌ ERREUR', f'{elapsed:.1f}s'))
            print(f"\n  → ❌ Erreur (code={result.returncode})")
    except Exception as e:
        results.append((name, f'❌ {str(e)[:30]}', '-'))
        print(f"\n  → ❌ Exception: {e}")

print("\n" + "="*60)
print("  RÉSUMÉ FINAL")
print("="*60)
for name, status, elapsed in results:
    print(f"  {status} {name} ({elapsed})")

print("\n  Fichiers .pkl générés dans /models/")
import os
models_dir = os.path.join(os.path.dirname(base), '..', 'models')
if os.path.exists(models_dir):
    pkls = [f for f in os.listdir(models_dir) if f.endswith('.pkl')]
    print(f"  Total: {len(pkls)} fichiers .pkl")
    for p in sorted(pkls):
        size = os.path.getsize(os.path.join(models_dir, p))
        print(f"    - {p} ({size//1024} KB)")
