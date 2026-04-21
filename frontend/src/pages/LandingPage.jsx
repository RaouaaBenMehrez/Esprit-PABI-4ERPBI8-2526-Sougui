import React, { useState, useEffect } from 'react';
import { Sun, Moon, Menu, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import logoUrl from '../assets/Logo.png';

const LandingPage = ({ onNavigate }) => {
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  const features = [
    {
      role: 'CEO',
      icon: '👑',
      color: 'var(--blue)',
      colorBg: 'rgba(30,90,255,0.08)',
      title: 'Dashboard CEO',
      desc: 'Vue globale sur le CA, marges, prévisions Prophet, performance B2B/B2C et insights IA pour des décisions stratégiques.',
      items: ['Prévision CA — Prophet AI', 'KPIs business temps réel', 'Ratio B2B/B2C', 'Insights stratégiques'],
    },
    {
      role: 'MARKETING',
      icon: '📊',
      color: '#7c3aed',
      colorBg: 'rgba(124,58,237,0.08)',
      title: 'Dashboard Marketing',
      desc: 'Analyse segmentation clients RFM, XGBoost classification, campagnes B2C, saisonnalité et performance produits.',
      items: ['Segmentation KMeans RFM', 'XGBoost Classification', 'Analyse saisonnalité', 'Performance produits'],
    },
    {
      role: 'COMMERCIAL',
      icon: '💼',
      color: '#059669',
      colorBg: 'rgba(5,150,105,0.08)',
      title: 'Dashboard Commercial',
      desc: 'Suivi des ventes, clients B2B, régression CA avec RandomForest, et Sales Agent IA pour la prospection.',
      items: ['Transactions détaillées', 'RF Regression CA', 'Top clients B2B', 'Sales Agent Gemini IA'],
    },
  ];

  const stats = [
    { value: '442+', label: 'Transactions analysées' },
    { value: '5', label: 'Modèles ML actifs' },
    { value: '77%', label: 'Revenue B2B' },
    { value: '3', label: 'Rôles spécialisés' },
  ];

  const techStack = [
    { name: 'Prophet', label: 'Prévision CA' },
    { name: 'XGBoost', label: 'Classification' },
    { name: 'KMeans', label: 'Segmentation RFM' },
    { name: 'Random Forest', label: 'Régression' },
    { name: 'Gemini 2.5', label: 'AI Agent' },
    { name: 'ChromaDB', label: 'RAG Vector DB' },
  ];

  return (
    <div style={{ background: 'var(--bg-page)', color: 'var(--text-primary)', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── NAVBAR ──────────────────────────────────────────────────── */}
      <nav
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          background: scrolled
            ? (theme === 'dark' ? 'rgba(5,8,15,0.95)' : 'rgba(255,255,255,0.95)')
            : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
          transition: 'all 0.3s ease',
          padding: '0 40px',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', height: 70 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
            <img src={logoUrl} alt="Sougui" style={{ width: 36, height: 36, objectFit: 'contain' }}
              onError={e => { e.target.style.display = 'none'; }} />
            <span style={{ fontFamily: '"Playfair Display", serif', fontWeight: 900, fontSize: 22, color: 'var(--text-primary)' }}>
              Sougui
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--blue)', marginLeft: 4 }}>
              BI Suite
            </span>
          </div>

          {/* Links desktop */}
          <div className="hide-scroll" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {[['Accueil','hero'],['À Propos','about'],['Fonctionnalités','features'],['Technologie','tech'],['Contact','contact']].map(([label, id]) => (
              <button key={id} onClick={() => scrollTo(id)} className="btn-ghost" style={{ fontWeight: 500 }}>
                {label}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 24 }}>
            <button onClick={toggleTheme} className="btn-ghost"
              style={{ padding: '8px', borderRadius: '10px', border: '1px solid var(--border)' }}>
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={() => onNavigate('login')} className="btn-outline" style={{ padding: '8px 20px', fontSize: 13 }}>
              Se connecter
            </button>
            <button onClick={() => onNavigate('login')} className="btn-primary" style={{ padding: '9px 20px', fontSize: 13 }}>
              Accéder →
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section id="hero" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden', paddingTop: 80 }}>
        {/* Background elements */}
        <div style={{
          position: 'absolute', top: '20%', left: '5%',
          width: 500, height: 500,
          background: 'radial-gradient(ellipse, rgba(30,90,255,0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', right: '5%',
          width: 400, height: 400,
          background: 'radial-gradient(ellipse, rgba(30,90,255,0.08) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        {/* Grid pattern */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(30,90,255,0.12) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          opacity: theme === 'dark' ? 0.3 : 0.15,
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px', width: '100%' }}>
          <div style={{ maxWidth: 760 }}>
            {/* Tag */}
            <div className="anim-fade-up" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 16px', borderRadius: 9999,
              background: 'rgba(30,90,255,0.1)', border: '1px solid rgba(30,90,255,0.2)',
              marginBottom: 28,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--blue)', display: 'inline-block' }} />
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--blue)' }}>
                Sougui Artisanat Tunisien — Business Intelligence Suite
              </span>
            </div>

            <h1 className="anim-fade-up delay-100" style={{
              fontFamily: '"Playfair Display", serif',
              fontSize: 'clamp(42px, 6vw, 80px)',
              fontWeight: 900, lineHeight: 1.08,
              letterSpacing: '-2px',
              marginBottom: 24,
              color: 'var(--text-primary)',
            }}>
              Pilotez votre<br />
              <span className="text-gradient">artisanat</span><br />
              par l'Intelligence
            </h1>

            <p className="anim-fade-up delay-200" style={{
              fontSize: 18, lineHeight: 1.7, color: 'var(--text-secondary)',
              maxWidth: 560, marginBottom: 40,
            }}>
              Tableau de bord BI dédié au startup Sougui.tn — Poterie, Céramique, Bijoux & Textile.
              3 espaces personnalisés : CEO, Marketing, Commercial. Modèles ML prédictifs intégrés.
            </p>

            <div className="anim-fade-up delay-300" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <button onClick={() => onNavigate('login')} className="btn-primary" style={{ fontSize: 15, padding: '14px 32px' }}>
                Commencer →
              </button>
              <button onClick={() => scrollTo('features')} className="btn-outline" style={{ fontSize: 15, padding: '14px 32px' }}>
                Voir les fonctionnalités
              </button>
            </div>

            {/* Stats */}
            <div className="anim-fade-up delay-400" style={{ display: 'flex', gap: 40, marginTop: 60, flexWrap: 'wrap' }}>
              {stats.map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--blue)', lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── ABOUT ───────────────────────────────────────────────────── */}
      <section id="about" style={{ padding: '100px 40px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--blue)', marginBottom: 16 }}>
                À Propos
              </div>
              <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 44, fontWeight: 900, lineHeight: 1.1, marginBottom: 24, color: 'var(--text-primary)' }}>
                L'artisanat tunisien<br />réinventé par l'IA
              </h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: 15, marginBottom: 20 }}>
                <strong style={{ color: 'var(--text-primary)' }}>Sougui.tn</strong> est un startup tunisien qui modernise l'artisanat avec des pièces uniques et raffinées pour la décoration et l'art de la table, alliant tradition et design contemporain.
              </p>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: 15, marginBottom: 32 }}>
                Cette suite Business Intelligence a été développée pour piloter intelligemment l'entreprise — visualiser les performances, prédire le CA, segmenter les clients et accélérer les ventes grâce à un agent IA conversationnel.
              </p>
              <div style={{ display: 'flex', gap: 16 }}>
                {['Poterie', 'Céramique', 'Bijoux', 'Textile'].map(c => (
                  <div key={c} className="badge badge-blue">{c}</div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { icon: '🏺', title: 'Artisanat Premium', desc: 'Pièces uniques façonnées à la main selon des traditions millénaires.' },
                { icon: '🤖', title: 'IA Intégrée', desc: 'Gemini 2.5 Flash pour des recommandations produits en temps réel.' },
                { icon: '📈', title: 'Prédictions ML', desc: 'Prophet, XGBoost et RandomForest pour anticiper les tendances.' },
                { icon: '🇹🇳', title: 'Made in Tunisia', desc: 'Un startup 100% tunisien qui modernise la tradition artisanale.' },
              ].map(item => (
                <div key={item.title} className="s-card" style={{ padding: 24 }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>{item.icon}</div>
                  <h4 style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: 'var(--text-primary)' }}>{item.title}</h4>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES / 3 ROLES ──────────────────────────────────────── */}
      <section id="features" style={{ padding: '100px 40px', background: theme === 'dark' ? 'rgba(10,15,30,0.5)' : 'rgba(240,244,255,0.5)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--blue)', marginBottom: 16 }}>
              Fonctionnalités
            </div>
            <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 44, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 16 }}>
              3 espaces, 3 visions business
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 16, maxWidth: 540, margin: '0 auto', lineHeight: 1.7 }}>
              Chaque rôle dispose de son propre tableau de bord avec des modèles IA adaptés à ses besoins spécifiques.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {features.map((f, i) => (
              <div key={f.role} className="s-card anim-fade-up"
                style={{ padding: 32, animationDelay: `${i * 0.1}s`, borderColor: f.color + '33' }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 16, background: f.colorBg, marginBottom: 20, fontSize: 28 }}>
                  {f.icon}
                </div>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: f.color, marginBottom: 8 }}>
                  {f.role}
                </div>
                <h3 style={{ fontWeight: 800, fontSize: 20, marginBottom: 12, color: 'var(--text-primary)' }}>{f.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.7, marginBottom: 24 }}>{f.desc}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {f.items.map(item => (
                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: f.color, flexShrink: 0 }} />
                      <span style={{ color: 'var(--text-secondary)' }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TECH STACK ──────────────────────────────────────────────── */}
      <section id="tech" style={{ padding: '100px 40px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--blue)', marginBottom: 16 }}>
            Technologie
          </div>
          <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 44, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 16 }}>
            Stack IA de pointe
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 56, fontSize: 15 }}>
            Des modèles ML entraînés sur les données réelles de Sougui
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, maxWidth: 800, margin: '0 auto' }}>
            {techStack.map(t => (
              <div key={t.name} className="s-card" style={{ padding: '24px', textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--blue)', marginBottom: 4 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ─────────────────────────────────────────────────── */}
      <section id="contact" style={{ padding: '100px 40px', background: theme === 'dark' ? 'rgba(10,15,30,0.5)' : 'rgba(240,244,255,0.5)' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--blue)', marginBottom: 16 }}>
            Contact
          </div>
          <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 44, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 16 }}>
            Démarrer maintenant
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 40, fontSize: 15, lineHeight: 1.7 }}>
            Connectez-vous à votre espace personnalisé et commencez à piloter votre activité par la donnée.
          </p>

          <div className="s-card" style={{ padding: 40, textAlign: 'left' }}>
            <div style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 8 }}>
                  Nom complet
                </label>
                <input type="text" placeholder="Votre nom" className="s-input" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 8 }}>
                  Email
                </label>
                <input type="email" placeholder="votre@email.com" className="s-input" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 8 }}>
                  Message
                </label>
                <textarea placeholder="Votre message..." className="s-input" rows={4} style={{ resize: 'vertical' }} />
              </div>
            </div>
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }}>
              Envoyer le message
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 48 }}>
            {[
              { label: '📧 Email', value: 'contact@sougui.tn' },
              { label: '📍 Adresse', value: 'Tunis, Tunisie' },
              { label: '🌐 Web', value: 'www.sougui.tn' },
            ].map(c => (
              <div key={c.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{c.label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue)' }}>{c.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer style={{ padding: '40px', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={logoUrl} alt="Sougui" style={{ width: 28, height: 28, objectFit: 'contain' }}
              onError={e => { e.target.style.display = 'none'; }} />
            <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Sougui.tn</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>— Smart Business Suite</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            © 2025 Sougui Artisanat Tunisien · Propulsé par IA · ESPRIT 4ERPBI8
          </div>
          <button onClick={() => onNavigate('login')} className="btn-primary" style={{ fontSize: 13, padding: '9px 20px' }}>
            Accéder au Dashboard →
          </button>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
