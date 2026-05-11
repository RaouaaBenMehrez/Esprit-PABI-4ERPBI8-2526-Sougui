import React, { useState, useEffect } from 'react';
import { TrendingUp, Loader2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const API = 'http://127.0.0.1:5000/api';

const MOIS_LABELS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

export default function B2BDemandPrediction() {
  const [meta, setMeta]     = useState(null);
  const [form, setForm]     = useState({ gouvernorat:'Tunis', secteur:'Banque', paiement:'Virement', saison:'Ete', mois:6, quantite:10, is_ramadan:0, nb_cmd_historique:5, ca_cumul:5000 });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/predict/b2b-demand/metadata`).then(r => r.json()).then(setMeta);
  }, []);

  const predict = async () => {
    setLoading(true);
    const r = await fetch(`${API}/predict/b2b-demand`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ...form, trimestre: Math.ceil(form.mois/3) })
    });
    setResult(await r.json());
    setLoading(false);
  };

  const Sel = ({ label, k, opts }) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:6 }}>{label}</label>
      <select value={form[k]} onChange={e => setForm(p=>({...p,[k]:e.target.value}))}
        style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-hover)', color:'var(--text-primary)', fontSize:13 }}>
        {opts?.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const Sl = ({ label, k, min, max, unit='' }) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', display:'flex', justifyContent:'space-between' }}>
        <span>{label}</span><span style={{ color:'var(--blue)' }}>{form[k]}{unit}</span>
      </label>
      <input type="range" min={min} max={max} value={form[k]}
        onChange={e => setForm(p=>({...p,[k]:+e.target.value}))}
        style={{ width:'100%', accentColor:'#3b82f6', marginTop:6 }} />
    </div>
  );

  const chartData = result?.predictions_3mois?.map(p => ({ name: MOIS_LABELS[p.mois-1], revenue: p.revenue_predit })) || [];

  return (
    <div className="anim-fade-up">
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <div style={{ width:48, height:48, borderRadius:14, background:'rgba(59,130,246,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <TrendingUp size={24} style={{ color:'#3b82f6' }} />
        </div>
        <div>
          <h1 style={{ fontSize:28, fontWeight:900, color:'var(--text-primary)' }}>B2B Demand Prediction</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)' }}>Prévision demande clients B2B · XGBoost Regressor · {meta?.n_clients_b2b || 21} clients B2B</p>
        </div>
        <div style={{ marginLeft:'auto', padding:'4px 12px', borderRadius:999, background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.3)', fontSize:11, fontWeight:700, color:'#3b82f6' }}>● ML LIVE</div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        {/* Formulaire */}
        <div className="s-card" style={{ padding:24 }}>
          <h3 style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)', marginBottom:20 }}>Profil Client B2B</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Sel label="Gouvernorat" k="gouvernorat" opts={meta?.gouvernorats || ['Tunis','Ariana','Sfax','Sousse']} />
            <Sel label="Secteur"     k="secteur"     opts={meta?.secteurs || ['Banque','Tech/IT','Agroalimentaire','Telecom']} />
            <Sel label="Paiement"    k="paiement"    opts={meta?.paiements || ['Virement','Chèque','Cash']} />
            <Sel label="Saison"      k="saison"      opts={meta?.saisons || ['Automne','Ete','Hiver','Printemps']} />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Mois cible</label>
              <select value={form.mois} onChange={e => setForm(p=>({...p, mois:+e.target.value}))}
                style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-hover)', color:'var(--text-primary)', fontSize:13 }}>
                {MOIS_LABELS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Ramadan ?</label>
              <select value={form.is_ramadan} onChange={e => setForm(p=>({...p, is_ramadan:+e.target.value}))}
                style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-hover)', color:'var(--text-primary)', fontSize:13 }}>
                <option value={0}>Non</option><option value={1}>Oui</option>
              </select>
            </div>
          </div>

          <Sl label="Quantité commandée" k="quantite"    min={1} max={500} unit=" unités" />
          <Sl label="CA cumulé client"   k="ca_cumul"   min={0} max={100000} unit=" DT" />
          <Sl label="Commandes historiques" k="nb_cmd_historique" min={0} max={100} />

          <button onClick={predict} disabled={loading}
            style={{ width:'100%', padding:'13px', borderRadius:10, background:'linear-gradient(135deg,#3b82f6,#2563eb)', color:'#fff', border:'none', cursor:'pointer', fontWeight:700, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {loading ? <Loader2 size={16} style={{ animation:'spin 1s linear infinite' }} /> : <TrendingUp size={16} />}
            {loading ? 'Prédiction en cours...' : 'Prédire la demande B2B'}
          </button>
        </div>

        {/* Résultats */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {result ? (
            <>
              {/* Revenue prédit */}
              <div className="s-card" style={{ padding:24, textAlign:'center', borderTop:'4px solid #3b82f6' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#3b82f6', marginBottom:8, letterSpacing:1 }}>DEMANDE B2B ESTIMÉE</div>
                <div style={{ fontSize:60, fontWeight:900, color:'var(--text-primary)', lineHeight:1 }}>
                  {result.revenue_predit?.toLocaleString('fr-FR', {maximumFractionDigits:0})}
                </div>
                <div style={{ fontSize:18, color:'var(--text-muted)' }}>DT</div>
              </div>

              {/* Prévisions 3 mois */}
              <div className="s-card" style={{ padding:20 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', marginBottom:4 }}>PRÉVISION 3 MOIS</div>
                <div style={{ fontSize:22, fontWeight:800, color:'#22c55e', marginBottom:12 }}>
                  Total : {result.ca_3mois_total?.toLocaleString('fr-FR',{maximumFractionDigits:0})} DT
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={chartData} margin={{ top:0, right:0, bottom:0, left:-20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="name" tick={{ fill:'#94a3b8', fontSize:11 }} />
                    <YAxis tick={{ fill:'#94a3b8', fontSize:11 }} />
                    <Tooltip formatter={v => `${v.toLocaleString('fr-FR',{maximumFractionDigits:0})} DT`} />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Interprétation */}
              <div className="s-card" style={{ padding:20, borderLeft:'4px solid #3b82f6' }}>
                <p style={{ fontSize:13, color:'var(--text-primary)', lineHeight:1.6, marginBottom:8 }}>{result.interpretation}</p>
                <p style={{ fontSize:12, color:'var(--text-muted)' }}>💡 {result.recommandation}</p>
              </div>
            </>
          ) : (
            <div className="s-card" style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:40, color:'var(--text-muted)', textAlign:'center' }}>
              <TrendingUp size={48} style={{ opacity:0.2, marginBottom:16 }} />
              <p style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>Prédiction B2B Demand</p>
              <p style={{ fontSize:13 }}>Configurez le profil client et prédisez la demande sur 3 mois.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
