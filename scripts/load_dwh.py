"""
load_dwh.py — Sougui BI
Charge tous les CSV post-ETL (ai-agent/data/) vers PostgreSQL Sougui_DWH
Architecture Constellation : FACT_VENTE + FACT_ACHAT + 7 dimensions
"""

import psycopg2
import pandas as pd
import os
from pathlib import Path

# ─── CONFIG ──────────────────────────────────────────────────────────────────
DB = {
    "host":     "localhost",
    "port":     5432,
    "dbname":   "Sougui_DWH",
    "user":     "postgres",
    "password": "postgres",   # ← changer si besoin
}
DATA_DIR = Path(__file__).parent.parent / "ai-agent" / "data"

# ─── CONNEXION ───────────────────────────────────────────────────────────────
def get_conn():
    return psycopg2.connect(**DB)

# ─── CREATION SCHEMA DWH ─────────────────────────────────────────────────────
DDL = """
-- ============================================================
-- ARCHITECTURE CONSTELLATION SOUGUI
-- ============================================================

-- DIM_DATE
CREATE TABLE IF NOT EXISTS dim_date (
    date_key        BIGINT PRIMARY KEY,
    date_complete   DATE,
    jour            INTEGER,
    mois            INTEGER,
    trimestre       INTEGER,
    annee           INTEGER,
    code_date       VARCHAR(20)
);

-- DIM_CLIENT
CREATE TABLE IF NOT EXISTS dim_client (
    client_key          INTEGER PRIMARY KEY,
    code_client         VARCHAR(100),
    nom_client          VARCHAR(200),
    type_client         VARCHAR(10),   -- B2B / B2C
    ville               VARCHAR(200),
    gouvernorat         VARCHAR(100),
    pays                VARCHAR(10),
    matricule_fiscal    VARCHAR(100),
    secteur_activite    VARCHAR(100),
    mode_paiement       VARCHAR(100)
);

-- DIM_PRODUIT
CREATE TABLE IF NOT EXISTS dim_produit (
    produit_key     INTEGER PRIMARY KEY,
    libelle         VARCHAR(300),
    categorie       VARCHAR(100),
    prix_vente      NUMERIC(12,4),
    code_produit    VARCHAR(100)
);

-- DIM_COMMANDE
CREATE TABLE IF NOT EXISTS dim_commande (
    commande_key    INTEGER PRIMARY KEY,
    statut_commande VARCHAR(100),
    mode_paiement   VARCHAR(100),
    code_commande   VARCHAR(100)
);

-- DIM_RECLAMATION
CREATE TABLE IF NOT EXISTS dim_reclamation (
    reclamation_key     INTEGER PRIMARY KEY,
    type_reclamation    VARCHAR(100),
    motif               TEXT,
    statut_reclamation  VARCHAR(100),
    canal_reclamation   VARCHAR(100),
    code_reclamation    VARCHAR(100)
);

-- DIM_CANAL_DISTRIBUTION
CREATE TABLE IF NOT EXISTS dim_canal_distribution (
    canal_key   INTEGER PRIMARY KEY,
    canal       VARCHAR(100),
    code_canal  VARCHAR(50)
);

-- DIM_FOURNISSEUR
CREATE TABLE IF NOT EXISTS dim_fournisseur (
    fournisseur_key     INTEGER PRIMARY KEY,
    code_fournisseur    VARCHAR(100),
    nom_fournisseur     VARCHAR(200),
    nom_normalise       VARCHAR(200),
    type_fournisseur    VARCHAR(100),
    specialite          VARCHAR(100),
    pays                VARCHAR(10)
);

-- DIM_MATIERE_PREMIERE
CREATE TABLE IF NOT EXISTS dim_matiere_premiere (
    matiere_premiere_key    INTEGER PRIMARY KEY,
    libelle                 VARCHAR(200),
    categorie               VARCHAR(100),
    cout_unitaire           NUMERIC(12,4),
    code_matiere_premiere   VARCHAR(100)
);

-- FACT_VENTE  (table de fait principale)
CREATE TABLE IF NOT EXISTS fact_vente (
    vente_key           INTEGER PRIMARY KEY,
    date_key            BIGINT,
    client_key          INTEGER,
    canal_key           INTEGER,
    produit_key         INTEGER,
    commande_key        INTEGER,
    reclamation_key     INTEGER,
    quantite            NUMERIC(12,4),
    prix_unitaire_ht    NUMERIC(12,4),
    montant_ht          NUMERIC(14,4),
    montant_tva         NUMERIC(14,4),
    montant_ttc         NUMERIC(14,4),
    montant_remise      NUMERIC(14,4),
    revenue             NUMERIC(14,4)
);

-- FACT_ACHAT  (deuxième table de fait — constellation)
CREATE TABLE IF NOT EXISTS fact_achat (
    achat_key           INTEGER PRIMARY KEY,
    id_date             BIGINT,
    fournisseur_key     INTEGER,
    mp_key              INTEGER,
    num_facture         VARCHAR(100),
    quantite_achetee    NUMERIC(14,4),
    prix_unitaire       NUMERIC(12,4),
    montant_ht          NUMERIC(14,4),
    montant_tva         NUMERIC(14,4),
    montant_ttc         NUMERIC(14,4),
    revenue             NUMERIC(14,4)
);

-- INDEX pour performances analytiques
CREATE INDEX IF NOT EXISTS idx_fv_date    ON fact_vente(date_key);
CREATE INDEX IF NOT EXISTS idx_fv_client  ON fact_vente(client_key);
CREATE INDEX IF NOT EXISTS idx_fv_canal   ON fact_vente(canal_key);
CREATE INDEX IF NOT EXISTS idx_fa_date    ON fact_achat(id_date);
CREATE INDEX IF NOT EXISTS idx_fa_fourn   ON fact_achat(fournisseur_key);
"""

def create_schema(conn):
    cur = conn.cursor()
    cur.execute(DDL)
    conn.commit()
    print("[OK] Schema DWH cree (ou deja existant)")

# ─── LOADER GENERIQUE ─────────────────────────────────────────────────────────
def load_table(conn, csv_file, table, col_map):
    """
    csv_file  : nom du fichier CSV (dans DATA_DIR)
    table     : nom de la table PostgreSQL cible
    col_map   : dict {col_csv: col_pg}  — mapping des colonnes
    """
    path = DATA_DIR / csv_file
    if not path.exists():
        print(f"[WARN] Fichier introuvable : {path}")
        return

    df = pd.read_csv(path, low_memory=False)
    df = df.rename(columns=col_map)
    df = df[[c for c in col_map.values() if c in df.columns]]

    # Nettoyage NULL
    df = df.where(pd.notnull(df), None)

    # Convertir toutes les colonnes _key (NULL -> 0, string -> int)
    for col in df.columns:
        if col.endswith('_key'):
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(int)

    cur = conn.cursor()
    cols = list(df.columns)
    placeholders = ', '.join(['%s'] * len(cols))
    col_names = ', '.join(cols)
    sql = f"""
        INSERT INTO {table} ({col_names}) VALUES ({placeholders})
        ON CONFLICT DO NOTHING
    """

    rows = [tuple(row) for row in df.itertuples(index=False, name=None)]
    cur.executemany(sql, rows)
    conn.commit()
    print(f"[OK] {table}: {cur.rowcount} lignes inserees ({len(df)} total)")

# ─── MAIN ─────────────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("  SOUGUI DWH - Chargement Constellation PostgreSQL")
    print("=" * 60)

    conn = get_conn()
    print(f"[OK] Connecte a PostgreSQL: {DB['dbname']}")

    # 1. Créer le schéma
    create_schema(conn)

    # 2. Charger les dimensions (ordre important : dims avant faits)
    load_table(conn, "Dim_Date.csv", "dim_date", {
        "date_key": "date_key", "date_complete": "date_complete",
        "jour": "jour", "mois": "mois", "trimestre": "trimestre",
        "annee": "annee", "Code_Date": "code_date"
    })

    load_table(conn, "Dim_Client.csv", "dim_client", {
        "Client_key": "client_key", "Code_client": "code_client",
        "Nom_client": "nom_client", "Type_client": "type_client",
        "Ville": "ville", "Gouvernorat": "gouvernorat", "Pays": "pays",
        "Matricule_Fiscal": "matricule_fiscal",
        "Secteur_Activite": "secteur_activite", "Mode_Paiement": "mode_paiement"
    })

    load_table(conn, "products.csv", "dim_produit", {
        "produit_key": "produit_key", "libelle": "libelle",
        "categorie": "categorie", "prix_vente": "prix_vente",
        "Code_produit": "code_produit"
    })

    load_table(conn, "Dim_Commandes.csv", "dim_commande", {
        "commande_key": "commande_key", "statut_commande": "statut_commande",
        "mode_paiement": "mode_paiement", "Code_Commande": "code_commande"
    })

    load_table(conn, "Dim_Reclamations.csv", "dim_reclamation", {
        "reclamation_key": "reclamation_key",
        "type_reclamation": "type_reclamation", "motif": "motif",
        "statut_reclamation": "statut_reclamation",
        "canal_reclamation": "canal_reclamation",
        "Code_Reclamation": "code_reclamation"
    })

    load_table(conn, "Dim_Canal_Distribution.csv", "dim_canal_distribution", {
        "canal_key": "canal_key", "canal": "canal", "Code_Canal": "code_canal"
    })

    load_table(conn, "Dim_Fournisseur.csv", "dim_fournisseur", {
        "Fournisseur_key": "fournisseur_key", "Code_Fournisseur": "code_fournisseur",
        "Nom_Fournisseur": "nom_fournisseur", "Nom_Normalise": "nom_normalise",
        "Type_Fournisseur": "type_fournisseur", "Specialite": "specialite",
        "Pays": "pays"
    })

    load_table(conn, "Dim_Matiere_Premiere.csv", "dim_matiere_premiere", {
        "matiere_premiere_key": "matiere_premiere_key", "libelle": "libelle",
        "categorie": "categorie", "cout_unitaire": "cout_unitaire",
        "Code_Matiere_Premiere": "code_matiere_premiere"
    })

    # 3. Charger les tables de faits
    load_table(conn, "Fact_Vente.csv", "fact_vente", {
        "vente_key": "vente_key", "date_key": "date_key",
        "client_key": "client_key", "canal_key": "canal_key",
        "produit_key": "produit_key", "commande_key": "commande_key",
        "reclamation_key": "reclamation_key", "quantite": "quantite",
        "prix_unitaire_ht": "prix_unitaire_ht", "montant_ht": "montant_ht",
        "montant_tva": "montant_tva", "montant_ttc": "montant_ttc",
        "montant_remise": "montant_remise", "revenue": "revenue"
    })

    load_table(conn, "Fact_Achat.csv", "fact_achat", {
        "achat_key": "achat_key", "id_date": "id_date",
        "fournisseur_key": "fournisseur_key", "mp_key": "mp_key",
        "num_facture": "num_facture", "quantite_achetee": "quantite_achetee",
        "prix_unitaire": "prix_unitaire", "montant_ht": "montant_ht",
        "montant_tva": "montant_tva", "montant_ttc": "montant_ttc",
        "revenue": "revenue"
    })

    conn.close()
    print("\n" + "=" * 60)
    print("  [OK] DWH Sougui charge avec succes!")
    print("  Architecture: CONSTELLATION (2 faits, 7 dimensions)")
    print("=" * 60)

if __name__ == "__main__":
    main()
