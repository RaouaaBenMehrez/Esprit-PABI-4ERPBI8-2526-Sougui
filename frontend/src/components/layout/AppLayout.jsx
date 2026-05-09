import React from 'react';
import { Sun, Moon, LogOut, Settings } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import FloatingAgent from '../agent/FloatingAgent';
import NotificationBell from '../profile/NotificationBell';
import logoUrl from '../../assets/Logo.png';

const ROLE_CONFIG = {
  ceo:        { label: 'CEO',        color: '#1e5aff', bg: 'rgba(30,90,255,0.1)',  icon: '👑' },
  marketing:  { label: 'Marketing',  color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', icon: '📊' },
  commercial: { label: 'Commercial', color: '#059669', bg: 'rgba(5,150,105,0.1)',  icon: '💼' },
};

const AppLayout = ({ user, activePage, setActivePage, onLogout, navItems, children }) => {
  const { theme, toggleTheme } = useTheme();
  const roleConf = ROLE_CONFIG[user?.role] || ROLE_CONFIG.ceo;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-page)' }}>
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        {/* Logo */}
        <div style={{ padding: '28px 20px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <img src={logoUrl} alt="Sougui" style={{ width: 32, height: 32, objectFit: 'contain' }}
              onError={e => { e.target.style.display = 'none'; }} />
            <div>
              <div style={{ fontFamily: '"Playfair Display", serif', fontWeight: 900, fontSize: 16, color: 'var(--text-primary)', lineHeight: 1 }}>Sougui</div>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)', marginTop: 2 }}>BI Suite</div>
            </div>
          </div>
          {/* User Badge — cliquer pour aller aux paramètres */}
          <div onClick={() => setActivePage('settings')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: roleConf.bg, border: `1px solid ${roleConf.color}33`, cursor: 'pointer', transition: 'opacity 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            title="Paramètres du profil">
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
        <nav style={{ flex: 1, padding: '16px 0', overflowY: 'auto' }}>
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
                    <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 9999, background: item.badge === 'BI' ? 'rgba(249,115,22,0.15)' : 'rgba(30,90,255,0.15)', color: item.badge === 'BI' ? 'var(--orange)' : 'var(--blue)' }}>
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Live indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulseDot 2s infinite' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#22c55e' }}>PostgreSQL · Live</span>
          </div>

          {/* Paramètres */}
          <button onClick={() => setActivePage('settings')}
            className={`sidebar-item ${activePage === 'settings' ? 'active' : ''}`}
            style={{ borderRadius: 10, padding: '8px 12px' }}>
            <Settings size={15} />
            <span style={{ fontSize: 13 }}>Paramètres</span>
          </button>

          {/* Cloche + Thème + Déconnexion */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 0' }}>
              <NotificationBell user={user} />
            </div>
            <button onClick={toggleTheme} className="btn-ghost" style={{ flex: 1, justifyContent: 'center', border: '1px solid var(--border)', borderRadius: 10, padding: '8px' }}>
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button onClick={onLogout} className="btn-ghost" style={{ flex: 1, justifyContent: 'center', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '8px', color: '#ef4444' }}>
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={{ flex: 1, marginLeft: 256, overflow: 'auto', minHeight: '100vh' }}>
        {children}
      </main>

      {/* ── FLOATING AGENT ── */}
      <FloatingAgent user={user} />
    </div>
  );
};

export default AppLayout;
