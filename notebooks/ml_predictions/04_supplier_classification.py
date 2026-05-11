"""
NOTEBOOK ML #4 — Supplier Classification (Scoring Fournisseurs)
Objectif : Classifier les fournisseurs par performance (A/B/C)
Modèle   : KMeans Clustering + scoring analytique
Input    : volume_achat, montant_total, specialite, pays
Output   : score performance + classe (Stratégique/Standard/À Revoir)
"""
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import silhouette_score
import pickle, os, json

DATA  = os.path.join(os.path.dirname(__file__), '../../ai-agent/data')
MODEL = os.path.join(os.path.dirname(__file__), '../../models')
os.makedirs(MODEL, exist_ok=True)

# ─── 1. Chargement ────────────────────────────────────────────────────────────
fa   = pd.read_csv(f'{DATA}/Fact_Achat.csv')
dim_f = pd.read_csv(f'{DATA}/Dim_Fournisseur.csv')
dim_d = pd.read_csv(f'{DATA}/Dim_Date.csv')

df = fa.merge(dim_f[['Fournisseur_key','Nom_Fournisseur','Nom_Normalise','Type_Fournisseur','Specialite','Pays']],
              left_on='fournisseur_key', right_on='Fournisseur_key', how='left')

# id_date format: YYYYMMDD (ex: 20250420)
df['date_complete'] = pd.to_datetime(df['id_date'].astype(str), format='%Y%m%d', errors='coerce')

print(f"Dataset achats: {len(df)} transactions, {df['fournisseur_key'].nunique()} fournisseurs")

# ─── 2. Agrégation par fournisseur ────────────────────────────────────────────
ref_date = df['date_complete'].max()

supplier_stats = df.groupby('fournisseur_key').agg(
    nb_achats        = ('achat_key', 'count'),
    montant_total    = ('montant_ttc', 'sum'),
    montant_moyen    = ('montant_ttc', 'mean'),
    recency_days     = ('date_complete', lambda x: (ref_date - x.max()).days if x.notna().any() else 999),
    nb_matieres      = ('mp_key', 'nunique'),
    qty_totale       = ('quantite_achetee', 'sum')
).reset_index()

supplier_stats = supplier_stats.merge(
    dim_f[['Fournisseur_key','Nom_Fournisseur','Nom_Normalise','Type_Fournisseur','Specialite','Pays']],
    left_on='fournisseur_key', right_on='Fournisseur_key', how='left'
)

print(f"\nStats fournisseurs:\n{supplier_stats[['Nom_Normalise','nb_achats','montant_total']].head(10).to_string()}")

# ─── 3. Scoring analytique multi-critères ────────────────────────────────────
# Score Volume (30%)
max_mt = supplier_stats['montant_total'].max()
supplier_stats['score_volume'] = (supplier_stats['montant_total'] / max_mt * 100).round(1)

# Score Fréquence (25%)
max_na = supplier_stats['nb_achats'].max()
supplier_stats['score_frequence'] = (supplier_stats['nb_achats'] / max_na * 100).round(1)

# Score Récence (25%) — moins de jours = meilleur
max_rec = supplier_stats['recency_days'].max()
supplier_stats['score_recence'] = ((1 - supplier_stats['recency_days'] / max_rec) * 100).round(1)

# Score Diversité (20%) — diversité matières premières
max_mat = supplier_stats['nb_matieres'].max()
supplier_stats['score_diversite'] = (supplier_stats['nb_matieres'] / max(max_mat, 1) * 100).round(1)

# Score Global pondéré
supplier_stats['score_global'] = (
    supplier_stats['score_volume']    * 0.30 +
    supplier_stats['score_frequence'] * 0.25 +
    supplier_stats['score_recence']   * 0.25 +
    supplier_stats['score_diversite'] * 0.20
).round(1)

# Classification
supplier_stats['classe'] = pd.cut(
    supplier_stats['score_global'],
    bins=[0, 30, 60, 100],
    labels=['À Revoir', 'Standard', 'Stratégique']
)

print(f"\nDistribution classes:\n{supplier_stats['classe'].value_counts()}")

# ─── 4. KMeans pour clustering avancé ────────────────────────────────────────
features_km = ['score_volume', 'score_frequence', 'score_recence', 'score_diversite']
X = supplier_stats[features_km].fillna(0)

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Trouver le bon k (elbow method simplifié)
best_k, best_sil = 3, -1
for k in [2, 3, 4]:
    km = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = km.fit_predict(X_scaled)
    sil = silhouette_score(X_scaled, labels) if len(set(labels)) > 1 else 0
    print(f"k={k}: silhouette={sil:.4f}")
    if sil > best_sil:
        best_sil, best_k = sil, k

model_km = KMeans(n_clusters=best_k, random_state=42, n_init=10)
supplier_stats['cluster'] = model_km.fit_predict(X_scaled)

cluster_names = {}
for c in range(best_k):
    mean_score = supplier_stats[supplier_stats['cluster']==c]['score_global'].mean()
    if mean_score >= 60:   cluster_names[c] = 'Strategique'
    elif mean_score >= 30: cluster_names[c] = 'Standard'
    else:                  cluster_names[c] = 'A Revoir'

supplier_stats['cluster_nom'] = supplier_stats['cluster'].map(cluster_names).fillna('Standard')

# Convertir classe en string pour éviter erreur Categorical
supplier_stats['classe'] = supplier_stats['classe'].astype(str)

# ─── 5. Sauvegarde ────────────────────────────────────────────────────────────
le_spec = LabelEncoder()
supplier_stats['Specialite'] = supplier_stats['Specialite'].fillna('Autre')
supplier_stats['spec_enc']   = le_spec.fit_transform(supplier_stats['Specialite'])

artifacts = {
    'model_km':     model_km,
    'scaler':       scaler,
    'le_spec':      le_spec,
    'cluster_names':cluster_names,
    'features':     features_km,
    'specialites':  list(le_spec.classes_)
}

with open(f'{MODEL}/supplier_scoring_v1.pkl', 'wb') as f:
    pickle.dump(artifacts, f)

# Data des fournisseurs pour le formulaire
suppliers_data = supplier_stats[[
    'fournisseur_key','Nom_Normalise','Type_Fournisseur','Specialite','Pays',
    'nb_achats','montant_total','score_global','classe','cluster_nom',
    'score_volume','score_frequence','score_recence','score_diversite'
]].fillna('Autre')
suppliers_data['classe'] = suppliers_data['classe'].astype(str)
suppliers_data['cluster_nom'] = suppliers_data['cluster_nom'].astype(str)

with open(f'{MODEL}/supplier_metadata.json', 'w', encoding='utf-8') as f:
    json.dump({
        'n_fournisseurs': len(suppliers_data),
        'best_k': best_k,
        'silhouette': round(best_sil, 4),
        'specialites': list(le_spec.classes_),
        'features': features_km,
        'distribution': supplier_stats['classe'].value_counts().to_dict()
    }, f, ensure_ascii=False, default=str)

# Sauvegarder les données fournisseurs en JSON pour le frontend
suppliers_list = suppliers_data.sort_values('score_global', ascending=False).to_dict('records')
for s in suppliers_list:
    for k, v in s.items():
        if hasattr(v, 'item'): s[k] = v.item()

with open(f'{MODEL}/suppliers_scored.json', 'w', encoding='utf-8') as f:
    json.dump(suppliers_list, f, ensure_ascii=False, default=str)

print(f"\n✅ Modèle Supplier Classification sauvegardé (silhouette={best_sil:.4f})")
print(suppliers_data[['Nom_Normalise','score_global','classe']].sort_values('score_global', ascending=False).head(10).to_string())
