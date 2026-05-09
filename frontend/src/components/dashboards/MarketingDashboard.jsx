import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Loader2, BrainCircuit } from 'lucide-react';
import AppLayout from '../layout/AppLayout';
import ProfileSettings from '../profile/ProfileSettings';

const API = 'http://127.0.0.1:5000/api';
const PBI_BASE = 'https://app.powerbi.com/reportEmbed?reportId=fa5fa437-6265-43ec-a047-a6802e6f49c4&autoAuth=true&ctid=604f1a96-cbe8-43f8-abbf-f8eaf5d85730';

const NAV = [
  { title: 'Marketing', items: [
    { id: 'mk-overview',    label: 'Vue Marketing',   icon: '📊' },
    { id: 'mk-b2c',         label: 'Performance B2C', icon: '🛍' },
    { id: 'mk-seasonality', label: 'Saisonnalité',    icon: '📅' },
  ]},
  { title: 'Intelligence IA', items: [
    { id: 'mk-rfm',     label: 'Segmentation RFM', icon: '🎯', badge: 'ML' },
    { id: 'mk-xgboost', label: 'XGBoost Client',   icon: '🤖', badge: 'ML' },
  ]},
];

const PURPLE = '#7c3aed';
const PURPLE_COLORS = [PURPLE, '#a855f7', '#d946ef', '#ec4899', '#f59e0b'];

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: PURPLE, fontWeight: 700 }}>{p.value?.toLocaleString()} DT</p>
      ))}
    </div>
  );
};

/* ── KMeans RFM Inline ─────────────────────────────────── */
const SEGMENT_INFO = {
  'Champions':        { color: '#22c55e', icon: '🏆', desc: 'Acheteurs récents, fréquents, haute valeur' },
  'Clients Fidèles':  { color: '#1e5aff', icon: '⭐', desc: 'Bonne fréquence, relation durable' },
  'Actifs':           { color: PURPLE,    icon: '⚡', desc: 'Acheteurs réguliers, potentiel de croissance' },
  'Nouveaux Clients': { color: '#f59e0b', icon: '🌱', desc: 'Premières achats, à fidéliser' },
  'Clients à Risque': { color: '#ef4444', icon: '⚠️', desc: 'Inactivité croissante, risque de perte' },
};

const RfmPredictor = () => {
  const [form, setForm] = useState({ recence: 30, frequence: 5, montant_total: 500 });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const run = async () => {
    setLoading(true); setErr(''); setResult(null);
    try {
      const r = await fetch(`${API}/predict/rfm`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      if (j.error) setErr(j.error);
      else setResult(j);
    } catch (e) { setErr(`Backend non disponible (port 5000) — ${e.message}`); }
    finally { setLoading(false); }
  };

  const segInfo = result ? (SEGMENT_INFO[result.segment] || { color: PURPLE, icon: '📦', desc: 'Segment détecté' }) : null;

  return (
    <div className="predict-inline">
      <h4 style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>🎯 Segmentation KMeans RFM</h4>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>Classifiez un client selon son comportement d'achat (Récence, Fréquence, Montant)</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
        {[
          { key: 'recence', label: 'Récence (j)', min: 1, max: 365, hint: 'Jours depuis dernier achat' },
          { key: 'frequence', label: 'Fréquence', min: 1, max: 100, hint: 'Nombre de commandes' },
          { key: 'montant_total', label: 'Montant (DT)', min: 10, max: 50000, step: 100, hint: 'CA total client' },
        ].map(f => (
          <div key={f.key}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 4 }}>{f.label}</label>
            <input type="number" min={f.min} max={f.max} step={f.step || 1}
              value={form[f.key]}
              onChange={e => setForm(p => ({ ...p, [f.key]: parseFloat(e.target.value) || 0 }))}
              className="s-input" style={{ padding: '8px 12px', fontSize: 13 }} />
            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 3 }}>{f.hint}</div>
          </div>
        ))}
      </div>

      <button onClick={run} disabled={loading} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px', marginBottom: 14 }}>
        {loading ? <Loader2 size={13} className="anim-spin" /> : <BrainCircuit size={13} />}
        {loading ? 'Segmentation en cours...' : 'Segmenter ce client'}
      </button>

      {err && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444', fontSize: 12 }}>⚠ {err}</div>}

      {result && segInfo && (
        <div style={{ borderRadius: 12, overflow: 'hidden', border: `1.5px solid ${segInfo.color}30` }}>
          <div style={{ padding: '16px 20px', background: `${segInfo.color}12`, borderBottom: `1px solid ${segInfo.color}20` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 28 }}>{segInfo.icon}</div>
              <div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Segment détecté · Cluster #{result.cluster}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: segInfo.color }}>{result.segment}</div>
              </div>
            </div>
          </div>
          <div style={{ padding: '12px 20px', background: 'var(--bg-hover)' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>{segInfo.desc}</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {Object.entries(SEGMENT_INFO).map(([name, info]) => (
                <div key={name} style={{ padding: '3px 10px', borderRadius: 9999, fontSize: 10, fontWeight: 600,
                  background: name === result.segment ? `${info.color}20` : 'transparent',
                  border: `1px solid ${name === result.segment ? info.color : 'var(--border)'}`,
                  color: name === result.segment ? info.color : 'var(--text-muted)' }}>
                  {info.icon} {name}
                </div>
              ))}
            </div>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>Modèle : {result.model}</p>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── XGBoost Classification Inline ──────────────────────────────── */
const XgbPredictor = () => {
  const [form, setForm] = useState({ recence: 30, frequence: 5, montant_total: 500, panier_moyen: 100 });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const run = async () => {
    setLoading(true); setErr(''); setResult(null);
    try {
      const r = await fetch(`${API}/predict/client`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      if (j.error) setErr(j.error);
      else setResult(j);
    } catch (e) { setErr(`Backend non disponible (port 5000) — ${e.message}`); }
    finally { setLoading(false); }
  };

  return (
    <div className="predict-inline">
      <h4 style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>🤖 XGBoost — Classification Client</h4>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>Prédit le statut et le potentiel commercial d'un client</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        {[
          { key: 'recence', label: 'Récence (j)', hint: 'Jours depuis dernier achat' },
          { key: 'frequence', label: 'Fréquence', hint: 'Nombre de commandes' },
          { key: 'montant_total', label: 'Montant total DT', hint: 'CA total client' },
          { key: 'panier_moyen', label: 'Panier moyen DT', hint: 'CA / commandes' },
        ].map(f => (
          <div key={f.key}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 4 }}>{f.label}</label>
            <input type="number" value={form[f.key]}
              onChange={e => setForm(p => ({ ...p, [f.key]: parseFloat(e.target.value) || 0 }))}
              className="s-input" style={{ padding: '8px 12px', fontSize: 13 }} />
            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 3 }}>{f.hint}</div>
          </div>
        ))}
      </div>

      <button onClick={run} disabled={loading} className="btn-primary"
        style={{ width: '100%', justifyContent: 'center', padding: '10px', marginBottom: 14, background: `linear-gradient(135deg, ${PURPLE}, #4c1d95)` }}>
        {loading ? <><Loader2 size={13} className="anim-spin" /> Classification...</> : <><BrainCircuit size={13} /> Classifier ce client</>}
      </button>

      {err && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444', fontSize: 12 }}>⚠ {err}</div>}

      {result && (
        <div style={{ borderRadius: 12, overflow: 'hidden', border: `1.5px solid ${PURPLE}30` }}>
          <div style={{ padding: '14px 18px', background: `${PURPLE}12`, borderBottom: `1px solid ${PURPLE}20` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Segment prédit</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: PURPLE }}>{result.segment}</div>
              </div>
              {result.confidence && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Confiance</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: result.confidence >= 70 ? '#22c55e' : result.confidence >= 50 ? '#f59e0b' : '#ef4444' }}>{result.confidence}<span style={{fontSize:13}}>%</span></div>
                </div>
              )}
            </div>
          </div>
          {result.confidence && (
            <div style={{ padding: '12px 18px', background: 'var(--bg-hover)' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>Niveau de confiance du modèle</div>
              <div style={{ height: 6, borderRadius: 9999, background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 9999, width: `${result.confidence}%`,
                  background: result.confidence >= 70 ? 'linear-gradient(90deg,#22c55e,#16a34a)' : result.confidence >= 50 ? 'linear-gradient(90deg,#f59e0b,#d97706)' : 'linear-gradient(90deg,#ef4444,#dc2626)',
                  transition: 'width 0.8s ease' }} />
              </div>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>Modèle : {result.model}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ── Power BI Page ───────────────────────────────────────────────── */
const PowerBIPage = () => (
  <div className="anim-fade-up">
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 14px', borderRadius: 9999, background: 'var(--orange-glow)', border: '1px solid var(--orange-border)', marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--orange)' }}>📈 Power BI Dashboard</span>
      </div>
      <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 6 }}>
        Rapport <span style={{ color: 'var(--orange)' }}>Marketing</span>
      </h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Vue Marketing — analyse segments & canaux B2C · Sougui.tn</p>
    </div>
    <div className="powerbi-container">
      <iframe
        title="Dashbord_Souguitn_Marketing"
        src={`${PBI_BASE}&pageName=ReportSectionMarketing`}
        allowFullScreen
      />
    </div>
  </div>
);

/* ══ MARKETING DASHBOARD ════════════════════════════════════════ */
const MarketingDashboard = ({ user, onLogout, onUpdateUser }) => {
  const [page, setPage] = useState('mk-overview');
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/dashboard`).then(r => r.json()).then(d => { setDash(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="loading-bar" style={{ width: 160, marginBottom: 16 }} />
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Chargement Marketing...</p>
      </div>
    </div>
  );

  const b2cData = (dash?.canalData || []).filter(d => d.name !== 'B2B');
  const totalB2c = b2cData.reduce((s, d) => s + d.value, 0);
  const totalCa  = dash?.total_ca || 1;

  return (
    <AppLayout user={user} activePage={page} setActivePage={setPage} onLogout={onLogout} navItems={NAV}>
      <div style={{ padding: 40 }}>

        {/* ── Overview Marketing ── */}
        {page === 'mk-overview' && dash && (
          <div className="anim-fade-up">
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderRadius: 9999, background: `${PURPLE}15`, border: `1px solid ${PURPLE}30`, marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: PURPLE }}>📊 Dashboard Marketing</span>
              </div>
              <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 36, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 6 }}>
                Analyse <span style={{ color: PURPLE }}>Marketing</span>
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Segmentation clients · Performance B2C · Saisonnalité</p>
            </div>

            {/* KPIs Marketing */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
              {[
                { icon: '🛒', label: 'CA B2C Total', value: (totalB2c/1000).toFixed(1), unit: 'K DT', color: PURPLE },
                { icon: '📈', label: '% du CA Global', value: ((totalB2c/totalCa)*100).toFixed(1), unit: '%', color: '#a855f7' },
                { icon: '🌐', label: 'E-commerce', value: ((dash?.canalData?.find(d=>d.name==='E-commerce')?.value||0)/1000).toFixed(1), unit: 'K DT', color: '#ec4899' },
                { icon: '🏪', label: 'Vente Physique', value: ((dash?.canalData?.find(d=>d.name==='Vente Physique')?.value||0)/1000).toFixed(1), unit: 'K DT', color: '#f59e0b' },
              ].map(k => (
                <div key={k.label} className="kpi-card">
                  <div style={{ fontSize: 28, marginBottom: 12 }}>{k.icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: k.color, lineHeight: 1, marginBottom: 4 }}>
                    {k.value}<span style={{ fontSize: 14, marginLeft: 2 }}>{k.unit}</span>
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>{k.label}</div>
                  <div style={{ marginTop: 14, height: 2, borderRadius: 9999, background: `linear-gradient(90deg, ${k.color}, transparent)`, opacity: 0.5 }} />
                </div>
              ))}
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div className="s-card" style={{ padding: 24 }}>
                <h3 style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>Répartition Canaux Marketing</h3>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>E-commerce vs Physique vs B2B</p>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={dash?.canalData || []} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                      {(dash?.canalData || []).map((_, i) => <Cell key={i} fill={PURPLE_COLORS[i % PURPLE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => [`${v?.toLocaleString()} DT`]} />
                    <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="s-card" style={{ padding: 24 }}>
                <h3 style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>Saisonnalité des Ventes</h3>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>Top mois par CA — planification campagnes</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dash?.seasonality || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey="value" fill={PURPLE} radius={[6,6,0,0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ML Inline */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
              <RfmPredictor />
              <XgbPredictor />
            </div>

            {/* Power BI embedded in Vue Marketing */}
            <div>
              <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 14px', borderRadius: 9999, background: 'var(--orange-glow)', border: '1px solid var(--orange-border)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--orange)' }}>📊 Power BI Marketing</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Rapport Marketing — segments & canaux B2C</span>
              </div>
              <div className="powerbi-container">
                <iframe
                  title="Dashbord_Souguitn_Marketing"
                  src={`${PBI_BASE}&pageName=ReportSectionMarketing`}
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        )}

        {/* ── B2C page ── */}
        {page === 'mk-b2c' && dash && (
          <div className="anim-fade-up">
            <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 36, fontWeight: 900, marginBottom: 8, color: 'var(--text-primary)' }}>
              Performance <span style={{ color: PURPLE }}>B2C</span>
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 32 }}>E-commerce + Vente Physique · Analyse détaillée</p>
            <div style={{ display: 'grid', gap: 20 }}>
              <div className="s-card" style={{ padding: 24 }}>
                <h3 style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 16 }}>Évolution CA B2C</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dash?.mainChart || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey="value" fill={PURPLE} radius={[6,6,0,0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ── Seasonality page ── */}
        {page === 'mk-seasonality' && dash && (
          <div className="anim-fade-up">
            <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 36, fontWeight: 900, marginBottom: 8, color: 'var(--text-primary)' }}>
              Analyse <span style={{ color: PURPLE }}>Saisonnalité</span>
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 32 }}>Planifiez vos campagnes marketing selon les pics de ventes</p>
            <div className="s-card" style={{ padding: 32 }}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={dash?.seasonality || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<Tip />} />
                  <Bar dataKey="value" radius={[8,8,0,0]} barSize={36}>
                    {(dash?.seasonality || []).map((_, i) => <Cell key={i} fill={PURPLE_COLORS[i % PURPLE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Power BI is now embedded in Vue Marketing overview */}

        {/* ── RFM page ── */}
        {page === 'mk-rfm' && (
          <div className="anim-fade-up">
            <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 36, fontWeight: 900, marginBottom: 32, color: 'var(--text-primary)' }}>
              Segmentation <span style={{ color: PURPLE }}>RFM</span>
            </h1>
            <RfmPredictor />
          </div>
        )}

        {/* ── XGBoost page ── */}
        {page === 'mk-xgboost' && (
          <div className="anim-fade-up">
            <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 36, fontWeight: 900, marginBottom: 32, color: 'var(--text-primary)' }}>
              Classification <span style={{ color: PURPLE }}>XGBoost</span>
            </h1>
            <XgbPredictor />
          </div>
        )}

        {page === 'settings' && (
          <div style={{ padding: '40px' }}>
            <ProfileSettings user={user} onUpdateUser={onUpdateUser} />
          </div>
        )}

      </div>
    </AppLayout>
  );
};

export default MarketingDashboard;
