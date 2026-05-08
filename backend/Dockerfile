# ─── Backend Flask — Dockerfile ───────────────────────────────────────────────
# Image légère Python 3.11 (Debian slim)
FROM python:3.11-slim

# Métadonnées
LABEL maintainer="Sougui BI Suite"
LABEL description="Backend Flask — API ML + Prediction + MLflow"

# Variables d'environnement
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FLASK_ENV=production \
    PORT=5000

# Répertoire de travail
WORKDIR /app

# Installer les dépendances système nécessaires à psycopg2 et prophet
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copier et installer les dépendances Python
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copier le code source backend
COPY . .

# Créer le dossier mlruns si absent
RUN mkdir -p mlruns

# Exposer le port Flask
EXPOSE 5000

# Commande de démarrage
CMD ["python", "server.py"]
