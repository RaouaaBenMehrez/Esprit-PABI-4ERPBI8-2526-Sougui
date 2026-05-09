import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, PieChart, Pie, Cell,
  BarChart, Bar, Legend
} from 'recharts';
import { TrendingUp, Users, ShoppingBag, Percent, BrainCircuit, Loader2, ChevronUp, ChevronDown, Search, BarChart2, Package, Database, RefreshCw, FileCode } from 'lucide-react';
import AppLayout from '../layout/AppLayout';
import ProfileSettings from '../profile/ProfileSettings';

const API = 'http://127.0.0.1:5000/api';
const PBI_BASE = 'https://app.powerbi.com/reportEmbed?reportId=fa5fa437-6265-43ec-a047-a6802e6f49c4&autoAuth=true&ctid=604f1a96-cbe8-43f8-abbf-f8eaf5d85730';

const NAV = [
  { title: 'Vue Globale', items: [
    { id: 'overview',    label: 'Vue d\'ensemble', icon: '🏠' },
    { id: 'revenue',     label: 'CA & Revenus',    icon: '💰' },
    { id: 'clients-ceo', label: 'Clients B2B',     icon: '🤝' },
  ]},
  { title: 'Intelligence IA', items: [
    { id: 'forecast',    label: 'Prévision Prophet', icon: '🔮', badge: 'IA' },
    { id: 'ai-insights', label: 'Insights Stratégie', icon: '🧠', badge: 'GPT' },
    { id: 'versions',    label: 'Versioning Modèles', icon: '📦', badge: 'v1.2' },
  ]},
];

/* ── Mini Components ────────────────────────────────────────────── */
const KPI = ({ icon, label, value, unit, trend, color = 'var(--blue)' }) => (
  <div className="kpi-card">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
      <div style={{ fontSize: 28 }}>{icon}</div>
      {trend !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700,
          color: trend >= 0 ? '#22c55e' : '#ef4444' }}>
          {trend >= 0 ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <div style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1, marginBottom: 4 }}>
      {value}<span style={{ fontSize: 16, fontWeight: 600, marginLeft: 3 }}>{unit}</span>
    </div>
    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
      {label}
    </div>
    <div style={{ marginTop: 16, height: 2, borderRadius: 9999, background: `linear-gradient(90deg, ${color}, transparent)`, opacity: 0.5 }} />
  </div>
);

const ChartCard = ({ title, subtitle, children }) => (
  <div className="s-card" style={{ padding: 24 }}>
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{title}</h3>
      {subtitle && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{subtitle}</p>}
    </div>
    {children}
  </div>
);

const COLORS = ['#1e5aff','#4d7fff','#7c3aed','#059669','#f59e0b'];

const Tooltip_ = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: 'var(--blue)', fontWeight: 700 }}>
          {p.value?.toLocaleString()} DT
        </p>
      ))}
    </div>
  );
};

/* ── Prophet Forecast inline ─────────────────────────────────────── */
const ProphetForecast = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const run = async () => {
    setLoading(true); setErr(''); setData(null);
    try {
      const r = await fetch(`${API}/predict/ca`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      if (j.error) setErr(j.error);
      else if (!j.predictions || j.predictions.length === 0) setErr('Aucune prévision générée — vérifiez le modèle Prophet.');
      else setData(j.predictions);
    } catch (e) { setErr(`Serveur backend non disponible (port 5000) — ${e.message}`); }
    finally { setLoading(false); }
  };

/* ── Model Explorer (Versioning) ───────────────────────────────── */
const ModelExplorer = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [retraining, setRetraining] = useState(false);
  const [msg, setMsg] = useState('');

  const fetchModels = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/models/versions`);
      const j = await r.json();
      setModels(j.files || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleRetrain = async () => {
    if (!window.confirm("Lancer un réentraînement complet ? Cela va créer de nouvelles versions des modèles.")) return;
    setRetraining(true); setMsg('');
    try {
      const r = await fetch(`${API}/retrain`, { method: 'POST' });
      const j = await r.json();
      setMsg(j.message || 'Pipeline lancé avec succès.');
      fetchModels();
    } catch (e) { setMsg('Erreur lors du lancement.'); }
    finally { setRetraining(false); }
  };

  useEffect(() => { fetchModels(); }, []);

  return (
    <div className="s-card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h3 style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)' }}>📦 Model Versioning Explorer</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Historique des modèles (.pkl) stockés dans /models</p>
        </div>
        <button onClick={handleRetrain} disabled={retraining} className="btn-primary" style={{ padding: '8px 16px', fontSize: 13, background: 'var(--blue)' }}>
          {retraining ? <Loader2 className="anim-spin" size={14} /> : <RefreshCw size={14} />}
          <span style={{ marginLeft: 8 }}>{retraining ? 'Retrain en cours...' : 'Forcer Retrain'}</span>
        </button>
      </div>

      {msg && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(30,90,255,0.08)', border: '1px solid rgba(30,90,255,0.2)', color: 'var(--blue)', fontSize: 13, marginBottom: 20 }}>
          {msg}
        </div>
      )}

      <div className="s-card-flat" style={{ overflow: 'hidden' }}>
        <table className="s-table">
          <thead>
            <tr>
              <th>Fichier (.pkl)</th><th>Type</th><th>Version</th><th>Taille</th><th>Dernière modification</th><th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40 }}><Loader2 className="anim-spin" style={{ margin: '0 auto' }} /></td></tr>
            ) : models.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucun modèle trouvé dans /models</td></tr>
            ) : (
              models.map((m, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <FileCode size={16} style={{ color: 'var(--blue)', flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 12, fontFamily: 'monospace' }}>{m.filename}</span>
                    </div>
                  </td>
                  <td><span className="badge badge-blue" style={{ fontSize: 10, textTransform: 'uppercase' }}>{m.model_type || m.filename?.split('_')[0]}</span></td>
                  <td style={{ fontWeight: 700, color: 'var(--blue)', fontSize: 13 }}>{m.version || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{m.size_kb ? `${m.size_kb} KB` : m.size || '—'}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{m.modified || '—'}</td>
                  <td>
                    {m.is_current
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 9999, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontSize: 10, fontWeight: 700 }}>✓ Actuel</span>
                      : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 9999, background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.2)', color: 'var(--text-muted)', fontSize: 10 }}>Archivé</span>
                    }
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};


  const maxVal = data ? Math.max(...data.map(d => d.prediction)) : 1;

  return (
    <div className="predict-inline">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>🔮 Prévision CA — Prophet AI</h4>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Prochains 6 mois · Intervalle de confiance 95% · Facebook Prophet</p>
        </div>
        <button onClick={run} disabled={loading} className="btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}>
          {loading ? <Loader2 size={13} className="anim-spin" /> : <BrainCircuit size={13} />}
          {loading ? 'Calcul...' : 'Lancer Prophet'}
        </button>
      </div>

      {err && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444', fontSize: 12 }}>⚠ {err}</div>}

      {!data && !loading && !err && (
        <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
          <BrainCircuit size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontSize: 13 }}>Cliquez sur "Lancer Prophet" pour générer les prévisions des 6 prochains mois</p>
        </div>
      )}

      {data && (
        <div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.map(d => ({ ...d, name: d.mois }))}>
              <defs>
                <linearGradient id="gradCA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--blue)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--blue)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false}
                tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <Tooltip content={<Tooltip_ />} />
              <Area type="monotone" dataKey="prediction" stroke="var(--blue)" strokeWidth={2.5}
                fill="url(#gradCA)" dot={{ fill: 'var(--blue)', r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>

          {/* All 6 months grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginTop: 14 }}>
            {data.map((d, i) => {
              const prev = i > 0 ? data[i-1].prediction : d.prediction;
              const trend = d.prediction >= prev;
              const pct = maxVal > 0 ? (d.prediction / maxVal) * 100 : 0;
              return (
                <div key={d.mois} style={{ padding: '10px 8px', borderRadius: 10, background: 'var(--bg-hover)', textAlign: 'center', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{d.mois}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--blue)', lineHeight: 1 }}>{(d.prediction/1000).toFixed(1)}<span style={{fontSize:9}}>K</span></div>
                  <div style={{ fontSize: 9, color: trend ? '#22c55e' : '#ef4444', marginTop: 3, fontWeight: 600 }}>{trend ? '▲' : '▼'} {Math.abs(((d.prediction - prev) / (prev || 1)) * 100).toFixed(0)}%</div>
                  <div style={{ height: 2, borderRadius: 9999, marginTop: 6, background: `linear-gradient(90deg, var(--blue), transparent)`, opacity: pct / 100 * 0.8 + 0.2 }} />
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              Confiance 95% : [{data[0]?.min?.toLocaleString('fr-FR', {maximumFractionDigits:0})} – {data[0]?.max?.toLocaleString('fr-FR', {maximumFractionDigits:0})} DT]
            </p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              Total prévu : {data.reduce((s,d)=>s+d.prediction,0).toLocaleString('fr-FR',{maximumFractionDigits:0})} DT
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Power BI Page ────────────────────────────────────────────────── */
const PowerBIPage = ({ role }) => {
  const src = role === 'ceo'
    ? PBI_BASE
    : `${PBI_BASE}&pageName=ReportSection${role === 'marketing' ? 'Marketing' : 'Commercial'}`;

  return (
    <div className="anim-fade-up">
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 14px', borderRadius: 9999, background: 'var(--orange-glow)', border: '1px solid var(--orange-border)', marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--orange)' }}>📊 Power BI Dashboard</span>
        </div>
        <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 6 }}>
          Tableau de Bord <span style={{ color: 'var(--orange)' }}>Power BI</span>
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {role === 'ceo' ? 'Vue globale — tous les rapports' : `Vue ${role} — rapport dédié`} · Sougui.tn Analytics
        </p>
      </div>
      <div className="powerbi-container">
        <iframe
          title="Dashbord_Souguitn"
          src={src}
          allowFullScreen
        />
      </div>
    </div>
  );
};

/* ══ CEO DASHBOARD ═══════════════════════════════════════════════ */
const CeoDashboard = ({ user, onLogout, onUpdateUser }) => {
  const [page, setPage] = useState('overview');
  const [dash, setDash] = useState(null);
  const [sales, setSales] = useState([]);
  const [salesFiltered, setSalesFiltered] = useState([]);
  const [salesSearch, setSalesSearch] = useState('');
  const [clients, setClients] = useState([]);
  const [clientSearch, setClientSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/dashboard`).then(r => r.json()),
      fetch(`${API}/clients`).then(r => r.json()),
    ]).then(([d, c]) => { setDash(d); setClients(c); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (page === 'revenue') {
      fetch(`${API}/sales`).then(r => r.json()).then(s => { setSales(s); setSalesFiltered(s); });
    }
  }, [page]);

  // Filter sales by search
  useEffect(() => {
    if (!salesSearch.trim()) { setSalesFiltered(sales); return; }
    const q = salesSearch.toLowerCase();
    setSalesFiltered(sales.filter(s =>
      s.date?.toLowerCase().includes(q) ||
      s.channel?.toLowerCase().includes(q)
    ));
  }, [salesSearch, sales]);

  const filteredClients = clients.filter(c => {
    if (c.type !== 'B2B') return false;
    if (!clientSearch.trim()) return true;
    const q = clientSearch.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.rfm_segment?.toLowerCase().includes(q);
  });

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="loading-bar" style={{ width: 160, marginBottom: 16 }} />
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Chargement des données CEO...</p>
      </div>
    </div>
  );

  return (
    <AppLayout user={user} activePage={page} setActivePage={setPage} onLogout={onLogout} navItems={NAV}>
      <div style={{ padding: '40px' }}>

        {/* ── Overview ── */}
        {page === 'overview' && dash && (
          <div className="anim-fade-up">
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 36, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 6 }}>
                Vue d'ensemble <span style={{ color: 'var(--blue)' }}>CEO</span>
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Sougui.tn · Données temps réel · PostgreSQL
              </p>
            </div>

            {/* Banner */}
            <div style={{
              borderRadius: 20, padding: '32px 40px', marginBottom: 32,
              background: 'linear-gradient(135deg, #0f2d80, #1e5aff 60%, #3d7eff)',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
                  Startup Artisanat Tunisien
                </div>
                <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 32, fontWeight: 900, color: '#fff', marginBottom: 8 }}>
                  Sougui.tn — CA Total
                </h2>
                <div style={{ fontSize: 48, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                  {dash?.total_ca?.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                  <span style={{ fontSize: 24, fontWeight: 600, marginLeft: 8, opacity: 0.8 }}>DT</span>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, marginTop: 8 }}>
                  Ratio B2B : {(dash?.ratio * 100)?.toFixed(1)}% · {dash?.kpis?.[1]?.value} transactions analysées
                </p>
              </div>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
              <KPI icon="💰" label="CA Total" value={(dash?.total_ca / 1000)?.toFixed(1)} unit="K DT" trend={8.5} />
              <KPI icon="📦" label="Transactions" value={dash?.kpis?.[1]?.value} unit="" trend={3.2} />
              <KPI icon="🏢" label="Revenue B2B" value={dash?.kpis?.[2]?.value} unit={dash?.kpis?.[2]?.unit} trend={5.1} color="#7c3aed" />
              <KPI icon="🛒" label="Revenue B2C" value={dash?.kpis?.[3]?.value} unit={dash?.kpis?.[3]?.unit} trend={12.4} color="#059669" />
            </div>

            {/* Charts Row 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
              <ChartCard title="Évolution CA Mensuel" subtitle="Chiffre d'affaires par mois">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={dash?.mainChart || []}>
                    <defs>
                      <linearGradient id="gr1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--blue)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="var(--blue)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip content={<Tooltip_ />} />
                    <Area type="monotone" dataKey="value" stroke="var(--blue)" strokeWidth={2.5} fill="url(#gr1)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Répartition Canaux" subtitle="B2B · E-commerce · Physique">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={dash?.canalData || []} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                      paddingAngle={4} dataKey="value">
                      {(dash?.canalData || []).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={v => [`${v?.toLocaleString()} DT`]} />
                    <Legend iconType="circle" iconSize={8}
                      formatter={v => <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* Seasonality + Insights */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <ChartCard title="Saisonnalité des Ventes" subtitle="Top 5 mois par CA">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dash?.seasonality || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip content={<Tooltip_ />} />
                    <Bar dataKey="value" fill="var(--blue)" radius={[6,6,0,0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="🧠 Insights Stratégiques IA" subtitle="Analyse automatique des KPIs">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(dash?.insights || []).map((ins, i) => (
                    <div key={i} style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--blue)', marginBottom: 4 }}>{ins.label}</div>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{ins.text}</p>
                    </div>
                  ))}
                </div>
              </ChartCard>
            </div>

            {/* Prophet inline */}
            <ProphetForecast />

            {/* Power BI embedded in overview */}
            <div style={{ marginTop: 32 }}>
              <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 14px', borderRadius: 9999, background: 'var(--orange-glow)', border: '1px solid var(--orange-border)' }}>
                  <BarChart2 size={13} style={{ color: 'var(--orange)' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--orange)' }}>Power BI Dashboard</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Vue globale — tous les rapports Sougui.tn</span>
              </div>
              <div className="powerbi-container">
                <iframe
                  title="Dashbord_Souguitn_CEO"
                  src={PBI_BASE}
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Revenue (CA & Revenus) ── */}
        {page === 'revenue' && (
          <div className="anim-fade-up">
            <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 36, fontWeight: 900, marginBottom: 8, color: 'var(--text-primary)' }}>
              CA & <span style={{ color: 'var(--blue)' }}>Revenus</span>
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Toutes les transactions · PostgreSQL</p>

            {/* Search bar */}
            <div className="search-bar" style={{ marginBottom: 20, maxWidth: 420 }}>
              <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                type="text"
                value={salesSearch}
                onChange={e => setSalesSearch(e.target.value)}
                placeholder="Rechercher par date, canal..."
              />
              {salesSearch && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                  {salesFiltered.length} résultat(s)
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
                  {salesFiltered.map((s, idx) => (
                    <tr key={s.id || idx}>
                      <td>{s.date}</td>
                      <td><span className={`badge ${s.channel === 'B2B' ? 'badge-blue' : 'badge-gold'}`}>{s.channel}</span></td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>{Number(s.amount).toLocaleString()} DT</td>
                      <td style={{ textAlign: 'right', color: '#22c55e' }}>{s.profit ? `${Number(s.profit).toLocaleString()} DT` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Clients CEO ── */}
        {page === 'clients-ceo' && (
          <div className="anim-fade-up">
            <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 36, fontWeight: 900, marginBottom: 8, color: 'var(--text-primary)' }}>
              Clients <span style={{ color: 'var(--blue)' }}>B2B Premium</span>
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Portefeuille clients stratégiques</p>

            {/* Search bar */}
            <div className="search-bar" style={{ marginBottom: 24, maxWidth: 420 }}>
              <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                type="text"
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                placeholder="Rechercher par nom, segment RFM..."
              />
              {clientSearch && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                  {filteredClients.length} client(s)
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {filteredClients.map(c => (
                <div key={c.id} className="s-card" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h3 style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{c.name}</h3>
                    <span className="badge badge-blue">{c.type}</span>
                  </div>
                  {c.rfm_segment && <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 12 }}>{c.rfm_segment}</div>}
                  <div className="divider" style={{ marginBottom: 12 }} />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Total dépensé</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--blue)' }}>{Number(c.total_spent).toLocaleString()} DT</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Power BI is now embedded in overview — no separate page needed */}

        {/* ── Forecast page ── */}
        {page === 'forecast' && (
          <div className="anim-fade-up">
            <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 36, fontWeight: 900, marginBottom: 8, color: 'var(--text-primary)' }}>
              Prévision <span style={{ color: 'var(--blue)' }}>Prophet AI</span>
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 32 }}>Forecasting CA sur 6 mois · Modèle Facebook Prophet</p>
            <ProphetForecast />
          </div>
        )}

        {/* ── AI Insights ── */}
        {page === 'ai-insights' && dash && (
          <div className="anim-fade-up">
            <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 36, fontWeight: 900, marginBottom: 8, color: 'var(--text-primary)' }}>
              Insights <span style={{ color: 'var(--blue)' }}>Stratégiques</span>
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 32 }}>Analyse BI automatique · données temps réel</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {(dash.insights || []).map((ins, i) => (
                <div key={i} className="s-card" style={{ padding: 28 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--blue)', marginBottom: 10 }}>{ins.label}</div>
                  <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary)' }}>{ins.text}</p>
                </div>
              ))}
              <div className="s-card" style={{ padding: 28 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--blue)', marginBottom: 10 }}>Ratio Dépendance B2B</div>
                <div style={{ fontSize: 40, fontWeight: 800, color: 'var(--text-primary)' }}>{(dash.ratio * 100).toFixed(1)}<span style={{ fontSize: 18 }}>%</span></div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.6 }}>Un ratio {'>'} 70% indique une forte dépendance au segment B2B. Diversifiez vers le e-commerce.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Model Versioning page ── */}
        {page === 'versions' && (
          <div className="anim-fade-up">
            <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 36, fontWeight: 900, marginBottom: 8, color: 'var(--text-primary)' }}>
              Versioning & <span style={{ color: 'var(--blue)' }}>Modèles</span>
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 32 }}>Gestion du cycle de vie des modèles ML · Historique des fichiers .pkl</p>
            <ModelExplorer />
          </div>
        )}

        {/* ── Profile Settings ── */}
        {page === 'settings' && (
          <div style={{ padding: '40px' }}>
            <ProfileSettings user={user} onUpdateUser={onUpdateUser} />
          </div>
        )}

      </div>
    </AppLayout>
  );
};

export default CeoDashboard;
