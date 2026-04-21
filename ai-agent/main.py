from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import Optional
import uuid, os, shutil
from dotenv import load_dotenv

load_dotenv()

from rag import index_services, get_all_services
from agent import run
import db

# ─── Lifespan (remplace @app.on_event("startup")) ────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    db.init_db()
    n = index_services()
    print(f"✅ {n} produits indexés")
    yield
    # Shutdown (optionnel)

app = FastAPI(title="Boutique Artisanale — Agent IA", version="4.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

sessions: dict = {}

class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str
    budget_max: Optional[int] = None

class ContactRequest(BaseModel):
    session_id: str
    nom: str
    email: Optional[str] = None
    telephone: Optional[str] = None

class FavoriteRequest(BaseModel):
    user_id: str
    product_code: str
    product_name: Optional[str] = ""

class IndexRequest(BaseModel):
    path: Optional[str] = None

@app.get("/")
def root():
    return {
        "api": "Sougui AI Agent",
        "version": "4.0.0",
        "status": "✅ en ligne",
        "docs": "/docs",
        "endpoints": ["/health", "/chat", "/produits", "/favorites/{user_id}"]
    }

@app.get("/health")
def health():
    from google import genai as google_genai
    api_key = os.getenv("GEMINI_API_KEY", "")
    gemini_ok, gemini_status = False, "❌ clé manquante"
    if api_key and api_key != "ta_clé_gemini_ici":
        try:
            client = google_genai.Client(api_key=api_key)
            resp = client.models.generate_content(
                model="gemini-2.0-flash", contents="OK"
            )
            if resp.text:
                gemini_ok, gemini_status = True, "✅ connecté"
        except Exception as e:
            gemini_status = f"❌ {e}"
    try:
        produits = get_all_services()
        chroma_ok, chroma_status = True, f"✅ {len(produits)} produits"
    except Exception as e:
        chroma_ok, chroma_status, produits = False, f"❌ {e}", []
    cats = sorted(set(
        p.get("categorie","") for p in produits
        if p.get("categorie") and p["categorie"] != "Non catalogué"
    ))
    return {
        "api": "✅ en ligne",
        "gemini": gemini_status,
        "chromadb": chroma_status,
        "categories": cats,
        "sessions": len(sessions),
        "pret": gemini_ok and chroma_ok
    }

@app.post("/chat")
def chat(req: ChatRequest):
    sid = req.session_id or str(uuid.uuid4())
    
    # Charger depuis la DB
    historique, info_client = db.get_session(sid)
    
    # Fusionner avec les infos en mémoire si présentes (fallback)
    if sid in sessions:
        if not historique: historique = sessions[sid].get("historique", [])
        if not info_client: info_client = sessions[sid].get("info_client", {})

    # Récupérer les favoris pour enrichir le contexte de l'agent
    favoris = db.get_favorites(sid)
    if favoris:
        info_client["favoris"] = [f["name"] or f["code"] for f in favoris]

    # ── Exécuter l'agent ────────────────────────────────────────────────────
    result = run(
        message=req.message,
        historique=historique,
        info_client=info_client,
        budget_max=req.budget_max
    )

    # ── Mettre à jour le profil client ──────────────────────────────────────
    updates = result.pop("profil_updates", {})
    for k, v in updates.items():
        info_client[k] = v

    # ── Sauvegarder dans l'historique ───────────────────────────────────────
    historique.append({"role": "client",      "content": req.message})
    historique.append({"role": "conseillere", "content": result["reponse"]})

    # ── Sauvegarder en DB ───────────────────────────────────────────────────
    db.save_session(sid, historique, info_client)
    sessions[sid] = {"historique": historique, "info_client": info_client}
    return {
        "session_id":         sid,
        "response":           result["reponse"],
        "action":             result.get("action"),
        "intention":          result.get("intention"),
        "rag_utilise":        result.get("rag_utilise", False),
        "produit_recommande": result.get("produit_recommande"),
        "prix_recommande":    result.get("prix_recommande"),
        "pitch":              result.get("pitch"),
        "prochaine_etape":    result.get("prochaine_etape"),
        "profil_client":      info_client,
        "favoris":            favoris,
        "produits_rag": [
            {
                "nom":       p["titre"],
                "code":      p["code"],
                "prix":      p["prix_mensuel"],
                "categorie": p["categorie"],
                "matiere":   p["matiere"],
                "en_stock":  p["en_stock"],
                "score":     p["score_similarite"]
            }
            for p in result.get("produits_rag", [])
        ],
        "nb_messages": len(historique)
    }

@app.post("/contact")
def save_contact(req: ContactRequest):
    session = sessions.get(req.session_id, {})
    info = session.get("info_client", {})
    ticket = {
        "ticket_id": f"CMD-{str(uuid.uuid4())[:8].upper()}",
        "nom": req.nom, "email": req.email, "telephone": req.telephone,
        "occasion": info.get("occasion",""),
        "budget":   info.get("budget", 0),
        "statut":   "nouveau"
    }
    return {"success": True, "ticket": ticket,
            "message": f"Ticket {ticket['ticket_id']} créé. Réponse sous 24h."}

@app.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(400, "CSV requis")
    os.makedirs("data", exist_ok=True)
    with open("data/products.csv", "wb") as f:
        shutil.copyfileobj(file.file, f)
    n = index_services("data/products.csv")
    return {"success": True, "produits_indexes": n,
            "message": f"✅ {n} produits indexés (prix>0 et publiés)"}

@app.get("/session/{session_id}")
def get_session(session_id: str):
    if session_id not in sessions:
        raise HTTPException(404, "Session non trouvée")
    s = sessions[session_id]
    return {"session_id": session_id, "historique": s["historique"],
            "profil_client": s["info_client"],
            "nb_messages": len(s["historique"])}

@app.delete("/session/{session_id}")
def reset_session(session_id: str):
    if session_id in sessions: del sessions[session_id]
    return {"success": True}

@app.post("/favorites")
def toggle_favorite(req: FavoriteRequest):
    db.add_favorite(req.user_id, req.product_code, req.product_name)
    return {"success": True, "favorites": db.get_favorites(req.user_id)}

@app.get("/favorites/{user_id}")
def get_favorites(user_id: str):
    return {"user_id": user_id, "favorites": db.get_favorites(user_id)}

@app.get("/produits")
def list_produits(categorie: Optional[str] = None):
    p = get_all_services()
    if categorie:
        p = [x for x in p if categorie.lower() in x.get("categorie","").lower()]
    return {"produits": p, "total": len(p)}

@app.post("/index")
def reindex(req: IndexRequest = IndexRequest()):
    try:
        n = index_services(req.path)
        return {"success": True, "produits_indexes": n}
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/health/detail")
def health_detail():
    """Vérifie en détail : Gemini + ChromaDB + produits avec prix > 0."""
    from google import genai as google_genai

    api_key = os.getenv("GEMINI_API_KEY", "")
    gemini_ok, gemini_status = False, "❌ clé manquante"
    if api_key and api_key != "ta_clé_gemini_ici":
        try:
            client = google_genai.Client(api_key=api_key)
            resp = client.models.generate_content(
                model="gemini-2.0-flash", contents="OK"
            )
            if resp.text:
                gemini_ok, gemini_status = True, "✅ connecté"
        except Exception as e:
            gemini_status = f"❌ {e}"

    # ChromaDB — tous les produits
    try:
        tous = get_all_services()
        avec_prix = [p for p in tous if p.get("prix", 0) > 0]
        sans_prix = [p for p in tous if p.get("prix", 0) == 0]
        cats = sorted(set(
            p.get("categorie","") for p in avec_prix
            if p.get("categorie") and p["categorie"] != "Non catalogué"
        ))
        chroma_ok = True
        chroma_status = f"✅ {len(avec_prix)} produits avec prix > 0"
    except Exception as e:
        tous, avec_prix, sans_prix, cats = [], [], [], []
        chroma_ok, chroma_status = False, f"❌ {e}"

    # Fichier CSV présent ?
    csv_present = os.path.exists("data/products.csv")
    csv_lines = 0
    if csv_present:
        with open("data/products.csv", encoding="utf-8-sig") as f:
            csv_lines = sum(1 for _ in f) - 1  # sans header

    return {
        "pret": gemini_ok and chroma_ok and len(avec_prix) > 0,
        "gemini": gemini_status,
        "csv": {
            "fichier_present": csv_present,
            "lignes_total": csv_lines,
            "produits_indexes": len(tous),
            "avec_prix_gt_0": len(avec_prix),
            "sans_prix_0":    len(sans_prix),
        },
        "categories_disponibles": cats,
        "apercu_produits": [
            {"nom": p["nom"], "prix": p.get("prix", 0), "categorie": p.get("categorie","")}
            for p in avec_prix[:5]
        ],
        "problemes": (
            ["❌ CSV non uploadé"] if not csv_present else []
        ) + (
            [f"❌ {len(sans_prix)} produits à prix=0 ignorés"] if sans_prix else []
        ) + (
            ["❌ Gemini non connecté"] if not gemini_ok else []
        ) + (
            ["✅ Tout est OK !"] if (gemini_ok and len(avec_prix) > 0) else []
        )
    }
