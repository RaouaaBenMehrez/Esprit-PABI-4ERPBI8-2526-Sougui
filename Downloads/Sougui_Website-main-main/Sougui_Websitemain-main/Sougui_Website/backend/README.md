# Sougui — AI-Powered Smart Business Suite 🪬

Sougui est une suite business intelligente conçue pour le **Lunar Hack 2.0 (FST 2026)**. Elle transforme les données brutes des PME en insights actionnables grâce à l'intelligence artificielle et l'analyse prédictive.

## 🚀 Fonctionnalités

### 1. Smart Analytics Dashboard (Pilier 1)
- **KPIs en temps réel** : Suivi automatique du Chiffre d'Affaires (CA), du taux de conversion (simulé) et du panier moyen.
- **Visualisations interactives** : Graphiques Plotly dynamiques pour l'analyse temporelle et la répartition par canaux.
- **Architecture Responsive** : Interface premium sombre avec accents dorés, optimisée pour une expérience professionnelle.

### 2. Backend & Données Dynamiques
- **Moteur SQLite** : Toutes les données (ventes, clients, produits) sont stockées et récupérées dynamiquement.
- **Authentification Sécurisée** : Système de Login utilisant `bcrypt` pour le hachage des mots de passe.
- **Gestion de Profils** : Seuls les administrateurs authentifiés peuvent accéder aux données sensibles.

### 3. Intelligence Artificielle (Pilier 2 & 3)
- **Sales Intelligence Agent** : Un assistant conversationnel qui répond aux questions sur les performances de l'entreprise.
- **Insights Automatiques** : Analyse automatique des tendances (ex: pics de vente, clients VIP à relancer).

## 🛠️ Installation

1. Clonez ce dépôt.
2. Installez les dépendances :
   ```bash
   pip install -r requirements.txt
   ```
3. Initialisez la base de données :
   ```bash
   python init_db.py
   ```
4. Lancez l'application :
   ```bash
   streamlit run app.py
   ```

## 🔐 Identifiants par défaut
- **Utilisateur** : `admin`
- **Mot de passe** : `admin123`

## 📊 Structure du Projet
- `app.py` : Entrée principale de l'application Streamlit.
- `init_db.py` : Script de création et de population de la base de données SQLite.
- `assets/style.css` : Design system (Dark & Gold).
- `requirements.txt` : Liste des librairies nécessaires.

---
*Développé pour le Lunar Hack 2.0 — Innovation & Data Science.*
