# -*- coding: utf-8 -*-
"""
conftest.py — Configuration Pytest pour Sougui BI Backend
Fournit les fixtures partagées entre tous les tests.
"""

import os
import sys
import pytest

# ─── Ajout du dossier backend au path Python ─────────────────────────────────
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, BACKEND_DIR)


@pytest.fixture(scope="session")
def app():
    """Crée l'application Flask en mode test (une seule fois pour toute la session)."""
    # Importer après ajout au path
    from server import app as flask_app

    flask_app.config.update({
        "TESTING":    True,
        "DEBUG":      False,
    })

    yield flask_app


@pytest.fixture(scope="session")
def client(app):
    """Client HTTP de test Flask."""
    return app.test_client()


@pytest.fixture(scope="session")
def runner(app):
    """Runner CLI de test Flask."""
    return app.test_cli_runner()
