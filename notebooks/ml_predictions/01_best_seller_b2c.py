"""
NOTEBOOK ML #1 — Best Seller B2C Prediction
Objectif : Prédire si un produit sera Best Seller en B2C
Modèle   : Random Forest Classifier
Input    : categorie, prix, matiere, trimestre
Output   : best_seller (1/0) + score confiance
"""
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score
import pickle, os, json

DATA  = os.path.join(os.path.dirname(__file__), '../../ai-agent/data')
MODEL = os.path.join(os.path.dirname(__file__), '../../models')
os.makedirs(MODEL, exist_ok=True)

# ─── 1. Chargement des données ────────────────────────────────────────────────
fv   = pd.read_csv(f'{DATA}/Fact_Vente.csv')
prod = pd.read_csv(f'{DATA}/products.csv')
dim_date = pd.read_csv(f'{DATA}/Dim_Date.csv')
dim_c = pd.read_csv(f'{DATA}/Dim_Client.csv')

# Filtrer B2C
fv_b2c = fv.merge(dim_c[['Client_key','Type_client']], left_on='client_key', right_on='Client_key')
fv_b2c = fv_b2c[fv_b2c['Type_client'] == 'B2C']

# ─── 2. Agrégation par produit ────────────────────────────────────────────────
prod_stats = fv_b2c.groupby('produit_key').agg(
    qty_totale   = ('quantite', 'sum'),
    ca_total     = ('revenue', 'sum'),
    nb_commandes = ('vente_key', 'count'),
    panier_moyen = ('revenue', 'mean')
).reset_index()

# Merger avec infos produit
df = prod_stats.merge(
    prod[['Produit_key','Categorie','Matiere','Prix_Vente_HT','Sous_Categorie']],
    left_on='produit_key', right_on='Produit_key', how='left'
).dropna(subset=['Categorie'])

# ─── 3. Target : Best Seller = top 30% CA ────────────────────────────────────
seuil_ca  = df['ca_total'].quantile(0.70)
seuil_qty = df['qty_totale'].quantile(0.70)
df['is_best_seller'] = ((df['ca_total'] >= seuil_ca) | (df['qty_totale'] >= seuil_qty)).astype(int)

print(f"Dataset: {len(df)} produits B2C")
print(f"Best sellers: {df['is_best_seller'].sum()} ({df['is_best_seller'].mean()*100:.0f}%)")

# ─── 4. Feature Engineering ───────────────────────────────────────────────────
le_cat = LabelEncoder()
le_mat = LabelEncoder()

df['Categorie']  = df['Categorie'].fillna('Non catalogué')
df['Matiere']    = df['Matiere'].fillna('Autre')
df['cat_enc']    = le_cat.fit_transform(df['Categorie'])
df['mat_enc']    = le_mat.fit_transform(df['Matiere'])
df['prix']       = pd.to_numeric(df['Prix_Vente_HT'], errors='coerce').fillna(0)
df['log_prix']   = np.log1p(df['prix'])

features = ['cat_enc', 'mat_enc', 'log_prix', 'nb_commandes']
X = df[features].fillna(0)
y = df['is_best_seller']

# ─── 5. Entraînement ──────────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42)

model = RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42, class_weight='balanced')
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
acc = accuracy_score(y_test, y_pred)
print(f"\nAccuracy: {acc:.2%}")
print(classification_report(y_test, y_pred))

# ─── 6. Sauvegarde ────────────────────────────────────────────────────────────
encoders = {
    'le_cat': le_cat,
    'le_mat': le_mat,
    'categories': list(le_cat.classes_),
    'matieres':   list(le_mat.classes_),
    'features':   features,
    'accuracy':   round(acc, 4)
}

with open(f'{MODEL}/best_seller_b2c_v1.pkl', 'wb') as f:
    pickle.dump(model, f)
with open(f'{MODEL}/best_seller_b2c_encoders_v1.pkl', 'wb') as f:
    pickle.dump(encoders, f)

# Sauvegarder le top produits pour le formulaire
top_produits = df[df['is_best_seller']==1][['produit_key','Categorie','Matiere','prix','qty_totale','ca_total']]\
    .sort_values('ca_total', ascending=False).head(20)

with open(f'{MODEL}/best_seller_b2c_metadata.json', 'w', encoding='utf-8') as f:
    json.dump({
        'accuracy': round(acc, 4),
        'n_produits': len(df),
        'n_best_sellers': int(df['is_best_seller'].sum()),
        'categories': list(le_cat.classes_),
        'matieres':   list(le_mat.classes_),
        'seuil_ca':   round(seuil_ca, 2),
        'seuil_qty':  round(seuil_qty, 2)
    }, f, ensure_ascii=False)

print(f"\n✅ Modèle sauvegardé : models/best_seller_b2c_v1.pkl (accuracy={acc:.2%})")
