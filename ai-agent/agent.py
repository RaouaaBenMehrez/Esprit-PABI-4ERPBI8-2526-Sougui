from google import genai
import os, json, re
from dotenv import load_dotenv

load_dotenv()

_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY", "MISSING_API_KEY"))

def _call_gemini(prompt: str) -> str:
    resp = _client.models.generate_content(
        model="gemini-2.0-flash", contents=prompt
    )
    return resp.text.strip()

def _gemini(prompt: str) -> dict:
    txt = _call_gemini(prompt)
    txt = re.sub(r'```json\s*|```', '', txt).strip()
    m = re.search(r'\{.*\}', txt, re.DOTALL)
    try:
        return json.loads(m.group()) if m else {}
    except:
        return {}


def classify(message: str, historique: list) -> str:
    """
    Toujours LLM — gère fautes, arabe, dialectal, mélange, ambigus.
    Fallback: "recommandation" si doute.
    """
    hist = "\n".join([f"{h['role']}: {h['content']}" for h in historique[-3:]])

    r = _gemini(f"""Tu es un classificateur pour une boutique artisanale tunisienne.
Classe l'intention du message en JSON. Une seule règle : si tu as un doute → recommandation.

HISTORIQUE: {hist if hist else "début de conversation"}
MESSAGE: "{message}"

RÈGLES:
- simple     = bonjour, merci, au revoir, question livraison/horaires/adresse
- recommandation = cherche produit, veut acheter, donne budget, demande prix, cadeau, décoration
               AUSSI si: fautes de frappe, arabe, dialectal tunisien, SMS, mélange langues
               AUSSI si: "donnez-moi", "montrez-moi", "vous avez quoi", "c'est pour"
- sav        = problème, cassé, abîmé, pas reçu, remboursement, réclamation

JSON: {{"intention": "simple"|"recommandation"|"sav", "raison": "1 mot"}}""")

    return r.get("intention", "recommandation")


# ─── Handler simple ───────────────────────────────────────────────────────────

def handle_simple(message: str, historique: list) -> dict:
    hist = "\n".join([f"{h['role']}: {h['content']}" for h in historique[-3:]])
    r = _gemini(f"""Tu es une conseillère d'une boutique artisanale tunisienne.
Réponds chaleureusement en 1-2 phrases max.
Si salutation → accueille et propose d'aider à trouver un produit ou cadeau.
Historique: {hist if hist else "début"} | Message: "{message}"
JSON: {{"reponse": "ta réponse courte"}}""")
    return {
        "reponse": r.get("reponse","Bonjour ! Comment puis-je vous aider ?"),
        "action": "simple", "rag_utilise": False, "produits_rag": [],
        "produit_recommande": None, "code_produit": None,
        "prix_recommande": None, "pitch": None,
        "prochaine_etape": "continuer", "profil_updates": {}
    }


# ─── Handler SAV ──────────────────────────────────────────────────────────────

def handle_sav(message: str, historique: list) -> dict:
    r = _gemini(f"""Tu es une conseillère d'une boutique artisanale tunisienne.
Réponds avec empathie en 2-3 phrases. Reconnais le problème.
Demande email OU téléphone — donne le choix.
Message: "{message}"
JSON: {{"reponse": "réponse empathique"}}""")
    return {
        "reponse": r.get("reponse","Je suis désolée. Quel est votre contact pour qu'on règle ça ?"),
        "action": "sav", "rag_utilise": False, "produits_rag": [],
        "produit_recommande": None, "code_produit": None,
        "prix_recommande": None, "pitch": None,
        "prochaine_etape": "contact", "profil_updates": {}
    }


# ─── Handler recommandation ───────────────────────────────────────────────────

def handle_recommandation(message: str, historique: list,
                           info_client: dict, budget_max: int = None) -> dict:
    from rag import search_services

    occasion = info_client.get("occasion")
    budget   = info_client.get("budget") or budget_max
    pour_qui = info_client.get("pour_qui")
    nb_q     = info_client.get("questions_posees", 0)
    hist     = "\n".join([f"{h['role']}: {h['content']}" for h in historique[-6:]])

    # Détecte si assez d'infos pour RAG direct
    msg_lower = message.lower()
    has_product = any(w in msg_lower for w in [
        "céramique","bois","tapis","poterie","sculpture","déco","cuivre",
        "broderie","plateau","boîte","verre","magnet","boudha","tortue","olivier",
        "calligraphie","osmanli","ottoman","berbère"
    ])
    has_budget = budget or any(c.isdigit() for c in message) or \
                 any(w in msg_lower for w in ["dt","dinar","euro","cher","économique","pas cher"])
    has_occasion = occasion or any(w in msg_lower for w in [
        "cadeau","offrir","anniversaire","mariage","mère","père","femme",
        "homme","fille","fils","ami","famille","déco","décoration","salon",
        "cuisine","bureau","maison"
    ])
    # Besoin vague = message général sans produit/occasion/budget précis
    mots_vague = ["quelque chose","un truc","un objet","un article",
                  "une chose","beau","belle","joli","bien","sympa",
                  "original","unique","special","spécial","marché"]
    is_vague = (any(m in msg_lower for m in mots_vague)
                and not has_product and not has_occasion and not has_budget)

    # Assez d'infos si : contexte précis OU déjà 2 questions posées
    # PAS assez si : besoin vague sans détails
    has_context = (not is_vague) and (has_product or has_budget or has_occasion or pour_qui or nb_q >= 2) or (nb_q >= 2)

    # ── Pas assez d'infos → 1 question ───────────────────────────────────────
    if not has_context:
        r = _gemini(f"""Tu es une conseillère boutique artisanale tunisienne.
Pose UNE seule question courte et naturelle pour mieux orienter.
Exemples : "C'est pour offrir ou pour vous ?" / "Quel budget avez-vous ?"
Message: "{message}" | Historique: {hist if hist else "début"}
JSON: {{
  "reponse": "ta question",
  "occasion_detectee": "cadeau|déco|personnel|null",
  "pour_qui_detecte": "femme|homme|enfant|maison|null",
  "budget_detecte": 0
}}""")
        updates = {"questions_posees": nb_q + 1}
        if r.get("occasion_detectee","null") not in ("null","None",None):
            updates["occasion"] = r["occasion_detectee"]
        if r.get("pour_qui_detecte","null") not in ("null","None",None):
            updates["pour_qui"] = r["pour_qui_detecte"]
        if int(r.get("budget_detecte") or 0) > 0:
            updates["budget"] = r["budget_detecte"]
        return {
            "reponse": r.get("reponse","C'est pour offrir ou pour vous ?"),
            "action": "question", "rag_utilise": False, "produits_rag": [],
            "produit_recommande": None, "code_produit": None,
            "prix_recommande": None, "pitch": None,
            "prochaine_etape": "continuer", "profil_updates": updates
        }

    # ── RAG ───────────────────────────────────────────────────────────────────
    query = message
    if occasion: query += f" {occasion}"
    if pour_qui: query += f" pour {pour_qui}"

    produits = search_services(query=query, n_results=3, budget_max=budget)

    # Filtrer immédiatement les produits à prix 0
    produits = [p for p in produits if p.get("prix_mensuel", 0) > 0]

    if not produits:
        msg = "Je n'ai pas trouvé de produit disponible"
        if budget:
            msg += f" à moins de {budget} DT. Voulez-vous augmenter le budget ?"
        else:
            msg += " pour cette recherche. Pouvez-vous préciser ?"
        return {
            "reponse": msg,
            "action": "info", "rag_utilise": True, "produits_rag": [],
            "produit_recommande": None, "code_produit": None,
            "prix_recommande": None, "pitch": None,
            "prochaine_etape": "continuer", "profil_updates": {}
        }

    # Format produits pour Gemini
    produits_txt = "\n".join([
        f"PRODUIT {i+1}: {p['titre']} | Prix: {p['prix_mensuel']} DT"
        f"{' (PROMO: '+str(p['prix_promo'])+' DT)' if p.get('prix_promo') and float(p.get('prix_promo',0))>0 else ''}"
        f" | Matière: {p['matiere'] if p.get('matiere') and p['matiere'] not in ('','Autre') else 'artisanale'}"
        f" | {p['categorie']}"
        f" | {'✅ Dispo' if p['en_stock'] else '⚠️ Vérifier'}"
        for i, p in enumerate(produits)
    ])

    r = _gemini(f"""Tu es une conseillère d une boutique artisanale tunisienne.
Ecris une réponse COURTE en 3 phrases. Pas de paragraphes longs.

Exemple de bonne réponse :
"Je vous recommande la Boîte en céramique à 15 DT. Fabriquée en bois d olivier avec des motifs géométriques bleus, elle s utilise comme rangement décoratif. C est un cadeau parfait et original — souhaitez-vous la réserver ?"

PROFIL CLIENT :
- Message : "{message}"
- Occasion : {occasion or 'non précisé'}
- Pour qui : {pour_qui or 'non précisé'}
- Budget : {budget or 'non précisé'} DT
- Articles Préférés (Favoris) : {info_client.get('favoris', 'aucun')}

PRODUITS DISPONIBLES :
{produits_txt}

HISTORIQUE : {hist if hist else "début"}

NOTE SUR LES FAVORIS: Si l'utilisateur a des articles préférés, essaie d'orienter la recommandation vers des produits similaires ou complémentaires à ses favoris. Si l'utilisateur demande explicitement ses favoris, liste-les.

Réponds UNIQUEMENT en JSON valide. Remplace chaque valeur entre guillemets par ta vraie réponse :
{{
  "reponse": "...",
  "produit_recommande": "...",
  "code_produit": "...",
  "prix_recommande": 0,
  "pitch": "...",
  "prochaine_etape": "voir_produit",
  "occasion_detectee": "null",
  "pour_qui_detecte": "null",
  "budget_detecte": 0,
  "style_detecte": "null"
}}""")

    updates = {}
    for dest, src in [("occasion","occasion_detectee"),("pour_qui","pour_qui_detecte"),("style","style_detecte")]:
        v = r.get(src)
        if v and str(v) not in ("null","None","0"): updates[dest] = v
    if int(r.get("budget_detecte") or 0) > 0: updates["budget"] = r["budget_detecte"]

    return {
        "reponse":            r.get("reponse","Voici ma recommandation..."),
        "action":             "recommandation",
        "produit_recommande": r.get("produit_recommande"),
        "code_produit":       r.get("code_produit"),
        "prix_recommande":    r.get("prix_recommande", 0),
        "pitch":              r.get("pitch"),
        "prochaine_etape":    r.get("prochaine_etape","voir_produit"),
        "rag_utilise":        True,
        "produits_rag":       produits,
        "profil_updates":     updates
    }


# ─── Point d'entrée ───────────────────────────────────────────────────────────

def run(message: str, historique: list,
        info_client: dict, budget_max: int = None) -> dict:
    intention = classify(message, historique)
    if   intention == "simple": result = handle_simple(message, historique)
    elif intention == "sav":    result = handle_sav(message, historique)
    else:                       result = handle_recommandation(message, historique, info_client, budget_max)
    result["intention"] = intention
    return result
