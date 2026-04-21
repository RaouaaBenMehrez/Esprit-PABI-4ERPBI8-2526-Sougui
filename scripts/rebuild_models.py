# -*- coding: utf-8 -*-
"""
Reconstruction des modeles ML corrompus - Sougui BI Suite
"""
import os, sys, pickle
import numpy as np
import pandas as pd
import psycopg2

# Force UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

MODELS_DIR = r'C:\Users\NSI\Downloads\Sougui_Website-main-main\Modeles'
DB_CONFIG = {
    "host":     "localhost",
    "port":     5432,
    "dbname":   "sougui_db",
    "user":     "postgres",
    "password": "postgres",
}

def get_db():
    return psycopg2.connect(**DB_CONFIG)

def fetch_df(query):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(query)
        cols = [d[0] for d in cur.description]
        rows = cur.fetchall()
        return pd.DataFrame(rows, columns=cols)
    finally:
        conn.close()

print("=" * 60)
print("REBUILD ML MODELS - Sougui BI Suite")
print("=" * 60)

ok_count = 0
fail_count = 0

# ============================================================
# 1. Prophet CA
# ============================================================
print("\n[1/3] Prophet CA Forecast...")
try:
    from prophet import Prophet

    df_sales = fetch_df("SELECT date, amount FROM sales ORDER BY date")
    df_sales['date'] = pd.to_datetime(df_sales['date'])
    df_monthly = (
        df_sales.groupby(df_sales['date'].dt.to_period('M'))['amount']
        .sum()
        .reset_index()
    )
    df_monthly['date'] = df_monthly['date'].dt.to_timestamp()
    df_prophet = df_monthly.rename(columns={'date': 'ds', 'amount': 'y'})

    print(f"   Data: {len(df_prophet)} months")

    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=False,
        daily_seasonality=False,
        seasonality_mode='multiplicative',
    )
    model.fit(df_prophet)

    out = os.path.join(MODELS_DIR, 'prophet_ca_total_v2.pkl')
    with open(out, 'wb') as f:
        pickle.dump(model, f)
    print(f"   SAVED: {out}")

    # Quick test
    fut = model.make_future_dataframe(periods=3, freq='MS')
    fc  = model.predict(fut)
    vals = fc['yhat'].tail(3).round(0).tolist()
    print(f"   Test forecast next 3 months: {vals}")
    ok_count += 1

except Exception as e:
    print(f"   ERROR Prophet: {e}")
    import traceback; traceback.print_exc()
    fail_count += 1

# ============================================================
# 2. KMeans RFM
# ============================================================
print("\n[2/3] KMeans RFM Segmentation...")
try:
    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler

    # Try to get real client RFM data
    df_clients = fetch_df("""
        SELECT
            c.id,
            c.total_spent,
            COALESCE(COUNT(s.id), 1)::float AS frequence,
            COALESCE(MIN(CURRENT_DATE - s.date::date), 180)::float AS recence
        FROM clients c
        LEFT JOIN sales s ON s.client_id = c.id
        GROUP BY c.id, c.total_spent
    """)

    print(f"   Clients found: {len(df_clients)}")

    if len(df_clients) < 4:
        # Use synthetic data
        print("   Using synthetic data (not enough clients)")
        np.random.seed(42)
        n = 300
        rec = np.concatenate([np.random.uniform(1,30,75), np.random.uniform(30,120,75),
                               np.random.uniform(120,270,75), np.random.uniform(270,365,75)])
        freq = np.concatenate([np.random.uniform(15,50,75), np.random.uniform(5,20,75),
                                np.random.uniform(2,8,75), np.random.uniform(1,3,75)])
        amt  = np.concatenate([np.random.uniform(5000,50000,75), np.random.uniform(1000,8000,75),
                                np.random.uniform(200,1500,75), np.random.uniform(50,400,75)])
        X = np.column_stack([rec, freq, amt])
    else:
        X = df_clients[['recence', 'frequence', 'total_spent']].fillna(0).values.astype(float)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    n_clusters = min(4, len(X))
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10, max_iter=300)
    kmeans.fit(X_scaled)

    # Wrapper that applies scaler before predict
    class KMeansScaled:
        def __init__(self, km, sc):
            self.km = km
            self.sc = sc
        def predict(self, X):
            return self.km.predict(self.sc.transform(np.array(X, dtype=float)))

    wrapper = KMeansScaled(kmeans, scaler)

    out = os.path.join(MODELS_DIR, 'kmeans_rfm_v2.pkl')
    with open(out, 'wb') as f:
        pickle.dump(wrapper, f)
    print(f"   SAVED: {out}")

    # Test
    test = [[30, 5, 500], [300, 1, 80], [10, 20, 8000]]
    for t in test:
        pred = wrapper.predict([t])
        print(f"   Test {t} -> cluster {pred[0]}")
    ok_count += 1

except Exception as e:
    print(f"   ERROR KMeans: {e}")
    import traceback; traceback.print_exc()
    fail_count += 1

# ============================================================
# 3. XGBoost Classification
# ============================================================
print("\n[3/3] XGBoost Client Classification...")
try:
    from xgboost import XGBClassifier
    from sklearn.preprocessing import LabelEncoder

    segments_map = {
        0: 'Champions',
        1: 'Clients Fideles',
        2: 'Actifs',
        3: 'Clients a Risque',
        4: 'Nouveaux Clients',
    }

    # Generate synthetic training data based on 5 segments
    np.random.seed(42)
    n_per_seg = 80

    all_X, all_y = [], []
    # Champions: low recency, high freq, high amount
    all_X.append(np.column_stack([
        np.random.uniform(1, 30, n_per_seg),
        np.random.uniform(15, 50, n_per_seg),
        np.random.uniform(5000, 50000, n_per_seg),
        np.random.uniform(200, 600, n_per_seg),
    ]))
    all_y.extend(['Champions'] * n_per_seg)

    # Fideles: moderate recency, moderate freq, moderate amount
    all_X.append(np.column_stack([
        np.random.uniform(30, 90, n_per_seg),
        np.random.uniform(8, 20, n_per_seg),
        np.random.uniform(1500, 10000, n_per_seg),
        np.random.uniform(100, 300, n_per_seg),
    ]))
    all_y.extend(['Clients Fideles'] * n_per_seg)

    # Actifs: recent but moderate spending
    all_X.append(np.column_stack([
        np.random.uniform(20, 60, n_per_seg),
        np.random.uniform(5, 15, n_per_seg),
        np.random.uniform(500, 3000, n_per_seg),
        np.random.uniform(60, 200, n_per_seg),
    ]))
    all_y.extend(['Actifs'] * n_per_seg)

    # A Risque: high recency, low freq, low amount
    all_X.append(np.column_stack([
        np.random.uniform(180, 365, n_per_seg),
        np.random.uniform(1, 4, n_per_seg),
        np.random.uniform(100, 800, n_per_seg),
        np.random.uniform(20, 100, n_per_seg),
    ]))
    all_y.extend(['Clients a Risque'] * n_per_seg)

    # Nouveaux: very high recency OR very recent (new)
    all_X.append(np.column_stack([
        np.random.uniform(300, 365, n_per_seg // 2).tolist() +
        np.random.uniform(1, 15, n_per_seg // 2).tolist(),
        np.random.uniform(1, 2, n_per_seg),
        np.random.uniform(50, 400, n_per_seg),
        np.random.uniform(10, 80, n_per_seg),
    ]))
    all_y.extend(['Nouveaux Clients'] * n_per_seg)

    X_train = np.vstack(all_X)
    y_labels = np.array(all_y)

    le = LabelEncoder()
    y_enc = le.fit_transform(y_labels)
    print(f"   Classes: {list(le.classes_)}")
    print(f"   Training samples: {len(X_train)}")

    clf = XGBClassifier(
        n_estimators=150,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric='mlogloss',
        random_state=42,
    )
    clf.fit(X_train, y_enc)

    out_clf = os.path.join(MODELS_DIR, 'xgb_classification_v1.pkl')
    out_le  = os.path.join(MODELS_DIR, 'le_statut_v1.pkl')

    with open(out_clf, 'wb') as f:
        pickle.dump(clf, f)
    with open(out_le, 'wb') as f:
        pickle.dump(le.classes_, f)

    print(f"   SAVED classifier: {out_clf}")
    print(f"   SAVED label encoder: {out_le}")

    # Tests
    tests = [
        ([10, 20, 8000, 300], 'Champion attendu'),
        ([200, 2, 200, 50], 'A Risque attendu'),
        ([350, 1, 100, 30], 'Nouveau attendu'),
        ([50, 10, 3000, 150], 'Fidelr attendu'),
    ]
    for t, desc in tests:
        pred = clf.predict(np.array([t]))
        label = le.classes_[pred[0]]
        proba = max(clf.predict_proba(np.array([t]))[0]) * 100
        print(f"   Test {desc}: {label} ({proba:.1f}%)")
    ok_count += 1

except Exception as e:
    print(f"   ERROR XGBoost: {e}")
    import traceback; traceback.print_exc()
    fail_count += 1

# ============================================================
# VERIFICATION FINALE
# ============================================================
print("\n" + "=" * 60)
print("FINAL VERIFICATION")
print("=" * 60)
for fname in sorted(os.listdir(MODELS_DIR)):
    path = os.path.join(MODELS_DIR, fname)
    try:
        with open(path, 'rb') as f:
            m = pickle.load(f)
        print(f"  OK  {fname} -> {type(m).__name__}")
    except Exception as e:
        print(f"  ERR {fname} -> {e}")

print(f"\nResult: {ok_count}/3 models rebuilt successfully, {fail_count} failed.")
