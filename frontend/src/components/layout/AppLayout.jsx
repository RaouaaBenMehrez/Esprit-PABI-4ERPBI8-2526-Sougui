import React from 'react';
import { Sun, Moon, LogOut, Settings, Globe } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import FloatingAgent from '../agent/FloatingAgent';
import NotificationBell from '../profile/NotificationBell';
import logoUrl from '../../assets/Logo.png';

const ROLE_CONFIG = {
  ceo:        { label: 'CEO',        color: '#1e5aff', bg: 'rgba(30,90,255,0.1)',  icon: '👑' },
  marketing:  { label: 'Marketing',  color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', icon: '📊' },
  commercial: { label: 'Commercial', color: '#059669', bg: 'rgba(5,150,105,0.1)',  icon: '💼' },
};

/* ── Main AppLayout ───────────────────────────────────────────── */
const AppLayout = ({ user, activePage, setActivePage, onLogout, navItems, children }) => {
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang }   = useLanguage();
  const roleConf = ROLE_CONFIG[user?.role] || ROLE_CONFIG.ceo;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-page)' }}>

      {/* ── SIDEBAR ── */}
      <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100vh', position: 'fixed', width: 256, borderRight: '1px solid var(--border)', background: 'var(--bg-card)', zIndex: 100 }}>
        
        {/* Logo */}
        <div data-tour="logo" style={{ padding: '28px 20px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <img src={logoUrl} alt="Sougui" style={{ width: 32, height: 32, objectFit: 'contain' }}
              onError={e => { e.target.style.display = 'none'; }} />
            <div>
              <div style={{ fontFamily: '"Playfair Display", serif', fontWeight: 900, fontSize: 16, color: 'var(--text-primary)', lineHeight: 1 }}>Sougui</div>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)', marginTop: 2 }}>BI Suite</div>
            </div>
          </div>

          {/* User Badge */}
          <div data-tour="user-badge" onClick={() => setActivePage('settings')}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: roleConf.bg, border: `1px solid ${roleConf.color}33`, cursor: 'pointer', transition: 'opacity 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            title={lang === 'fr' ? 'Paramètres du profil' : 'Profile settings'}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: `${roleConf.color}22`, border: `2px solid ${roleConf.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {user?.avatar_url
                ? <img src={user.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 15, fontWeight: 800, color: roleConf.color }}>{(user?.username?.[0] || '?').toUpperCase()}</span>
              }
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: roleConf.color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{roleConf.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{user?.username}</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav data-tour="sidebar-nav" style={{ flex: 1, padding: '16px 0', overflowY: 'auto' }}>
          {navItems.map(section => (
            <div key={section.title} style={{ marginBottom: 8 }}>
              <div style={{ padding: '6px 20px', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)' }}>
                {section.title}
              </div>
              {section.items.map(item => (
                <button key={item.id} onClick={() => setActivePage(item.id)}
                  className={`sidebar-item ${activePage === item.id ? 'active' : ''}`}>
                  <span style={{ fontSize: 16, lineHeight: 1 }}>{item.icon}</span>
                  <span style={{ fontSize: 13 }}>{item.label}</span>
                  {item.badge && (
                    <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 9999, background: item.badge === 'BI' || item.badge === 'PBI' ? 'rgba(249,115,22,0.15)' : 'rgba(30,90,255,0.15)', color: item.badge === 'BI' || item.badge === 'PBI' ? 'var(--orange)' : 'var(--blue)' }}>
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Bottom sidebar */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Live indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulseDot 2s infinite' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#22c55e' }}>PostgreSQL · Live</span>
          </div>

          {/* Settings */}
          <button
            data-tour="settings-btn"
            onClick={() => setActivePage('settings')}
            className={`sidebar-item ${activePage === 'settings' ? 'active' : ''}`}
            style={{ borderRadius: 10, padding: '8px 12px' }}
          >
            <Settings size={15} />
            <span style={{ fontSize: 13 }}>{lang === 'fr' ? 'Paramètres' : 'Settings'}</span>
          </button>

          {/* Sign out */}
          <button
            data-tour="logout-btn"
            onClick={onLogout}
            className="btn-ghost"
            style={{
              width: '100%',
              justifyContent: 'center',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 10,
              padding: '8px',
              color: '#ef4444',
              gap: 8,
              fontSize: 13,
              fontWeight: 600,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <LogOut size={15} />
            <span>{lang === 'fr' ? 'Déconnexion' : 'Sign out'}</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <div style={{ flex: 1, marginLeft: 256, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* ── TOP BAR ── */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 200,
          height: 60,
          background: theme === 'dark' ? 'rgba(5,8,15,0.92)' : 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 32px',
          gap: 12,
        }}>
          {/* Left — breadcrumb / page title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {roleConf.icon} {roleConf.label}
            </span>
            <span style={{ color: 'var(--border)' }}>›</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              {navItems.flatMap(s => s.items).find(i => i.id === activePage)?.label
                || (activePage === 'settings' ? (lang === 'fr' ? 'Paramètres' : 'Settings') : activePage)}
            </span>
          </div>

          {/* Right — actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

            {/* FR / EN toggle */}
            <button
              data-tour="lang-btn"
              onClick={toggleLang}
              title={lang === 'fr' ? 'Switch to English' : 'Passer en Français'}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--bg-card)', cursor: 'pointer',
                fontSize: 11, fontWeight: 800, color: 'var(--blue)',
                letterSpacing: '0.05em', transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}
            >
              <Globe size={13} />
              {lang === 'fr' ? 'EN' : 'FR'}
            </button>

            {/* Dark / Light mode */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? (lang === 'fr' ? 'Mode clair' : 'Light mode') : (lang === 'fr' ? 'Mode sombre' : 'Dark mode')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--bg-card)', cursor: 'pointer',
                fontSize: 11, fontWeight: 700,
                color: theme === 'dark' ? '#f59e0b' : '#6366f1',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}
            >
              {theme === 'dark'
                ? <><Sun size={14} /><span>{lang === 'fr' ? 'Clair' : 'Light'}</span></>
                : <><Moon size={14} /><span>{lang === 'fr' ? 'Sombre' : 'Dark'}</span></>
              }
            </button>

            {/* Notification bell */}
            <NotificationBell user={user} topBar />

            {/* LogOut in top bar */}
            <button data-tour="logout-btn" onClick={onLogout} 
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 8,
                border: '1px solid rgba(239,68,68,0.2)',
                background: 'var(--bg-card)', cursor: 'pointer',
                fontSize: 11, fontWeight: 700,
                color: '#ef4444',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}
              title={lang === 'fr' ? 'Déconnexion' : 'Sign out'}
            >
              <LogOut size={14} />
              <span>{lang === 'fr' ? 'Sortir' : 'Logout'}</span>
            </button>

          </div>
        </header>

        {/* ── MAIN CONTENT ── */}
        <main style={{ flex: 1, overflow: 'auto' }}>
          {children}
        </main>
      </div>

      {/* ── FLOATING AGENT ── */}
      <FloatingAgent user={user} />
    </div>
  );
};

export default AppLayout;
