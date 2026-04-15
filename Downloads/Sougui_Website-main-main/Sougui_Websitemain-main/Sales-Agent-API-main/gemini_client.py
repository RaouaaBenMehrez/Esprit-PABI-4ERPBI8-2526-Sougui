import google.generativeai as genai
import os
import json
import re

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.5-flash")

SYSTEM_PROMPT = """Tu es Yasmine, conseillère experte dans une boutique artisanale tunisienne.
Tu parles français naturellement, tu es chaleureuse et passionnée par l'artisanat.

RÈGLES STRICTES :
- Tu poses MAXIMUM 2 questions avant de recommander
- Tu comprends le contexte : cadeau, décoration maison, occasion spéciale, style recherché
- Tu assumes ta recommandation avec conviction
- Tu décris les produits avec émotion : matière, aspect visuel, usage, histoire
- Tu mentionnes toujours le prix clairement
- Tu proposes toujours une action : voir le produit, l'ajouter au panier, contacter la boutique

FORMAT DE RÉPONSE : JSON uniquement, aucun texte avant ou après.
"""


def chat_with_agent(
    message: str,
    historique: list,
    services: list,
    info_client: dict
) -> dict:
    """Génère une réponse de la conseillère via Gemini."""

    # Formater les produits trouvés par RAG
    if services:
        produits_txt = "\n".join([
            f"- [{s['score_similarite']*100:.0f}% pertinence] {s['titre']}"
            f" | Prix: {s['prix_mensuel']} DT"
            f"{' | PROMO: ' + str(s['prix_promo']) + ' DT' if s['prix_promo'] and float(s['prix_promo']) > 0 else ''}"
            f" | Matière: {s['matiere'] if s['matiere'] and s['matiere'] != 'Autre' else 'artisanale'}"
            f" | Catégorie: {s['categorie']}"
            f"{' | ✅ En stock' if s['en_stock'] else ' | ⚠️ Stock à vérifier'}"
            for s in services
        ])
    else:
        produits_txt = "Aucun produit trouvé pour ce critère."

    # Historique conversation
    hist_txt = ""
    if historique:
        hist_txt = "\n".join([
            f"{m['role'].upper()}: {m['content']}"
            for m in historique[-6:]
        ])

    # Infos client connues
    client_txt = ""
    if info_client.get("occasion"):
        client_txt += f"Occasion: {info_client['occasion']}\n"
    if info_client.get("budget"):
        client_txt += f"Budget: {info_client['budget']} DT\n"
    if info_client.get("style"):
        client_txt += f"Style préféré: {info_client['style']}\n"
    if info_client.get("pour_qui"):
        client_txt += f"Pour qui: {info_client['pour_qui']}\n"

    prompt = f"""{SYSTEM_PROMPT}

PRODUITS DISPONIBLES (trouvés par RAG selon la recherche) :
{produits_txt}

INFOS CLIENT CONNUES :
{client_txt if client_txt else "Première interaction"}

HISTORIQUE :
{hist_txt if hist_txt else "Début de conversation"}

MESSAGE CLIENT : {message}

Réponds en JSON strictement valide :
{{
  "message": "Ta réponse chaleureuse et descriptive en français",
  "action": "question" | "recommandation" | "contact" | "info",
  "produit_recommande": "nom exact du produit ou null",
  "code_produit": "code du produit recommandé ou null",
  "prix_recommande": 0,
  "occasion_detectee": "cadeau|déco|personnel|collection|null",
  "budget_detecte": 0,
  "style_detecte": "traditionnel|moderne|minimaliste|coloré|null",
  "pour_qui_detecte": "femme|homme|enfant|maison|null",
  "prochaine_etape": "voir_produit" | "ajouter_panier" | "contact" | "continuer",
  "pitch": "description émotionnelle du produit en 1 phrase ou null"
}}"""

    try:
        response = model.generate_content(prompt)
        txt = response.text.strip()
        txt = re.sub(r'```json\s*', '', txt)
        txt = re.sub(r'```\s*', '', txt)
        txt = txt.strip()

        match = re.search(r'\{.*\}', txt, re.DOTALL)
        if match:
            data = json.loads(match.group())
            # Mapper les nouveaux champs vers les anciens pour compatibilité
            data.setdefault("service_recommande", data.get("produit_recommande"))
            data.setdefault("secteur_detecte", data.get("occasion_detectee"))
            data.setdefault("besoin_detecte", data.get("style_detecte"))
            return data

        return {
            "message": txt,
            "action": "info",
            "produit_recommande": None,
            "service_recommande": None,
            "prix_recommande": 0,
            "prochaine_etape": "continuer",
            "pitch": None
        }

    except Exception as e:
        print(f"❌ ERREUR GEMINI : {str(e)}")
        return {
            "message": f"Erreur Gemini: {str(e)}",
            "action": "info",
            "produit_recommande": None,
            "service_recommande": None,
            "prix_recommande": 0,
            "prochaine_etape": "continuer",
            "pitch": None,
            "error": str(e)
        }
