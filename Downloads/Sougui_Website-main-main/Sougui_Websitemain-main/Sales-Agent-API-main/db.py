import sqlite3
import json
import os

DB_PATH = "agent_data.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # Sessions table
    c.execute('''CREATE TABLE IF NOT EXISTS sessions
                 (user_id TEXT PRIMARY KEY, history TEXT, info TEXT)''')
    # Favorites table
    c.execute('''CREATE TABLE IF NOT EXISTS favorites
                 (user_id TEXT, product_code TEXT, product_name TEXT, UNIQUE(user_id, product_code))''')
    conn.commit()
    conn.close()
    print("✅ Database initialized")

def save_session(user_id, history, info):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    history_json = json.dumps(history)
    info_json = json.dumps(info)
    c.execute("INSERT OR REPLACE INTO sessions (user_id, history, info) VALUES (?, ?, ?)",
              (user_id, history_json, info_json))
    conn.commit()
    conn.close()

def get_session(user_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT history, info FROM sessions WHERE user_id=?", (user_id,))
    res = c.fetchone()
    conn.close()
    if res:
        return json.loads(res[0]), json.loads(res[1])
    return [], {}

def add_favorite(user_id, product_code, product_name=""):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    try:
        c.execute("INSERT INTO favorites (user_id, product_code, product_name) VALUES (?, ?, ?)", 
                  (user_id, product_code, product_name))
        conn.commit()
    except sqlite3.IntegrityError:
        pass
    conn.close()

def get_favorites(user_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT product_code, product_name FROM favorites WHERE user_id=?", (user_id,))
    res = c.fetchall()
    conn.close()
    return [{"code": r[0], "name": r[1]} for r in res]

if __name__ == "__main__":
    init_db()
