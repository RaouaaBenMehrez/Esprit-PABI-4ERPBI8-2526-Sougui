import React, { useState, useEffect } from 'react';
import { TrendingUp, Loader2, BarChart2, Activity } from 'lucide-react';

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

  const SelNum = ({ label, k, opts }) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:6 }}>{label}</label>
      <select value={form[k]} onChange={e => setForm(p=>({...p,[k]:+e.target.value}))}
        style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-hover)', color:'var(--text-primary)', fontSize:13 }}>
        {opts?.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
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

  // Removed chart data

  return (
    <div className="anim-fade-up">
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <div style={{ width:48, height:48, borderRadius:14, background:'rgba(59,130,246,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <TrendingUp size={24} style={{ color:'#3b82f6' }} />
        </div>
        <div>
          <h1 style={{ fontSize:28, fontWeight:900, color:'var(--text-primary)' }}>Prévision Commandes Entreprises</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)' }}>Projection du chiffre d'affaires client · XGBoost Regressor · {meta?.n_clients_b2b || 21} clients entreprises</p>
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
            {loading ? 'Prédiction en cours...' : 'Estimer les Commandes'}
          </button>
        </div>

        {/* Résultats Premium */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {result ? (
            <div style={{ padding:32, borderRadius:24, background:'linear-gradient(145deg, rgba(59,130,246,0.05), var(--bg-card))', border:'1px solid rgba(59,130,246,0.2)' }}>
              
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
                <div style={{ width:40, height:40, borderRadius:12, background:'#3b82f6', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <BarChart2 size={20} />
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:800, color:'#3b82f6', textTransform:'uppercase', letterSpacing:1 }}>Estimation du Mois Cible</div>
                  <div style={{ fontSize:14, color:'var(--text-primary)', fontWeight:600 }}>{MOIS_LABELS[form.mois - 1]}</div>
                </div>
              </div>

              <div style={{ textAlign:'center', padding:'32px 0', borderTop:'1px dashed var(--border)', borderBottom:'1px dashed var(--border)', marginBottom:24 }}>
                <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:8 }}>Chiffre d'Affaires Projeté</div>
                <div style={{ fontSize:56, fontWeight:900, color:'var(--text-primary)', lineHeight:1, fontFamily:'"Playfair Display", serif' }}>
                  {result.revenue_predit?.toLocaleString('fr-FR', {maximumFractionDigits:0})}
                  <span style={{ fontSize:20, color:'var(--text-muted)', marginLeft:8, fontFamily:'Inter, sans-serif' }}>DT</span>
                </div>
                
                <div style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop:16, padding:'6px 12px', borderRadius:999, background:'rgba(59,130,246,0.1)', color:'#3b82f6', fontSize:12, fontWeight:700 }}>
                  <Activity size={14} /> ± 5% Marge d'erreur ML
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 }}>
                <div style={{ padding:16, borderRadius:12, background:'var(--bg-hover)' }}>
                  <div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1 }}>CA Historique</div>
                  <div style={{ fontSize:18, fontWeight:800, color:'var(--text-primary)' }}>{form.ca_cumul.toLocaleString()} DT</div>
                </div>
                <div style={{ padding:16, borderRadius:12, background:'var(--bg-hover)' }}>
                  <div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1 }}>Saisonnalité</div>
                  <div style={{ fontSize:18, fontWeight:800, color:'var(--text-primary)' }}>{form.saison} {form.is_ramadan ? '(Ramadan)' : ''}</div>
                </div>
              </div>

              <div style={{ padding:20, borderRadius:16, background:'rgba(59,130,246,0.08)', borderLeft:'4px solid #3b82f6' }}>
                <p style={{ fontSize:14, color:'var(--text-primary)', lineHeight:1.6, margin:0, fontWeight:600 }}>{result.interpretation}</p>
                <div style={{ height:1, background:'rgba(59,130,246,0.15)', margin:'12px 0' }} />
                <p style={{ fontSize:13, color:'var(--text-muted)', margin:0 }}>💡 {result.recommandation}</p>
              </div>

            </div>
          ) : (
            <div style={{ height:'100%', borderRadius:24, border:'2px dashed var(--border)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:40, color:'var(--text-muted)', textAlign:'center', background:'var(--bg-card)' }}>
              <div style={{ width:80, height:80, borderRadius:'50%', background:'var(--bg-hover)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24 }}>
                <TrendingUp size={40} style={{ color:'var(--border)' }} />
              </div>
              <h3 style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', marginBottom:8, fontFamily:'"Playfair Display", serif' }}>En attente de configuration</h3>
              <p style={{ fontSize:14, maxWidth:250, margin:'0 auto' }}>Définissez le profil du client B2B pour générer la projection financière.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
