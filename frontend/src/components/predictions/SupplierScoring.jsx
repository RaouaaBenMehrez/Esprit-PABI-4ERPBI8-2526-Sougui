import React, { useState, useEffect } from 'react';
import { Factory, Star, Loader2 } from 'lucide-react';
import { ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

const API = 'http://127.0.0.1:5000/api';

const CLASSE_STYLE = {
  'Strategique': { color:'#22c55e', bg:'rgba(34,197,94,0.1)',  label:'⭐ Stratégique', desc:'Fournisseur clé — relation prioritaire' },
  'Standard':    { color:'#3b82f6', bg:'rgba(59,130,246,0.1)', label:'✅ Standard',     desc:'Fournisseur fiable — maintenir' },
  'A Revoir':    { color:'#ef4444', bg:'rgba(239,68,68,0.1)',  label:'⚠️ À Revoir',    desc:'Performance insuffisante — audit requis' },
};

export default function SupplierScoring() {
  const [data, setData]         = useState(null);
  const [filter, setFilter]     = useState('all');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/predict/supplier-scoring`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const fournisseurs = (data?.fournisseurs || []).filter(f =>
    filter === 'all' || String(f.classe) === filter
  );

  const radarData = selected ? [
    { subject:'Volume',    A: selected.score_volume    || 0, fullMark:100 },
    { subject:'Fréquence', A: selected.score_frequence || 0, fullMark:100 },
    { subject:'Récence',   A: selected.score_recence   || 0, fullMark:100 },
    { subject:'Diversité', A: selected.score_diversite || 0, fullMark:100 },
  ] : [];

  return (
    <div className="anim-fade-up">
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <div style={{ width:48, height:48, borderRadius:14, background:'rgba(34,197,94,0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Factory size={24} style={{ color:'#22c55e' }} />
        </div>
        <div>
          <h1 style={{ fontSize:28, fontWeight:900, color:'var(--text-primary)' }}>Supplier Classification</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)' }}>Scoring & classification fournisseurs · KMeans + Score multi-critères</p>
        </div>
        <div style={{ marginLeft:'auto', padding:'4px 12px', borderRadius:999, background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', fontSize:11, fontWeight:700, color:'#22c55e' }}>● DWH LIVE</div>
      </div>

      {/* KPIs distribution */}
      {data && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:20 }}>
          {Object.entries(CLASSE_STYLE).map(([key, cs]) => (
            <div key={key} className="s-card" style={{ padding:20, cursor:'pointer', border:`2px solid ${filter===key?cs.color:'transparent'}`, background: filter===key ? cs.bg : undefined }}
              onClick={() => setFilter(filter===key?'all':key)}>
              <div style={{ fontSize:18, marginBottom:4 }}>{cs.label}</div>
              <div style={{ fontSize:32, fontWeight:900, color:cs.color }}>{data.distribution?.[key] || 0}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>{cs.desc}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:20 }}>
        {/* Tableau fournisseurs */}
        <div className="s-card" style={{ padding:0, overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h3 style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)' }}>
              {data?.total || 0} Fournisseurs classifiés
            </h3>
            <div style={{ display:'flex', gap:8 }}>
              {['all','Strategique','Standard','A Revoir'].map(k => (
                <button key={k} onClick={() => setFilter(k)}
                  style={{ padding:'4px 10px', borderRadius:6, border:'1px solid var(--border)',
                    background: filter===k ? 'var(--blue)' : 'transparent',
                    color: filter===k ? '#fff' : 'var(--text-muted)', fontSize:11, cursor:'pointer' }}>
                  {k === 'all' ? 'Tous' : k}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div style={{ padding:40, textAlign:'center' }}><Loader2 size={24} style={{ animation:'spin 1s linear infinite', color:'var(--blue)' }} /></div>
          ) : (
            <div style={{ maxHeight:400, overflowY:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ position:'sticky', top:0, background:'var(--bg-card)' }}>
                    {['Fournisseur','Spécialité','Score','Classe'].map(h => (
                      <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--text-muted)', borderBottom:'1px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fournisseurs.map((f, i) => {
                    const cs = CLASSE_STYLE[String(f.classe)] || CLASSE_STYLE['Standard'];
                    return (
                      <tr key={i} onClick={() => setSelected(f)} style={{ cursor:'pointer', background: selected?.fournisseur_key===f.fournisseur_key ? cs.bg : 'transparent', transition:'background .15s' }}>
                        <td style={{ padding:'10px 16px', color:'var(--text-primary)', fontWeight:600, borderBottom:'1px solid var(--border)' }}>{f.Nom_Normalise || f.Nom_Fournisseur || '—'}</td>
                        <td style={{ padding:'10px 16px', color:'var(--text-muted)', borderBottom:'1px solid var(--border)', fontSize:12 }}>{f.Specialite || '—'}</td>
                        <td style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ flex:1, height:6, borderRadius:999, background:'var(--bg-hover)', overflow:'hidden' }}>
                              <div style={{ height:'100%', width:`${f.score_global||0}%`, background:cs.color, borderRadius:999 }} />
                            </div>
                            <span style={{ fontSize:12, fontWeight:700, color:cs.color, minWidth:35 }}>{(f.score_global||0).toFixed(0)}%</span>
                          </div>
                        </td>
                        <td style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)' }}>
                          <span style={{ padding:'3px 8px', borderRadius:6, background:cs.bg, color:cs.color, fontSize:11, fontWeight:700 }}>{String(f.classe)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Détail fournisseur sélectionné */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {selected ? (
            <>
              <div className="s-card" style={{ padding:20 }}>
                <div style={{ fontSize:16, fontWeight:800, color:'var(--text-primary)', marginBottom:4 }}>{selected.Nom_Normalise || selected.Nom_Fournisseur}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:16 }}>{selected.Specialite} · {selected.Pays}</div>
                {[
                  { label:'Volume achats',  val:`${(selected.montant_total||0).toLocaleString()} DT` },
                  { label:'Nb commandes',   val: selected.nb_achats },
                  { label:'Score global',   val:`${(selected.score_global||0).toFixed(1)}%` },
                  { label:'Cluster ML',     val: selected.cluster_nom || '—' },
                ].map((r,i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                    <span style={{ fontSize:12, color:'var(--text-muted)' }}>{r.label}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{r.val}</span>
                  </div>
                ))}
              </div>

              {/* Radar chart */}
              <div className="s-card" style={{ padding:20 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', marginBottom:12 }}>PROFIL DE PERFORMANCE</div>
                <ResponsiveContainer width="100%" height={180}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill:'#94a3b8', fontSize:11 }} />
                    <PolarRadiusAxis domain={[0,100]} tick={false} />
                    <Radar name="Score" dataKey="A" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="s-card" style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:40, color:'var(--text-muted)', textAlign:'center' }}>
              <Factory size={48} style={{ opacity:0.2, marginBottom:16 }} />
              <p style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>Sélectionnez un fournisseur</p>
              <p style={{ fontSize:13 }}>Cliquez sur une ligne du tableau pour voir le profil détaillé.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
