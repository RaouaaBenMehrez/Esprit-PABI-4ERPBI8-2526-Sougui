import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Loader2, BarChart2, Activity, AlertCircle } from 'lucide-react';

const API = 'http://127.0.0.1:5000/api';

const CANAUX = ['Tous les canaux', 'E-commerce', 'Vente directe', 'Grossiste B2B'];
const MOIS_LABELS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

export default function RevenueForecaster() {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [canal, setCanal]       = useState('Tous les canaux');
  const [horizon, setHorizon]   = useState(1);

  const today      = new Date();
  const targetDate = new Date(today.getFullYear(), today.getMonth() + horizon, 1);
  const targetMois = `${MOIS_LABELS[targetDate.getMonth()]} ${targetDate.getFullYear()}`;

  const runForecast = async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${API}/predict/prophet-forecast`);
      const d = await r.json();
      // Pick the data point closest to horizon months ahead
      const target = d.forecast?.slice(horizon - 1, horizon)[0];
      setForecast({ ...d, target });
    } catch {
      setError('Impossible de contacter le modèle Prophet. Vérifiez que le backend est actif.');
    }
    setLoading(false);
  };

  // Canal multipliers (simulated weighting)
  const CANAL_WEIGHT = { 'Tous les canaux': 1, 'E-commerce': 0.35, 'Vente directe': 0.42, 'Grossiste B2B': 0.23 };
  const weight = CANAL_WEIGHT[canal] || 1;
  const rawValue  = forecast?.target?.yhat ?? null;
  const displayCA = rawValue !== null ? (rawValue * weight) : null;
  const lowerCA   = rawValue !== null ? (forecast.target.yhat_lower * weight) : null;
  const upperCA   = rawValue !== null ? (forecast.target.yhat_upper * weight) : null;
  const trend     = forecast?.target?.trend ?? null;
  const isUp      = trend !== null && displayCA > (rawValue * weight * 0.95);

  return (
    <div className="anim-fade-up">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <div style={{ width:48, height:48, borderRadius:14, background:'rgba(16,185,129,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <BarChart2 size={24} style={{ color:'#10b981' }} />
        </div>
        <div>
          <h1 style={{ fontSize:28, fontWeight:900, color:'var(--text-primary)' }}>Prévision des Revenus</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)' }}>Projection mensuelle · Modèle Prophet (Facebook AI) · Données DWH Sougui</p>
        </div>
        <div style={{ marginLeft:'auto', padding:'4px 12px', borderRadius:999, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)', fontSize:11, fontWeight:700, color:'#10b981' }}>● ML LIVE</div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        {/* Formulaire */}
        <div className="s-card" style={{ padding:24 }}>
          <h3 style={{ fontWeight:700, fontSize:15, color:'var(--text-primary)', marginBottom:20 }}>Paramètres de Projection</h3>

          {/* Canal */}
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:6 }}>CANAL DE VENTE</label>
            <select value={canal} onChange={e => setCanal(e.target.value)}
              style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-hover)', color:'var(--text-primary)', fontSize:13 }}>
              {CANAUX.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Horizon */}
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span>HORIZON DE PROJECTION</span>
              <span style={{ color:'#10b981' }}>+{horizon} mois → {targetMois}</span>
            </label>
            <input type="range" min={1} max={6} value={horizon} onChange={e => setHorizon(+e.target.value)}
              style={{ width:'100%', accentColor:'#10b981' }} />
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text-muted)', marginTop:4 }}>
              <span>1 mois</span><span>6 mois</span>
            </div>
          </div>

          {/* Contexte actuel */}
          <div style={{ padding:'12px 16px', borderRadius:12, background:'rgba(16,185,129,0.05)', border:'1px solid rgba(16,185,129,0.15)', marginBottom:20, fontSize:12, color:'var(--text-muted)' }}>
            📅 Aujourd'hui : <strong>{MOIS_LABELS[today.getMonth()]} {today.getFullYear()}</strong><br/>
            🎯 Mois ciblé : <strong>{targetMois}</strong>
          </div>

          <button onClick={runForecast} disabled={loading}
            style={{ width:'100%', padding:'13px', borderRadius:10, background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff',
              border:'none', cursor:'pointer', fontWeight:700, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity: loading ? 0.7 : 1 }}>
            {loading ? <Loader2 size={16} style={{ animation:'spin 1s linear infinite' }} /> : <TrendingUp size={16} />}
            {loading ? 'Calcul Prophet en cours...' : 'Lancer la Prévision'}
          </button>
        </div>

        {/* Résultats */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {error ? (
            <div style={{ padding:24, borderRadius:16, background:'rgba(239,68,68,0.05)', border:'1px solid rgba(239,68,68,0.2)', display:'flex', gap:12, alignItems:'flex-start' }}>
              <AlertCircle size={20} style={{ color:'#ef4444', flexShrink:0, marginTop:2 }} />
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'#ef4444', marginBottom:4 }}>Erreur de connexion</div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>{error}</div>
              </div>
            </div>
          ) : displayCA !== null ? (
            <>
              {/* Carte principale */}
              <div style={{
                padding:32, borderRadius:24, position:'relative', overflow:'hidden',
                background:'linear-gradient(145deg, rgba(16,185,129,0.08), var(--bg-card))',
                border:'1px solid rgba(16,185,129,0.25)',
                boxShadow:'0 20px 40px -10px rgba(16,185,129,0.15)',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                  <div style={{ fontSize:11, fontWeight:800, color:'#10b981', textTransform:'uppercase', letterSpacing:1 }}>
                    {canal} · {targetMois}
                  </div>
                  <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700,
                    color: isUp ? '#22c55e' : '#ef4444' }}>
                    {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    Tendance {isUp ? 'haussière' : 'baissière'}
                  </div>
                </div>

                <div style={{ textAlign:'center', padding:'20px 0 28px', borderTop:'1px dashed rgba(16,185,129,0.2)', borderBottom:'1px dashed rgba(16,185,129,0.2)', marginBottom:24 }}>
                  <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:8 }}>CA Projeté pour {targetMois}</div>
                  <div style={{ fontSize:56, fontWeight:900, color:'var(--text-primary)', lineHeight:1, fontFamily:'"Playfair Display", serif' }}>
                    {Math.round(displayCA).toLocaleString('fr-FR')}
                    <span style={{ fontSize:20, color:'var(--text-muted)', marginLeft:8, fontFamily:'Inter, sans-serif' }}>DT</span>
                  </div>
                  <div style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop:12, padding:'5px 14px', borderRadius:999, background:'rgba(16,185,129,0.1)', color:'#10b981', fontSize:12, fontWeight:700 }}>
                    <Activity size={13} /> Intervalle : {Math.round(lowerCA).toLocaleString()} – {Math.round(upperCA).toLocaleString()} DT
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                  <div style={{ padding:16, borderRadius:12, background:'var(--bg-hover)' }}>
                    <div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>Canal sélectionné</div>
                    <div style={{ fontSize:15, fontWeight:800, color:'var(--text-primary)' }}>{canal}</div>
                  </div>
                  <div style={{ padding:16, borderRadius:12, background:'var(--bg-hover)' }}>
                    <div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>Part estimée</div>
                    <div style={{ fontSize:15, fontWeight:800, color:'#10b981' }}>{(weight * 100).toFixed(0)}% du CA</div>
                  </div>
                </div>
              </div>

              <div style={{ padding:'14px 18px', borderRadius:12, background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.15)', fontSize:13, color:'var(--text-primary)', fontWeight:500 }}>
                💡 <strong>Recommandation :</strong> {isUp
                  ? `Le mois de ${targetMois} s'annonce favorable. Renforcez le stock et activez les promotions sur ${canal === 'Tous les canaux' ? 'tous vos canaux' : canal}.`
                  : `Une légère baisse est attendue. Envisagez des promotions ciblées pour soutenir les ventes en ${targetMois}.`
                }
              </div>
            </>
          ) : (
            <div style={{ height:'100%', borderRadius:24, border:'2px dashed var(--border)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:40, color:'var(--text-muted)', textAlign:'center', background:'var(--bg-card)' }}>
              <div style={{ width:80, height:80, borderRadius:'50%', background:'var(--bg-hover)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24 }}>
                <BarChart2 size={40} style={{ color:'var(--border)' }} />
              </div>
              <h3 style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', marginBottom:8, fontFamily:'"Playfair Display", serif' }}>En attente de projection</h3>
              <p style={{ fontSize:14, maxWidth:250, margin:'0 auto' }}>Choisissez le canal et l'horizon, puis lancez la prévision Prophet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
