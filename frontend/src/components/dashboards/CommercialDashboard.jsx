import React, { useState, useEffect, useRef } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid
} from 'recharts';
import { Send, Bot, User, Loader2, BrainCircuit, Search } from 'lucide-react';
import AppLayout from '../layout/AppLayout';
import ProfileSettings from '../profile/ProfileSettings';
import DeliveryAnalysis   from '../predictions/DeliveryAnalysis';
import B2BDemandPrediction from '../predictions/B2BDemandPrediction';
import PriceSimulator      from '../predictions/PriceSimulator';
import PowerBIEmbed        from '../powerbi/PowerBIEmbed';
import { useLanguage } from '../../context/LanguageContext';
import translations from '../../context/translations';

const API     = 'http://127.0.0.1:5000/api';
const AGENT   = 'http://localhost:8000';
const PBI_COMMERCIAL_ID = 'c041af2f-3e58-4613-a5f3-d4e8fa3b46a3';
const PBI_BASE = `https://app.powerbi.com/reportEmbed?reportId=${PBI_COMMERCIAL_ID}&autoAuth=true&ctid=604f1a96-cbe8-43f8-abbf-f8eaf5d85730`;
const GREEN   = '#059669';

const buildNav = (t) => [
  { title: t.nav_com_section, items: [
    { id: 'cm-overview', label: t.nav_com_overview, icon: '💼' },
    { id: 'cm-ventes',   label: t.nav_com_ventes,   icon: '📋' },
    { id: 'cm-clients',  label: t.nav_com_clients,  icon: '🤝' },
  ]},
  { title: t.nav_com_board, items: [
    { id: 'cm-powerbi', label: 'Power BI Report', icon: '📊', badge: 'PBI' },
  ]},
  { title: t.nav_com_ml, items: [
    { id: 'cm-delivery',   label: t.nav_com_delivery,   icon: '🗺️', badge: 'ML' },
    { id: 'cm-b2b',        label: t.nav_com_b2b,        icon: '📈', badge: 'ML' },
    { id: 'cm-price',      label: t.nav_com_price,      icon: '💲', badge: 'ML' },
    { id: 'cm-regression', label: t.nav_com_regression, icon: '📈', badge: 'ML' },
    { id: 'cm-agent',      label: t.nav_com_agent,      icon: '🤖', badge: 'Live' },
  ]},
];

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: GREEN, fontWeight: 700 }}>{p.value?.toLocaleString()} DT</p>
      ))}
    </div>
  );
};

/* ── RF Regression Inline ──────────────────────────────────────── */
const RfRegression = () => {
  const [form, setForm] = useState({ recence: 30, frequence: 5, montant_total: 500 });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const run = async () => {
    setLoading(true); setErr(''); setResult(null);
    try {
      const r = await fetch(`${API}/predict/ca-regression`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      if (j.error) setErr(j.error);
      else if (j.ca_predit === undefined) setErr('Réponse invalide du modèle.');
      else setResult(j);
    } catch (e) { setErr(`Backend non disponible (port 5000) — ${e.message}`); }
    finally { setLoading(false); }
  };

  // CA bracket classification for context
  const getCaBracket = (ca) => {
    if (ca < 500)   return { label: 'Petit client',     color: '#f59e0b' };
    if (ca < 2000)  return { label: 'Client standard',  color: '#1e5aff' };
    if (ca < 10000) return { label: 'Bon client',       color: GREEN };
    return               { label: 'Client premium',     color: '#22c55e' };
  };

  const bracket = result ? getCaBracket(result.ca_predit) : null;

  return (
    <div className="predict-inline">
      <h4 style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>📈 RandomForest — Régression CA</h4>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>Estimez le CA futur d'un client selon son profil RFM (Récence · Fréquence · Montant)</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
        {[
          { key: 'recence',       label: 'Récence (j)',  hint: 'Jours depuis dernier achat', min: 1, max: 365 },
          { key: 'frequence',     label: 'Fréquence',    hint: 'Nb commandes total',          min: 1, max: 500 },
          { key: 'montant_total', label: 'Montant DT',   hint: 'CA total historique',         min: 0, max: 100000, step: 100 },
        ].map(f => (
          <div key={f.key}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>{f.label}</label>
            <input type="number" min={f.min} max={f.max} step={f.step || 1}
              value={form[f.key]}
              onChange={e => setForm(p => ({ ...p, [f.key]: parseFloat(e.target.value) || 0 }))}
              className="s-input" style={{ padding: '8px 12px', fontSize: 13 }} />
            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 3 }}>{f.hint}</div>
          </div>
        ))}
      </div>

      <button onClick={run} disabled={loading} className="btn-primary"
        style={{ width: '100%', justifyContent: 'center', padding: '10px', marginBottom: 14, background: `linear-gradient(135deg, ${GREEN}, #064e3b)` }}>
        {loading ? <><Loader2 size={13} className="anim-spin" /> Calcul en cours...</> : <><BrainCircuit size={13} /> Prédire le CA</>}
      </button>

      {err && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 12 }}>⚠ {err}</div>}

      {result && bracket && (
        <div style={{ borderRadius: 12, overflow: 'hidden', border: `1.5px solid ${GREEN}30` }}>
          <div style={{ padding: '20px 24px', background: `${GREEN}10`, borderBottom: `1px solid ${GREEN}20`, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>CA Prédit — RandomForest</div>
            <div style={{ fontSize: 48, fontWeight: 800, color: GREEN, lineHeight: 1 }}>
              {result.ca_predit?.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
              <span style={{ fontSize: 20, fontWeight: 600, marginLeft: 6 }}>DT</span>
            </div>
          </div>
          <div style={{ padding: '12px 20px', background: 'var(--bg-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Classification</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 12px', borderRadius: 9999,
                background: `${bracket.color}15`, border: `1px solid ${bracket.color}40`,
                fontSize: 12, fontWeight: 700, color: bracket.color }}>
                {bracket.label}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Modèle</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{result.model}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Chat Agent Component (version pleine page) ───────────────── */
const AgentChat = ({ user }) => {
  const [messages, setMessages] = useState([{
    role: 'bot',
    content: `Bonjour ${user?.username || ''}! Je suis Sougui, votre assistante commerciale. 🌿 Comment puis-je vous aider à trouver un produit artisanal aujourd'hui ?`
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState(null);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    fetch(`${AGENT}/health`, { signal: AbortSignal.timeout(3000) })
      .then(r => r.json())
      .then(d => setAgentStatus(d?.pret ? 'online' : 'limited'))
      .catch(() => setAgentStatus('offline'));
  }, []);

  const buildFallback = (msg) => {
    const m = msg.toLowerCase();
    if (m.includes('bonjour') || m.includes('salut')) return 'Bonjour ! Comment puis-je vous aider aujourd\'hui ?';
    if (m.includes('poterie') || m.includes('céramique')) return 'Nous proposons de la poterie et céramique tunisienne entre 15 DT et 180 DT. Souhaitez-vous plus de détails ?';
    if (m.includes('bijou')) return 'Nos bijoux artisanaux (argent, cuivre, corail) vont de 25 DT à 350 DT. Quel type vous intéresse ?';
    if (m.includes('cadeau') || m.includes('mariage')) return 'Pour un cadeau : coffrets céramique (45 DT), bijoux argent (80 DT), ou tapis Berbère (120+ DT). Quelle occasion ?';
    if (m.includes('prix') || m.includes('budget')) return 'Nos prix vont de 8 DT (souvenirs) à 450 DT (grands tapis Berbères). Quel est votre budget ?';
    if (m.includes('stock') || m.includes('dispo')) return 'Tous les produits affichés sont disponibles. Tapis sur commande : 2-3 semaines. Lequel vous intéresse ?';
    if (m.includes('textile') || m.includes('fouta')) return 'Notre collection textile (foutas, cheich, broderies) est faite à la main : 20-180 DT selon la pièce.';
    if (m.includes('livraison')) return 'Livraison 24-48h sur Tunis, 3-5 jours ailleurs. Gratuite au-dessus de 150 DT.';
    return 'Je suis votre assistante Sougui. Parlez-moi de l\'occasion, du budget ou du type de produit artisanal que vous cherchez !';
  };

  const send = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    setMessages(p => [...p, { role: 'user', content: msg }]);
    setLoading(true);

    // 2 tentatives
    let botReply = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await fetch(`${AGENT}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: user?.id ? `${user.id}-commercial` : 'commercial-1',
            message: msg,
          }),
          signal: AbortSignal.timeout(8000),
        });
        if (r.ok) {
          const data = await r.json();
          botReply = {
            role: 'bot',
            content: data.response || data.reponse || 'Réponse reçue.',
            products: data.produits_rag || [],
          };
          break;
        }
      } catch { /* retry */ }
    }

    if (!botReply) {
      botReply = { role: 'bot', content: buildFallback(msg) };
    }

    setMessages(p => [...p, botReply]);
    setLoading(false);
  };

  const statusColor = agentStatus === 'online' ? '#22c55e' : agentStatus === 'limited' ? '#f59e0b' : '#ef4444';
  const statusLabel = agentStatus === 'online' ? 'En ligne' : agentStatus === 'limited' ? 'Limité' : 'Hors ligne';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '70vh', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${GREEN}15`, border: `1px solid ${GREEN}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={20} style={{ color: GREEN }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Sougui Sales Agent</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Gemini 2.5 Flash · ChromaDB RAG</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 9999, background: `${statusColor}10`, border: `1px solid ${statusColor}25` }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, animation: 'pulseDot 2s infinite' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: statusColor }}>{statusLabel}</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }} className="hide-scroll">
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ display: 'flex', gap: 10, maxWidth: '85%', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                ...(m.role === 'user'
                  ? { background: `linear-gradient(135deg, ${GREEN}, #064e3b)` }
                  : { background: `${GREEN}10`, border: `1px solid ${GREEN}25` })
              }}>
                {m.role === 'user' ? <User size={14} style={{ color: '#fff' }} /> : <Bot size={14} style={{ color: GREEN }} />}
              </div>
              <div>
                <div style={{
                  padding: '12px 16px', borderRadius: 14, fontSize: 13, lineHeight: 1.6,
                  ...(m.role === 'user'
                    ? { background: `linear-gradient(135deg, ${GREEN}, #064e3b)`, color: '#fff', borderTopRightRadius: 4 }
                    : { background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderTopLeftRadius: 4 })
                }}>
                  {m.content}
                </div>
                {/* Products */}
                {m.products?.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {m.products.map((p, pi) => (
                      <div key={pi} style={{ padding: '10px 14px', borderRadius: 10, background: `${GREEN}08`, border: `1px solid ${GREEN}20`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{p.nom}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.categorie}</div>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: GREEN }}>{p.prix} DT</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${GREEN}10`, border: `1px solid ${GREEN}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bot size={14} style={{ color: GREEN }} />
            </div>
            <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--bg-surface)', border: '1px solid var(--border)', display: 'flex', gap: 4 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: GREEN, opacity: 0.7, animation: 'pulseDot 1.2s infinite', animationDelay: `${i*0.2}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Quick actions */}
      <div style={{ padding: '8px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, overflow: 'auto' }} className="hide-scroll">
        {['Poterie artisanale', 'Cadeau mariage', 'Budget 50 DT', 'Produit en stock', 'Bijoux argent'].map(q => (
          <button key={q} onClick={() => setInput(q)} style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 9999, background: 'var(--bg-hover)', border: '1px solid var(--border)', fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={send} style={{ display: 'flex', gap: 10, padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        <input type="text" value={input} onChange={e => setInput(e.target.value)}
          placeholder="Décrivez ce que vous cherchez..." className="s-input" style={{ flex: 1 }} />
        <button type="submit" disabled={loading || !input.trim()} className="btn-primary"
          style={{ padding: '12px 18px', flexShrink: 0, background: `linear-gradient(135deg, ${GREEN}, #064e3b)`, opacity: (loading || !input.trim()) ? 0.5 : 1 }}>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};

/* ── Power BI Page ───────────────────────────────────────────────── */
const PowerBIPage = () => (
  <div className="anim-fade-up">
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 14px', borderRadius: 9999, background: 'var(--orange-glow)', border: '1px solid var(--orange-border)', marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--orange)' }}>📊 Power BI Dashboard</span>
      </div>
      <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 6 }}>
        Rapport <span style={{ color: 'var(--orange)' }}>Commercial</span>
      </h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Vue Commercial — ventes, clients B2B & performance · Sougui.tn</p>
    </div>
    <div className="powerbi-container">
      <iframe
        title="Dashbord_Souguitn_Commercial"
        src={`${PBI_BASE}&pageName=ReportSectionCommercial`}
        allowFullScreen
      />
    </div>
  </div>
);

/* ══ COMMERCIAL DASHBOARD ═══════════════════════════════════════ */
const CommercialDashboard = ({ user, onLogout, onUpdateUser }) => {
  const { lang } = useLanguage();
  const t = translations[lang];
  const NAV = buildNav(t);

  const [page, setPage] = useState(
    () => sessionStorage.getItem('sougui_page_com') || 'cm-overview'
  );
  const handleSetPage = (p) => { setPage(p); sessionStorage.setItem('sougui_page_com', p); };
  const [dash, setDash] = useState(null);
  const [sales, setSales] = useState([]);
  const [salesSearch, setSalesSearch] = useState('');
  const [clients, setClients] = useState([]);
  const [clientSearch, setClientSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/dashboard`).then(r => r.json()),
      fetch(`${API}/sales`).then(r => r.json()),
      fetch(`${API}/clients`).then(r => r.json()),
    ]).then(([d, s, c]) => { setDash(d); setSales(s); setClients(c); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="loading-bar" style={{ width: 160, marginBottom: 16 }} />
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t.dash_loading_com}</p>
      </div>
    </div>
  );

  const topClients = clients.filter(c => c.type === 'B2B').slice(0, 5);

  // Filter sales
  const filteredSales = sales.filter(s => {
    if (!salesSearch.trim()) return true;
    const q = salesSearch.toLowerCase();
    return s.date?.toLowerCase().includes(q) || s.channel?.toLowerCase().includes(q);
  });

  // Filter clients
  const filteredClients = clients.filter(c => {
    if (!clientSearch.trim()) return true;
    const q = clientSearch.toLowerCase();
    return c.name?.toLowerCase().includes(q) ||
      c.type?.toLowerCase().includes(q) ||
      c.rfm_segment?.toLowerCase().includes(q);
  });

  return (
    <AppLayout user={user} activePage={page} setActivePage={handleSetPage} onLogout={onLogout} navItems={NAV}>
      <div style={{ padding: 40 }}>

        {/* ── Overview Commercial ── */}
        {page === 'cm-overview' && dash && (
          <div className="anim-fade-up">
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderRadius: 9999, background: `${GREEN}15`, border: `1px solid ${GREEN}30`, marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: GREEN }}>💼 Dashboard Commercial</span>
              </div>
              <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 36, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 6 }}>
                Performance <span style={{ color: GREEN }}>Commerciale</span>
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ventes · Clients B2B · Prédictions RF · Agent IA</p>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
              {[
                { icon: '📦', label: t.kpi_transactions, value: dash?.kpis?.[1]?.value, unit: '', color: GREEN },
                { icon: '🏢', label: t.kpi_revenue_b2b, value: dash?.kpis?.[2]?.value, unit: dash?.kpis?.[2]?.unit, color: '#059669' },
                { icon: '💰', label: t.kpi_ca_total, value: (dash?.total_ca/1000)?.toFixed(1), unit: 'K DT', color: '#10b981' },
                { icon: '📊', label: t.kpi_ratio_b2b, value: ((dash?.ratio || 0) * 100).toFixed(1), unit: '%', color: '#34d399' },
              ].map(k => (
                <div key={k.label} className="kpi-card">
                  <div style={{ fontSize: 26, marginBottom: 12 }}>{k.icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: k.color, lineHeight: 1, marginBottom: 4 }}>
                    {k.value}<span style={{ fontSize: 13, marginLeft: 2 }}>{k.unit}</span>
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>{k.label}</div>
                  <div style={{ marginTop: 14, height: 2, borderRadius: 9999, background: `linear-gradient(90deg, ${k.color}, transparent)`, opacity: 0.5 }} />
                </div>
              ))}
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
              <div className="s-card" style={{ padding: 24 }}>
                <h3 style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 16 }}>{t.dash_evolution_ca}</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={dash?.mainChart || []}>
                    <defs>
                      <linearGradient id="grGreen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={GREEN} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip content={<Tip />} />
                    <Area type="monotone" dataKey="value" stroke={GREEN} strokeWidth={2.5} fill="url(#grGreen)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="s-card" style={{ padding: 24 }}>
                <h3 style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>{t.dash_top_clients}</h3>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>Par CA Total</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {topClients.map((c, i) => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: `${GREEN}15`, border: `1px solid ${GREEN}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: GREEN, flexShrink: 0 }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                        <div style={{ height: 3, borderRadius: 9999, marginTop: 4, background: `linear-gradient(90deg, ${GREEN}, transparent)`, width: `${Math.min((c.total_spent / (topClients[0]?.total_spent || 1)) * 100, 100)}%` }} />
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: GREEN, flexShrink: 0 }}>{(c.total_spent/1000).toFixed(0)}K</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RF Regression inline */}
            <RfRegression />

            {/* Power BI embedded in Vue Commerciale */}
            <div style={{ marginTop: 32 }}>
              <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 14px', borderRadius: 9999, background: 'var(--orange-glow)', border: '1px solid var(--orange-border)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--orange)' }}>📊 Power BI Commercial</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Rapport Commercial — ventes, clients B2B & performance</span>
              </div>
              <div className="powerbi-container">
                <iframe
                  title="Dashbord_Souguitn_Commercial"
                  src={`${PBI_BASE}&pageName=ReportSectionCommercial`}
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Ventes (Transactions) ── */}
        {page === 'cm-ventes' && (
          <div className="anim-fade-up">
            <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 36, fontWeight: 900, marginBottom: 8, color: 'var(--text-primary)' }}>
              Transactions <span style={{ color: GREEN }}>Détaillées</span>
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>{sales.length} transactions · Données temps réel</p>

            {/* Search bar */}
            <div className="search-bar" style={{ marginBottom: 20, maxWidth: 420 }}>
              <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                type="text"
                value={salesSearch}
                onChange={e => setSalesSearch(e.target.value)}
                placeholder={t.dash_search_ph}
              />
              {salesSearch && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                  {filteredSales.length} {t.dash_results}
                </span>
              )}
            </div>

            <div className="s-card-flat" style={{ overflow: 'hidden' }}>
              <table className="s-table">
                <thead>
                  <tr>
                    <th>Date</th><th>Canal</th>
                    <th style={{ textAlign: 'right' }}>Montant</th><th style={{ textAlign: 'right' }}>Marge</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.slice(0, 50).map((s, idx) => (
                    <tr key={s.id || idx}>
                      <td>{s.date}</td>
                      <td><span className={`badge ${s.channel === 'B2B' ? 'badge-blue' : 'badge-gold'}`}>{s.channel}</span></td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>{Number(s.amount).toLocaleString()} DT</td>
                      <td style={{ textAlign: 'right', color: GREEN }}>{s.profit ? `${Number(s.profit).toLocaleString()} DT` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Clients B2B ── */}
        {page === 'cm-clients' && (
          <div className="anim-fade-up">
            <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 36, fontWeight: 900, marginBottom: 8, color: 'var(--text-primary)' }}>
              Clients <span style={{ color: GREEN }}>B2B</span>
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Portefeuille clients entreprises</p>

            {/* Search bar */}
            <div className="search-bar" style={{ marginBottom: 24, maxWidth: 420 }}>
              <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                type="text"
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                placeholder={t.dash_search_clients}
              />
              {clientSearch && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                  {filteredClients.length} {t.dash_clients_label}
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {filteredClients.map(c => (
                <div key={c.id} className="s-card" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                    <h3 style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{c.name}</h3>
                    <span className={`badge ${c.type === 'B2B' ? 'badge-blue' : 'badge-gold'}`}>{c.type}</span>
                  </div>
                  {c.rfm_segment && <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>{c.rfm_segment}</div>}
                  <div className="divider" style={{ marginBottom: 10 }} />
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{t.dash_total_spent}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: GREEN }}>{Number(c.total_spent).toLocaleString()} DT</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Power BI is now embedded in Vue Commerciale overview */}

        {/* ── RF Regression page ── */}
        {page === 'cm-regression' && (
          <div className="anim-fade-up">
            <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 36, fontWeight: 900, marginBottom: 8, color: 'var(--text-primary)' }}>
              Régression <span style={{ color: GREEN }}>RandomForest</span>
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 32 }}>Prédiction du CA client basée sur les données RFM</p>
            <RfRegression />
          </div>
        )}

        {/* ── Agent IA page ── */}
        {page === 'cm-agent' && (
          <div className="anim-fade-up">
            <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 36, fontWeight: 900, marginBottom: 8, color: 'var(--text-primary)' }}>
              Sales Agent <span style={{ color: GREEN }}>IA</span>
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>
              Powered by Gemini 2.5 Flash · RAG ChromaDB · Port 8000
            </p>
            <AgentChat user={user} />
          </div>
        )}

        {/* ── Power BI dédié Commercial ── */}
        {page === 'cm-powerbi' && (
          <div style={{ padding:'40px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
              <div style={{ width:48, height:48, borderRadius:14, background:'rgba(242,200,17,0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="2" y="14" width="4" height="8" rx="1" fill="#f2c811"/><rect x="8" y="9" width="4" height="13" rx="1" fill="#f2c811" opacity=".8"/><rect x="14" y="4" width="4" height="18" rx="1" fill="#f2c811" opacity=".6"/><rect x="20" y="2" width="2" height="20" rx="1" fill="#f2c811" opacity=".4"/></svg>
              </div>
              <div>
                <h1 style={{ fontSize:28, fontWeight:900, color:'var(--text-primary)' }}>Power BI Report</h1>
                <p style={{ fontSize:13, color:'var(--text-muted)' }}>Rapport interactif Commercial · Sans onglets ni panneau filtres</p>
              </div>
              <div style={{ marginLeft:'auto', padding:'4px 12px', borderRadius:999, background:'rgba(242,200,17,0.1)', border:'1px solid rgba(242,200,17,0.3)', fontSize:11, fontWeight:700, color:'#f2c811' }}>● LIVE</div>
            </div>
            <PowerBIEmbed reportId={PBI_COMMERCIAL_ID} title="Rapport Commercial" />
          </div>
        )}

        {/* ── Prédictions ML ── */}
        {page === 'cm-delivery' && <div style={{ padding:'40px' }}><DeliveryAnalysis /></div>}
        {page === 'cm-b2b'     && <div style={{ padding:'40px' }}><B2BDemandPrediction /></div>}
        {page === 'cm-price'   && <div style={{ padding:'40px' }}><PriceSimulator /></div>}

        {page === 'settings' && (
          <div style={{ padding: '40px' }}>
            <ProfileSettings user={user} onUpdateUser={onUpdateUser} />
          </div>
        )}

      </div>
    </AppLayout>
  );
};

export default CommercialDashboard;
