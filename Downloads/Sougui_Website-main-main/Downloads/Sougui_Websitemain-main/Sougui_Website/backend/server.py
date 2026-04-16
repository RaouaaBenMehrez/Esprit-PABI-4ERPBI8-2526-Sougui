from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import pandas as pd
import bcrypt

app = Flask(__name__)
# Explicitly enable CORS for all routes and origins with common headers
CORS(app, resources={r"/api/*": {"origins": "*"}})

@app.before_request
def log_request_info():
    app.logger.debug('Headers: %s', request.headers)
    app.logger.debug('Body: %s', request.get_data())

def get_db_connection():
    conn = sqlite3.connect('sougui_suite.db')
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    if not data:
        return jsonify({"success": False, "message": "Données manquantes"}), 400
        
    username = data.get('username')
    password = data.get('password')
    
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT password FROM users WHERE username=?", (username,))
    user = c.fetchone()
    conn.close()
    
    if user and bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
        return jsonify({"success": True, "user": {"username": username}})
    else:
        return jsonify({"success": False, "message": "Identifiants invalides"}), 401

@app.route('/api/dashboard', methods=['GET'])
def get_dashboard_data():
    conn = get_db_connection()
    
    # 1. Base Analytics
    sales_df = pd.read_sql_query("SELECT amount, channel, date FROM sales", conn)
    total_ca = sales_df['amount'].sum()
    total_orders = len(sales_df)
    
    # 2. B2B vs B2C split
    b2b_revenue = sales_df[sales_df['channel'] == 'B2B']['amount'].sum()
    b2c_revenue = sales_df[sales_df['channel'].isin(['E-commerce', 'Vente Physique'])]['amount'].sum()

    # 3. Main Chart (Monthly CA)
    monthly_df = sales_df.copy()
    monthly_df['date'] = pd.to_datetime(monthly_df['date'])
    monthly_sa = monthly_df.set_index('date').resample('M')['amount'].sum().reset_index()
    monthly_sa['name'] = monthly_sa['date'].dt.strftime('%b')
    main_chart = monthly_sa[['name', 'amount']].rename(columns={'amount': 'value'}).to_dict('records')
    
    # 4. Canal Data for Pie Chart
    canal_summary = sales_df.groupby('channel')['amount'].sum().reset_index()
    canal_summary.columns = ['name', 'value']
    canal_data = canal_summary.to_dict('records')

    # 5. Seasonality (Revenue by Month Name)
    season_df = monthly_df.copy()
    season_df['month_name'] = season_df['date'].dt.strftime('%B')
    seasonality = season_df.groupby('month_name')['amount'].sum().reset_index().sort_values('amount', ascending=False)
    seasonality.columns = ['name', 'value']
    season_data = seasonality.head(5).to_dict('records')

    # 6. Ratio (B2B / Total)
    ratio = round(b2b_revenue / total_ca, 2) if total_ca > 0 else 0
    
    conn.close()
    
    return jsonify({
        "kpis": [
            {"label": "Total Revenue", "value": f"{total_ca/1000:,.1f}", "unit": "K", "icon": "Gift"},
            {"label": "Transaction Count", "value": str(total_orders), "unit": "", "icon": "Handshake"},
            {"label": "B2B Revenue", "value": f"{b2b_revenue/1000:,.2f}", "unit": "K", "icon": "Users"},
            {"label": "B2C Revenue", "value": f"{b2c_revenue/1000:,.2f}", "unit": "K", "icon": "ShieldCheck"}
        ],
        "total_ca": total_ca,
        "ratio": ratio,
        "mainChart": main_chart,
        "canalData": canal_data,
        "seasonality": season_data,
        "insights": [
            {"label": "Pic Saisonnier", "text": f"Votre meilleur mois est {season_data[0]['name']} ({season_data[0]['value']:,.0f} DT)."},
            {"label": "Performance", "text": f"B2C représente {(b2c_revenue/total_ca*100):.1f}% de l'activité globale."},
            {"label": "Alerte", "text": f"Le ratio de dépendance B2B est de {ratio}. Diversifiez vos canaux B2C."}
        ]
    })

@app.route('/api/sales', methods=['GET'])
def get_sales_data():
    conn = get_db_connection()
    sales = pd.read_sql_query("SELECT * FROM sales ORDER BY date DESC LIMIT 50", conn)
    conn.close()
    return jsonify(sales.to_dict('records'))

@app.route('/api/clients', methods=['GET'])
def get_clients_data():
    conn = get_db_connection()
    clients = pd.read_sql_query("SELECT * FROM clients ORDER BY total_spent DESC", conn)
    conn.close()
    return jsonify(clients.to_dict('records'))

@app.route('/api/products', methods=['GET'])
def get_products():
    conn = get_db_connection()
    products = pd.read_sql_query("SELECT * FROM products WHERE price > 0", conn)
    conn.close()
    return jsonify(products.to_dict('records'))

if __name__ == '__main__':
    app.run(port=5000, debug=True)
