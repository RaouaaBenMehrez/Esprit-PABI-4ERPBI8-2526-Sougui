import streamlit as st
import pandas as pd
import sqlite3
import plotly.express as px
import plotly.graph_objects as go
import bcrypt
from datetime import datetime
import os
import requests

# --- PAGE CONFIG ---
st.set_page_config(page_title="Sougui — Smart Business Suite", page_icon="🪬", layout="wide")

# --- LOAD CSS ---
def local_css(file_name):
    with open(file_name) as f:
        st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)

if os.path.exists("assets/style.css"):
    local_css("assets/style.css")

# --- DB HELPERS ---
def get_db_connection():
    return sqlite3.connect('sougui_suite.db')

def fetch_data(query):
    conn = get_db_connection()
    df = pd.read_sql_query(query, conn)
    conn.close()
    return df

# --- AUTHENTICATION ---
def login_user(username, password):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT password FROM users WHERE username=?", (username,))
    res = c.fetchone()
    conn.close()
    if res:
        return bcrypt.checkpw(password.encode('utf-8'), res[0].encode('utf-8'))
    return False

if 'authenticated' not in st.session_state:
    st.session_state['authenticated'] = False

if not st.session_state['authenticated']:
    st.title("🪬 Sougui Smart Suite")
    st.subheader("Login to your workspace")
    
    with st.form("login_form"):
        username = st.text_input("Username")
        password = st.text_input("Password", type="password")
        submit = st.form_submit_button("Sign In")
        
        if submit:
            if login_user(username, password):
                st.session_state['authenticated'] = True
                st.rerun()
            else:
                st.error("Invalid username or password")
    st.stop()

# --- MAIN APP ---
if os.path.exists("assets/logo.png"):
    st.sidebar.image("assets/logo.png", use_container_width=True)
else:
    st.sidebar.markdown(f"""
        <div style='text-align: center; padding: 20px 0;'>
            <h1 style='color: #c9a84c; font-size: 32px;'>🪬 Sougui</h1>
        </div>
    """, unsafe_allow_html=True)
st.sidebar.markdown("<p style='text-align: center; color: #8a7a62; font-size: 10px; text-transform: uppercase; letter-spacing: 2px;'>Smart Business Suite</p>", unsafe_allow_html=True)

page = st.sidebar.radio("Navigation", ["📊 Dashboard", "💰 Ventes & CA", "🤖 Sales AI Agent"])

# Logout button
if st.sidebar.button("Logout"):
    st.session_state['authenticated'] = False
    st.rerun()

# --- DATA FETCHING ---
sales_df = fetch_data("SELECT * FROM sales")
sales_df['date'] = pd.to_datetime(sales_df['date'])
total_ca = sales_df['amount'].sum()
total_orders = len(sales_df)
avg_basket = total_ca / total_orders if total_orders > 0 else 0
total_profit = sales_df['profit'].sum()

# --- PAGES ---
if page == "📊 Dashboard":
    st.markdown("<h1 class='page-title'>Vue d'ensemble <span>— Smart Analytics</span></h1>", unsafe_allow_html=True)
    st.markdown("<p style='color: #8a7a62;'>Données temps réel · Lunar Hack 2.0</p>", unsafe_allow_html=True)

    # KPI Row
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.markdown(f"""
            <div class="kpi-card">
                <div class="kpi-label">CA Total</div>
                <div class="kpi-value">{total_ca:,.0f} DT</div>
                <div class="kpi-unit">Actualisé</div>
            </div>
        """, unsafe_allow_html=True)
    with col2:
        st.markdown(f"""
            <div class="kpi-card">
                <div class="kpi-label">Commandes</div>
                <div class="kpi-value">{total_orders}</div>
                <div class="kpi-unit">Toutes sources</div>
            </div>
        """, unsafe_allow_html=True)
    with col3:
        st.markdown(f"""
            <div class="kpi-card">
                <div class="kpi-label">Panier Moyen</div>
                <div class="kpi-value">{avg_basket:,.1f} DT</div>
                <div class="kpi-unit">par transaction</div>
            </div>
        """, unsafe_allow_html=True)
    with col4:
        st.markdown(f"""
            <div class="kpi-card">
                <div class="kpi-label">Marge Brute</div>
                <div class="kpi-value">{total_profit:,.0f} DT</div>
                <div class="kpi-unit">{(total_profit/total_ca*100):.1f}% du CA</div>
            </div>
        """, unsafe_allow_html=True)

    # AI Insight Section
    st.markdown(f"""
        <div class="insight-banner">
            <div class="insight-icon">🧠</div>
            <div class="insight-text">
                <strong>Insight IA :</strong> Votre CA total a atteint <strong>{total_ca:,.0f} DT</strong>. 
                Le canal B2B reste votre moteur principal. 
                <strong>Recommandation :</strong> Concentrez vos efforts marketing sur le E-commerce pour capturer le segment B2C qui est actuellement sous-exploité.
            </div>
        </div>
    """, unsafe_allow_html=True)

    # Charts
    c1, c2 = st.columns([2, 1])
    
    with c1:
        st.subheader("Évolution du CA Mensuel")
        monthly_sales = sales_df.set_index('date').resample('M')['amount'].sum().reset_index()
        fig_line = px.line(monthly_sales, x='date', y='amount', title="CA Mensuel (DT)", template="plotly_dark")
        fig_line.update_traces(line_color='#c9a84c')
        st.plotly_chart(fig_line, use_container_width=True)

    with c2:
        st.subheader("Répartition par Canal")
        canal_sum = sales_df.groupby('channel')['amount'].sum().reset_index()
        fig_pie = px.pie(canal_sum, values='amount', names='channel', hole=0.4, template="plotly_dark")
        fig_pie.update_traces(marker=dict(colors=['#c9a84c', '#b87333', '#7a5e28']))
        st.plotly_chart(fig_pie, use_container_width=True)

    # Bottom Row
    st.subheader("Top Clients B2B")
    clients_df = fetch_data("SELECT name, total_spent, type FROM clients ORDER BY total_spent DESC")
    st.table(clients_df)

elif page == "💰 Ventes & CA":
    st.markdown("<h1>Analyse des Ventes</h1>", unsafe_allow_html=True)
    
    sales_by_product = sales_df.groupby('product')['amount'].sum().sort_values(ascending=False).reset_index()
    fig_bar = px.bar(sales_by_product, x='product', y='amount', color='amount', 
                     template="plotly_dark", color_continuous_scale=['#7a5e28', '#c9a84c'])
    st.plotly_chart(fig_bar, use_container_width=True)
    
    st.subheader("Détails des transactions récentes")
    st.dataframe(sales_df.sort_values('date', ascending=False).head(20), use_container_width=True)

elif page == "🤖 Sales AI Agent":
    st.markdown("<h1>Sales Intelligence Agent</h1>", unsafe_allow_html=True)
    st.markdown("<p style='color: #8a7a62;'>Posez des questions sur vos données business (ex: 'Quel est mon meilleur produit ?')</p>", unsafe_allow_html=True)

    if "messages" not in st.session_state:
        st.session_state.messages = []

    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    if prompt := st.chat_input("Dites quelque chose..."):
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        with st.chat_message("assistant"):
            try:
                # Appeler l'API de l'agent commercial
                res = requests.post("http://localhost:8000/chat", json={
                    "session_id": f"admin_{username}",
                    "message": prompt
                })
                data = res.json()
                response = data["response"]
            except Exception as e:
                # Fallback sur la logique simple si l'API est hors ligne
                if "meilleur produit" in prompt.lower() or "top produit" in prompt.lower():
                    best_prod = sales_df.groupby('product')['amount'].sum().idxmax()
                    response = f"Votre meilleur produit en termes de CA est **{best_prod}**."
                elif "ca" in prompt.lower() or "chiffre d'affaires" in prompt.lower():
                    response = f"Votre chiffre d'affaires total est de **{total_ca:,.0f} DT**."
                elif "canal" in prompt.lower() or "b2b" in prompt.lower():
                    b2b_ca = sales_df[sales_df['channel']=='B2B']['amount'].sum()
                    response = f"Le canal B2B a généré **{b2b_ca:,.0f} DT**, soit **{(b2b_ca/total_ca*100):.1f}%** de votre CA total."
                else:
                    response = "Je suis votre assistant Sougui. (Détail: L'API Agent est actuellement injoignable, passage en mode restreint)."
            
            st.markdown(response)
            st.session_state.messages.append({"role": "assistant", "content": response})
