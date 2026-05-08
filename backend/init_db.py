import psycopg2
import psycopg2.extras
import bcrypt
import os
from datetime import datetime, timedelta
import random

# ─── Configuration ────────────────────────────────────────────────────────────
DB_CONFIG = {
    "host":     os.getenv("PG_HOST",     "localhost"),
    "port":     int(os.getenv("PG_PORT", 5432)),
    "dbname":   os.getenv("PG_DB",       "sougui_db"),
    "user":     os.getenv("PG_USER",     "postgres"),
    "password": os.getenv("PG_PASSWORD", "postgres"),
}

def get_conn():
    return psycopg2.connect(**DB_CONFIG)

def init_db():
    conn = get_conn()
    c = conn.cursor()

    # ─── Tables ──────────────────────────────────────────────────────────────

    c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id         SERIAL PRIMARY KEY,
            username   VARCHAR(50) UNIQUE NOT NULL,
            password   VARCHAR(255) NOT NULL,
            role       VARCHAR(20) DEFAULT 'admin',
            email      VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS clients (
            id           SERIAL PRIMARY KEY,
            name         VARCHAR(100) NOT NULL,
            email        VARCHAR(100),
            telephone    VARCHAR(20),
            type         VARCHAR(10) DEFAULT 'B2C',
            total_spent  NUMERIC(12,2) DEFAULT 0,
            rfm_segment  VARCHAR(30),
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id          SERIAL PRIMARY KEY,
            code        VARCHAR(50) UNIQUE NOT NULL,
            name        VARCHAR(100) NOT NULL,
            category    VARCHAR(50),
            price       NUMERIC(10,2),
            promo_price NUMERIC(10,2),
            stock       INTEGER DEFAULT 0,
            is_active   BOOLEAN DEFAULT TRUE,
            image_url   TEXT
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS sales (
            id          SERIAL PRIMARY KEY,
            client_id   INTEGER REFERENCES clients(id) ON DELETE SET NULL,
            product_id  INTEGER REFERENCES products(id) ON DELETE SET NULL,
            date        DATE NOT NULL,
            amount      NUMERIC(12,2) NOT NULL,
            profit      NUMERIC(12,2),
            channel     VARCHAR(20),
            quantity    INTEGER DEFAULT 1,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS agent_sessions (
            id          SERIAL PRIMARY KEY,
            session_id  VARCHAR(100) UNIQUE NOT NULL,
            client_info JSONB DEFAULT '{}',
            history     JSONB DEFAULT '[]',
            updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS favorites (
            id           SERIAL PRIMARY KEY,
            user_id      VARCHAR(100) NOT NULL,
            product_code VARCHAR(50)  NOT NULL,
            product_name VARCHAR(100),
            added_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, product_code)
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS predictions (
            id              SERIAL PRIMARY KEY,
            model_name      VARCHAR(50),
            prediction_date DATE NOT NULL,
            value           NUMERIC(15,2),
            confidence      NUMERIC(5,2),
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    print("✅ Tables créées.")

    # ─── Utilisateurs ─────────────────────────────────────────────────────────
    role_users = [
        ('admin',      'admin123',       'admin'),
        ('ceo',        'ceo123',         'ceo'),
        ('marketing',  'marketing123',   'marketing'),
        ('commercial', 'commercial123',  'commercial'),
    ]
    for uname, upw, urole in role_users:
        hashed_pw = bcrypt.hashpw(upw.encode(), bcrypt.gensalt()).decode()
        try:
            c.execute(
                "INSERT INTO users (username, password, role) VALUES (%s, %s, %s) ON CONFLICT (username) DO UPDATE SET role = EXCLUDED.role",
                (uname, hashed_pw, urole)
            )
            conn.commit()
            print(f"✅ Utilisateur '{uname}' créé (rôle: {urole}).")
        except Exception as e:
            conn.rollback()
            print(f"[WARN] Utilisateur '{uname}' : {e}")

    # ─── Clients B2B ──────────────────────────────────────────────────────────
    b2b_clients = [
        ('Attijari Bank',  'contact@attijari.tn', '+216 71 148 000', 'B2B', 113258, 'Champions'),
        ('WIFAK Bank',     'contact@wifak.tn',    '+216 71 961 200', 'B2B', 75000,  'Fidèles'),
        ('Everience',      'info@everience.tn',   '+216 71 345 000', 'B2B', 61000,  'Fidèles'),
        ('SOPAT',          'sopat@sopat.com.tn',  '+216 71 285 000', 'B2B', 45000,  'Fidèles'),
        ('Tunisair',       'info@tunisair.com.tn', '+216 71 837 000', 'B2B', 30000, 'Actifs'),
        ('Société ABC',    'abc@example.com',     '+216 71 100 001', 'B2C', 8500,   'Actifs'),
        ('Mme. Ben Amor',  'benamor@example.com', '+216 55 123 456', 'B2C', 3200,   'Nouveaux'),
    ]
    for cl in b2b_clients:
        try:
            c.execute(
                """INSERT INTO clients (name, email, telephone, type, total_spent, rfm_segment)
                   VALUES (%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING""",
                cl
            )
        except Exception:
            conn.rollback()
    conn.commit()
    print("✅ Clients insérés.")

    # Récupérer les IDs clients
    c.execute("SELECT id FROM clients ORDER BY id")
    client_ids = [row[0] for row in c.fetchall()]

    # ─── Produits ─────────────────────────────────────────────────────────────
    artisan_products = [
        ('SOUGUI-POT-001', 'Poterie Artisanale Nabeul',   'Poterie',        45.0,  38.0,  50,  True),
        ('SOUGUI-TAP-001', 'Tapis Berbère Handmade',      'Tapis',          320.0, 280.0, 15,  True),
        ('SOUGUI-BIJ-001', 'Bijoux Argent Filigrane',     'Bijouterie',     85.0,  70.0,  30,  True),
        ('SOUGUI-CER-001', 'Céramique Sculptée Bleue',    'Céramique',      65.0,  55.0,  25,  True),
        ('SOUGUI-BOI-001', 'Boîte Bois Olivier Gravée',   'Bois',           40.0,  35.0,  40,  True),
        ('SOUGUI-CUI-001', 'Plateau Cuivre Ciselé',       'Cuivre',         150.0, 120.0, 10,  True),
        ('SOUGUI-CER-002', 'Service à Thé Céramique',     'Arts de Table',  95.0,  80.0,  20,  True),
        ('SOUGUI-BIJ-002', 'Collier Jaspe & Argent',      'Bijouterie',     55.0,  45.0,  35,  True),
        ('SOUGUI-TIS-001', 'Fouta Hammam Traditionnelle', 'Textile',        30.0,  25.0,  60,  True),
        ('SOUGUI-MAG-001', 'Magnet Minaret Tunis',        'Souvenirs',      8.0,   6.0,   100, True),
    ]
    for p in artisan_products:
        try:
            c.execute(
                """INSERT INTO products (code, name, category, price, promo_price, stock, is_active)
                   VALUES (%s,%s,%s,%s,%s,%s,%s) ON CONFLICT (code) DO NOTHING""",
                p
            )
        except Exception:
            conn.rollback()
    conn.commit()
    print("✅ Produits insérés.")

    # Récupérer IDs produits
    c.execute("SELECT id FROM products ORDER BY id")
    product_ids = [row[0] for row in c.fetchall()]

    # ─── Ventes (données réalistes 2024-2026) ────────────────────────────────
    channels = ['B2B', 'E-commerce', 'Vente Physique']
    start_date = datetime(2024, 1, 1)

    # Vérifie si des ventes existent déjà
    c.execute("SELECT COUNT(*) FROM sales")
    count = c.fetchone()[0]
    if count == 0:
        sales_data = []
        for _ in range(442):
            date    = start_date + timedelta(days=random.randint(0, 730))
            channel = random.choices(channels, weights=[77, 15, 8])[0]
            amount  = random.uniform(500, 5000) if channel == 'B2B' else random.uniform(20, 300)
            profit  = amount * random.uniform(0.3, 0.6)
            cl_id   = random.choice(client_ids) if client_ids else None
            pr_id   = random.choice(product_ids) if product_ids else None
            qty     = random.randint(1, 5)
            sales_data.append((cl_id, pr_id, date.strftime('%Y-%m-%d'), round(amount, 2), round(profit, 2), channel, qty))

        c.executemany(
            """INSERT INTO sales (client_id, product_id, date, amount, profit, channel, quantity)
               VALUES (%s,%s,%s,%s,%s,%s,%s)""",
            sales_data
        )
        conn.commit()
        print(f"✅ {len(sales_data)} ventes insérées.")
    else:
        print(f"[INFO] {count} ventes déjà présentes dans la base.")

    conn.close()
    print("\n✅ Base de données PostgreSQL initialisée avec succès !")
    print("   Utilisateur : admin | Mot de passe : admin123")

if __name__ == "__main__":
    init_db()
