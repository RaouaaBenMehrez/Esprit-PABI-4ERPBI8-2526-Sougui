import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Compass } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

/* ── Tour content (bilingual) ─────────────────────────────────── */
const TOURS = {
  ceo: {
    fr: [
      { target: 'logo',        title: '🏠 Logo Sougui',           desc: 'Cliquez sur le logo pour revenir à l\'accueil depuis n\'importe quelle page.' },
      { target: 'user-badge',  title: '👤 Votre profil',           desc: 'Votre badge de rôle. Cliquez pour accéder aux Paramètres : profil, sécurité, utilisateurs.' },
      { target: 'sidebar-nav', title: '🧭 Navigation principale',  desc: 'Le menu latéral vous donne accès à toutes les sections : Vue d\'ensemble, Revenus, Clients B2B, Power BI et Prédictions ML.' },
      { target: 'ceo-banner',  title: '📊 KPI Live — CA Total',    desc: 'Le banner bleu affiche votre chiffre d\'affaires en temps réel depuis le Data Warehouse PostgreSQL. Les formes 3D sont un effet visuel ✨' },
      { target: 'ceo-kpis',   title: '📈 4 KPIs Stratégiques',    desc: 'CA Total · Transactions · Revenu B2B · Revenu B2C. La flèche ▲▼ indique la tendance par rapport au mois précédent.' },
      { target: 'lang-btn',    title: '🌐 Langue FR / EN',         desc: 'Basculez l\'interface entre Français et Anglais à tout moment. Le guide aussi changera de langue !' },
      { target: 'settings-btn',title: '⚙ Paramètres',             desc: 'Gérez votre profil, mot de passe, reconnaissance faciale, utilisateurs et URLs Power BI.' },
      { target: null,          title: '🎉 Vous êtes prêt !',       desc: 'Explorez librement votre espace CEO. Relancez ce guide depuis Paramètres → "Relancer le guide".' },
    ],
    en: [
      { target: 'logo',        title: '🏠 Sougui Logo',            desc: 'Click the logo anytime to return to the home page. It\'s your central starting point.' },
      { target: 'user-badge',  title: '👤 Your Profile',           desc: 'Your role badge. Click to access Settings: profile, security, user management.' },
      { target: 'sidebar-nav', title: '🧭 Main Navigation',        desc: 'The sidebar gives access to all sections: Overview, Revenue, B2B Clients, Power BI and ML Predictions.' },
      { target: 'ceo-banner',  title: '📊 Live KPI — Total Revenue', desc: 'The blue banner shows your real-time revenue from the PostgreSQL Data Warehouse. The 3D shapes are a visual effect ✨' },
      { target: 'ceo-kpis',   title: '📈 4 Strategic KPIs',       desc: 'Total Revenue · Transactions · B2B Revenue · B2C Revenue. The ▲▼ arrow shows the trend vs last month.' },
      { target: 'lang-btn',    title: '🌐 Language FR / EN',       desc: 'Switch the interface between French and English anytime. The guide will follow the language!' },
      { target: 'settings-btn',title: '⚙ Settings',               desc: 'Manage your profile, password, facial recognition, users and Power BI URLs.' },
      { target: null,          title: '🎉 You\'re all set!',        desc: 'Explore your CEO space freely. Relaunch this guide from Settings → "Relaunch guide".' },
    ],
  },
  marketing: {
    fr: [
      { target: 'logo',        title: '🏠 Logo Sougui',           desc: 'Cliquez sur le logo pour revenir à l\'accueil depuis n\'importe quelle page.' },
      { target: 'sidebar-nav', title: '🧭 Navigation Marketing',  desc: 'Accédez à : Vue Marketing, Performance B2C, Saisonnalité, Power BI, et vos 4 modèles ML.' },
      { target: 'ceo-banner',  title: '✨ Banner Marketing Live',  desc: 'La constellation de points réagit à votre curseur. Ce banner affiche votre CA B2C en temps réel.' },
      { target: 'ceo-kpis',   title: '🛒 KPIs B2C',             desc: 'CA B2C · % du CA global · E-commerce · Vente Physique. Surveillez la répartition de vos canaux.' },
      { target: 'settings-btn',title: '⚙ Paramètres',            desc: 'Gérez votre profil et préférences depuis cette section.' },
      { target: null,          title: '🚀 Bonne analyse !',        desc: 'Lancez vos prédictions KMeans & XGBoost depuis le menu ML. Consultez votre Power BI intégré.' },
    ],
    en: [
      { target: 'logo',        title: '🏠 Sougui Logo',           desc: 'Click the logo anytime to return to the home page.' },
      { target: 'sidebar-nav', title: '🧭 Marketing Navigation',  desc: 'Access: Marketing View, B2C Performance, Seasonality, Power BI, and your 4 ML models.' },
      { target: 'ceo-banner',  title: '✨ Marketing Live Banner',  desc: 'The constellation of dots reacts to your cursor. This banner shows your real-time B2C revenue.' },
      { target: 'ceo-kpis',   title: '🛒 B2C KPIs',             desc: 'B2C Revenue · % of Global · E-commerce · Physical Sales. Monitor your channel breakdown.' },
      { target: 'settings-btn',title: '⚙ Settings',              desc: 'Manage your profile and preferences from this section.' },
      { target: null,          title: '🚀 Happy analysing!',       desc: 'Launch your KMeans & XGBoost predictions from the ML menu. View your embedded Power BI.' },
    ],
  },
  commercial: {
    fr: [
      { target: 'logo',        title: '🏠 Logo Sougui',           desc: 'Cliquez sur le logo pour revenir à l\'accueil depuis n\'importe quelle page.' },
      { target: 'sidebar-nav', title: '🧭 Navigation Commerciale', desc: 'Accédez à : Vue Commerciale, Transactions, Clients B2B, Prédictions ML, et votre Agent IA.' },
      { target: 'ceo-banner',  title: '🌿 Banner Commercial Live', desc: 'Les orbes vertes flottantes réagissent à votre curseur. CA, transactions B2B et ratio en temps réel.' },
      { target: 'ceo-kpis',   title: '💼 KPIs Commerciaux',      desc: 'CA Total · Transactions · B2B · Ratio B2B. Suivez vos performances quotidiennes.' },
      { target: 'settings-btn',title: '⚙ Paramètres',            desc: 'Gérez votre profil, sécurité et préférences.' },
      { target: null,          title: '💪 Prêt à vendre !',       desc: 'Utilisez l\'Agent IA (Gemini + RAG) pour des recommandations produits instantanées. Bonne journée !' },
    ],
    en: [
      { target: 'logo',        title: '🏠 Sougui Logo',           desc: 'Click the logo anytime to return to the home page.' },
      { target: 'sidebar-nav', title: '🧭 Sales Navigation',      desc: 'Access: Sales View, Transactions, B2B Clients, ML Predictions, and your AI Agent.' },
      { target: 'ceo-banner',  title: '🌿 Commercial Live Banner', desc: 'Floating green orbs react to your cursor. Real-time CA, B2B transactions and ratio.' },
      { target: 'ceo-kpis',   title: '💼 Sales KPIs',            desc: 'Total Revenue · Transactions · B2B · B2B Ratio. Track your daily performance.' },
      { target: 'settings-btn',title: '⚙ Settings',              desc: 'Manage your profile, security and preferences.' },
      { target: null,          title: '💪 Ready to sell!',        desc: 'Use the AI Agent (Gemini + RAG) for instant product recommendations. Have a great day!' },
    ],
  },
};

const ROLE_CFG = {
  ceo:        { color: '#1e5aff', bg: 'linear-gradient(135deg,#0f2d80,#1e5aff)', emoji: '👑', label: { fr: 'CEO', en: 'CEO' } },
  marketing:  { color: '#7c3aed', bg: 'linear-gradient(135deg,#2e0d6e,#7c3aed)', emoji: '📊', label: { fr: 'Marketing', en: 'Marketing' } },
  commercial: { color: '#059669', bg: 'linear-gradient(135deg,#064e3b,#059669)', emoji: '💼', label: { fr: 'Commercial', en: 'Sales' } },
};

const STORAGE_KEY = 'sougui_tour_done_';

/* ── Compute card position relative to a target element ───────── */
function getCardPos(targetEl) {
  if (!targetEl) return { top: '50%', left: '50%', transform: 'translate(-50%,-50%)', arrowDir: null };
  const r = targetEl.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardW = 360;
  const cardH = 260;
  const gap = 16;

  // Prefer right of element
  if (r.right + gap + cardW < vw) {
    return {
      top: Math.min(Math.max(r.top + r.height / 2 - cardH / 2, 16), vh - cardH - 16),
      left: r.right + gap,
      arrowDir: 'left',
      arrowTop: Math.max(Math.min(r.top + r.height / 2, vh - 32), 32),
    };
  }
  // Prefer left
  if (r.left - gap - cardW > 0) {
    return {
      top: Math.min(Math.max(r.top + r.height / 2 - cardH / 2, 16), vh - cardH - 16),
      left: r.left - gap - cardW,
      arrowDir: 'right',
      arrowTop: Math.max(Math.min(r.top + r.height / 2, vh - 32), 32),
    };
  }
  // Below
  if (r.bottom + gap + cardH < vh) {
    return {
      top: r.bottom + gap,
      left: Math.min(Math.max(r.left + r.width / 2 - cardW / 2, 16), vw - cardW - 16),
      arrowDir: 'up',
    };
  }
  // Above
  return {
    top: r.top - gap - cardH,
    left: Math.min(Math.max(r.left + r.width / 2 - cardW / 2, 16), vw - cardW - 16),
    arrowDir: 'down',
  };
}

/* ── Spotlight clip path ──────────────────────────────────────── */
function getSpotlight(el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const pad = 8;
  return {
    top:    r.top    - pad,
    left:   r.left   - pad,
    width:  r.width  + pad * 2,
    height: r.height + pad * 2,
    borderRadius: 12,
  };
}

/* ── Welcome screen ───────────────────────────────────────────── */
const Welcome = ({ role, lang, onStart, onSkip }) => {
  const cfg = ROLE_CFG[role] || ROLE_CFG.ceo;
  const isFr = lang === 'fr';
  return (
    <div style={{
      position:'fixed',inset:0,zIndex:9999,
      background:'rgba(5,8,15,0.85)',backdropFilter:'blur(14px)',
      display:'flex',alignItems:'center',justifyContent:'center',
      animation:'gtFadeIn 0.35s ease',
    }}>
      <style>{`
        @keyframes gtFadeIn{from{opacity:0}to{opacity:1}}
        @keyframes gtSlideUp{from{opacity:0;transform:translateY(30px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes gtFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
      `}</style>
      <div style={{
        background:'linear-gradient(145deg,rgba(12,16,36,0.99),rgba(6,9,20,0.99))',
        border:`1px solid ${cfg.color}30`,borderRadius:28,
        padding:'52px 56px',maxWidth:520,width:'90%',textAlign:'center',
        animation:'gtSlideUp 0.45s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow:`0 40px 100px rgba(0,0,0,0.7),0 0 60px ${cfg.color}18`,
      }}>
        <div style={{
          display:'inline-flex',alignItems:'center',gap:10,
          padding:'9px 22px',borderRadius:9999,
          background:`${cfg.color}18`,border:`1.5px solid ${cfg.color}38`,
          marginBottom:28,animation:'gtFloat 3s ease-in-out infinite',
        }}>
          <span style={{fontSize:20}}>{cfg.emoji}</span>
          <span style={{fontSize:12,fontWeight:800,color:cfg.color,letterSpacing:'0.12em',textTransform:'uppercase'}}>
            {isFr ? `Espace ${cfg.label.fr}` : `${cfg.label.en} Space`}
          </span>
        </div>

        <h1 style={{fontSize:34,fontWeight:900,fontFamily:'"Playfair Display",serif',color:'#fff',marginBottom:14,lineHeight:1.2}}>
          {isFr ? 'Bienvenue sur' : 'Welcome to'}<br/>
          <span style={{color:cfg.color}}>Sougui BI</span>
        </h1>
        <p style={{color:'rgba(255,255,255,0.6)',fontSize:14,lineHeight:1.8,marginBottom:36}}>
          {isFr
            ? <>Voulez-vous un <strong style={{color:'#fff'}}>tour guidé</strong> ? Nous vous montrerons chaque section en <strong style={{color:cfg.color}}>moins de 2 min</strong>.</>
            : <>Would you like a <strong style={{color:'#fff'}}>guided tour</strong>? We'll walk you through each section in <strong style={{color:cfg.color}}>under 2 min</strong>.</>
          }
        </p>
        <div style={{display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap'}}>
          <button onClick={onStart} style={{
            padding:'13px 32px',borderRadius:14,background:cfg.bg,
            border:'none',cursor:'pointer',fontSize:14,fontWeight:800,color:'#fff',
            display:'flex',alignItems:'center',gap:8,
            boxShadow:`0 8px 24px ${cfg.color}40`,transition:'all 0.2s',
          }}
            onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.04)';}}
            onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)';}}
          >
            <Compass size={16}/>
            {isFr ? 'Commencer le tour' : 'Start the tour'}
          </button>
          <button onClick={onSkip} style={{
            padding:'13px 24px',borderRadius:14,
            background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.14)',
            cursor:'pointer',fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.5)',transition:'all 0.2s',
          }}
            onMouseEnter={e=>{e.currentTarget.style.color='#fff';}}
            onMouseLeave={e=>{e.currentTarget.style.color='rgba(255,255,255,0.5)';}}
          >
            {isFr ? 'Passer' : 'Skip'}
          </button>
        </div>
        <p style={{color:'rgba(255,255,255,0.2)',fontSize:11,marginTop:22}}>
          {isFr ? 'Vous pouvez relancer ce guide depuis Paramètres.' : 'You can relaunch this guide from Settings.'}
        </p>
      </div>
    </div>
  );
};

/* ── Main GuidedTour ──────────────────────────────────────────── */
const GuidedTour = ({ role }) => {
  const { lang } = useLanguage();
  const safeRole = role === 'admin' ? 'ceo' : (role || 'ceo');
  const storageKey = STORAGE_KEY + safeRole;

  const [phase, setPhase] = useState(() =>
    localStorage.getItem(storageKey) === 'done' ? 'hidden' : 'welcome'
  );
  const [idx, setIdx] = useState(0);
  const [pos, setPos]  = useState(null);
  const [spot, setSpot] = useState(null);

  const tourData = TOURS[safeRole] || TOURS.ceo;
  const steps    = tourData[lang] || tourData.fr;
  const cfg      = ROLE_CFG[safeRole] || ROLE_CFG.ceo;
  const step     = steps[idx];

  // Compute position whenever step or lang changes
  useLayoutEffect(() => {
    if (phase !== 'tour' || !step) return;
    const update = () => {
      const el = step.target ? document.querySelector(`[data-tour="${step.target}"]`) : null;
      setPos(getCardPos(el));
      setSpot(getSpotlight(el));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [phase, idx, lang, step]);

  const done  = () => { localStorage.setItem(storageKey,'done'); setPhase('hidden'); };
  const next  = () => { if (idx >= steps.length - 1) done(); else setIdx(i => i + 1); };
  const prev  = () => setIdx(i => Math.max(0, i - 1));
  const isLast = idx === steps.length - 1;

  if (phase === 'hidden') return null;
  if (phase === 'welcome') return <Welcome role={safeRole} lang={lang} onStart={() => { setIdx(0); setPhase('tour'); }} onSkip={done} />;

  if (!pos) return null;

  return (
    <>
      <style>{`
        @keyframes gtCardIn{from{opacity:0;transform:translateY(12px) scale(0.96)}to{opacity:1;transform:translateY(0) scale(1)}}
      `}</style>

      {/* Dark overlay with spotlight hole */}
      <div style={{ position:'fixed',inset:0,zIndex:9990,pointerEvents:'none' }}>
        {/* Full dark layer */}
        <div style={{ position:'absolute',inset:0, background:'rgba(5,8,15,0.65)' }} />
        {/* Spotlight cutout */}
        {spot && (
          <div style={{
            position:'absolute',
            top:spot.top, left:spot.left,
            width:spot.width, height:spot.height,
            borderRadius:spot.borderRadius,
            boxShadow:`0 0 0 9999px rgba(5,8,15,0.65), 0 0 0 3px ${cfg.color}80`,
            background:'transparent',
            transition:'all 0.4s cubic-bezier(0.4,0,0.2,1)',
          }}/>
        )}
      </div>

      {/* Click-through overlay to allow dismiss */}
      <div style={{ position:'fixed',inset:0,zIndex:9991,pointerEvents:'all' }} onClick={done} />

      {/* Step card */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position:'fixed',
          top: pos.top, left: pos.left,
          width:360,
          zIndex:9999,
          background: 'linear-gradient(145deg, rgba(10,14,32,0.99), rgba(5,8,18,0.99))',
          border:`1px solid ${cfg.color}40`,
          borderRadius:20,
          padding:'24px 26px 22px',
          boxShadow:`0 24px 70px rgba(0,0,0,0.7), 0 0 30px ${cfg.color}15`,
          animation:'gtCardIn 0.32s cubic-bezier(0.34,1.56,0.64,1)',
          transition:'top 0.4s cubic-bezier(0.4,0,0.2,1), left 0.4s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Progress bar */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
          <span style={{ fontSize:10, fontWeight:700, color:cfg.color }}>
            {lang==='fr' ? `Étape` : `Step`} {idx+1} / {steps.length}
          </span>
          <div style={{ flex:1, height:4, background:'rgba(255,255,255,0.08)', borderRadius:9999, overflow:'hidden' }}>
            <div style={{
              height:'100%', borderRadius:9999,
              background:`linear-gradient(90deg, ${cfg.color}, ${cfg.color}aa)`,
              width:`${((idx+1)/steps.length)*100}%`,
              transition:'width 0.4s ease',
            }}/>
          </div>
          <button onClick={done} style={{
            background:'none',border:'none',cursor:'pointer',
            color:'rgba(255,255,255,0.3)',padding:4,borderRadius:6,transition:'color 0.2s',
          }}
            onMouseEnter={e=>{e.currentTarget.style.color='#fff';}}
            onMouseLeave={e=>{e.currentTarget.style.color='rgba(255,255,255,0.3)';}}
            title={lang==='fr' ? 'Fermer' : 'Close'}
          >
            <X size={15}/>
          </button>
        </div>

        {/* Step label */}
        <div style={{
          display:'inline-block', padding:'3px 10px', borderRadius:9999,
          background:`${cfg.color}18`, border:`1px solid ${cfg.color}35`,
          fontSize:10, fontWeight:700, color:cfg.color,
          letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:10,
        }}>
          {lang==='fr' ? `Étape ${idx+1}` : `Step ${idx+1}`}
        </div>

        <h3 style={{ fontSize:17, fontWeight:800, color:'#fff', marginBottom:10, lineHeight:1.3 }}>
          {step.title}
        </h3>
        <p style={{ color:'rgba(255,255,255,0.68)', fontSize:13, lineHeight:1.75, marginBottom:22 }}>
          {step.desc}
        </p>

        {/* Dot indicators */}
        <div style={{ display:'flex', gap:5, justifyContent:'center', marginBottom:18 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              height:6, borderRadius:9999, transition:'all 0.3s',
              width: i === idx ? 22 : i < idx ? 8 : 6,
              background: i === idx ? cfg.color : i < idx ? `${cfg.color}70` : 'rgba(255,255,255,0.18)',
            }}/>
          ))}
        </div>

        {/* Navigation */}
        <div style={{ display:'flex', gap:8 }}>
          {idx > 0 && (
            <button onClick={prev} style={{
              flex:1, padding:'10px 14px', borderRadius:10,
              background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)',
              cursor:'pointer', fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.7)',
              display:'flex', alignItems:'center', justifyContent:'center', gap:5, transition:'all 0.2s',
            }}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.12)';}}
              onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.06)';}}
            >
              <ChevronLeft size={14}/> {lang==='fr' ? 'Précédent' : 'Previous'}
            </button>
          )}
          <button onClick={next} style={{
            flex:2, padding:'10px 20px', borderRadius:10,
            background: isLast ? cfg.bg : `${cfg.color}22`,
            border:`1.5px solid ${isLast ? 'transparent' : `${cfg.color}45`}`,
            cursor:'pointer', fontSize:13, fontWeight:800, color:'#fff',
            display:'flex', alignItems:'center', justifyContent:'center', gap:7,
            boxShadow: isLast ? `0 6px 18px ${cfg.color}40` : 'none', transition:'all 0.2s',
          }}
            onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.02)';}}
            onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)';}}
          >
            {isLast
              ? (lang==='fr' ? '✓ Commencer !' : '✓ Let\'s go!')
              : <>{lang==='fr' ? 'Suivant' : 'Next'} <ChevronRight size={14}/></>
            }
          </button>
        </div>

        {/* Skip link */}
        {!isLast && (
          <div style={{ textAlign:'center', marginTop:12 }}>
            <button onClick={done} style={{
              background:'none', border:'none', cursor:'pointer',
              fontSize:11, color:'rgba(255,255,255,0.25)', textDecoration:'underline',
              transition:'color 0.2s',
            }}
              onMouseEnter={e=>{e.currentTarget.style.color='rgba(255,255,255,0.6)';}}
              onMouseLeave={e=>{e.currentTarget.style.color='rgba(255,255,255,0.25)';}}
            >
              {lang==='fr' ? 'Passer le guide →' : 'Skip guide →'}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default GuidedTour;
