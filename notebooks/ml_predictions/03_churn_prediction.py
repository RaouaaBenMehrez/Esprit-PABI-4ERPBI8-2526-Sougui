"""
NOTEBOOK ML #3 — Client Churn Prediction (UNIQUE — pas chez les concurrents)
Objectif : Prédire si un client va partir (churn) dans les 90 prochains jours
Modèle   : Random Forest Classifier + features RFM
Input    : recency, frequency, monetary, secteur, gouvernorat
Output   : risque churn (0-100%) + segment (Fidèle/À risque/Perdu)
"""
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import classification_report, roc_auc_score
import pickle, os, json
from datetime import datetime, timedelta

DATA  = os.path.join(os.path.dirname(__file__), '../../ai-agent/data')
MODEL = os.path.join(os.path.dirname(__file__), '../../models')
os.makedirs(MODEL, exist_ok=True)

# ─── 1. Chargement ────────────────────────────────────────────────────────────
fv   = pd.read_csv(f'{DATA}/Fact_Vente.csv')
dim_c = pd.read_csv(f'{DATA}/Dim_Client.csv')
dim_d = pd.read_csv(f'{DATA}/Dim_Date.csv')

df = fv.merge(dim_c[['Client_key','Nom_client','Type_client','Gouvernorat','Secteur_Activite']],
              left_on='client_key', right_on='Client_key')
df = df.merge(dim_d[['date_key','date_complete']], on='date_key')
df['date_complete'] = pd.to_datetime(df['date_complete'])
df = df[df['revenue'] > 0]

# ─── 2. Calcul RFM ────────────────────────────────────────────────────────────
reference_date = df['date_complete'].max()

rfm = df.groupby('client_key').agg(
    recency   = ('date_complete', lambda x: (reference_date - x.max()).days),
    frequency = ('vente_key', 'count'),
    monetary  = ('revenue', 'sum'),
    last_date = ('date_complete', 'max'),
    first_date= ('date_complete', 'min')
).reset_index()

# Features supplémentaires
rfm['tenure_days']     = (reference_date - rfm['first_date']).dt.days
rfm['avg_order_value'] = rfm['monetary'] / rfm['frequency']
rfm['purchase_rate']   = rfm['frequency'] / (rfm['tenure_days'] + 1) * 30  # cmd/mois

# Merge avec infos client
rfm = rfm.merge(dim_c[['Client_key','Type_client','Gouvernorat','Secteur_Activite']],
                left_on='client_key', right_on='Client_key', how='left')

# ─── 3. Définir le CHURN (adapté aux données réelles) ──────────────────────
# Churn = recency dans le top 40% (clients les plus inactifs) ET frequence faible
recency_q60  = rfm['recency'].quantile(0.60)
frequency_q40 = rfm['frequency'].quantile(0.40)

rfm['is_churn'] = (
    (rfm['recency'] > recency_q60) &
    (rfm['frequency'] <= frequency_q40)
).astype(int)

# Assurer au moins 10% de churns pour l'entraînement
if rfm['is_churn'].mean() < 0.05:
    # Fallback: top 35% les plus inactifs sont "churn"
    rfm['is_churn'] = (rfm['recency'] > rfm['recency'].quantile(0.65)).astype(int)

print(f"Dataset: {len(rfm)} clients")
print(f"Churned: {rfm['is_churn'].sum()} ({rfm['is_churn'].mean()*100:.0f}%)")
print(f"Recency mediane: {rfm['recency'].median():.0f} jours")

# ─── 4. Feature Engineering ───────────────────────────────────────────────────
le_gov = LabelEncoder()
le_sec = LabelEncoder()
le_typ = LabelEncoder()

rfm['Gouvernorat']      = rfm['Gouvernorat'].fillna('Tunis').str.strip().str.title()
rfm['Secteur_Activite'] = rfm['Secteur_Activite'].fillna('Particulier')
rfm['Type_client']      = rfm['Type_client'].fillna('B2C')

rfm['gov_enc'] = le_gov.fit_transform(rfm['Gouvernorat'])
rfm['sec_enc'] = le_sec.fit_transform(rfm['Secteur_Activite'])
rfm['typ_enc'] = le_typ.fit_transform(rfm['Type_client'])

# Scores RFM normalisés
# Scores RFM normalisés (safe pour petits datasets)
def safe_qcut(series, n, labels):
    try:
        return pd.qcut(series, n, labels=labels[:n-1] if len(labels)>=n-1 else labels, duplicates='drop').astype(float)
    except:
        # Fallback: classement simple normalisé
        return ((series.rank(pct=True) * (len(labels)-1)).round().astype(int).clip(1, len(labels)).astype(float))

rfm['r_score'] = safe_qcut(rfm['recency'],   5, [5,4,3,2,1])
rfm['f_score'] = safe_qcut(rfm['frequency'], 5, [1,2,3,4,5])
rfm['m_score'] = safe_qcut(rfm['monetary'],  5, [1,2,3,4,5])

features = [
    'recency','frequency','monetary',
    'r_score','f_score','m_score',
    'tenure_days','avg_order_value','purchase_rate',
    'gov_enc','sec_enc','typ_enc'
]

X = rfm[features].fillna(0)
y = rfm['is_churn']

# ─── 5. Entraînement ──────────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25,
                                                      stratify=y, random_state=42)

scaler = StandardScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s  = scaler.transform(X_test)

model = GradientBoostingClassifier(
    n_estimators=150, max_depth=4, learning_rate=0.1,
    subsample=0.8, random_state=42
)
model.fit(X_train_s, y_train)

y_prob = model.predict_proba(X_test_s)[:,1]
y_pred = model.predict(X_test_s)

auc = roc_auc_score(y_test, y_prob)
print(f"\nAUC-ROC: {auc:.4f}")
print(classification_report(y_test, y_pred))

# ─── 6. Sauvegarde ────────────────────────────────────────────────────────────
encoders = {
    'le_gov': le_gov, 'le_sec': le_sec, 'le_typ': le_typ,
    'scaler': scaler,
    'gouvernorats': list(le_gov.classes_),
    'secteurs':     list(le_sec.classes_),
    'types':        list(le_typ.classes_),
    'features':     features,
    'reference_date': str(reference_date.date())
}

with open(f'{MODEL}/churn_prediction_v1.pkl', 'wb') as f:
    pickle.dump(model, f)
with open(f'{MODEL}/churn_encoders_v1.pkl', 'wb') as f:
    pickle.dump(encoders, f)

# Stats pour le dashboard
rfm['churn_proba'] = model.predict_proba(scaler.transform(X.fillna(0)))[:,1]
rfm['churn_segment'] = pd.cut(rfm['churn_proba'],
    bins=[0, 0.3, 0.6, 1.0],
    labels=['Fidèle', 'À Risque', 'Perdu'])

top_churn = rfm[rfm['churn_proba'] > 0.6][['client_key','recency','frequency','monetary','churn_proba']]\
    .sort_values('churn_proba', ascending=False).head(10)
print(f"\nTop 10 clients à risque:\n{top_churn}")

with open(f'{MODEL}/churn_metadata.json', 'w', encoding='utf-8') as f:
    json.dump({
        'auc': round(auc, 4),
        'n_clients': len(rfm),
        'n_churned': int(rfm['is_churn'].sum()),
        'churn_rate': round(rfm['is_churn'].mean() * 100, 1),
        'gouvernorats': list(le_gov.classes_),
        'secteurs':     list(le_sec.classes_),
        'types':        list(le_typ.classes_),
        'features':     features,
        'reference_date': str(reference_date.date())
    }, f, ensure_ascii=False)

print(f"\n✅ Modèle Churn sauvegardé : models/churn_prediction_v1.pkl (AUC={auc:.4f})")
