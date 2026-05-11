"""
NOTEBOOK ML #6 — Price Simulator (Impact Changement de Prix)
Objectif : Simuler l'impact d'un changement de prix sur les ventes et le CA
Modèle   : ElasticNet Regression (élasticité-prix) + simulation Monte Carlo
Input    : produit, nouveau_prix, horizon_mois
Output   : delta_ventes%, delta_CA_DT, nouveau_CA_estimé, recommandation
"""
import pandas as pd
import numpy as np
from sklearn.linear_model import ElasticNet, Ridge
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import r2_score, mean_absolute_error
import pickle, os, json

DATA  = os.path.join(os.path.dirname(__file__), '../../ai-agent/data')
MODEL = os.path.join(os.path.dirname(__file__), '../../models')
os.makedirs(MODEL, exist_ok=True)

# ─── 1. Chargement ────────────────────────────────────────────────────────────
fv   = pd.read_csv(f'{DATA}/Fact_Vente.csv')
prod = pd.read_csv(f'{DATA}/products.csv')
dim_d = pd.read_csv(f'{DATA}/Dim_Date.csv')
dim_c = pd.read_csv(f'{DATA}/Dim_Client.csv')

df = fv.merge(prod[['Produit_key','Categorie','Matiere','Prix_Vente_HT','Prix_Promo']],
              left_on='produit_key', right_on='Produit_key', how='left')
df = df.merge(dim_d[['date_key','mois','trimestre','annee','saison']],
              on='date_key', how='left')
df = df.merge(dim_c[['Client_key','Type_client','Gouvernorat']],
              left_on='client_key', right_on='Client_key', how='left')

df['Prix_Vente_HT'] = pd.to_numeric(df['Prix_Vente_HT'], errors='coerce').fillna(0)
df['Prix_Promo']    = pd.to_numeric(df['Prix_Promo'], errors='coerce').fillna(0)
df['prix_effectif'] = df.apply(
    lambda r: r['Prix_Promo'] if r['Prix_Promo'] > 0 else r['Prix_Vente_HT'], axis=1
)
df = df[df['prix_effectif'] > 0]
df = df[df['revenue'] > 0]

print(f"Dataset price: {len(df)} transactions avec prix > 0")

# ─── 2. Calcul de l'élasticité prix par catégorie ────────────────────────────
# Agrégation mensuelle par produit
df['periode'] = df['annee'].astype(str) + '-' + df['mois'].astype(str).str.zfill(2)

agg = df.groupby(['produit_key','periode','prix_effectif','Categorie','Matiere']).agg(
    qty_vendue = ('quantite', 'sum'),
    ca_total   = ('revenue', 'sum'),
    nb_cmd     = ('vente_key', 'count')
).reset_index()

# Calculer variation prix/qty pour l'élasticité
agg = agg.sort_values(['produit_key','periode'])
agg['delta_prix_pct'] = agg.groupby('produit_key')['prix_effectif'].pct_change() * 100
agg['delta_qty_pct']  = agg.groupby('produit_key')['qty_vendue'].pct_change() * 100

# Élasticité = delta_qty% / delta_prix%
agg_valid = agg.dropna(subset=['delta_prix_pct','delta_qty_pct'])
agg_valid = agg_valid[agg_valid['delta_prix_pct'] != 0]
agg_valid['elasticite'] = agg_valid['delta_qty_pct'] / agg_valid['delta_prix_pct']
agg_valid['elasticite'] = agg_valid['elasticite'].clip(-10, 10)

elasticite_par_cat = agg_valid.groupby('Categorie')['elasticite'].median().to_dict()
print(f"\nÉlasticité par catégorie:\n{elasticite_par_cat}")

# ─── 3. Modèle Ridge Regression (qty ~ prix + features) ─────────────────────
le_cat = LabelEncoder()
le_mat = LabelEncoder()
le_sai = LabelEncoder()

df['Categorie'] = df['Categorie'].fillna('Non catalogué')
df['Matiere']   = df['Matiere'].fillna('Autre')
df['saison']    = df['saison'].fillna('Ete')

df['cat_enc'] = le_cat.fit_transform(df['Categorie'])
df['mat_enc'] = le_mat.fit_transform(df['Matiere'])
df['sai_enc'] = le_sai.fit_transform(df['saison'])
df['log_prix']= np.log1p(df['prix_effectif'])

features = ['log_prix', 'cat_enc', 'mat_enc', 'sai_enc', 'mois', 'trimestre']
X = df[features].fillna(0)
y = np.log1p(df['quantite'])  # log transform

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

model = Ridge(alpha=1.0)
model.fit(X_scaled, y)

r2 = r2_score(y, model.predict(X_scaled))
print(f"\nRidge Regression R²={r2:.4f}")
print(f"Coefficients: {dict(zip(features, model.coef_.round(3)))}")

# ─── 4. Statistiques produits pour simulation ─────────────────────────────────
prod_stats = df.groupby(['produit_key','Categorie','Matiere','prix_effectif']).agg(
    qty_moy     = ('quantite', 'mean'),
    ca_moy      = ('revenue', 'mean'),
    qty_total   = ('quantite', 'sum'),
    ca_total    = ('revenue', 'sum'),
    nb_mois_actif = ('periode', 'nunique')
).reset_index()

prod_stats = prod_stats.merge(
    prod[['Produit_key','Nom_Produit']], 
    left_on='produit_key', right_on='Produit_key', how='left'
)

# ─── 5. Sauvegarde ────────────────────────────────────────────────────────────
price_artifacts = {
    'model_ridge': model,
    'scaler':      scaler,
    'le_cat':      le_cat,
    'le_mat':      le_mat,
    'le_sai':      le_sai,
    'features':    features,
    'elasticites': elasticite_par_cat,
    'r2':          r2
}

with open(f'{MODEL}/price_simulator_v1.pkl', 'wb') as f:
    pickle.dump(price_artifacts, f)

# JSON des produits pour le formulaire
produits_prix = prod_stats[['produit_key','Nom_Produit','Categorie','Matiere',
                              'prix_effectif','qty_moy','ca_moy','qty_total','ca_total']]\
    .dropna(subset=['Nom_Produit'])\
    .sort_values('ca_total', ascending=False)\
    .head(80)\
    .to_dict('records')

for p in produits_prix:
    for k, v in p.items():
        if hasattr(v, 'item'): p[k] = v.item()

with open(f'{MODEL}/price_products.json', 'w', encoding='utf-8') as f:
    json.dump(produits_prix, f, ensure_ascii=False, default=str)

with open(f'{MODEL}/price_metadata.json', 'w', encoding='utf-8') as f:
    json.dump({
        'r2': round(r2, 4),
        'n_produits': len(prod_stats),
        'categories': list(le_cat.classes_),
        'matieres':   list(le_mat.classes_),
        'saisons':    list(le_sai.classes_),
        'elasticites':elasticite_par_cat,
        'features':   features
    }, f, ensure_ascii=False, default=str)

print(f"\n✅ Price Simulator sauvegardé : models/price_simulator_v1.pkl (R²={r2:.4f})")
print(prod_stats[['Nom_Produit','prix_effectif','qty_moy','ca_moy']].head(10).to_string())
