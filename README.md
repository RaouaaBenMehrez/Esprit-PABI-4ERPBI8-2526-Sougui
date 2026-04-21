<h1 align="center">Sougui BI Suite & AI Platform 🚀</h1>

<p align="center">
  <em>Plateforme de Business Intelligence complète avec dashboards interactifs, prédictions Machine Learning avancées, workflows MLOps automatisés (n8n) et Agent Commercial IA conversationnel.</em>
</p>

---

## 🌟 Présentation du Projet

**Sougui BI Suite** est un écosystème décisionnel complet conçu pour transformer les données brutes en insights actionnables. Ce projet (réalisé dans le cadre du cursus Esprit 4BI 8) s'articule autour de trois axes majeurs :
1. **Des Dashboards adaptatifs basés sur les rôles** (PDG, Marketing, Commercial).
2. **De l'Intelligence Artificielle de pointe** incluant des prédictions prédictives multi-modèles (XGBoost, Prophet, KMeans, Random Forest) et un Agent autonome RAG.
3. **Des flux d'automatisation MLOps** avec n8n pour des prédictions en temps réel et du ré-entraînement de modèles continu.

---

## ⚙️ Fonctionnalités Clés

- 📊 **Dashboards Rôles-Spécifiques :** Interfaces personnalisées Vite/React avec Dark/Light mode dynamique.
- 🤖 **Agent IA Flottant Intégré :** Un assistant IA (FastAPI + LangGraph + RAG) draggable avec contrôle vocal, disponible directement sur l'interface de vente.
- 🔮 **Machine Learning Multi-Modèles :** 
  - *Prophet* (Séries temporelles pour le CA)
  - *XGBoost* (Classification de risques clients)
  - *KMeans* (Segmentation marketing)
  - *Random Forest* (Prédiction de demande)
- ⚙️ **Pipelines d'Automatisation n8n :**
  - **Inférence Périodique (Batch)** : Déclenché par cron, inférence + logging en base.
  - **Inférence Temps Réel** : API via Webhook n8n avec Fallbacks et notifications Slack.
  - **Ré-entraînement Automatisé (MLOps)** : Déclenchement périodique du script `retrain_models.py` avec alertes Slack de Drift.

---

## 🏗️ Architecture du Projet

Le dépôt est découpé en microservices et pipelines distincts :

```text
sougui-bi-suite/
│
├── frontend/         # Application React/Vite (Dashboards CEO, Marketing, Commercial)
├── backend/          # API Flask (Données, Prédictions ML, Base Postgres)
├── ai-agent/         # Microservice FastAPI + Langchain/LangGraph (Agent LLM RAG)
├── n8n/              # Workflows JSON pour l'automatisation MLOps
├── models/           # Modèles ML entraînés au format .pkl
└── scripts/          # Scripts batch (.bat) et d'automatisation Python
```

---

## 🛠️ Stack Technique

### Frontend
- **React 18** & **Vite** (Rapidité et HMR)
- **Tailwind CSS** (Styling moderne et Responsive)
- **Recharts / Chart.js** (Visualisation de données)

### Backend & Modèles
- **Flask** (API Principale RESTful)
- **PostgreSQL** (Stockage de la donnée)
- **Bibliothèques ML** : `scikit-learn`, `xgboost`, `prophet`, `pandas`

### Agent IA & Automatisation
- **FastAPI** (Hautes performances pour les requêtes asynchrones LLM)
- **LangGraph & Langchain** (Pipelines conversationnels et flux de pensées de l'Agent)
- **Google Gemini** (LLM de base)
- **n8n** (Outil MLOps/Orchestration No-Code)

---

## 🚀 Guide de Démarrage Rapide

### Pré-requis
- **Python 3.9+**
- **Node.js 18+**
- **PostgreSQL** démarré
- Une API Key Google Gemini (pour l'Agent IA)

### 1. Configuration des variables
Copiez le modèle `.env.example` dans les dossiers requis :
```bash
cp .env.example backend/.env
cp .env.example ai-agent/.env
# Remplissez vos credentials DB et votre clé Gemini dans les fichiers .env
```

### 2. Lancement Global (Windows)
Pour lancer tous les services facilement, utilisez les scripts fournis dans `/scripts` :
```cmd
.\scripts\start_backend.bat
.\scripts\start_frontend.bat
.\scripts\start_ai_agent.bat
```

### 3. Lancement Manuel

#### Backend Flask (Port 5000)
```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate  # (Windows)
pip install -r requirements.txt
python server.py
```

#### Frontend Vite (Port 5173)
```bash
cd frontend
npm install
npm run dev
```

#### Microservice AI Agent FastAPI (Port 8000)
```bash
cd ai-agent
python -m venv .venv
source .venv/Scripts/activate  # (Windows)
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 🔁 Importer les Workflows MLOps dans n8n

Dans le dossier `n8n`, retrouverez les pipelines d'automatisation :
1. Lancez n8n (ex: `npx n8n`).
2. Allez sur l'interface `localhost:5678`.
3. Cliquez sur **Workflows -> Add workflow -> Import from File**.
4. Importez successivement : 
   - `1_Periodic_Inference_Workflow.json`
   - `2_RealTime_Predict_Workflow.json`
   - `3_Automated_Retraining_Workflow.json`
5. Configurez vos "Credentials" (Bases de données Postgres, compte Slack).

---

## 🛡️ Accès et Rôles

Le portail web dispose d'un système de routage basé sur les rôles.
- **`ceo`** : Accès global stratégique (KPIs majeurs, prévisions météo d'affaires Prophet/RF).
- **`marketing`** : Vue dédiée à la segmentation des clients (KMeans) et optimisation des campagnes.
- **`commercial`** : Vue opérationnelle avec accès natif à l'Agent IA pour requêter du scoring client en temps réel (XGBoost).

---

> 🎉 **Projet réalisé dans le cadre académique de l'ESPRIT (4BI 8)**.
