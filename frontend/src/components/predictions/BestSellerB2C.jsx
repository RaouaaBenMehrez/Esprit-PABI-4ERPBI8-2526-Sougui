import React, { useState, useEffect } from 'react';
import { ShoppingBag, Star, Loader2, TrendingUp } from 'lucide-react';

const API = 'http://127.0.0.1:5000/api';

export default function BestSellerB2C() {
  const [meta, setMeta]     = useState(null);
  const [form, setForm]     = useState({ categorie:'', matiere:'', prix:50, nb_commandes:5 });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/predict/best-seller-b2c/metadata`).then(r => r.json()).then(setMeta);
  }, []);

  const predict = async () => {
    setLoading(true);
    const r = await fetch(`${API}/predict/best-seller-b2c`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form)
    });
    setResult(await r.json());
    setLoading(false);
  };

  const F = ({ label, children }) => (
    <div style={{ marginBottom:16 }}>
      <label style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:6 }}>{label}</label>
      {children}
    </div>
  );

  const sel = (key, opts) => (
    <select value={form[key]} onChange={e => setForm(p=>({...p,[key]:e.target.value}))}
      style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-hover)', color:'var(--text-primary)', fontSize:13 }}>
      <option value="">-- Choisir --</option>
      {opts.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  return (
    <div className="anim-fade-up">
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <div style={{ width:48, height:48, borderRadius:14, background:'rgba(168,85,247,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <ShoppingBag size={24} style={{ color:'#a855f7' }} />
        </div>
        <div>
          <h1 style={{ fontSize:28, fontWeight:900, color:'var(--text-primary)' }}>Best Seller B2C</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)' }}>Prédiction produit best-seller · Random Forest Classifier · Accuracy: {meta ? (meta.accuracy*100).toFixed(0) : '...'}%</p>
        </div>
        <div style={{ marginLeft:'auto', padding:'4px 12px', borderRadius:999, background:'rgba(168,85,247,0.1)', border:'1px solid rgba(168,85,247,0.3)', fontSize:11, fontWeight:700, color:'#a855f7' }}>● ML LIVE</div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        {/* Formulaire */}
        <div className="s-card" style={{ padding:24 }}>
          <h3 style={{ fontWeight:700, fontSize:15, color:'var(--text-primary)', marginBottom:20 }}>Paramètres du Produit</h3>
          <F label="Catégorie">{sel('categorie', meta?.categories || [])}</F>
          <F label="Matière">{sel('matiere', meta?.matieres || [])}</F>
          <F label={`Prix de vente HT : ${form.prix} DT`}>
            <input type="range" min={1} max={500} step={1} value={form.prix}
              onChange={e => setForm(p=>({...p, prix: +e.target.value}))}
              style={{ width:'100%', accentColor:'#a855f7' }} />
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text-muted)', marginTop:4 }}>
              <span>1 DT</span><span style={{ fontWeight:700, color:'#a855f7' }}>{form.prix} DT</span><span>500 DT</span>
            </div>
          </F>
          <F label={`Commandes historiques : ${form.nb_commandes}`}>
            <input type="range" min={1} max={100} step={1} value={form.nb_commandes}
              onChange={e => setForm(p=>({...p, nb_commandes: +e.target.value}))}
              style={{ width:'100%', accentColor:'#a855f7' }} />
          </F>
          <button onClick={predict} disabled={loading || !form.categorie || !form.matiere}
            style={{ width:'100%', padding:'13px', borderRadius:10, background:'linear-gradient(135deg,#a855f7,#7c3aed)', color:'#fff',
              border:'none', cursor:'pointer', fontWeight:700, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity: (!form.categorie || !form.matiere) ? 0.5 : 1 }}>
            {loading ? <Loader2 size={16} style={{ animation:'spin 1s linear infinite' }} /> : <Star size={16} />}
            {loading ? 'Prédiction en cours...' : 'Prédire Best Seller'}
          </button>
        </div>

        {/* Résultat */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {result ? (
            <>
              {/* Score principal */}
              <div className="s-card" style={{ padding:24, border:`2px solid ${result.couleur}`, background:`${result.couleur}12`, textAlign:'center' }}>
                <div style={{ fontSize:12, fontWeight:700, color:result.couleur, marginBottom:8 }}>
                  {result.is_best_seller ? '🏆 BEST SELLER DÉTECTÉ' : '📊 PRODUIT STANDARD'}
                </div>
                <div style={{ fontSize:72, fontWeight:900, color:result.couleur, lineHeight:1 }}>{result.score_pct}%</div>
                <div style={{ fontSize:14, color:'var(--text-muted)', marginTop:8 }}>Probabilité Best Seller</div>
                <div style={{ marginTop:12, padding:'6px 16px', borderRadius:999, background:result.couleur, color:'#fff', display:'inline-block', fontSize:13, fontWeight:700 }}>
                  {result.niveau}
                </div>
              </div>

              {/* Gauge bar */}
              <div className="s-card" style={{ padding:20 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', marginBottom:12 }}>SCORE DE CONFIANCE</div>
                <div style={{ height:12, borderRadius:999, background:'var(--bg-hover)', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${result.score_pct}%`, background:`linear-gradient(90deg, ${result.couleur}, ${result.couleur}cc)`, borderRadius:999, transition:'width 1s ease' }} />
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text-muted)', marginTop:6 }}>
                  <span>Peu Probable</span><span>Très Probable</span>
                </div>
              </div>

              {/* Interprétation */}
              <div className="s-card" style={{ padding:20, borderLeft:`4px solid ${result.couleur}` }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', marginBottom:8 }}>💡 RECOMMANDATION</div>
                <p style={{ fontSize:13, color:'var(--text-primary)', lineHeight:1.6 }}>{result.recommandation}</p>
                <div style={{ marginTop:8, fontSize:11, color:'var(--text-muted)' }}>Accuracy modèle RF: {(result.accuracy_modele*100).toFixed(0)}%</div>
              </div>
            </>
          ) : (
            <div className="s-card" style={{ padding:40, textAlign:'center', color:'var(--text-muted)', flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16 }}>
              <ShoppingBag size={48} style={{ opacity:0.2 }} />
              <div>
                <p style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>Lancez une prédiction</p>
                <p style={{ fontSize:13 }}>Remplissez le formulaire et cliquez sur "Prédire".</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
