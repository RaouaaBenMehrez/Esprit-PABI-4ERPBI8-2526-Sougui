import React, { useState } from 'react';
import { Sun, Snowflake, Leaf, Flower2, TrendingUp, Star, ShoppingBag } from 'lucide-react';

// ── Données saisonnières ───────────────────────────────────────────────────
const SEASONS = {
  Printemps: {
    months: [3, 4, 5], icon: Flower2, color: '#f59e0b',
    categories: [
      { cat: 'Arts de la table', score: 92, raison: 'Saison des mariages et fêtes de printemps — forte demande cadeau', action: 'Mettre en avant les coffrets et sets de table' },
      { cat: 'Bijoux', score: 88, raison: 'Fête des mères (mai) et événements sociaux en hausse', action: 'Créer des offres spéciales fête des mères' },
      { cat: 'Textile',          score: 75, raison: 'Renouvellement de la décoration intérieure printanière', action: 'Proposer des coussins et plaids aux couleurs vives' },
      { cat: 'Céramique',        score: 68, raison: 'Achats décoration pour terrasses et jardins', action: 'Mettre en vitrine pots et objets décoratifs extérieur' },
    ],
  },
  Été: {
    months: [6, 7, 8], icon: Sun, color: '#ef4444',
    categories: [
      { cat: 'Arts de la table', score: 85, raison: 'Saison touristique et souvenirs artisanaux', action: 'Activer les canaux e-commerce et expéditions export' },
      { cat: 'Poterie',          score: 78, raison: 'Forte demande souvenir et artisanat tunisien authentique', action: 'Préparer stock pour les fêtes de l\'Aïd et touristes' },
      { cat: 'Bijoux',           score: 72, raison: 'Cadeaux de voyage et achats impulsifs touristes', action: 'Proposer des packs cadeau emballés' },
      { cat: 'Textile',          score: 60, raison: 'Accessoires plage et décoration estivale', action: 'Activer les réductions de fin de saison dès août' },
    ],
  },
  Automne: {
    months: [9, 10, 11], icon: Leaf, color: '#22c55e',
    categories: [
      { cat: 'Textile',          score: 89, raison: 'Renouvellement décoration d\'intérieur pré-hiver', action: 'Proposer des kits déco cocooning avec bougies et coussins' },
      { cat: 'Céramique',        score: 82, raison: 'Fête de l\'Aïd El Kebir et achats familiaux', action: 'Créer des coffrets famille pour les grandes tablées' },
      { cat: 'Arts de la table', score: 79, raison: 'Rentrée et repas en famille plus fréquents', action: 'Mettre en avant la vaisselle complète et les sets' },
      { cat: 'Bijoux',           score: 65, raison: 'Cadeaux pré-fêtes de fin d\'année', action: 'Lancer la campagne anticipée Noël / Nouvel An' },
    ],
  },
  Hiver: {
    months: [12, 1, 2], icon: Snowflake, color: '#3b82f6',
    categories: [
      { cat: 'Bijoux',           score: 94, raison: 'Fêtes de fin d\'année et cadeaux Noël / Nouvel An', action: 'Activer des packs cadeaux premium avec emballage luxe' },
      { cat: 'Arts de la table', score: 88, raison: 'Repas de fête et réveillons — pic de demande vaisselle', action: 'Créer des éditions limitées et collections hiver' },
      { cat: 'Textile',          score: 82, raison: 'Décoration hivernale (plaids, coussins, bougies)', action: 'Bundle chaud : plaid + bougie + coussin' },
      { cat: 'Poterie',          score: 70, raison: 'Cadeaux artisanaux authentiques pour les fêtes', action: 'Proposer des pièces gravées ou personnalisées' },
    ],
  },
};

const getSeason = (month) => {
  for (const [s, data] of Object.entries(SEASONS)) {
    if (data.months.includes(month)) return s;
  }
  return 'Printemps';
};

export default function SeasonalRecommend() {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const defaultSeason = getSeason(currentMonth);
  const [selectedSeason, setSelectedSeason] = useState(defaultSeason);

  const season = SEASONS[selectedSeason];
  const Icon = season.icon;

  return (
    <div className="anim-fade-up">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <div style={{ width:48, height:48, borderRadius:14, background:`rgba(245,158,11,0.15)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={24} style={{ color: season.color }} />
        </div>
        <div>
          <h1 style={{ fontSize:28, fontWeight:900, color:'var(--text-primary)' }}>Recommandation Saisonnière</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)' }}>Quels produits mettre en avant · Basé sur la saisonnalité · Données historiques Sougui</p>
        </div>
        <div style={{ marginLeft:'auto', padding:'4px 12px', borderRadius:999, background:`${season.color}15`, border:`1px solid ${season.color}40`, fontSize:11, fontWeight:700, color:season.color }}>
          ● {selectedSeason.toUpperCase()}
        </div>
      </div>

      {/* Sélecteur de saison */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:24 }}>
        {Object.entries(SEASONS).map(([s, data]) => {
          const Ic = data.icon;
          const isActive = selectedSeason === s;
          return (
            <button key={s} onClick={() => setSelectedSeason(s)}
              style={{
                padding:'14px 10px', borderRadius:14, textAlign:'center',
                border:`2px solid ${isActive ? data.color : 'var(--border)'}`,
                background: isActive ? `${data.color}15` : 'var(--bg-card)',
                cursor:'pointer', transition:'all .2s',
                boxShadow: isActive ? `0 4px 20px ${data.color}30` : 'none',
              }}>
              <Ic size={22} style={{ color: isActive ? data.color : 'var(--text-muted)', marginBottom:6 }} />
              <div style={{ fontSize:12, fontWeight:700, color: isActive ? data.color : 'var(--text-primary)' }}>{s}</div>
              <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>
                {data.months.map(m => ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'][m-1]).join(' · ')}
              </div>
            </button>
          );
        })}
      </div>

      {/* Recommandations par catégorie */}
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {season.categories.map((item, i) => (
          <div key={i} style={{
            padding:24, borderRadius:20,
            background: i === 0 ? `linear-gradient(135deg, ${season.color}10, var(--bg-card))` : 'var(--bg-card)',
            border:`1px solid ${i === 0 ? season.color + '30' : 'var(--border)'}`,
            boxShadow: i === 0 ? `0 8px 24px -8px ${season.color}20` : 'none',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              {/* Rang + score */}
              <div style={{ textAlign:'center', minWidth:56 }}>
                <div style={{ fontSize:24, fontWeight:900, color: i === 0 ? season.color : 'var(--text-muted)', lineHeight:1 }}>
                  {i === 0 ? <Star size={28} fill={season.color} color={season.color} /> : `#${i+1}`}
                </div>
                <div style={{ fontSize:22, fontWeight:900, color: season.color, marginTop:4 }}>{item.score}<span style={{fontSize:12}}>%</span></div>
                <div style={{ fontSize:9, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1 }}>Score</div>
              </div>

              {/* Barre de score */}
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <ShoppingBag size={16} style={{ color: season.color }} />
                    <span style={{ fontSize:15, fontWeight:800, color:'var(--text-primary)' }}>{item.cat}</span>
                  </div>
                  {i === 0 && (
                    <span style={{ fontSize:10, fontWeight:800, padding:'2px 10px', borderRadius:999, background: season.color, color:'#fff' }}>
                      ★ PRIORITÉ
                    </span>
                  )}
                </div>
                <div style={{ height:8, borderRadius:8, background:'var(--bg-hover)', marginBottom:10, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${item.score}%`, borderRadius:8, background:`linear-gradient(90deg, ${season.color}, ${season.color}80)`, transition:'width 1s ease' }} />
                </div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:6 }}>📊 {item.raison}</div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', padding:'8px 12px', borderRadius:8, background:`${season.color}10`, borderLeft:`3px solid ${season.color}` }}>
                  💡 {item.action}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop:20, padding:'12px 20px', borderRadius:12, background:'var(--bg-hover)', fontSize:12, color:'var(--text-muted)', textAlign:'center' }}>
        Recommandations générées à partir des ventes historiques de Sougui · Mise à jour trimestrielle
      </div>
    </div>
  );
}
