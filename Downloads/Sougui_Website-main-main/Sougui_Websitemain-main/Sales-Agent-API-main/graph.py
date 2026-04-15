from typing import TypedDict, Literal, Optional, List
from langgraph.graph import StateGraph, END
import google.generativeai as genai
import os
import json
import re

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.5-flash")

# ─── State — tout ce qui voyage entre les noeuds ────────────────────────────

class AgentState(TypedDict):
    # Entrée
    message: str
    session_id: str
    budget_max: Optional[int]

    # Profil client accumulé
    historique: List[dict]
    occasion: Optional[str]
    budget: Optional[int]
    style: Optional[str]
    pour_qui: Optional[str]

    # Résultats intermédiaires
    intention: Optional[str]          # "simple" | "qualifier" | "recherche" | "sav"
    produits_rag: List[dict]
    questions_posees: int

    # Sortie finale
    reponse: Optional[str]
    action: Optional[str]
    produit_recommande: Optional[str]
    prochaine_etape: Optional[str]


def _call_gemini(prompt: str) -> str:
    resp = model.generate_content(prompt)
    txt = resp.text.strip()
    txt = re.sub(r'```json\s*', '', txt)
    txt = re.sub(r'```\s*', '', txt)
    return txt.strip()


def _parse_json(txt: str) -> dict:
    match = re.search(r'\{.*\}', txt, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except Exception:
            pass
    return {}


# ─── Noeud 1 : Classifier ────────────────────────────────────────────────────

def node_classifier(state: AgentState) -> AgentState:
    """
    Lit le message et décide l'intention :
    - simple    → salutation, merci, question générale
    - qualifier → besoin flou, pas assez d'infos pour chercher
    - recherche → client cherche un produit directement
    - sav       → problème, réclamation, demande de contact
    """
    msg = state["message"].lower()
    historique = state.get("historique", [])

    # Vérification rapide sans LLM pour les cas évidents
    mots_simple = ["bonjour", "bonsoir", "salut", "merci", "ok", "super",
                   "au revoir", "parfait", "d'accord", "oui", "non"]
    mots_sav = ["problème", "cassé", "abîmé", "pas arrivé", "livraison",
                "rembours", "réclamation", "rappel", "contactez"]
    mots_recherche = ["cherche", "veux", "voudrais", "besoin", "cadeau",
                      "céramique", "bois", "tapis", "poterie", "déco",
                      "budget", "prix", "combien"]

    if any(m in msg for m in mots_sav):
        return {**state, "intention": "sav"}

    if len(msg.split()) <= 4 and any(m in msg for m in mots_simple):
        return {**state, "intention": "simple"}

    if any(m in msg for m in mots_recherche):
        return {**state, "intention": "recherche"}

    # Cas ambigu → LLM décide
    prompt = f"""Message client : "{state['message']}"
Historique récent : {json.dumps(historique[-4:], ensure_ascii=False)}
Profil connu : occasion={state.get('occasion')}, budget={state.get('budget')}

Classe l'intention en JSON :
{{"intention": "simple"|"qualifier"|"recherche"|"sav",
  "raison": "1 phrase"}}

- simple : salutation, remerciement, question générale sans produit
- qualifier : besoin vague, besoin de plus d'infos avant de chercher
- recherche : client cherche un produit précis, ou assez d'infos pour recommander
- sav : problème commande, réclamation, demande contact"""

    result = _parse_json(_call_gemini(prompt))
    intention = result.get("intention", "qualifier")

    return {**state, "intention": intention}


# ─── Noeud 2 : Chat simple ───────────────────────────────────────────────────

def node_chat_simple(state: AgentState) -> AgentState:
    """Répond aux messages simples sans faire de recherche."""
    hist_txt = "\n".join([f"{m['role']}: {m['content']}" for m in state.get("historique", [])[-4:]])

    prompt = f"""Tu es Yasmine, conseillère d'une boutique artisanale tunisienne.
Réponds chaleureusement à ce message simple.
Si c'est une salutation → accueille et demande comment tu peux aider.
Si c'est un remerciement → réponds gentiment.

Historique : {hist_txt if hist_txt else "début"}
Message : "{state['message']}"

Réponds en JSON :
{{"reponse": "ta réponse courte et chaleureuse",
  "prochaine_etape": "continuer"}}"""

    result = _parse_json(_call_gemini(prompt))
    return {
        **state,
        "reponse": result.get("reponse", "Bonjour ! Comment puis-je vous aider ?"),
        "action": "simple",
        "prochaine_etape": "continuer"
    }


# ─── Noeud 3 : Qualifier ─────────────────────────────────────────────────────

def node_qualifier(state: AgentState) -> AgentState:
    """Pose 1 question ciblée pour comprendre le besoin."""
    hist_txt = "\n".join([f"{m['role']}: {m['content']}" for m in state.get("historique", [])[-6:]])
    questions_posees = state.get("questions_posees", 0)

    # Si déjà 2 questions posées → passer directement à la recherche
    if questions_posees >= 2:
        return {**state, "intention": "recherche"}

    prompt = f"""Tu es Yasmine, conseillère boutique artisanale tunisienne.
Le client a un besoin flou. Pose UNE seule question courte et précise
pour mieux comprendre afin de recommander le bon produit.

Ce qu'on sait : occasion={state.get('occasion')}, budget={state.get('budget')}, style={state.get('style')}
Historique : {hist_txt if hist_txt else "début"}
Message actuel : "{state['message']}"

Ne pose qu'UNE question. Réponds en JSON :
{{"reponse": "ta question courte et naturelle",
  "occasion_detectee": "cadeau|déco|personnel|null",
  "pour_qui_detecte": "femme|homme|enfant|maison|null",
  "budget_detecte": 0}}"""

    result = _parse_json(_call_gemini(prompt))

    updates = {"questions_posees": questions_posees + 1}
    if result.get("occasion_detectee"):
        updates["occasion"] = result["occasion_detectee"]
    if result.get("pour_qui_detecte"):
        updates["pour_qui"] = result["pour_qui_detecte"]
    if result.get("budget_detecte") and int(result.get("budget_detecte", 0)) > 0:
        updates["budget"] = result["budget_detecte"]

    return {
        **state,
        **updates,
        "reponse": result.get("reponse", "Pouvez-vous me donner plus de détails ?"),
        "action": "question",
        "prochaine_etape": "continuer"
    }


# ─── Noeud 4 : RAG + Recommander ─────────────────────────────────────────────

def node_rag_recommander(state: AgentState) -> AgentState:
    """Cherche dans ChromaDB et génère une recommandation personnalisée."""
    from rag import search_services

    # Construire la requête RAG depuis le profil client
    query_parts = [state["message"]]
    if state.get("occasion"):
        query_parts.append(state["occasion"])
    if state.get("style"):
        query_parts.append(state["style"])
    if state.get("pour_qui"):
        query_parts.append(f"pour {state['pour_qui']}")

    query = " ".join(query_parts)
    budget = state.get("budget") or state.get("budget_max")

    produits = search_services(query=query, n_results=3, budget_max=budget)

    if not produits:
        return {
            **state,
            "produits_rag": [],
            "reponse": "Je n'ai pas trouvé de produit correspondant. Pouvez-vous préciser votre recherche ?",
            "action": "info",
            "prochaine_etape": "continuer"
        }

    # Formater les produits pour Gemini
    produits_txt = "\n".join([
        f"- {p['titre']} | {p['prix_mensuel']} DT"
        f"{' | PROMO: '+str(p['prix_promo'])+' DT' if p['prix_promo'] and float(p['prix_promo'])>0 else ''}"
        f" | {p['matiere'] if p['matiere'] and p['matiere'] != 'Autre' else 'artisanal'}"
        f" | {p['categorie']}"
        f" | {'✅ En stock' if p['en_stock'] else '⚠️ Vérifier stock'}"
        f" | Score: {p['score_similarite']}"
        for p in produits
    ])

    hist_txt = "\n".join([f"{m['role']}: {m['content']}" for m in state.get("historique", [])[-6:]])

    prompt = f"""Tu es Yasmine, conseillère boutique artisanale tunisienne.
Recommande le meilleur produit avec chaleur et passion.

PROFIL CLIENT :
- Message : "{state['message']}"
- Occasion : {state.get('occasion', 'non précisé')}
- Pour qui : {state.get('pour_qui', 'non précisé')}
- Budget : {state.get('budget', 'non précisé')} DT
- Style : {state.get('style', 'non précisé')}

PRODUITS TROUVÉS PAR RAG :
{produits_txt}

HISTORIQUE : {hist_txt if hist_txt else "début"}

Recommande en expliquant POURQUOI ce produit pour CE client.
Mentionne le prix clairement. Propose une action concrète.

Réponds en JSON :
{{"reponse": "ta recommandation chaleureuse et convaincante",
  "produit_recommande": "nom exact du produit",
  "prix_recommande": 0,
  "pitch": "1 phrase émotionnelle sur le produit",
  "prochaine_etape": "voir_produit|ajouter_panier|contact",
  "style_detecte": "traditionnel|moderne|coloré|null"}}"""

    result = _parse_json(_call_gemini(prompt))

    updates = {}
    if result.get("style_detecte"):
        updates["style"] = result["style_detecte"]

    return {
        **state,
        **updates,
        "produits_rag": produits,
        "reponse": result.get("reponse", "Voici ma recommandation..."),
        "action": "recommandation",
        "produit_recommande": result.get("produit_recommande"),
        "prochaine_etape": result.get("prochaine_etape", "voir_produit")
    }


# ─── Noeud 5 : SAV ───────────────────────────────────────────────────────────

def node_sav(state: AgentState) -> AgentState:
    """Gère les problèmes et collecte le contact client."""
    hist_txt = "\n".join([f"{m['role']}: {m['content']}" for m in state.get("historique", [])[-4:]])

    prompt = f"""Tu es Yasmine, conseillère boutique artisanale tunisienne.
Le client a un problème. Réponds avec empathie, reconnaît le problème,
et demande son contact (email OU téléphone — donne le choix).

Message : "{state['message']}"
Historique : {hist_txt if hist_txt else "début"}

Réponds en JSON :
{{"reponse": "réponse empathique + demande contact naturelle",
  "prochaine_etape": "contact"}}"""

    result = _parse_json(_call_gemini(prompt))
    return {
        **state,
        "reponse": result.get("reponse", "Je suis désolée pour ce problème. Quel est votre email ?"),
        "action": "sav",
        "prochaine_etape": "contact"
    }


# ─── Router — décide quel noeud appeler après le classifier ─────────────────

def router(state: AgentState) -> Literal["chat_simple", "qualifier", "rag_recommander", "sav"]:
    intention = state.get("intention", "qualifier")
    if intention == "simple":
        return "chat_simple"
    elif intention == "sav":
        return "sav"
    elif intention == "recherche":
        return "rag_recommander"
    else:
        return "qualifier"


def qualifier_router(state: AgentState) -> Literal["rag_recommander", "fin"]:
    """Après qualifier : assez d'infos ? → RAG, sinon → fin (attend réponse)"""
    if state.get("intention") == "recherche":
        return "rag_recommander"
    return "fin"


# ─── Construction du graphe ──────────────────────────────────────────────────

def build_graph():
    graph = StateGraph(AgentState)

    graph.add_node("classifier", node_classifier)
    graph.add_node("chat_simple", node_chat_simple)
    graph.add_node("qualifier", node_qualifier)
    graph.add_node("rag_recommander", node_rag_recommander)
    graph.add_node("sav", node_sav)

    graph.set_entry_point("classifier")

    graph.add_conditional_edges("classifier", router, {
        "chat_simple":     "chat_simple",
        "qualifier":       "qualifier",
        "rag_recommander": "rag_recommander",
        "sav":             "sav"
    })

    graph.add_conditional_edges("qualifier", qualifier_router, {
        "rag_recommander": "rag_recommander",
        "fin":             END
    })

    graph.add_edge("chat_simple",     END)
    graph.add_edge("rag_recommander", END)
    graph.add_edge("sav",             END)

    return graph.compile()


# Instance globale du graphe
agent_graph = build_graph()


def run_agent(message: str, session_id: str, historique: list,
              info_client: dict, budget_max: int = None) -> dict:
    """Point d'entrée principal — exécute le graphe LangGraph."""

    initial_state: AgentState = {
        "message":           message,
        "session_id":        session_id,
        "budget_max":        budget_max,
        "historique":        historique,
        "occasion":          info_client.get("occasion"),
        "budget":            info_client.get("budget"),
        "style":             info_client.get("style"),
        "pour_qui":          info_client.get("pour_qui"),
        "intention":         None,
        "produits_rag":      [],
        "questions_posees":  info_client.get("questions_posees", 0),
        "reponse":           None,
        "action":            None,
        "produit_recommande": None,
        "prochaine_etape":   None,
    }

    final_state = agent_graph.invoke(initial_state)

    return {
        "reponse":           final_state.get("reponse", ""),
        "action":            final_state.get("action"),
        "intention":         final_state.get("intention"),
        "produit_recommande": final_state.get("produit_recommande"),
        "prochaine_etape":   final_state.get("prochaine_etape"),
        "produits_rag":      final_state.get("produits_rag", []),
        "profil_client": {
            "occasion":        final_state.get("occasion"),
            "budget":          final_state.get("budget"),
            "style":           final_state.get("style"),
            "pour_qui":        final_state.get("pour_qui"),
            "questions_posees": final_state.get("questions_posees", 0),
        }
    }
