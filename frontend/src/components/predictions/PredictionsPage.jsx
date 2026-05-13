/**
 * PredictionsPage.jsx — Hub centralisé de toutes les prédictions ML Sougui
 * Sert de point d'entrée unifié avec navigation par onglets entre les 6 modèles.
 */
import React, { useState, useEffect } from 'react';
import {
  BrainCircuit, MapPin, TrendingUp, ShoppingBag,
  AlertTriangle, Factory, BarChart2, CheckCircle,
  AlertCircle, Loader2, Cpu
} from 'lucide-react';
import BestSellerB2C         from './BestSellerB2C';
import B2BDemandPrediction   from './B2BDemandPrediction';
import SupplierScoring       from './SupplierScoring';
import SeasonalRecommend     from './SeasonalRecommend';
import RevenueForecaster     from './RevenueForecaster';
import { useLanguage }       from '../../context/LanguageContext';
import translations          from '../../context/translations';

const API = 'http://127.0.0.1:5000/api';

/* ── Statut de santé des modèles ─────────────────────────────────── */
const ModelsHealth = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/predict/status`)
      .then(r => r.json()).then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  const labels = {
    prophet_ca:'Prophet CA', rf_regression:'RF Régression',
    rf_classification:'RF Classification', xgb_regression:'XGB Régression',
    xgb_classification:'XGB Classification', kmeans_rfm:'KMeans RFM',
    scaler_regression:'Scaler', le_statut:'Label Encoder',
  };

  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
      {loading ? (
        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-muted)' }}>
          <Loader2 size={13} style={{ animation:'spin 1s linear infinite' }} /> Vérification modèles...
        </div>
      ) : !status ? (
        <div style={{ fontSize:12, color:'#ef4444' }}>⚠ Backend non disponible</div>
      ) : (
        <>
          {Object.entries(status.models || {}).map(([key, ok]) => (
            <div key={key} style={{
              display:'flex', alignItems:'center', gap:5, padding:'3px 10px',
              borderRadius:999, fontSize:11, fontWeight:600,
              background: ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${ok ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
              color: ok ? '#22c55e' : '#ef4444',
            }}>
              {ok ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
              {labels[key] || key}
            </div>
          ))}
          <div style={{
            padding:'3px 12px', borderRadius:999, fontSize:11, fontWeight:700,
            background: status.all_ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${status.all_ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: status.all_ok ? '#22c55e' : '#ef4444',
          }}>
            {status.all_ok ? '✓ Tous OK' : `⚠ ${Object.values(status.models||{}).filter(v=>!v).length} manquant(s)`}
          </div>
        </>
      )}
    </div>
  );
};

/* ── Configuration des onglets selon le rôle utilisateur */
const buildTabs = (t, role = 'ceo') => {
  const ALL = [
    {
      id: 'best-seller', roles: ['ceo','marketing','commercial'],
      label: t.pred_bestseller_label, icon: ShoppingBag, color: '#a855f7',
      badge: 'RandomForest', desc: t.pred_bestseller_desc,
      render: () => <BestSellerB2C />,
    },
    {
      id: 'b2b-demand', roles: ['ceo','commercial'],
      label: t.pred_b2b_label, icon: TrendingUp, color: '#3b82f6',
      badge: 'XGBoost', desc: t.pred_b2b_desc,
      render: () => <B2BDemandPrediction />,
    },
    {
      id: 'supplier', roles: ['ceo'],
      label: t.pred_supplier_label, icon: Factory, color: '#22c55e',
      badge: 'KMeans', desc: t.pred_supplier_desc,
      render: () => <SupplierScoring />,
    },
    {
      id: 'seasonal', roles: ['marketing'],
      label: t.pred_seasonal_label, icon: BarChart2, color: '#f59e0b',
      badge: 'IA Saisonnière', desc: t.pred_seasonal_desc,
      render: () => <SeasonalRecommend />,
    },
    {
      id: 'revenue-forecast', roles: ['ceo','commercial'],
      label: t.pred_revenue_label, icon: TrendingUp, color: '#10b981',
      badge: 'Prophet', desc: t.pred_revenue_desc,
      render: () => <RevenueForecaster />,
    },
  ];
  return ALL.filter(tab => tab.roles.includes(role));
};

/* ══ PAGE PRINCIPALE ════════════════════════════════════════════════════ */
const PredictionsPage = ({ role = 'ceo' }) => {
  const { lang } = useLanguage();
  const t = translations[lang];
  const TABS = buildTabs(t, role);
  const [active, setActive] = useState(TABS[0]?.id || 'best-seller');
  const tab = TABS.find(tb => tb.id === active);

  return (
    <div className="anim-fade-up" style={{ padding: '40px' }}>

      {/* En-tête */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
          <div style={{ width:52, height:52, borderRadius:16, background:'linear-gradient(135deg,rgba(30,90,255,0.2),rgba(124,58,237,0.2))', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid rgba(30,90,255,0.25)' }}>
            <BrainCircuit size={26} style={{ color:'#4d7fff' }} />
          </div>
          <div>
            <h1 style={{ fontSize:32, fontWeight:900, color:'var(--text-primary)', lineHeight:1.1 }}>
              Predictive Intelligence <span style={{ color:'var(--blue)' }}>Suite</span>
            </h1>
            <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>
              4 modèles ML · RandomForest · XGBoost · KMeans · Haversine
            </p>
          </div>
          <div style={{ marginLeft:'auto', padding:'5px 14px', borderRadius:999, background:'rgba(30,90,255,0.1)', border:'1px solid rgba(30,90,255,0.25)', fontSize:12, fontWeight:700, color:'var(--blue)', display:'flex', alignItems:'center', gap:6 }}>
            <Cpu size={13} /> ML LIVE · DWH PostgreSQL
          </div>
        </div>
        <div style={{ marginTop:12 }}>
          <ModelsHealth />
        </div>
      </div>

      {/* Onglets de navigation */}
      <div style={{ display:'grid', gridTemplateColumns:`repeat(${TABS.length},1fr)`, gap:10, marginBottom:28 }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button key={t.id} onClick={() => setActive(t.id)}
              style={{
                padding:'14px 10px', borderRadius:14,
                border:`2px solid ${isActive ? t.color : 'var(--border)'}`,
                background: isActive ? `${t.color}18` : 'var(--bg-card)',
                cursor:'pointer', transition:'all .2s', textAlign:'center',
                boxShadow: isActive ? `0 4px 20px ${t.color}25` : 'none',
              }}>
              <div style={{ width:36, height:36, borderRadius:10, background: isActive ? `${t.color}22` : 'var(--bg-hover)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 8px' }}>
                <Icon size={18} style={{ color: isActive ? t.color : 'var(--text-muted)' }} />
              </div>
              <div style={{ fontSize:11, fontWeight:700, color: isActive ? t.color : 'var(--text-primary)', lineHeight:1.3 }}>{t.label}</div>
              <div style={{ fontSize:9, color:'var(--text-muted)', marginTop:4, padding:'2px 6px', borderRadius:999, background:'var(--bg-hover)', display:'inline-block' }}>{t.badge}</div>
            </button>
          );
        })}
      </div>

      {/* Fil d'ariane */}
      {tab && (
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20, padding:'10px 16px', borderRadius:10, background:'var(--bg-hover)', borderLeft:`4px solid ${tab.color}` }}>
          <tab.icon size={14} style={{ color: tab.color }} />
          <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{tab.label}</span>
          <span style={{ fontSize:12, color:'var(--text-muted)' }}>·</span>
          <span style={{ fontSize:12, color:'var(--text-muted)' }}>{tab.desc}</span>
          <div style={{ marginLeft:'auto', padding:'2px 10px', borderRadius:999, background:`${tab.color}18`, border:`1px solid ${tab.color}33`, fontSize:10, fontWeight:700, color:tab.color }}>
            {tab.badge}
          </div>
        </div>
      )}

      {/* Contenu de l'onglet actif — rendu via render() pour éviter l'instanciation module-level */}
      <div key={active} className="anim-fade-up">
        {tab?.render?.()}
      </div>

    </div>
  );
};

export default PredictionsPage;
