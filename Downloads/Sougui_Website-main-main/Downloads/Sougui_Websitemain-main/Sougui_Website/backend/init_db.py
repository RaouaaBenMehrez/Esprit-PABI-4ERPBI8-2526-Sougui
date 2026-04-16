import sqlite3
import bcrypt
import pandas as pd
from datetime import datetime, timedelta
import random

def init_db():
    conn = sqlite3.connect('sougui_suite.db')
    c = conn.cursor()

    # Create Users table
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT
        )
    ''')

    # Create Sales table
    c.execute('''
        CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            amount REAL,
            channel TEXT,
            product TEXT,
            client_id INTEGER,
            profit REAL
        )
    ''')

    # Create Clients table
    c.execute('''
        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            type TEXT,
            total_spent REAL
        )
    ''')

    # Create Products table
    c.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT,
            name TEXT,
            category TEXT,
            price REAL,
            promo_price REAL,
            stock BOOLEAN,
            image_url TEXT
        )
    ''')

    # Add a default admin user
    hashed_pw = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    try:
        c.execute("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ('admin', hashed_pw, 'admin'))
    except sqlite3.IntegrityError:
        pass

    # Generate Mock Data for Sales
    channels = ['B2B', 'E-commerce', 'Vente Physique']
    products = ['Poterie Artisanale', 'Tapis Handmande', 'Bijoux Argent', 'Céramique Sculptée']
    
    # Based on the HTML: CA 323,596 DT, 442 commands
    # 77% B2B, 15% E-commerce, 7% Physical
    
    sales_data = []
    start_date = datetime(2024, 1, 1)
    
    for _ in range(442):
        date = start_date + timedelta(days=random.randint(0, 460))
        # Weighted channel choice
        channel = random.choices(channels, weights=[77, 15, 8])[0]
        
        if channel == 'B2B':
            amount = random.uniform(500, 5000)
        else:
            amount = random.uniform(20, 300)
            
        profit = amount * random.uniform(0.3, 0.6)
        product = random.choice(products)
        sales_data.append((date.strftime('%Y-%m-%d'), amount, channel, product, random.randint(1, 20), profit))

    c.executemany("INSERT INTO sales (date, amount, channel, product, client_id, profit) VALUES (?, ?, ?, ?, ?, ?)", sales_data)

    # Mock B2B Clients from HTML
    b2b_clients = [
        ('Attijari Bank', 'B2B', 113258),
        ('WIFAK Bank', 'B2B', 75000),
        ('Everience', 'B2B', 61000),
        ('SOPAT', 'B2B', 45000),
        ('Tunisair', 'B2B', 30000)
    ]
    c.executemany("INSERT INTO clients (name, type, total_spent) VALUES (?, ?, ?)", b2b_clients)

    # Load Products from CSV
    try:
        products_df = pd.read_csv('data/Dim_Produits.csv')
        # Clean data: handle quotes and types
        products_df['Prix_Vente_HT'] = pd.to_numeric(products_df['Prix_Vente_HT'].astype(str).str.replace(',', '.'), errors='coerce').fillna(0)
        products_df['Prix_Promo'] = pd.to_numeric(products_df['Prix_Promo'].astype(str).str.replace(',', '.'), errors='coerce').fillna(0)
        
        # Mapping specific real images generated
        specific_images = {
            "BB-001-FP": "/images/boudha_noir.png",
            "BC-002-RL": "/images/boite_ceramique.png",
            "CC-001-SM": "/images/couffin.png"
        }

        # Placeholder images from Unsplash based on category
        img_placeholders = {
            "Déco": "https://images.unsplash.com/photo-1606722590583-6951b5ea92da?w=800",
            "Arts de la table": "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=800",
            "Couffins & Foutas": "https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?w=800",
            "Nature": "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800",
            "Jeux": "https://images.unsplash.com/photo-1629815049405-3c1d9f898a9d?w=800"
        }

        # Filter and map columns
        product_rows = []
        for _, row in products_df.iterrows():
            code = str(row['Code_Produit']).strip()
            cat = str(row['Categorie']).split(',')[0].strip()
            
            # Use specific image if available, else placeholder
            img = specific_images.get(code)
            if not img:
                img = img_placeholders.get(cat, f"https://loremflickr.com/800/800/{cat},handcraft/all")
            
            product_rows.append((
                code,
                row['Nom_Produit'],
                cat,
                row['Prix_Vente_HT'],
                row['Prix_Promo'],
                str(row['En_Stock']).strip().lower() == 'true',
                img
            ))
        
        # Clear existing products to avoid duplicates on re-init
        c.execute("DELETE FROM products")
        c.executemany("INSERT INTO products (code, name, category, price, promo_price, stock, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)", product_rows)
        print(f"Loaded {len(product_rows)} products from CSV.")
    except Exception as e:
        print(f"Error loading products CSV: {e}")

    conn.commit()
    conn.close()
    print("Database initialized successfully with mock data.")

if __name__ == "__main__":
    init_db()
