import joblib
import numpy as np

MODELS_PATH = r"C:\Users\NSI\Downloads\Hachathon_LunarHack-main-main\Hachathon_LunarHack-main-main\Modeles"

def load(fname):
    return joblib.load(f"{MODELS_PATH}\\{fname}")

# 1. Inspect KMeans dict
print("=== KMeans dict ===")
km_dict = load('kmeans_rfm_v2.pkl')
print(f"Keys: {list(km_dict.keys())}")
for k, v in km_dict.items():
    print(f"  {k}: {type(v).__name__}", end="")
    if hasattr(v, '__len__'):
        try: print(f" (len={len(v)})", end="")
        except: pass
    if hasattr(v, 'shape'):
        print(f" shape={v.shape}", end="")
    if hasattr(v, 'n_clusters'):
        print(f" n_clusters={v.n_clusters}", end="")
    if hasattr(v, 'cluster_centers_'):
        print(f" centers.shape={v.cluster_centers_.shape}", end="")
    print()

# 2. Inspect RobustScaler
print("\n=== RobustScaler ===")
sc = load('scaler_regression_v1.pkl')
print(f"  n_features_in_: {sc.n_features_in_}")
print(f"  center_: {sc.center_}")
print(f"  scale_: {sc.scale_}")

# 3. Inspect RandomForestRegressor
print("\n=== RF Regressor ===")
rf = load('rf_regression_v1.pkl')
print(f"  n_features_in_: {rf.n_features_in_}")
print(f"  feature_names_in_: {getattr(rf, 'feature_names_in_', 'N/A')}")

# 4. Inspect XGB Regressor
print("\n=== XGB Regressor ===")
xgb_r = load('xgb_regression_v1.pkl')
print(f"  n_features_in_: {xgb_r.n_features_in_}")
print(f"  feature_names_in_: {getattr(xgb_r, 'feature_names_in_', 'N/A')}")

# 5. Inspect RF Classification (GridSearchCV)
print("\n=== RF Classification (GridSearchCV) ===")
rf_cls = load('rf_classification_v1.pkl')
print(f"  best_estimator_: {type(rf_cls.best_estimator_).__name__}")
print(f"  n_features_in_: {rf_cls.n_features_in_}")
print(f"  best_params_: {rf_cls.best_params_}")
print(f"  classes_: {rf_cls.classes_}")
try:
    print(f"  feature_names_in_: {rf_cls.feature_names_in_}")
except: pass

# 6. Inspect XGB Classification (GridSearchCV)
print("\n=== XGB Classification (GridSearchCV) ===")
xgb_cls = load('xgb_classification_v1.pkl')
print(f"  best_estimator_: {type(xgb_cls.best_estimator_).__name__}")
print(f"  n_features_in_: {xgb_cls.n_features_in_}")
print(f"  classes_: {xgb_cls.classes_}")
try:
    print(f"  feature_names_in_: {xgb_cls.feature_names_in_}")
except: pass

# 7. LabelEncoder
print("\n=== LabelEncoder ===")
le = load('le_statut_v1.pkl')
print(f"  classes_: {le.classes_}")
