# Sales Agent API 🤖

Agent commercial IA pour agence digitale — FastAPI + Gemini + ChromaDB + Docker

## Stack technique
- **FastAPI** — API REST
- **Gemini 1.5 Flash** — LLM pour la conversation
- **ChromaDB** — Base vectorielle RAG
- **Docker** — Containerisation

## Installation en 3 étapes

### 1. Cloner et configurer
```bash
# Copier le fichier .env
cp .env.example .env

# Éditer .env et mettre ta clé Gemini
# GEMINI_API_KEY=ta_vraie_clé_ici
```

> Obtenir une clé gratuite sur : https://aistudio.google.com/app/apikey

### 2. Lancer avec Docker
```bash
docker-compose up --build
```

### 3. Tester avec Postman
- Importer `postman_collection.json` dans Postman
- Lancer les requêtes dans l'ordre (1 → 12)

## Routes disponibles

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | /health | Vérifier que l'API fonctionne |
| GET | /services | Lister tous les services |
| POST | /chat | Conversation avec l'agent |
| POST | /contact | Sauvegarder un contact/lead |
| GET | /session/{id} | Voir l'historique d'une session |
| DELETE | /session/{id} | Réinitialiser une session |
| POST | /index | Réindexer les services |

## Exemple de conversation Postman

**Étape 1 — Premier message :**
```json
POST /chat
{
  "session_id": "test-001",
  "message": "Bonjour, je cherche à avoir plus de clients"
}
```

**Étape 2 — Contexte :**
```json
POST /chat
{
  "session_id": "test-001",
  "message": "J'ai un restaurant à Tunis, budget 500 DT/mois",
  "budget_max": 500
}
```

**Étape 3 — Recommandation :**
```json
POST /chat
{
  "session_id": "test-001",
  "message": "Qu'est-ce que vous recommandez ?"
}
```

**Étape 4 — Contact :**
```json
POST /contact
{
  "session_id": "test-001",
  "nom": "Ahmed Ben Ali",
  "email": "ahmed@gmail.com",
  "telephone": "+216 55 123 456",
  "type_contact": "rdv"
}
```

## Ajouter des services

Modifier `data/services.json` puis appeler `POST /index` pour réindexer.

## Documentation interactive

Ouvrir http://localhost:8000/docs dans le navigateur.
