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
          <h1 style={{ fontSize:28, fontWeight:900, color:'var(--text-primary)' }}>Analyse Produits Phares</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)' }}>Prédiction de potentiel commercial · Random Forest Classifier · Précision: {meta ? (meta.accuracy*100).toFixed(0) : '...'}%</p>
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
            {loading ? 'Analyse en cours...' : 'Analyser ce Produit'}
          </button>
        </div>

        {/* Résultat Premium Ticket */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {result ? (
            <div style={{
              borderRadius:24, overflow:'hidden', position:'relative',
              background: `linear-gradient(145deg, ${result.couleur}10, var(--bg-card))`,
              border: `1px solid ${result.couleur}30`,
              boxShadow: `0 20px 40px -10px ${result.couleur}20`
            }}>
              {/* Ticket Header */}
              <div style={{ padding:'24px 32px', background: `${result.couleur}15`, borderBottom: `1px dashed ${result.couleur}40`, position:'relative' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 12px', borderRadius:999, background:result.couleur, color:'#fff', fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>
                      {result.is_best_seller ? <Star size={12} fill="currentColor" /> : <TrendingUp size={12} />}
                      {result.niveau}
                    </div>
                    <h2 style={{ fontSize:28, fontWeight:900, color:'var(--text-primary)', margin:0, fontFamily:'"Playfair Display", serif' }}>
                      {result.is_best_seller ? 'Produit Phare Potentiel' : 'Produit Standard'}
                    </h2>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1 }}>Score ML</div>
                    <div style={{ fontSize:48, fontWeight:900, color:result.couleur, lineHeight:1 }}>{result.score_pct}<span style={{fontSize:24}}>%</span></div>
                  </div>
                </div>
              </div>

              {/* Ticket Body */}
              <div style={{ padding:'32px' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, marginBottom:24 }}>
                  <div style={{ padding:'16px', borderRadius:16, background:'var(--bg-hover)' }}>
                    <div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>Catégorie ciblée</div>
                    <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)' }}>{form.categorie}</div>
                  </div>
                  <div style={{ padding:'16px', borderRadius:16, background:'var(--bg-hover)' }}>
                    <div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>Prix simulé</div>
                    <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)' }}>{form.prix} DT</div>
                  </div>
                </div>

                <div style={{ padding:'20px', borderRadius:16, background:`${result.couleur}08`, border:`1px solid ${result.couleur}20` }}>
                  <div style={{ display:'flex', gap:12 }}>
                    <div style={{ width:32, height:32, borderRadius:'50%', background:result.couleur, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      💡
                    </div>
                    <div>
                      <div style={{ fontSize:12, fontWeight:800, color:result.couleur, textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>Recommandation Stratégique</div>
                      <p style={{ fontSize:14, color:'var(--text-primary)', lineHeight:1.6, margin:0 }}>{result.recommandation}</p>
                    </div>
                  </div>
                </div>
                
                <div style={{ marginTop:24, display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1px solid var(--border)', paddingTop:16 }}>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                    Modèle: RandomForestClassifier
                  </div>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--text-secondary)' }}>
                    Précision: {(result.accuracy_modele*100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Decorative ticket cutouts */}
              <div style={{ position:'absolute', top:104, left:-12, width:24, height:24, borderRadius:'50%', background:'var(--bg-surface)', borderRight:`1px solid ${result.couleur}30` }} />
              <div style={{ position:'absolute', top:104, right:-12, width:24, height:24, borderRadius:'50%', background:'var(--bg-surface)', borderLeft:`1px solid ${result.couleur}30` }} />
            </div>
          ) : (
            <div style={{ height:'100%', borderRadius:24, border:'2px dashed var(--border)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:40, color:'var(--text-muted)', textAlign:'center', background:'var(--bg-card)' }}>
              <div style={{ width:80, height:80, borderRadius:'50%', background:'var(--bg-hover)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24 }}>
                <ShoppingBag size={40} style={{ color:'var(--border)' }} />
              </div>
              <h3 style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', marginBottom:8, fontFamily:'"Playfair Display", serif' }}>En attente d'analyse</h3>
              <p style={{ fontSize:14, maxWidth:250, margin:'0 auto' }}>Définissez les paramètres du produit pour analyser son potentiel commercial.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
