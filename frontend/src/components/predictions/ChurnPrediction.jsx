import React, { useState, useEffect } from 'react';
import { Users, Loader2, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const API = 'http://127.0.0.1:5000/api';

export default function ChurnPrediction() {
  const [meta, setMeta]     = useState(null);
  const [form, setForm]     = useState({ recency:90, frequency:3, monetary:1000, gouvernorat:'Tunis', secteur:'Particulier', type_client:'B2C', tenure_days:180 });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/predict/churn/metadata`).then(r => r.json()).then(setMeta);
  }, []);

  const predict = async () => {
    setLoading(true);
    const r = await fetch(`${API}/predict/churn`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form)
    });
    setResult(await r.json());
    setLoading(false);
  };

  const Slider = ({ label, k, min, max, unit='' }) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', display:'flex', justifyContent:'space-between' }}>
        <span>{label}</span><span style={{ color:'var(--text-primary)' }}>{form[k]}{unit}</span>
      </label>
      <input type="range" min={min} max={max} value={form[k]}
        onChange={e => setForm(p=>({...p,[k]:+e.target.value}))}
        style={{ width:'100%', accentColor:'#ef4444', marginTop:6 }} />
    </div>
  );

  const Sel = ({ label, k, opts }) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:6 }}>{label}</label>
      <select value={form[k]} onChange={e => setForm(p=>({...p,[k]:e.target.value}))}
        style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-hover)', color:'var(--text-primary)', fontSize:13 }}>
        {opts.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const rfmColors = { r_score:'#3b82f6', f_score:'#22c55e', m_score:'#a855f7' };

  return (
    <div className="anim-fade-up">
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <div style={{ width:48, height:48, borderRadius:14, background:'rgba(239,68,68,0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <AlertTriangle size={24} style={{ color:'#ef4444' }} />
        </div>
        <div>
          <h1 style={{ fontSize:28, fontWeight:900, color:'var(--text-primary)' }}>Churn Prediction</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)' }}>Risque de départ client · Gradient Boosting + RFM · AUC: {meta ? (meta.auc*100).toFixed(1) : '...'}%</p>
        </div>
        <div style={{ marginLeft:'auto', padding:'4px 12px', borderRadius:999, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', fontSize:11, fontWeight:700, color:'#ef4444' }}>● UNIQUE</div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        {/* Formulaire */}
        <div className="s-card" style={{ padding:24 }}>
          <h3 style={{ fontWeight:700, fontSize:15, color:'var(--text-primary)', marginBottom:20 }}>Profil Client RFM</h3>
          <Slider label="Recency (jours depuis dernier achat)" k="recency" min={1} max={400} unit=" j" />
          <Slider label="Frequency (nb commandes total)" k="frequency" min={1} max={50} />
          <Slider label="Monetary (CA total DT)" k="monetary" min={10} max={50000} unit=" DT" />
          <Slider label="Ancienneté (jours)" k="tenure_days" min={1} max={1000} unit=" j" />
          <Sel label="Type client" k="type_client" opts={meta?.types || ['B2C','B2B']} />
          <Sel label="Secteur" k="secteur" opts={meta?.secteurs || ['Particulier','Banque','Tech/IT','Agroalimentaire','Telecom']} />
          <button onClick={predict} disabled={loading}
            style={{ width:'100%', padding:'13px', borderRadius:10, background:'linear-gradient(135deg,#ef4444,#dc2626)', color:'#fff', border:'none', cursor:'pointer', fontWeight:700, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {loading ? <Loader2 size={16} style={{ animation:'spin 1s linear infinite' }} /> : <Users size={16} />}
            {loading ? 'Analyse en cours...' : 'Analyser le risque Churn'}
          </button>
        </div>

        {/* Résultat */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {result ? (
            <>
              {/* Score Churn */}
              <div className="s-card" style={{ padding:28, textAlign:'center', borderTop:`4px solid ${result.couleur}` }}>
                <div style={{ fontSize:11, fontWeight:700, color:result.couleur, marginBottom:8, letterSpacing:1 }}>RISQUE DE CHURN</div>
                <div style={{ fontSize:72, fontWeight:900, color:result.couleur, lineHeight:1 }}>{result.churn_probabilite}%</div>
                <div style={{ marginTop:12, padding:'8px 20px', borderRadius:999, background:result.couleur, color:'#fff', display:'inline-block', fontSize:14, fontWeight:700 }}>
                  {result.segment}
                </div>
              </div>

              {/* Barre progression */}
              <div className="s-card" style={{ padding:20 }}>
                <div style={{ height:14, borderRadius:999, background:'var(--bg-hover)', overflow:'hidden', position:'relative' }}>
                  <div style={{ height:'100%', width:`${result.churn_probabilite}%`, background:`linear-gradient(90deg,#22c55e,#f59e0b,#ef4444)`, borderRadius:999, transition:'width 1s ease' }} />
                  <div style={{ position:'absolute', left:`${result.churn_probabilite}%`, top:'-2px', transform:'translateX(-50%)', fontSize:10, color:'#fff', fontWeight:700 }}>▲</div>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text-muted)', marginTop:6 }}>
                  <span>🟢 Fidèle</span><span>🟡 À Risque</span><span>🔴 Perdu</span>
                </div>
              </div>

              {/* Scores RFM */}
              <div className="s-card" style={{ padding:20 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', marginBottom:12 }}>SCORES RFM</div>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={[
                    { name:'Récence', val: result.rfm.r_score, fill:'#3b82f6' },
                    { name:'Fréquence', val: result.rfm.f_score, fill:'#22c55e' },
                    { name:'Montant', val: result.rfm.m_score, fill:'#a855f7' },
                  ]} margin={{ top:0, right:0, bottom:0, left:-20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="name" tick={{ fill:'#94a3b8', fontSize:11 }} />
                    <YAxis domain={[0,5]} tick={{ fill:'#94a3b8', fontSize:11 }} />
                    <Bar dataKey="val" radius={[4,4,0,0]}>
                      {[{fill:'#3b82f6'},{fill:'#22c55e'},{fill:'#a855f7'}].map((c,i)=>(
                        <rect key={i} fill={c.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Action */}
              <div className="s-card" style={{ padding:20, borderLeft:`4px solid ${result.couleur}` }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', marginBottom:8 }}>⚡ ACTION RECOMMANDÉE</div>
                <p style={{ fontSize:13, color:'var(--text-primary)', lineHeight:1.6 }}>{result.action_recommandee}</p>
              </div>
            </>
          ) : (
            <div className="s-card" style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:40, color:'var(--text-muted)', textAlign:'center' }}>
              <Users size={48} style={{ opacity:0.2, marginBottom:16 }} />
              <p style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>Analysez le risque churn</p>
              <p style={{ fontSize:13 }}>Renseignez les métriques RFM du client et lancez la prédiction.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
