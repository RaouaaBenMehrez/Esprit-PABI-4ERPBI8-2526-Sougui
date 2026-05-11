"""
NOTEBOOK ML #5 — Delivery Analysis (comme le screenshot concurrent)
Objectif : Calculer distance + estimer coût livraison depuis l'entrepôt Sougui
Modèle   : Linear Regression (coût livraison) + haversine distance
Input    : gouvernorat/ville client (sélection dans formulaire)
Output   : distance km + coût estimé DT + zone proximité
"""
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, r2_score
import pickle, os, json, math

DATA  = os.path.join(os.path.dirname(__file__), '../../ai-agent/data')
MODEL = os.path.join(os.path.dirname(__file__), '../../models')
os.makedirs(MODEL, exist_ok=True)

# ─── Coordonnées de l'entrepôt Sougui (Tunis) ────────────────────────────────
SOUGUI_LAT = 36.8065
SOUGUI_LNG = 10.1815

# ─── Coordonnées GPS par gouvernorat tunisien ─────────────────────────────────
COORDS_GOUVERNORATS = {
    # Grand Tunis
    'Tunis':       (36.8065, 10.1815),
    'Ariana':      (36.8665, 10.1647),
    'Ben Arous':   (36.7533, 10.2281),
    'La Marsa':    (36.8783, 10.3253),
    'Manouba':     (36.8089, 10.0975),
    'Bardo':       (36.8094, 10.1408),
    'Carthage':    (36.8575, 10.3246),
    'El Kram':     (36.8375, 10.3167),
    'Kram':        (36.8375, 10.3167),
    'Belvédère':   (36.8200, 10.1700),
    # Nord
    'Bizerte':     (37.2744, 9.8739),
    'Béja':        (36.7256, 9.1817),
    'Beja':        (36.7256, 9.1817),
    'Jendouba':    (36.5011, 8.7803),
    'Kef':         (36.1824, 8.7147),
    'Siliana':     (36.0842, 9.3747),
    # Centre-Nord
    'Sousse':      (35.8288, 10.6405),
    'Monastir':    (35.7643, 10.8113),
    'Mahdia':      (35.5047, 11.0622),
    'Kairouan':    (35.6781, 10.0963),
    # Centre
    'Kasserine':   (35.1667, 8.8333),
    'Sidi Bouzid': (35.0381, 9.4858),
    # Sfax
    'Sfax':        (34.7406, 10.7603),
    # Sud
    'Gabès':       (33.8814, 10.0981),
    'Médenine':    (33.3549, 10.5055),
    'Tataouine':   (32.9211, 10.4508),
    'Gafsa':       (34.4250, 8.7842),
    'Tozeur':      (33.9197, 8.1335),
    'Kébili':      (33.7042, 8.9689),
    'Zaghouan':    (36.4028, 10.1433),
    'Nabeul':      (36.4561, 10.7376),
    # Autres
    'Place Pasteur': (36.8100, 10.1900),
    'Mourouj':       (36.7167, 10.2167),
    'La Soukra':     (36.8967, 10.2150),
    'Raoued':        (36.8833, 10.1833),
    'Ezzahra':       (36.7667, 10.2500),
    'Msaken':        (35.7300, 10.5600),
    'Hammam Sousse': (35.8600, 10.5900),
    'Hammam-Lif':    (36.7250, 10.3167),
}

# ─── Fonction Haversine ───────────────────────────────────────────────────────
def haversine(lat1, lng1, lat2, lng2):
    """Calcul de la distance en km entre deux coordonnées GPS."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * \
        math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    return R * 2 * math.asin(math.sqrt(a))

# ─── 1. Construire le dataset de livraison ────────────────────────────────────
fv   = pd.read_csv(f'{DATA}/Fact_Vente.csv')
dim_c = pd.read_csv(f'{DATA}/Dim_Client.csv')
dim_cmd = pd.read_csv(f'{DATA}/Dim_Commandes.csv')

df = fv.merge(dim_c[['Client_key','Nom_client','Type_client','Ville','Gouvernorat']],
              left_on='client_key', right_on='Client_key')
df = df.merge(dim_cmd[['Commande_key','Frais_livraison','Methode_livraison']],
              left_on='commande_key', right_on='Commande_key', how='left')

# Normaliser gouvernorats
df['Gouvernorat'] = df['Gouvernorat'].fillna('Tunis').str.strip().str.title()

# Calculer distance pour chaque client
def get_coords(gouvernorat):
    gov = gouvernorat.strip().title()
    # Essai direct
    if gov in COORDS_GOUVERNORATS:
        return COORDS_GOUVERNORATS[gov]
    # Essai partiel
    for key in COORDS_GOUVERNORATS:
        if key.lower() in gov.lower() or gov.lower() in key.lower():
            return COORDS_GOUVERNORATS[key]
    return COORDS_GOUVERNORATS['Tunis']  # Défaut

df['lat'] = df['Gouvernorat'].apply(lambda g: get_coords(g)[0])
df['lng'] = df['Gouvernorat'].apply(lambda g: get_coords(g)[1])
df['distance_km'] = df.apply(
    lambda r: haversine(SOUGUI_LAT, SOUGUI_LNG, r['lat'], r['lng']), axis=1
).round(2)

# Frais livraison (si disponible dans les données)
df['Frais_livraison'] = pd.to_numeric(df['Frais_livraison'], errors='coerce').fillna(0)
df['has_delivery'] = (df['Frais_livraison'] > 0).astype(int)

print(f"Dataset livraison: {len(df)} transactions")
print(f"Distance moyenne: {df['distance_km'].mean():.1f} km")
print(f"Max distance: {df['distance_km'].max():.1f} km")

# ─── 2. Modèle de prédiction du coût ─────────────────────────────────────────
# Tarification Sougui basée sur les données réelles
# Base: 1.5 DT/km + frais fixes selon zone

def estimate_cost(distance_km, revenue=0):
    """Estimation du coût de livraison basée sur la distance."""
    if distance_km <= 5:
        return round(1.5 + distance_km * 0.2, 2)   # Zone locale
    elif distance_km <= 20:
        return round(3.0 + distance_km * 0.15, 2)   # Grand Tunis
    elif distance_km <= 100:
        return round(8.0 + distance_km * 0.12, 2)   # Régional
    else:
        return round(15.0 + distance_km * 0.10, 2)  # National

df['cout_estime'] = df['distance_km'].apply(estimate_cost)

# Train un modèle de régression sur les vraies données (si frais disponibles)
df_with_frais = df[df['Frais_livraison'] > 0].copy()
print(f"\nTransactions avec frais de livraison: {len(df_with_frais)}")

if len(df_with_frais) >= 10:
    le_gov = LabelEncoder()
    le_met = LabelEncoder()
    df_with_frais['gov_enc'] = le_gov.fit_transform(df_with_frais['Gouvernorat'])
    df_with_frais['Methode_livraison'] = df_with_frais['Methode_livraison'].fillna('Standard')
    df_with_frais['met_enc'] = le_met.fit_transform(df_with_frais['Methode_livraison'])

    X_lr = df_with_frais[['distance_km', 'gov_enc', 'met_enc', 'revenue']].fillna(0)
    y_lr = df_with_frais['Frais_livraison']

    model_lr = LinearRegression()
    model_lr.fit(X_lr, y_lr)
    r2 = r2_score(y_lr, model_lr.predict(X_lr))
    print(f"Régression coût livraison R²={r2:.4f}")
    trained_model = model_lr
    trained_encoders = {'le_gov': le_gov, 'le_met': le_met}
else:
    trained_model = None
    trained_encoders = {}
    print("Pas assez de données avec frais → utilisation du modèle analytique")

# ─── 3. Préparer la liste clients pour le formulaire ─────────────────────────
clients_list = dim_c[['Client_key','Nom_client','Type_client','Ville','Gouvernorat']].copy()
clients_list['Gouvernorat'] = clients_list['Gouvernorat'].fillna('Tunis').str.strip().str.title()
clients_list['lat'] = clients_list['Gouvernorat'].apply(lambda g: get_coords(g)[0])
clients_list['lng'] = clients_list['Gouvernorat'].apply(lambda g: get_coords(g)[1])
clients_list['distance_km'] = clients_list.apply(
    lambda r: haversine(SOUGUI_LAT, SOUGUI_LNG, r['lat'], r['lng']), axis=1
).round(2)
clients_list['cout_estime'] = clients_list['distance_km'].apply(estimate_cost)
clients_list['zone'] = clients_list['distance_km'].apply(
    lambda d: 'Proximité' if d <= 20 else ('Régionale' if d <= 100 else 'Nationale')
)

# ─── 4. Sauvegarde ────────────────────────────────────────────────────────────
delivery_artifacts = {
    'model_lr':  trained_model,
    'encoders':  trained_encoders,
    'coords':    COORDS_GOUVERNORATS,
    'sougui_lat': SOUGUI_LAT,
    'sougui_lng': SOUGUI_LNG,
    'estimate_formula': {
        'zone_locale':    {'max_km': 5,   'base': 1.5,  'per_km': 0.2},
        'grand_tunis':    {'max_km': 20,  'base': 3.0,  'per_km': 0.15},
        'regional':       {'max_km': 100, 'base': 8.0,  'per_km': 0.12},
        'national':       {'max_km': 9999,'base': 15.0, 'per_km': 0.10},
    }
}

with open(f'{MODEL}/delivery_analysis_v1.pkl', 'wb') as f:
    pickle.dump(delivery_artifacts, f)

# JSON des clients pour le formulaire frontend
clients_json = clients_list.sort_values('Nom_client').to_dict('records')
for c in clients_json:
    for k, v in c.items():
        if hasattr(v, 'item'): c[k] = v.item()

with open(f'{MODEL}/delivery_clients.json', 'w', encoding='utf-8') as f:
    json.dump(clients_json, f, ensure_ascii=False, default=str)

with open(f'{MODEL}/delivery_metadata.json', 'w', encoding='utf-8') as f:
    json.dump({
        'sougui_warehouse': {'lat': SOUGUI_LAT, 'lng': SOUGUI_LNG, 'address': 'Tunis, Tunisie'},
        'n_clients': len(clients_list),
        'gouvernorats': COORDS_GOUVERNORATS,
        'zones': {
            'Proximité':  {'max_km': 20,  'description': 'Grand Tunis — livraison rapide'},
            'Régionale':  {'max_km': 100, 'description': 'Nord/Centre Tunisie'},
            'Nationale':  {'max_km': 9999,'description': 'Sud Tunisie et autres'},
        }
    }, f, ensure_ascii=False)

print(f"\n✅ Delivery Analysis sauvegardé : {len(clients_list)} clients géolocalisés")
print(clients_list[['Nom_client','Gouvernorat','distance_km','cout_estime','zone']].head(10).to_string())
