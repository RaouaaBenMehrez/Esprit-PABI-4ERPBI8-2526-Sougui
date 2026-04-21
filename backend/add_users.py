import psycopg2
import bcrypt
import os

DB_CONFIG = {
    'host':     os.getenv('PG_HOST',     'localhost'),
    'port':     int(os.getenv('PG_PORT', 5432)),
    'dbname':   os.getenv('PG_DB',       'sougui_db'),
    'user':     os.getenv('PG_USER',     'postgres'),
    'password': os.getenv('PG_PASSWORD', 'postgres'),
}

conn = psycopg2.connect(**DB_CONFIG)
c = conn.cursor()

users = [
    ('ceo',        'ceo123',        'ceo'),
    ('marketing',  'marketing123',  'marketing'),
    ('commercial', 'commercial123', 'commercial'),
]

for uname, upw, urole in users:
    hashed = bcrypt.hashpw(upw.encode(), bcrypt.gensalt()).decode()
    c.execute("""
        INSERT INTO users (username, password, role)
        VALUES (%s, %s, %s)
        ON CONFLICT (username) DO UPDATE SET role = EXCLUDED.role, password = EXCLUDED.password
    """, (uname, hashed, urole))
    print(f'OK: {uname} ({urole})')

conn.commit()
conn.close()
print('Tous les utilisateurs ont ete crees.')
