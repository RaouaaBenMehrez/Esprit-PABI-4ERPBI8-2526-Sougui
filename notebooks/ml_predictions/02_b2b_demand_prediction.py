"""
NOTEBOOK ML #2 — B2B Demand Prediction
Objectif : Prédire la demande B2B (revenue) pour les 3 prochains mois
Modèle   : XGBoost Regressor
Input    : secteur, gouvernorat, mois, type_canal, historique CA
Output   : CA prédit B2B + intervalle confiance
"""
import pandas as pd
import numpy as np
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, r2_score
import pickle, os, json

DATA  = os.path.join(os.path.dirname(__file__), '../../ai-agent/data')
MODEL = os.path.join(os.path.dirname(__file__), '../../models')
os.makedirs(MODEL, exist_ok=True)

# ─── 1. Chargement ────────────────────────────────────────────────────────────
fv   = pd.read_csv(f'{DATA}/Fact_Vente.csv')
dim_c = pd.read_csv(f'{DATA}/Dim_Client.csv')
dim_d = pd.read_csv(f'{DATA}/Dim_Date.csv')
dim_canal = pd.read_csv(f'{DATA}/Dim_Canal_Distribution.csv')

# Filtrer B2B uniquement
b2b_clients = dim_c[dim_c['Type_client'] == 'B2B']
fv_b2b = fv.merge(b2b_clients[['Client_key','Nom_client','Gouvernorat','Secteur_Activite','Mode_Paiement']],
                  left_on='client_key', right_on='Client_key')
fv_b2b = fv_b2b.merge(dim_d[['date_key','mois','trimestre','annee','saison','est_ramadan']],
                       on='date_key')
fv_b2b = fv_b2b.merge(dim_canal[['canal_key','type_canal']], on='canal_key', how='left')

print(f"Dataset B2B: {len(fv_b2b)} transactions, {len(b2b_clients)} clients")

# ─── 2. Feature Engineering ───────────────────────────────────────────────────
le_gov  = LabelEncoder()
le_sec  = LabelEncoder()
le_pay  = LabelEncoder()
le_canal= LabelEncoder()
le_sais = LabelEncoder()

fv_b2b['Gouvernorat']      = fv_b2b['Gouvernorat'].fillna('Tunis').str.strip().str.title()
fv_b2b['Secteur_Activite'] = fv_b2b['Secteur_Activite'].fillna('Autre')
fv_b2b['Mode_Paiement']    = fv_b2b['Mode_Paiement'].fillna('Virement')
fv_b2b['type_canal']       = fv_b2b['type_canal'].fillna('B2B')
fv_b2b['saison']           = fv_b2b['saison'].fillna('Ete')

fv_b2b['gov_enc']   = le_gov.fit_transform(fv_b2b['Gouvernorat'])
fv_b2b['sec_enc']   = le_sec.fit_transform(fv_b2b['Secteur_Activite'])
fv_b2b['pay_enc']   = le_pay.fit_transform(fv_b2b['Mode_Paiement'])
fv_b2b['canal_enc'] = le_canal.fit_transform(fv_b2b['type_canal'])
fv_b2b['sais_enc']  = le_sais.fit_transform(fv_b2b['saison'])
fv_b2b['is_ramadan']= fv_b2b['est_ramadan'].astype(int)
fv_b2b['qty_log']   = np.log1p(fv_b2b['quantite'])

# Historique CA client (rolling)
fv_b2b = fv_b2b.sort_values(['client_key','date_key'])
fv_b2b['ca_cumul_client'] = fv_b2b.groupby('client_key')['revenue'].cumsum().shift(1).fillna(0)
fv_b2b['nb_cmd_client']   = fv_b2b.groupby('client_key').cumcount()

features = [
    'gov_enc','sec_enc','pay_enc','canal_enc','sais_enc',
    'mois','trimestre','is_ramadan',
    'quantite','qty_log','ca_cumul_client','nb_cmd_client'
]

X = fv_b2b[features].fillna(0)
y = fv_b2b['revenue'].clip(0)   # Pas de revenus négatifs dans la prédiction

# ─── 3. Entraînement XGBoost ──────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = XGBRegressor(
    n_estimators=200, max_depth=5, learning_rate=0.05,
    subsample=0.8, colsample_bytree=0.8, random_state=42, verbosity=0
)
model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

y_pred = model.predict(X_test)
mae  = mean_absolute_error(y_test, y_pred)
r2   = r2_score(y_test, y_pred)
print(f"\nMAE: {mae:.2f} DT")
print(f"R²:  {r2:.4f}")

# Importance features
feat_imp = dict(zip(features, model.feature_importances_.round(4).tolist()))
print(f"Feature importance: {feat_imp}")

# ─── 4. Sauvegarde ────────────────────────────────────────────────────────────
encoders = {
    'le_gov':  le_gov,  'le_sec': le_sec,
    'le_pay':  le_pay,  'le_canal': le_canal,
    'le_sais': le_sais,
    'gouvernorats': list(le_gov.classes_),
    'secteurs':     list(le_sec.classes_),
    'paiements':    list(le_pay.classes_),
    'saisons':      list(le_sais.classes_),
    'features':     features
}

with open(f'{MODEL}/b2b_demand_xgb_v1.pkl', 'wb') as f:
    pickle.dump(model, f)
with open(f'{MODEL}/b2b_demand_encoders_v1.pkl', 'wb') as f:
    pickle.dump(encoders, f)

# Stats par secteur pour le formulaire
stats_secteur = fv_b2b.groupby('Secteur_Activite')['revenue'].agg(['mean','sum','count']).reset_index()

with open(f'{MODEL}/b2b_demand_metadata.json', 'w', encoding='utf-8') as f:
    json.dump({
        'mae': round(mae, 2),
        'r2':  round(r2, 4),
        'gouvernorats': list(le_gov.classes_),
        'secteurs':     list(le_sec.classes_),
        'paiements':    list(le_pay.classes_),
        'saisons':      list(le_sais.classes_),
        'features':     features,
        'feature_importance': feat_imp,
        'n_transactions': len(fv_b2b),
        'n_clients_b2b':  int(len(b2b_clients))
    }, f, ensure_ascii=False)

print(f"\n✅ Modèle B2B Demand sauvegardé : models/b2b_demand_xgb_v1.pkl (R²={r2:.4f})")
