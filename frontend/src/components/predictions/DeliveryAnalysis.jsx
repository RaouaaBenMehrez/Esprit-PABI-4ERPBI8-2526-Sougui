import React, { useState, useEffect } from 'react';
import { Search, MapPin, Package, TrendingUp, Loader2 } from 'lucide-react';

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
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState(null);
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    fetch(`${API}/predict/delivery-analysis`)
      .then(r => r.json())
      .then(d => setClients(d.clients || []));
  }, []);

  const filtered = clients.filter(c =>
    c.Nom_client?.toLowerCase().includes(search.toLowerCase()) ||
    c.Gouvernorat?.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 8);

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

          {/* Recherche client */}
          <div style={{ position:'relative', marginBottom:8 }}>
            <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un client ou gouvernorat..."
              style={{ width:'100%', padding:'10px 10px 10px 32px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-hover)', color:'var(--text-primary)', fontSize:13 }}
            />
          </div>

          {/* Liste clients */}
          <div style={{ maxHeight:220, overflowY:'auto', marginBottom:16 }}>
            {filtered.map((c, i) => (
              <div key={i} onClick={() => setSelected(c)}
                style={{ padding:'10px 12px', borderRadius:8, cursor:'pointer', marginBottom:4,
                  background: selected?.Client_key === c.Client_key ? 'rgba(59,130,246,0.15)' : 'transparent',
                  border: selected?.Client_key === c.Client_key ? '1px solid rgba(59,130,246,0.4)' : '1px solid transparent',
                  transition:'all .15s' }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{c.Nom_client}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>{c.Gouvernorat} · {c.distance_km?.toFixed(1)} km · {c.cout_estime?.toFixed(2)} DT</div>
              </div>
            ))}
          </div>

          {selected && (
            <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', marginBottom:16 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#ef4444', marginBottom:4 }}>CLIENT SÉLECTIONNÉ</div>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{selected.Nom_client}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>{selected.lat?.toFixed(4)}, {selected.lng?.toFixed(4)}</div>
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

        {/* Panel droit — résultats */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Map placeholder / Info coords */}
          <div className="s-card" style={{ padding:20, flex:1, minHeight:200, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
            {selected ? (
              <div style={{ width:'100%' }}>
                <h4 style={{ fontWeight:700, fontSize:13, color:'var(--text-primary)', marginBottom:12 }}>🗺️ Coordonnées GPS</h4>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  {[
                    { label:'Entrepôt Sougui', lat:SOUGUI.lat, lng:SOUGUI.lng, color:'#3b82f6' },
                    { label: selected.Nom_client, lat: selected.lat, lng: selected.lng, color:'#ef4444' }
                  ].map((pt, i) => (
                    <div key={i} style={{ padding:12, borderRadius:10, background:'var(--bg-hover)', borderLeft:`3px solid ${pt.color}` }}>
                      <div style={{ fontSize:10, fontWeight:700, color:pt.color, marginBottom:4 }}>{i===0?'S':'D'}</div>
                      <div style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)' }}>{pt.label}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)' }}>{pt.lat?.toFixed(4)}, {pt.lng?.toFixed(4)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign:'center', color:'var(--text-muted)' }}>
                <MapPin size={40} style={{ opacity:0.3, marginBottom:8 }} />
                <p style={{ fontSize:13 }}>Sélectionnez un client pour voir la carte</p>
              </div>
            )}
          </div>

          {/* Résultats */}
          {result && zs && (
            <>
              <div className="s-card" style={{ padding:20, background:zs.bg, border:`1px solid ${zs.border}` }}>
                <div style={{ fontSize:11, fontWeight:700, color:zs.color, marginBottom:8 }}>✓ CLIENT PROCHE — {result.zone?.toUpperCase()}</div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>Client</div>
                    <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>{result.client}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>Distance</div>
                    <div style={{ fontSize:22, fontWeight:800, color:zs.color }}>{result.distance_km} km</div>
                  </div>
                </div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:8 }}>Zone de proximité · {result.zone}</div>
              </div>

              <div className="s-card" style={{ padding:20 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--blue)', marginBottom:8 }}>COÛT ESTIMÉ</div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>Client</div>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{result.client}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>Distance · {result.distance_km} km</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>COÛT ESTIMÉ</div>
                    <div style={{ fontSize:36, fontWeight:900, color:'var(--blue)' }}>{result.cout_estime}</div>
                    <div style={{ fontSize:14, color:'var(--text-muted)' }}>DT</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
