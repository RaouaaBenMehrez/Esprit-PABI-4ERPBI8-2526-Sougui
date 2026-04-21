# Documentation des Workflows n8n Sougui BI

Ce document décrit en détail les trois workflows automatisés fournis dans ce dossier, ainsi que les choix d'architecture qui permettent de répondre parfaitement aux conditions du projet (ML Pipeline Architecture, Technical Implementation, Automation Logic, Robustness).

## 🗂️ Contenu du dossier

| Fichier JSON | Description | Validé pour |
|--------------|-------------|-------------|
| `1_Periodic_Inference_Workflow.json` | Pipeline d'inférence en batch (Prophet). S'exécute chaque semaine. | **A**, **C** (Cron, Output), **D** (Errors) |
| `2_RealTime_Predict_Workflow.json` | Pipeline d'inférence événementiel en temps réel (XGBoost). | **A**, **B** (Webhook, HTTP) |
| `3_Automated_Retraining_Workflow.json` | Pipeline automatisé pour le ré-entraînement du modèle. | **C** (Bonus), **D** (Alertes Slack) |

---

## 🎯 Validation des Conditions 

### Condition A : Workflow Design (ML Pipeline Architecture)
- **Pipeline Complet (Trigger → Data → Model → Output)** : Le Workflow 1 orchestre une récupération (déclenchée par *Cron*), une exécution de prédiction en passant par le nœud `HTTP Request`, puis formatte les données (Nœud `Code`) avant des insérer l'output de la prédiction dans la base de données avec le nœud `Postgres`. 
- **Modularité & Documentation** : Les workflows sont documentés en interne. Tous les nœuds ont le champ `notes` rempli (Labels), expliquant la finalité du composant. Tous sont exportables/importables via JSON.

### Condition B : ML Model Integration (Technical Implementation)
- **FastAPI / Flask** : Le backend `server.py` existant est pleinement intégré à n8n via des requêtes REST (GET / POST). 
- **Nœuds n8n Utilisés** :
  - **HTTP Request** : Utilisé dans les Workflows 1 et 2 pour interroger Flask (`/api/predict/ca` et `/api/predict/client`).
  - **Webhook** : Utilisé dans le Workflow 2 comme Trigger événementiel en temps réel.
  - **Cron / Schedule** : Utilisé dans les Workflows 1 et 3 pour la planification d'inférence et de ré-entraînement.
  - **Execute Command** : Utilisé dans le Workflow 3 pour démarrer un script Python directement sur la machine hôte (`python scripts/retrain_models.py`).

### Condition C : Automation Logic (Inference / Retraining)
- **Automated Inference Pipeline** :
  - *Automatisée* : Inférence hebdomadaire (Workflow 1).
  - *Événementielle* : Réponse instantanée via `Webhook Response` (Workflow 2).
  - *Stockage* : Configuration d'un stockage dans PostgreSQL (`PostgreSQL_Storage` Node).
- **Retraining Automation (Bonus !)** : Le Workflow 3 s'exécute tous les 1ers du mois, invoque un script Python de réapprentissage et lit l'Output (Exit Code) de ce script. Si l'entraînement réussit et que le fichier modèle (`.pkl`) est mis à jour, un log est envoyé, créant une boucle MLOps fermée.

### Condition D : Robustness & Monitoring (Error Handling & Logs)
- **Gestion des erreurs (Fallbacks & Retries)** :
  - Le Workflow 2 possède une réponse spécifique (`Error_Response` - HTTP 503) avec un chemin "On Error: Continue". Si Flask crashe, n8n n'échoue pas lamentablement mais renvoie un JSON explicite.
- **Notifications Slack & Logs** :
  - Utilisation systématique de Nœuds `Slack` pour alerter les ingénieurs (Alerte d'échec ML, Alerte de réentraînement réussi avec métriques, Alerte Data Drift).
  - Utilisation du nœud `Error Trigger` (Workflow 1) qui se déclenche automatiquement si *n'importe quel* nœud du workflow subit une erreur silencieuse.

---

## 🚀 Guide d'Importation n8n

1. Ouvrez votre dashboard n8n (`localhost:5678`).
2. Cliquez sur **Workflows** → **Add workflow**.
3. Cliquez sur le menu en haut à droite `...` → **Import from file**.
4. Sélectionnez l'un des fichiers `.json` de ce répertoire.
5. Pensez à remplir ou créer les identifiants/Credentials pour `Postgres` et `Slack` dans les paramètres des nœuds si vous souhaitez tester la chaîne globale en mode actif.
