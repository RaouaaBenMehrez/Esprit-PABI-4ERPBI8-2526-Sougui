# Sougui BI Suite

Plateforme de Business Intelligence complète avec dashboards interactifs, prédictions ML et agent commercial IA.

## Architecture

```
sougui-bi-suite/
├── backend/          # API Flask (authentification, données, prédictions ML)
├── frontend/         # Application React/Vite (dashboards CEO, Marketing, Commercial)
├── ai-agent/         # Microservice FastAPI + LangGraph (chatbot IA)
├── models/           # Modèles ML entraînés (.pkl)
└── scripts/          # Lanceurs et utilitaires
```

## Démarrage rapide

### 1. Backend (Flask — port 5000)
```bash
cd backend
pip install -r requirements.txt
python server.py
```

### 2. Frontend (Vite — port 5173)
```bash
cd frontend
npm install
npm run dev
```

### 3. AI Agent (FastAPI — port 8000)
```bash
cd ai-agent
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Ou avec les scripts BAT (Windows)
```
scripts/start_backend.bat
scripts/start_frontend.bat
scripts/start_ai_agent.bat
```

## Configuration

Copiez `.env.example` et remplissez vos valeurs :
```bash
cp .env.example backend/.env
cp .env.example ai-agent/.env
```

## Stack Technique

| Module      | Technologie                        |
|-------------|------------------------------------|
| Frontend    | React 18 + Vite + Tailwind CSS     |
| Backend     | Flask + PostgreSQL + bcrypt        |
| AI Agent    | FastAPI + LangGraph + Gemini + RAG |
| ML Models   | Prophet, XGBoost, RandomForest, KMeans |

## Rôles utilisateur

| Rôle       | Dashboard                          |
|------------|------------------------------------|
| `ceo`      | Vue globale CA, KPIs, prédictions  |
| `marketing`| Segmentation clients, campagnes    |
| `commercial`| Produits, commandes, agent IA      |
