import chromadb
import json
import csv
import os

chroma_client = chromadb.PersistentClient(path="/app/chroma_db")
collection = chroma_client.get_or_create_collection(
    name="produits_artisanaux",
    metadata={"hnsw:space": "cosine"}
)


def _build_texte(p: dict) -> str:
    parts = []
    if p.get("Nom_Produit"):
        parts.append(p["Nom_Produit"])
    if p.get("Categorie") and p["Categorie"] not in ("", "Non catalogué"):
        parts.append(f"Catégorie: {p['Categorie']}")
    if p.get("Sous_Categorie") and p["Sous_Categorie"] not in ("", "Non catalogué"):
        parts.append(f"Sous-catégorie: {p['Sous_Categorie']}")
    if p.get("Matiere") and p["Matiere"] not in ("", "Autre"):
        parts.append(f"Matière: {p['Matiere']}")
    prix = float(p.get("Prix_Vente_HT", 0) or 0)
    if prix > 0:
        parts.append(f"Prix: {prix} DT")
    nom = p.get("Nom_Produit", "").lower()
    tags = []
    keywords = {
        "cadeau": ["cadeau", "gift", "offrir"],
        "déco": ["déco", "décoration", "boudha", "sculpture", "magnet", "tortue"],
        "céramique": ["céramique", "boîte", "poterie", "bouteille"],
        "bois": ["bois", "olivier"],
        "artisanal": ["artisan", "artisanal", "collection"],
        "cuisine": ["tasse", "soucoupe", "arts de la table", "plateau", "verre"],
        "cuivre": ["cuivre", "métal"],
        "calligraphie": ["calligraphie", "arabe", "ottoman"],
    }
    for tag, kws in keywords.items():
        if any(kw in nom for kw in kws):
            tags.append(tag)
    if p.get("Categorie") and p["Categorie"] not in ("", "Non catalogué"):
        tags.append(p["Categorie"].lower())
    if tags:
        parts.append(f"Tags: {', '.join(set(tags))}")
    return ". ".join(parts)


def index_from_csv(path: str = "data/products.csv") -> int:
    produits = []
    with open(path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            nom = row.get("Nom_Produit", "").strip()
            code = row.get("Code_Produit", "").strip()
            prix = float(row.get("Prix_Vente_HT", 0) or 0)
            publie_raw = str(row.get("Publie_Web", "False")).strip().lower()
            publie = publie_raw in ("true", "1", "yes", "oui")

            # ✅ On indexe tout ce qui a un nom et un code pour le test
            if not nom or not code:
                continue

            produits.append(row)

    if not produits:
        return 0

    try:
        existing = collection.get()
        if existing["ids"]:
            collection.delete(ids=existing["ids"])
    except Exception:
        pass

    ids, documents, metadatas = [], [], []
    for p in produits:
        prix = float(p.get("Prix_Vente_HT", 0) or 0)
        prix_promo = float(p.get("Prix_Promo", 0) or 0)
        en_stock_raw = str(p.get("En_Stock", "False")).strip().lower()
        en_stock = en_stock_raw in ("true", "1", "yes", "oui")

        texte = _build_texte(p)
        code = p["Code_Produit"].strip()

        ids.append(code)
        documents.append(texte)
        metadatas.append({
            "code": code,
            "nom": p["Nom_Produit"].strip(),
            "categorie": p.get("Categorie", "").strip(),
            "sous_categorie": p.get("Sous_Categorie", "").strip(),
            "matiere": p.get("Matiere", "").strip(),
            "prix": prix,
            "prix_promo": prix_promo,
            "en_stock": str(en_stock),
            "publie_web": "True"
        })

    batch_size = 50
    for i in range(0, len(ids), batch_size):
        collection.add(
            ids=ids[i:i+batch_size],
            documents=documents[i:i+batch_size],
            metadatas=metadatas[i:i+batch_size]
        )

    return len(ids)


def index_from_json(path: str = "data/services.json") -> int:
    with open(path, encoding="utf-8") as f:
        services = json.load(f)
    try:
        existing = collection.get()
        if existing["ids"]:
            collection.delete(ids=existing["ids"])
    except Exception:
        pass
    ids, documents, metadatas = [], [], []
    for s in services:
        texte = (
            f"{s['titre']}. {s['description']}. "
            f"Catégorie: {s['categorie']}. "
            f"Tags: {', '.join(s['labels'])}."
        )
        ids.append(s["id"])
        documents.append(texte)
        metadatas.append({
            "code": s["id"],
            "nom": s["titre"],
            "categorie": s["categorie"],
            "sous_categorie": "",
            "matiere": "",
            "prix": float(s["prix_mensuel"]),
            "prix_promo": 0.0,
            "en_stock": "True",
            "publie_web": "True"
        })
    collection.add(ids=ids, documents=documents, metadatas=metadatas)
    return len(ids)


def index_services(path: str = None) -> int:
    csv_path = path or "data/products.csv"
    json_path = "data/services.json"
    if os.path.exists(csv_path):
        print(f"📦 Indexation depuis CSV : {csv_path}")
        return index_from_csv(csv_path)
    elif os.path.exists(json_path):
        print(f"📦 Indexation depuis JSON : {json_path}")
        return index_from_json(json_path)
    else:
        print("⚠️ Aucun fichier trouvé")
        return 0


def needs_rag(message: str, historique: list) -> bool:
    """
    Décide si le RAG est nécessaire pour ce message.
    Évite les appels inutiles pour salutations et questions générales.
    """
    msg = message.lower().strip()

    # Messages courts / salutations → pas de RAG
    mots_salutation = [
        "bonjour", "bonsoir", "salut", "hello", "hi", "coucou",
        "merci", "au revoir", "ok", "oui", "non", "d'accord",
        "super", "parfait", "génial", "bien", "très bien"
    ]
    if len(msg.split()) <= 3 and any(m in msg for m in mots_salutation):
        return False

    # Salutation seule
    if msg in mots_salutation:
        return False

    # Questions sur la commande/livraison → pas de RAG produit
    mots_operationnels = [
        "livraison", "commander", "payer", "paiement", "adresse",
        "délai", "retour", "remboursement", "garantie", "contact",
        "email", "téléphone", "horaire", "ouvert"
    ]
    if any(m in msg for m in mots_operationnels):
        return False

    # Tout le reste → RAG utile
    return True


def search_services(query: str, n_results: int = 3, budget_max: int = None) -> list:
    """Cherche les produits — TOUJOURS filtre prix > 0."""
    total = collection.count()
    if total == 0:
        return []

    # Toujours exclure les produits à prix 0
    if budget_max and budget_max > 0:
        where_filter = {"prix": {"$lte": float(budget_max), "$gt": 0.0}}
    else:
        where_filter = {"prix": {"$gt": 0.0}}

    try:
        results = collection.query(
            query_texts=[query],
            n_results=min(n_results, total),
            where=where_filter
        )
    except Exception:
        # Retry sans filtre si aucun résultat
        try:
            results = collection.query(
                query_texts=[query],
                n_results=min(n_results, total)
            )
        except Exception:
            return []

    produits = []
    for i in range(len(results["ids"][0])):
        meta = results["metadatas"][0][i]
        score = round(max(0, 1 - results["distances"][0][i]), 2)
        produits.append({
            "id": results["ids"][0][i],
            "titre": meta["nom"],
            "code": meta["code"],
            "categorie": meta["categorie"],
            "sous_categorie": meta["sous_categorie"],
            "matiere": meta["matiere"],
            "prix_mensuel": meta["prix"],
            "prix_promo": meta["prix_promo"],
            "en_stock": meta["en_stock"] == "True",
            "publie_web": meta["publie_web"] == "True",
            "duree": "",
            "details": f"Matière: {meta['matiere']}" if meta["matiere"] not in ("", "Autre") else "",
            "texte_complet": results["documents"][0][i],
            "score_similarite": score
        })

    return produits


def get_all_services() -> list:
    try:
        results = collection.get()
        produits = []
        for i in range(len(results["ids"])):
            meta = results["metadatas"][i]
            produits.append({
                "id": results["ids"][i],
                "nom": meta["nom"],
                "categorie": meta["categorie"],
                "prix": meta["prix"],
                "en_stock": meta["en_stock"] == "True"
            })
        return produits
    except Exception:
        return []
