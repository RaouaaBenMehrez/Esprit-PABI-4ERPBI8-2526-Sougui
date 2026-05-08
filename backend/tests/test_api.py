# -*- coding: utf-8 -*-
"""
test_api.py — Tests automatisés (Pytest) pour Sougui BI Backend
================================================================
Teste les endpoints critiques de l'API Flask :
  - /api/health           → santé générale
  - /api/predict/ca       → prévision Prophet
  - /api/predict/client   → classification XGBoost
  - /api/predict/rfm      → segmentation KMeans
  - /api/predict/ca-regression → régression RF
  - /api/predict/status   → état des modèles
  - /api/mlflow-runs      → liste des runs MLflow
  - /api/models/versions  → versionnage des modèles

Usage :
  cd backend
  pytest tests/ -v
  pytest tests/ -v --tb=short
"""

import json
import pytest


# ══════════════════════════════════════════════════════════════════════════════
# TESTS — Endpoints de santé
# ══════════════════════════════════════════════════════════════════════════════

class TestHealth:
    """Tests de l'endpoint /api/health"""

    def test_health_returns_200(self, client):
        """L'endpoint health doit retourner 200."""
        response = client.get("/api/health")
        assert response.status_code == 200, (
            f"Attendu 200, reçu {response.status_code}"
        )

    def test_health_returns_json(self, client):
        """L'endpoint health doit retourner du JSON valide."""
        response = client.get("/api/health")
        data = response.get_json()
        assert data is not None, "La réponse n'est pas du JSON valide"

    def test_health_has_status_field(self, client):
        """Le JSON de health doit contenir un champ 'status'."""
        response = client.get("/api/health")
        data = response.get_json()
        assert "status" in data, f"Champ 'status' manquant dans : {data}"

    def test_health_has_models_loaded(self, client):
        """Le JSON de health doit contenir 'models_loaded'."""
        response = client.get("/api/health")
        data = response.get_json()
        assert "models_loaded" in data, f"Champ 'models_loaded' manquant dans : {data}"


class TestIndex:
    """Tests de l'endpoint racine /"""

    def test_index_returns_200(self, client):
        """L'endpoint racine doit retourner 200."""
        response = client.get("/")
        assert response.status_code == 200

    def test_index_lists_routes(self, client):
        """L'index doit lister les routes disponibles."""
        response = client.get("/")
        data = response.get_json()
        assert "routes" in data
        assert len(data["routes"]) > 0


# ══════════════════════════════════════════════════════════════════════════════
# TESTS — Endpoint de prédiction Prophet CA
# ══════════════════════════════════════════════════════════════════════════════

class TestPredictCA:
    """Tests de GET /api/predict/ca (Prophet forecast)"""

    def test_predict_ca_returns_200_or_503(self, client):
        """Le endpoint CA doit retourner 200 (modèle OK) ou 503 (modèle absent)."""
        response = client.get("/api/predict/ca")
        assert response.status_code in [200, 503], (
            f"Status inattendu : {response.status_code}"
        )

    def test_predict_ca_returns_json(self, client):
        """Le endpoint CA doit toujours retourner du JSON."""
        response = client.get("/api/predict/ca")
        data = response.get_json()
        assert data is not None, "La réponse n'est pas du JSON valide"

    def test_predict_ca_structure_when_success(self, client):
        """Si le modèle est disponible, la réponse doit contenir 'predictions'."""
        response = client.get("/api/predict/ca")
        data = response.get_json()
        if response.status_code == 200:
            assert "predictions" in data, f"Champ 'predictions' manquant : {data}"
            assert isinstance(data["predictions"], list), "'predictions' doit être une liste"
            assert len(data["predictions"]) > 0, "La liste de prédictions est vide"

    def test_predict_ca_prediction_format(self, client):
        """Chaque prédiction doit avoir les champs mois, prediction, min, max."""
        response = client.get("/api/predict/ca")
        data = response.get_json()
        if response.status_code == 200 and "predictions" in data:
            for pred in data["predictions"]:
                assert "mois"       in pred, f"Champ 'mois' manquant dans : {pred}"
                assert "prediction" in pred, f"Champ 'prediction' manquant dans : {pred}"
                assert "min"        in pred, f"Champ 'min' manquant dans : {pred}"
                assert "max"        in pred, f"Champ 'max' manquant dans : {pred}"
                assert pred["prediction"] >= 0, "La prédiction ne peut pas être négative"


# ══════════════════════════════════════════════════════════════════════════════
# TESTS — Endpoint de classification client (XGBoost)
# ══════════════════════════════════════════════════════════════════════════════

class TestPredictClient:
    """Tests de POST /api/predict/client (XGBoost Classification)"""

    def _post(self, client, payload):
        return client.post(
            "/api/predict/client",
            data=json.dumps(payload),
            content_type="application/json"
        )

    def test_predict_client_returns_200_or_503(self, client):
        """Le endpoint client doit retourner 200 ou 503."""
        payload = {"recence": 30, "frequence": 5, "montant_total": 500, "panier_moyen": 100}
        response = self._post(client, payload)
        assert response.status_code in [200, 503], (
            f"Status inattendu : {response.status_code}"
        )

    def test_predict_client_returns_json(self, client):
        """Le endpoint client doit retourner du JSON valide."""
        payload = {"recence": 30, "frequence": 5, "montant_total": 500, "panier_moyen": 100}
        response = self._post(client, payload)
        data = response.get_json()
        assert data is not None

    def test_predict_client_has_segment_field(self, client):
        """Si le modèle est dispo, la réponse doit contenir 'segment'."""
        payload = {"recence": 30, "frequence": 5, "montant_total": 500, "panier_moyen": 100}
        response = self._post(client, payload)
        data = response.get_json()
        if response.status_code == 200:
            assert "segment" in data, f"Champ 'segment' manquant : {data}"
            assert isinstance(data["segment"], str), "'segment' doit être une chaîne"
            assert len(data["segment"]) > 0, "'segment' ne doit pas être vide"

    def test_predict_client_with_champion_profile(self, client):
        """Un profil Champion (récence faible, fréquence haute) doit retourner un résultat."""
        payload = {"recence": 5, "frequence": 30, "montant_total": 20000, "panier_moyen": 500}
        response = self._post(client, payload)
        assert response.status_code in [200, 503]

    def test_predict_client_with_risk_profile(self, client):
        """Un profil à risque (récence haute, fréquence basse) doit retourner un résultat."""
        payload = {"recence": 300, "frequence": 1, "montant_total": 100, "panier_moyen": 20}
        response = self._post(client, payload)
        assert response.status_code in [200, 503]

    def test_predict_client_uses_defaults(self, client):
        """L'endpoint doit fonctionner même sans payload (valeurs par défaut)."""
        response = self._post(client, {})
        assert response.status_code in [200, 503]

    def test_predict_client_has_model_field(self, client):
        """Si succès, la réponse doit indiquer le modèle utilisé."""
        payload = {"recence": 30, "frequence": 5, "montant_total": 500, "panier_moyen": 100}
        response = self._post(client, payload)
        data = response.get_json()
        if response.status_code == 200:
            assert "model" in data, f"Champ 'model' manquant : {data}"


# ══════════════════════════════════════════════════════════════════════════════
# TESTS — Endpoint RFM KMeans
# ══════════════════════════════════════════════════════════════════════════════

class TestPredictRFM:
    """Tests de POST /api/predict/rfm (KMeans Segmentation)"""

    def _post(self, client, payload):
        return client.post(
            "/api/predict/rfm",
            data=json.dumps(payload),
            content_type="application/json"
        )

    def test_predict_rfm_returns_valid_status(self, client):
        """L'endpoint RFM doit retourner 200 ou 503."""
        payload = {"recence": 30, "frequence": 5, "montant_total": 500}
        response = self._post(client, payload)
        assert response.status_code in [200, 503]

    def test_predict_rfm_has_cluster_and_segment(self, client):
        """Si succès, la réponse doit contenir 'cluster' et 'segment'."""
        payload = {"recence": 30, "frequence": 5, "montant_total": 500}
        response = self._post(client, payload)
        data = response.get_json()
        if response.status_code == 200:
            assert "cluster" in data, f"Champ 'cluster' manquant : {data}"
            assert "segment" in data, f"Champ 'segment' manquant : {data}"
            assert isinstance(data["cluster"], int), "'cluster' doit être un entier"

    def test_predict_rfm_cluster_in_valid_range(self, client):
        """Le cluster retourné doit être un entier non négatif."""
        payload = {"recence": 10, "frequence": 20, "montant_total": 8000}
        response = self._post(client, payload)
        data = response.get_json()
        if response.status_code == 200 and "cluster" in data:
            assert data["cluster"] >= 0, f"Cluster invalide : {data['cluster']}"


# ══════════════════════════════════════════════════════════════════════════════
# TESTS — Endpoint CA Regression (RandomForest)
# ══════════════════════════════════════════════════════════════════════════════

class TestPredictCaRegression:
    """Tests de POST /api/predict/ca-regression (RandomForest Regression)"""

    def _post(self, client, payload):
        return client.post(
            "/api/predict/ca-regression",
            data=json.dumps(payload),
            content_type="application/json"
        )

    def test_ca_regression_valid_status(self, client):
        """L'endpoint CA-regression doit retourner 200 ou 503."""
        payload = {"recence": 30, "frequence": 5, "montant_total": 500}
        response = self._post(client, payload)
        assert response.status_code in [200, 503]

    def test_ca_regression_has_prediction(self, client):
        """Si succès, la réponse doit contenir 'ca_predit'."""
        payload = {"recence": 30, "frequence": 5, "montant_total": 500}
        response = self._post(client, payload)
        data = response.get_json()
        if response.status_code == 200:
            assert "ca_predit" in data, f"Champ 'ca_predit' manquant : {data}"
            assert isinstance(data["ca_predit"], (int, float)), "'ca_predit' doit être numérique"


# ══════════════════════════════════════════════════════════════════════════════
# TESTS — Diagnostic et statut des modèles
# ══════════════════════════════════════════════════════════════════════════════

class TestPredictStatus:
    """Tests de GET /api/predict/status et /api/predict/diagnostic"""

    def test_predict_status_returns_200(self, client):
        """L'endpoint status doit retourner 200."""
        response = client.get("/api/predict/status")
        assert response.status_code == 200

    def test_predict_status_has_models_dict(self, client):
        """Le status doit contenir un dictionnaire 'models'."""
        response = client.get("/api/predict/status")
        data = response.get_json()
        assert "models" in data, f"Champ 'models' manquant : {data}"
        assert isinstance(data["models"], dict)

    def test_predict_status_has_all_ok(self, client):
        """Le status doit indiquer 'all_ok' (bool)."""
        response = client.get("/api/predict/status")
        data = response.get_json()
        assert "all_ok" in data, f"Champ 'all_ok' manquant : {data}"
        assert isinstance(data["all_ok"], bool)

    def test_diagnostic_returns_200(self, client):
        """L'endpoint diagnostic doit retourner 200."""
        response = client.get("/api/predict/diagnostic")
        assert response.status_code == 200

    def test_diagnostic_has_summary(self, client):
        """Le diagnostic doit contenir 'summary'."""
        response = client.get("/api/predict/diagnostic")
        data = response.get_json()
        assert "summary" in data, f"Champ 'summary' manquant : {data}"


# ══════════════════════════════════════════════════════════════════════════════
# TESTS — MLflow et versionnage des modèles
# ══════════════════════════════════════════════════════════════════════════════

class TestMLflowRoutes:
    """Tests de /api/mlflow-runs et /api/models/versions"""

    def test_mlflow_runs_returns_200(self, client):
        """L'endpoint mlflow-runs doit retourner 200."""
        response = client.get("/api/mlflow-runs")
        assert response.status_code == 200, (
            f"Status inattendu : {response.status_code}"
        )

    def test_mlflow_runs_returns_json(self, client):
        """L'endpoint mlflow-runs doit retourner du JSON."""
        response = client.get("/api/mlflow-runs")
        data = response.get_json()
        assert data is not None

    def test_mlflow_runs_has_runs_field(self, client):
        """La réponse mlflow-runs doit toujours avoir un champ 'runs'."""
        response = client.get("/api/mlflow-runs")
        data = response.get_json()
        assert "runs" in data, f"Champ 'runs' manquant : {data}"
        assert isinstance(data["runs"], list)

    def test_model_versions_returns_200(self, client):
        """L'endpoint models/versions doit retourner 200."""
        response = client.get("/api/models/versions")
        assert response.status_code == 200

    def test_model_versions_has_files(self, client):
        """L'endpoint models/versions doit retourner une liste de fichiers."""
        response = client.get("/api/models/versions")
        data = response.get_json()
        assert "files" in data, f"Champ 'files' manquant : {data}"
        assert isinstance(data["files"], list)
        assert len(data["files"]) > 0, "Aucun modèle trouvé dans models/"

    def test_model_versions_file_structure(self, client):
        """Chaque fichier modèle doit avoir les champs requis."""
        response = client.get("/api/models/versions")
        data = response.get_json()
        if "files" in data and len(data["files"]) > 0:
            f = data["files"][0]
            assert "filename"   in f, f"Champ 'filename' manquant : {f}"
            assert "model_type" in f, f"Champ 'model_type' manquant : {f}"
            assert "size_kb"    in f, f"Champ 'size_kb' manquant : {f}"
            assert "modified"   in f, f"Champ 'modified' manquant : {f}"


# ══════════════════════════════════════════════════════════════════════════════
# TESTS — Données (clients, ventes, produits)
# ══════════════════════════════════════════════════════════════════════════════

class TestDataEndpoints:
    """Tests des endpoints de données (nécessitent la base de données)."""

    def test_clients_endpoint_exists(self, client):
        """GET /api/clients doit répondre (200 ou 500 si DB absent)."""
        response = client.get("/api/clients")
        assert response.status_code in [200, 204, 500], (
            f"Status inattendu : {response.status_code}"
        )

    def test_clients_returns_json(self, client):
        """GET /api/clients doit retourner du JSON."""
        response = client.get("/api/clients")
        # Accepter toute réponse JSON valide
        try:
            data = response.get_json()
        except Exception:
            data = None
        # Si la DB n'est pas dispo, on ne peut pas tester plus
        if response.status_code == 200:
            assert data is not None
            assert isinstance(data, list)

    def test_sales_endpoint_exists(self, client):
        """GET /api/sales doit répondre."""
        response = client.get("/api/sales")
        assert response.status_code in [200, 204, 500]

    def test_products_endpoint_exists(self, client):
        """GET /api/products doit répondre."""
        response = client.get("/api/products")
        assert response.status_code in [200, 204, 500]
