import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, CheckCheck, Info, AlertTriangle, CheckCircle, Zap } from 'lucide-react';

const API = 'http://127.0.0.1:5000/api';

const TYPE_CONFIG = {
  info:    { icon: Info,          color: '#4d7fff', bg: 'rgba(30,90,255,0.08)',   border: 'rgba(30,90,255,0.2)'  },
  success: { icon: CheckCircle,   color: '#22c55e', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.2)'  },
  warning: { icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)' },
  error:   { icon: Zap,           color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)'  },
};

function timeAgo(isoString) {
  if (!isoString) return '';
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60)    return 'à l\'instant';
  if (diff < 3600)  return `il y a ${Math.floor(diff/60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff/3600)}h`;
  return `il y a ${Math.floor(diff/86400)}j`;
}

const NotificationBell = ({ user }) => {
  const [open, setOpen]       = useState(false);
  const [notifs, setNotifs]   = useState([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  const unread = notifs.filter(n => !n.is_read).length;

  const fetchNotifs = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res  = await fetch(`${API}/notifications?user_id=${user.id}`);
      const data = await res.json();
      setNotifs(Array.isArray(data) ? data : []);
    } catch { setNotifs([]); }
    finally   { setLoading(false); }
  };

  useEffect(() => {
    fetchNotifs();
    const iv = setInterval(fetchNotifs, 30000);
    return () => clearInterval(iv);
  }, [user?.id]); // eslint-disable-line

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (nid) => {
    await fetch(`${API}/notifications/${nid}/read`, { method: 'PUT' });
    setNotifs(prev => prev.map(n => n.id === nid ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    await fetch(`${API}/notifications/read-all`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id }),
    });
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* Bouton cloche */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) fetchNotifs(); }}
        style={{
          position: 'relative', background: 'none', border: 'none',
          cursor: 'pointer', padding: '6px', borderRadius: 8,
          color: 'var(--text-muted)', transition: 'color 0.2s',
          display: 'flex', alignItems: 'center',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        title="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0,
            width: 16, height: 16, borderRadius: '50%',
            background: '#ef4444', color: '#fff',
            fontSize: 9, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--bg-page)',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* ── Panel — s'ouvre VERS LE HAUT ── */}
      {open && (
        <div style={{
          position: 'fixed',
          left: 264,           /* juste à droite de la sidebar (256px + 8px) */
          bottom: 16,          /* aligné avec le bas de la sidebar */
          width: 380,
          maxHeight: '70vh',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          boxShadow: '0 -8px 40px rgba(0,0,0,0.45), 0 4px 20px rgba(0,0,0,0.2)',
          zIndex: 99999,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={15} style={{ color: 'var(--blue)' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                Notifications
              </span>
              {unread > 0 && (
                <span style={{
                  padding: '1px 7px', borderRadius: 9999,
                  background: 'rgba(239,68,68,0.12)', color: '#ef4444',
                  fontSize: 10, fontWeight: 700,
                }}>
                  {unread} non lue{unread > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {unread > 0 && (
                <button onClick={markAllRead} title="Tout marquer comme lu"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--blue)', padding: 4, borderRadius: 6, display: 'flex' }}>
                  <CheckCheck size={14} />
                </button>
              )}
              <button onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, display: 'flex' }}>
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Liste scrollable */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading && notifs.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                Chargement...
              </div>
            )}
            {!loading && notifs.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center' }}>
                <Bell size={32} style={{ color: 'var(--text-muted)', opacity: 0.3, margin: '0 auto 8px', display: 'block' }} />
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Aucune notification</p>
              </div>
            )}
            {notifs.map(n => {
              const cfg  = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
              const Icon = cfg.icon;
              return (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markRead(n.id)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border)',
                    background: n.is_read ? 'transparent' : cfg.bg,
                    cursor: n.is_read ? 'default' : 'pointer',
                    transition: 'background 0.2s',
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                  }}
                  onMouseEnter={e => { if (!n.is_read) e.currentTarget.style.filter = 'brightness(1.15)'; }}
                  onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: cfg.bg, border: `1px solid ${cfg.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={15} style={{ color: cfg.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{
                        fontSize: 12, fontWeight: n.is_read ? 500 : 700,
                        color: 'var(--text-primary)', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {n.title}
                      </span>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }}>
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                      {n.message}
                    </p>
                    {!n.is_read && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        marginTop: 4, fontSize: 9, color: cfg.color, fontWeight: 600,
                      }}>
                        <Check size={9} /> Cliquer pour marquer comme lu
                      </span>
                    )}
                  </div>
                  {!n.is_read && (
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.color, flexShrink: 0, marginTop: 4 }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
