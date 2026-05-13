import React, { useState, useEffect } from 'react';
import { MapPin, Truck, TrendingUp, Loader2, Package, CheckCircle2 } from 'lucide-react';

const API = 'http://127.0.0.1:5000/api';
const SOUGUI = { lat: 36.8065, lng: 10.1815 };

const ZONE_STYLE = {
  'Proximité':  { color:'#22c55e', bg:'rgba(34,197,94,0.1)',  border:'rgba(34,197,94,0.3)'  },
  'Grand Tunis':{ color:'#3b82f6', bg:'rgba(59,130,246,0.1)', border:'rgba(59,130,246,0.3)' },
  'Régionale':  { color:'#f59e0b', bg:'rgba(245,158,11,0.1)', border:'rgba(245,158,11,0.3)' },
  'Nationale':  { color:'#ef4444', bg:'rgba(239,68,68,0.1)',  border:'rgba(239,68,68,0.3)'  },
};

export default function DeliveryAnalysis() {
  const [clients, setClients]   = useState([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    fetch(`${API}/predict/delivery-analysis`)
      .then(r => r.json())
      .then(d => setClients(d.clients || []));
  }, []);

  const selected = clients.find(c => c.Client_key === selectedKey) || null;

  const analyze = async () => {
    if (!selected) return;
    setLoading(true);
    const r = await fetch(`${API}/predict/delivery-analysis/calculate`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ lat: selected.lat, lng: selected.lng,
        nom: selected.Nom_client, gouvernorat: selected.Gouvernorat })
    });
    setResult(await r.json());
    setLoading(false);
  };

  const zs = result ? (ZONE_STYLE[result.zone] || ZONE_STYLE['Nationale']) : null;

  return (
    <div className="anim-fade-up">
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
        <div style={{ width:48, height:48, borderRadius:14, background:'rgba(59,130,246,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <MapPin size={24} style={{ color:'#3b82f6' }} />
        </div>
        <div>
          <h1 style={{ fontSize:28, fontWeight:900, color:'var(--text-primary)' }}>Delivery Analysis</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)' }}>Distance et coût de livraison depuis l'entrepôt Sougui · Modèle Haversine</p>
        </div>
        <div style={{ marginLeft:'auto', padding:'4px 12px', borderRadius:999, background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', fontSize:11, fontWeight:700, color:'#22c55e' }}>
          ● ML LIVE
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginTop:24 }}>
        {/* Panel gauche — formulaire */}
        <div className="s-card" style={{ padding:24 }}>
          <h3 style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)', marginBottom:4 }}>Analyse Géographique</h3>
          <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:16 }}>Sélectionnez un client pour analyser la distance et le coût</p>

          {/* Entrepôt */}
          <div style={{ padding:'12px 16px', borderRadius:10, background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.2)', marginBottom:12 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#3b82f6', marginBottom:4 }}>POINT DE RÉFÉRENCE — Entrepôt Sougui</div>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>36.8065, 10.1815 · Tunis, Tunisie</div>
          </div>

          {/* Recherche client via Select */}
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:8 }}>SÉLECTION DU CLIENT</label>
            <select
              value={selectedKey} onChange={e => setSelectedKey(e.target.value)}
              style={{ width:'100%', padding:'12px 14px', borderRadius:12, border:'1px solid var(--border)', background:'var(--bg-hover)', color:'var(--text-primary)', fontSize:14, fontWeight:600, appearance:'none', cursor:'pointer' }}
            >
              <option value="">-- Choisir un client à livrer --</option>
              {clients.map((c, i) => (
                <option key={i} value={c.Client_key}>{c.Nom_client} ({c.Gouvernorat})</option>
              ))}
            </select>
          </div>

          {selected && (
            <div style={{ padding:'16px', borderRadius:16, background:'rgba(59,130,246,0.05)', border:'1px solid rgba(59,130,246,0.15)', marginBottom:20, display:'flex', gap:12, alignItems:'center' }}>
              <div style={{ width:40, height:40, borderRadius:12, background:'#3b82f6', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <MapPin size={20} />
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:800, color:'#3b82f6', textTransform:'uppercase', letterSpacing:1 }}>Destination</div>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>{selected.Nom_client}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>{selected.Gouvernorat}</div>
              </div>
            </div>
          )}

          <button onClick={analyze} disabled={!selected || loading}
            style={{ width:'100%', padding:'12px', borderRadius:10, background: selected ? 'var(--blue)' : 'var(--bg-hover)',
              color: selected ? '#fff' : 'var(--text-muted)', border:'none', cursor: selected ? 'pointer' : 'not-allowed',
              fontWeight:700, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {loading ? <Loader2 size={16} style={{ animation:'spin 1s linear infinite' }} /> : <TrendingUp size={16} />}
            {loading ? 'Calcul en cours...' : 'Analyser distance & coût'}
          </button>
        </div>

        {/* Panel droit — résultats (Delivery Ticket) */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {result && zs ? (
            <div style={{
              borderRadius:24, overflow:'hidden', position:'relative',
              background: `linear-gradient(145deg, ${zs.bg}, var(--bg-card))`,
              border: `1px solid ${zs.border}`,
              boxShadow: `0 20px 40px -10px ${zs.bg}`
            }}>
              {/* Entête du Ticket */}
              <div style={{ padding:'24px 32px', background: `${zs.color}15`, borderBottom: `1px dashed ${zs.color}40` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:48, height:48, borderRadius:'50%', background:zs.color, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Truck size={24} />
                    </div>
                    <div>
                      <div style={{ fontSize:11, fontWeight:800, color:zs.color, textTransform:'uppercase', letterSpacing:1 }}>Bon de Livraison</div>
                      <div style={{ fontSize:20, fontWeight:900, color:'var(--text-primary)', fontFamily:'"Playfair Display", serif' }}>Ordre d'expédition</div>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:999, background:zs.color, color:'#fff', fontSize:12, fontWeight:800, textTransform:'uppercase', letterSpacing:1 }}>
                      <CheckCircle2 size={14} /> Zone {result.zone}
                    </div>
                  </div>
                </div>
              </div>

              {/* Corps du Ticket */}
              <div style={{ padding:'32px' }}>
                {/* Trajet GPS */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', position:'relative', padding:'0 20px', marginBottom:32 }}>
                  <div style={{ position:'absolute', top:'50%', left:40, right:40, height:2, background:`dashed 2px ${zs.color}50`, zIndex:0 }} />
                  <div style={{ textAlign:'center', position:'relative', zIndex:1 }}>
                    <div style={{ width:12, height:12, borderRadius:'50%', border:`3px solid ${zs.color}`, background:'var(--bg-card)', margin:'0 auto 8px' }} />
                    <div style={{ fontSize:11, fontWeight:800, color:'var(--text-muted)', textTransform:'uppercase' }}>Départ</div>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>Sougui HQ</div>
                  </div>
                  <div style={{ textAlign:'center', position:'relative', zIndex:1, background:'var(--bg-card)', padding:'0 16px', borderRadius:999 }}>
                    <div style={{ fontSize:14, fontWeight:900, color:zs.color }}>{result.distance_km} km</div>
                    <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase' }}>Distance ML</div>
                  </div>
                  <div style={{ textAlign:'center', position:'relative', zIndex:1 }}>
                    <div style={{ width:12, height:12, borderRadius:'50%', background:zs.color, margin:'0 auto 8px', boxShadow:`0 0 0 4px ${zs.color}30` }} />
                    <div style={{ fontSize:11, fontWeight:800, color:'var(--text-muted)', textTransform:'uppercase' }}>Arrivée</div>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{result.client}</div>
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, marginBottom:24 }}>
                  <div style={{ padding:'20px', borderRadius:16, background:'var(--bg-hover)' }}>
                    <div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>Coordonnées GPS Destination</div>
                    <div style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)' }}>{selected?.lat?.toFixed(4)}, {selected?.lng?.toFixed(4)}</div>
                  </div>
                  <div style={{ padding:'20px', borderRadius:16, background:'var(--bg-hover)' }}>
                    <div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>Modèle de Calcul</div>
                    <div style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)' }}>Formule de Haversine</div>
                  </div>
                </div>

                <div style={{ padding:'24px', borderRadius:16, background:`${zs.color}15`, border:`1px solid ${zs.color}30`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:800, color:zs.color, textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>Coût de Livraison Estimé</div>
                    <div style={{ fontSize:13, color:'var(--text-muted)' }}>Basé sur la zone et la distance</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:40, fontWeight:900, color:zs.color, lineHeight:1 }}>{result.cout_estime}<span style={{fontSize:20}}>DT</span></div>
                  </div>
                </div>
              </div>
              
              {/* Decorative ticket cutouts */}
              <div style={{ position:'absolute', top:96, left:-12, width:24, height:24, borderRadius:'50%', background:'var(--bg-surface)', borderRight:`1px solid ${zs.color}40` }} />
              <div style={{ position:'absolute', top:96, right:-12, width:24, height:24, borderRadius:'50%', background:'var(--bg-surface)', borderLeft:`1px solid ${zs.color}40` }} />
            </div>
          ) : (
            <div style={{ height:'100%', borderRadius:24, border:'2px dashed var(--border)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:40, color:'var(--text-muted)', textAlign:'center', background:'var(--bg-card)' }}>
              <div style={{ width:80, height:80, borderRadius:'50%', background:'var(--bg-hover)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24 }}>
                <Package size={40} style={{ color:'var(--border)' }} />
              </div>
              <h3 style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', marginBottom:8, fontFamily:'"Playfair Display", serif' }}>Aucune expédition</h3>
              <p style={{ fontSize:14, maxWidth:250, margin:'0 auto' }}>Sélectionnez un client et lancez l'analyse pour générer le bon de livraison.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
