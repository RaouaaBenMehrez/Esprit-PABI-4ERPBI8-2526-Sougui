import React, { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Menu, X, Send, CheckCircle, AlertCircle, Loader2, Globe } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import translations from '../context/translations';
import logoUrl from '../assets/Logo.png';
import emailjs from '@emailjs/browser';

const EMAILJS_SERVICE_ID  = 'service_sougui';
const EMAILJS_TEMPLATE_ID = 'template_sougui';
const EMAILJS_PUBLIC_KEY  = 'YOUR_PUBLIC_KEY';
const RECIPIENT_EMAIL     = 'raouaabenmehre393@gmail.com';

const LandingPage = ({ onNavigate }) => {
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang } = useLanguage();
  const t = translations[lang];

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const formRef = useRef(null);
  const [contact, setContact] = useState({ nom: '', email: '', message: '' });
  const [contactState, setContactState] = useState('idle');
  const [contactError, setContactError] = useState('');

  // Restaurer position de scroll au rechargement
  useEffect(() => {
    const savedSection = sessionStorage.getItem('sougui_section');
    if (savedSection) {
      setTimeout(() => {
        document.getElementById(savedSection)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, []);

  // Sauvegarder la section visible lors du scroll
  useEffect(() => {
    const sections = ['hero', 'about', 'features', 'tech', 'contact'];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            sessionStorage.setItem('sougui_section', entry.target.id);
          }
        });
      },
      { threshold: 0.4 }
    );
    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleContact = async (e) => {
    e.preventDefault();
    if (!contact.nom.trim() || !contact.email.trim() || !contact.message.trim()) {
      setContactError(t.contact_fill_all);
      return;
    }
    setContactState('loading');
    setContactError('');
    try {
      if (EMAILJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY') {
        const subject = encodeURIComponent(`[Sougui] Message de ${contact.nom}`);
        const body    = encodeURIComponent(`Nom: ${contact.nom}\nEmail: ${contact.email}\n\n${contact.message}`);
        window.open(`mailto:${RECIPIENT_EMAIL}?subject=${subject}&body=${body}`);
        setContactState('success');
        setContact({ nom: '', email: '', message: '' });
        return;
      }
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID,
        { from_name: contact.nom, from_email: contact.email, message: contact.message, to_email: RECIPIENT_EMAIL, reply_to: contact.email },
        EMAILJS_PUBLIC_KEY
      );
      setContactState('success');
      setContact({ nom: '', email: '', message: '' });
      setTimeout(() => setContactState('idle'), 5000);
    } catch (err) {
      setContactError(t.contact_error + RECIPIENT_EMAIL);
      setContactState('error');
    }
  };

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    sessionStorage.setItem('sougui_section', id);
    setMenuOpen(false);
  };

  const features = [
    {
      role: t.feat_ceo_role, icon: '👑', color: 'var(--blue)', colorBg: 'rgba(30,90,255,0.08)',
      title: t.feat_ceo_title, desc: t.feat_ceo_desc,
      items: [t.feat_ceo_i1, t.feat_ceo_i2, t.feat_ceo_i3, t.feat_ceo_i4],
    },
    {
      role: t.feat_mkt_role, icon: '📊', color: '#7c3aed', colorBg: 'rgba(124,58,237,0.08)',
      title: t.feat_mkt_title, desc: t.feat_mkt_desc,
      items: [t.feat_mkt_i1, t.feat_mkt_i2, t.feat_mkt_i3, t.feat_mkt_i4],
    },
    {
      role: t.feat_com_role, icon: '💼', color: '#059669', colorBg: 'rgba(5,150,105,0.08)',
      title: t.feat_com_title, desc: t.feat_com_desc,
      items: [t.feat_com_i1, t.feat_com_i2, t.feat_com_i3, t.feat_com_i4],
    },
  ];

  const stats = [
    { value: '442+', label: t.stat_transactions },
    { value: '5',    label: t.stat_analyses },
    { value: '77%',  label: t.stat_revenue },
    { value: '3',    label: t.stat_roles },
  ];

  const techStack = [
    { name: t.tech_1_name, label: t.tech_1_label },
    { name: t.tech_2_name, label: t.tech_2_label },
    { name: t.tech_3_name, label: t.tech_3_label },
    { name: t.tech_4_name, label: t.tech_4_label },
    { name: t.tech_5_name, label: t.tech_5_label },
    { name: t.tech_6_name, label: t.tech_6_label },
  ];

  const navLinks = [
    [t.nav_home, 'hero'], [t.nav_about, 'about'],
    [t.nav_features, 'features'], [t.nav_tech, 'tech'], [t.nav_contact, 'contact'],
  ];

  const btnLang = {
    padding: '8px 14px', borderRadius: 10,
    border: '1px solid var(--border)', background: 'none',
    cursor: 'pointer', fontWeight: 700, fontSize: 12,
    color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: 5,
    transition: 'all 0.2s',
  };

  return (
    <div style={{ background: 'var(--bg-page)', color: 'var(--text-primary)', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── NAVBAR ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? (theme === 'dark' ? 'rgba(5,8,15,0.95)' : 'rgba(255,255,255,0.95)') : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
        transition: 'all 0.3s ease', padding: '0 40px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', height: 70 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
            <img src={logoUrl} alt="Sougui" style={{ width: 36, height: 36, objectFit: 'contain' }}
              onError={e => { e.target.style.display = 'none'; }} />
            <span style={{ fontFamily: '"Playfair Display", serif', fontWeight: 900, fontSize: 22, color: 'var(--text-primary)' }}>Sougui</span>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--blue)', marginLeft: 4 }}>BI Suite</span>
          </div>

          <div className="hide-scroll" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {navLinks.map(([label, id]) => (
              <button key={id} onClick={() => scrollTo(id)} className="btn-ghost" style={{ fontWeight: 500 }}>{label}</button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 24 }}>
            <button onClick={toggleLang} style={btnLang}><Globe size={13} />{t.lang_switch}</button>
            <button onClick={toggleTheme} className="btn-ghost" style={{ padding: '8px', borderRadius: '10px', border: '1px solid var(--border)' }}>
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={() => onNavigate('login')} className="btn-outline" style={{ padding: '8px 20px', fontSize: 13 }}>{t.nav_login}</button>
            <button onClick={() => onNavigate('login')} className="btn-primary" style={{ padding: '9px 20px', fontSize: 13 }}>{t.nav_access}</button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section id="hero" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden', paddingTop: 80 }}>
        <div style={{ position: 'absolute', top: '20%', left: '5%', width: 500, height: 500, background: 'radial-gradient(ellipse, rgba(30,90,255,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: 400, height: 400, background: 'radial-gradient(ellipse, rgba(30,90,255,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(30,90,255,0.12) 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: theme === 'dark' ? 0.3 : 0.15, pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px', width: '100%' }}>
          <div style={{ maxWidth: 760 }}>
            <div className="anim-fade-up" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 9999, background: 'rgba(30,90,255,0.1)', border: '1px solid rgba(30,90,255,0.2)', marginBottom: 28 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--blue)', display: 'inline-block' }} />
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--blue)' }}>{t.hero_tag}</span>
            </div>

            <h1 className="anim-fade-up delay-100" style={{ fontFamily: '"Playfair Display", serif', fontSize: 'clamp(42px, 6vw, 80px)', fontWeight: 900, lineHeight: 1.08, letterSpacing: '-2px', marginBottom: 24, color: 'var(--text-primary)' }}>
              {t.hero_title_1}<br />
              <span className="text-gradient">{t.hero_title_2}</span><br />
              {t.hero_title_3}
            </h1>

            <p className="anim-fade-up delay-200" style={{ fontSize: 18, lineHeight: 1.7, color: 'var(--text-secondary)', maxWidth: 560, marginBottom: 40 }}>
              {t.hero_subtitle}
            </p>

            <div className="anim-fade-up delay-300" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <button onClick={() => onNavigate('login')} className="btn-primary" style={{ fontSize: 15, padding: '14px 32px' }}>{t.hero_start}</button>
              <button onClick={() => scrollTo('features')} className="btn-outline" style={{ fontSize: 15, padding: '14px 32px' }}>{t.hero_features}</button>
            </div>

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

      {/* ── ABOUT ── */}
      <section id="about" style={{ padding: '100px 40px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--blue)', marginBottom: 16 }}>{t.about_tag}</div>
              <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 44, fontWeight: 900, lineHeight: 1.1, marginBottom: 24, color: 'var(--text-primary)' }}>
                {t.about_title_1}<br />{t.about_title_2}
              </h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: 15, marginBottom: 20 }}>
                <strong style={{ color: 'var(--text-primary)' }}>Sougui.tn</strong> {t.about_p1}
              </p>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: 15, marginBottom: 32 }}>{t.about_p2}</p>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {[t.about_pottery, t.about_ceramics, t.about_jewelry, t.about_textile].map(c => (
                  <div key={c} className="badge badge-blue">{c}</div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { icon: '🏺', title: t.about_card1_title, desc: t.about_card1_desc },
                { icon: '🤖', title: t.about_card2_title, desc: t.about_card2_desc },
                { icon: '📈', title: t.about_card3_title, desc: t.about_card3_desc },
                { icon: '🇹🇳', title: t.about_card4_title, desc: t.about_card4_desc },
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

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding: '100px 40px', background: theme === 'dark' ? 'rgba(10,15,30,0.5)' : 'rgba(240,244,255,0.5)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--blue)', marginBottom: 16 }}>{t.features_tag}</div>
            <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 44, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 16 }}>{t.features_title}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 16, maxWidth: 540, margin: '0 auto', lineHeight: 1.7 }}>{t.features_subtitle}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {features.map((f, i) => (
              <div key={f.role} className="s-card anim-fade-up" style={{ padding: 32, animationDelay: `${i * 0.1}s`, borderColor: f.color + '33' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 16, background: f.colorBg, marginBottom: 20, fontSize: 28 }}>{f.icon}</div>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: f.color, marginBottom: 8 }}>{f.role}</div>
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

      {/* ── TECH ── */}
      <section id="tech" style={{ padding: '100px 40px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--blue)', marginBottom: 16 }}>{t.tech_tag}</div>
          <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 44, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 16 }}>{t.tech_title}</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 56, fontSize: 15 }}>{t.tech_subtitle}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, maxWidth: 800, margin: '0 auto' }}>
            {techStack.map(tech => (
              <div key={tech.name} className="s-card" style={{ padding: '28px 24px', textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--blue)', marginBottom: 6 }}>{tech.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{tech.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" style={{ padding: '100px 40px', background: theme === 'dark' ? 'rgba(10,15,30,0.5)' : 'rgba(240,244,255,0.5)' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--blue)', marginBottom: 16 }}>{t.contact_tag}</div>
          <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 44, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 16 }}>{t.contact_title}</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 40, fontSize: 15, lineHeight: 1.7 }}>{t.contact_subtitle}</p>

          <div className="s-card" style={{ padding: 40, textAlign: 'left' }}>
            {contactState === 'success' ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <CheckCircle size={56} style={{ color: '#22c55e', margin: '0 auto 16px' }} />
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>{t.contact_success_title}</div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{t.contact_success_sub} <strong>{contact.email || RECIPIENT_EMAIL}</strong> {t.contact_success_sub2}</div>
                <button onClick={() => setContactState('idle')} className="btn-outline" style={{ marginTop: 24, fontSize: 13 }}>{t.contact_send_another}</button>
              </div>
            ) : (
              <form ref={formRef} onSubmit={handleContact} style={{ display: 'grid', gap: 16 }}>
                {[
                  { key: 'nom', label: t.contact_name, type: 'text', ph: t.contact_name_ph },
                  { key: 'email', label: t.contact_email, type: 'email', ph: t.contact_email_ph },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 8 }}>{f.label} *</label>
                    <input type={f.type} placeholder={f.ph} className="s-input" value={contact[f.key]} onChange={e => setContact(p => ({ ...p, [f.key]: e.target.value }))} required />
                  </div>
                ))}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 8 }}>{t.contact_message} *</label>
                  <textarea placeholder={t.contact_msg_ph} className="s-input" rows={4} style={{ resize: 'vertical' }} value={contact.message} onChange={e => setContact(p => ({ ...p, message: e.target.value }))} required />
                </div>
                {contactError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 13 }}>
                    <AlertCircle size={16} />{contactError}
                  </div>
                )}
                <button type="submit" disabled={contactState === 'loading'} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', opacity: contactState === 'loading' ? 0.7 : 1 }}>
                  {contactState === 'loading'
                    ? <><Loader2 size={16} className="anim-spin" style={{ marginRight: 8 }} />{t.contact_sending}</>
                    : <><Send size={16} style={{ marginRight: 8 }} />{t.contact_send}</>}
                </button>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                  {t.contact_or} <a href={`mailto:${RECIPIENT_EMAIL}`} style={{ color: 'var(--blue)', textDecoration: 'none', fontWeight: 600 }}>{RECIPIENT_EMAIL}</a>
                </div>
              </form>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 48, flexWrap: 'wrap' }}>
            {[
              { label: t.contact_c_email, value: 'contact@sougui.tn' },
              { label: t.contact_c_addr, value: 'Tunis, Tunisie' },
              { label: t.contact_c_web, value: 'www.sougui.tn' },
            ].map(c => (
              <div key={c.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{c.label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue)' }}>{c.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: '40px', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={logoUrl} alt="Sougui" style={{ width: 28, height: 28, objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
            <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Sougui.tn</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>— Smart Business Suite</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.footer_copy}</div>
          <button onClick={() => onNavigate('login')} className="btn-primary" style={{ fontSize: 13, padding: '9px 20px' }}>{t.footer_cta}</button>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
