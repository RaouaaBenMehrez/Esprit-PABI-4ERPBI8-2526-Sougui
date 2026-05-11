import React, { useState, useEffect } from 'react';
import { BarChart2, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';

const API = 'http://127.0.0.1:5000/api';

export default function PriceSimulator() {
  const [meta, setMeta]     = useState(null);
  const [produits, setProduits] = useState([]);
  const [form, setForm]     = useState({ categorie:'', matiere:'', prix_actuel:50, prix_nouveau:55, qty_actuelle:10, mois:6, saison:'Ete' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/predict/price-simulator/products`).then(r => r.json()).then(d => {
      setMeta(d);
      setProduits(d.produits || []);
    });
  }, []);

  const predict = async () => {
    setLoading(true);
    const r = await fetch(`${API}/predict/price-simulator`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form)
    });
    setResult(await r.json());
    setLoading(false);
  };

  const selectProduit = (p) => {
    setForm(prev => ({ ...prev, categorie: p.Categorie||'', matiere: p.Matiere||'', prix_actuel: p.prix_effectif||50, prix_nouveau: Math.round((p.prix_effectif||50)*1.1), qty_actuelle: p.qty_moy||10 }));
  };

  const Sel = ({ label, k, opts }) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:6 }}>{label}</label>
      <select value={form[k]} onChange={e => setForm(p=>({...p,[k]:e.target.value}))}
        style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-hover)', color:'var(--text-primary)', fontSize:13 }}>
        <option value="">-- Choisir --</option>
        {opts?.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const chartData = result ? [
    { name:'Situation Actuelle', ca: result.ca_actuel,  fill:'#3b82f6' },
    { name:'Après Simulation',   ca: result.ca_nouveau, fill: result.delta_ca >= 0 ? '#22c55e' : '#ef4444' },
  ] : [];

  return (
    <div className="anim-fade-up">
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <div style={{ width:48, height:48, borderRadius:14, background:'rgba(245,158,11,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <BarChart2 size={24} style={{ color:'#f59e0b' }} />
        </div>
        <div>
          <h1 style={{ fontSize:28, fontWeight:900, color:'var(--text-primary)' }}>Price Simulator</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)' }}>Impact changement de prix sur les ventes · Ridge Regression + Élasticité-prix</p>
        </div>
        <div style={{ marginLeft:'auto', padding:'4px 12px', borderRadius:999, background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)', fontSize:11, fontWeight:700, color:'#f59e0b' }}>● ML LIVE</div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        {/* Formulaire */}
        <div className="s-card" style={{ padding:24 }}>
          <h3 style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)', marginBottom:4 }}>Paramètres Simulation</h3>

          {/* Quick select produit */}
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Choisir un produit existant (optionnel)</label>
            <div style={{ maxHeight:120, overflowY:'auto', border:'1px solid var(--border)', borderRadius:8 }}>
              {produits.slice(0,15).map((p,i) => (
                <div key={i} onClick={() => selectProduit(p)}
                  style={{ padding:'8px 12px', cursor:'pointer', fontSize:12, borderBottom:'1px solid var(--border)',
                    color:'var(--text-primary)', background: form.categorie===p.Categorie ? 'rgba(245,158,11,0.1)' : 'transparent' }}>
                  <span style={{ fontWeight:600 }}>{p.Nom_Produit?.slice(0,35)}</span>
                  <span style={{ color:'var(--text-muted)', float:'right' }}>{p.prix_effectif} DT</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Sel label="Catégorie" k="categorie" opts={meta?.categories} />
            <Sel label="Matière"   k="matiere"   opts={meta?.matieres} />
          </div>

          {/* Prix sliders */}
          {[
            { label:`Prix Actuel : ${form.prix_actuel} DT`,   k:'prix_actuel', min:1, max:500, color:'#3b82f6' },
            { label:`Nouveau Prix : ${form.prix_nouveau} DT`, k:'prix_nouveau', min:1, max:500, color:'#f59e0b' },
            { label:`Qté Actuelle : ${form.qty_actuelle} unités`, k:'qty_actuelle', min:1, max:200, color:'#a855f7' },
          ].map(sl => (
            <div key={sl.k} style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:6 }}>{sl.label}</label>
              <input type="range" min={sl.min} max={sl.max} value={form[sl.k]}
                onChange={e => setForm(p=>({...p,[sl.k]:+e.target.value}))}
                style={{ width:'100%', accentColor: sl.color }} />
            </div>
          ))}

          <Sel label="Saison" k="saison" opts={meta?.saisons || ['Automne','Ete','Hiver','Printemps']} />

          <button onClick={predict} disabled={loading || !form.categorie}
            style={{ width:'100%', padding:'13px', borderRadius:10, background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#fff', border:'none', cursor:'pointer', fontWeight:700, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity: !form.categorie ? 0.5 : 1 }}>
            {loading ? <Loader2 size={16} style={{ animation:'spin 1s linear infinite' }} /> : <BarChart2 size={16} />}
            {loading ? 'Simulation en cours...' : 'Simuler l\'impact prix'}
          </button>
        </div>

        {/* Résultats */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {result ? (
            <>
              {/* KPIs delta */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {[
                  { label:'CA Actuel', val:`${result.ca_actuel.toFixed(0)} DT`, color:'#3b82f6' },
                  { label:'CA Simulé',  val:`${result.ca_nouveau.toFixed(0)} DT`, color: result.delta_ca>=0?'#22c55e':'#ef4444' },
                  { label:'Δ CA',       val:`${result.delta_ca>0?'+':''}${result.delta_ca.toFixed(0)} DT`, color: result.delta_ca>=0?'#22c55e':'#ef4444' },
                  { label:'Δ Quantité', val:`${result.delta_qty_pct>0?'+':''}${result.delta_qty_pct.toFixed(1)}%`, color: result.delta_qty_pct>=0?'#22c55e':'#f59e0b' },
                ].map((kpi,i) => (
                  <div key={i} className="s-card" style={{ padding:16, textAlign:'center' }}>
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6 }}>{kpi.label}</div>
                    <div style={{ fontSize:22, fontWeight:800, color:kpi.color }}>{kpi.val}</div>
                  </div>
                ))}
              </div>

              {/* Graphique comparatif */}
              <div className="s-card" style={{ padding:20 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', marginBottom:12 }}>COMPARAISON CA</div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={chartData} margin={{ top:0, right:0, bottom:0, left:-20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="name" tick={{ fill:'#94a3b8', fontSize:11 }} />
                    <YAxis tick={{ fill:'#94a3b8', fontSize:11 }} />
                    <Tooltip formatter={v => `${v.toFixed(0)} DT`} />
                    <Bar dataKey="ca" radius={[6,6,0,0]}>
                      {chartData.map((d,i) => <rect key={i} fill={d.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Élasticité + recommandation */}
              <div className="s-card" style={{ padding:20, borderLeft:`4px solid ${result.couleur}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)' }}>Élasticité-prix</span>
                  <span style={{ fontSize:18, fontWeight:800, color:'var(--text-primary)' }}>{result.elasticite}</span>
                </div>
                <p style={{ fontSize:13, color:'var(--text-primary)', lineHeight:1.6 }}>{result.recommandation}</p>
              </div>
            </>
          ) : (
            <div className="s-card" style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:40, color:'var(--text-muted)', textAlign:'center' }}>
              <BarChart2 size={48} style={{ opacity:0.2, marginBottom:16 }} />
              <p style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>Simulateur de Prix</p>
              <p style={{ fontSize:13 }}>Choisissez un produit, ajustez le prix et observez l'impact sur le CA.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
