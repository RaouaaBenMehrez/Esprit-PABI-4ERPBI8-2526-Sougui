import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, CheckCheck, Info, AlertTriangle, CheckCircle, Zap, Clock, ArrowRight } from 'lucide-react';

const API = 'http://127.0.0.1:5000/api';

const TYPE_CONFIG = {
  info:    { icon: Info,          color: '#4d7fff', bg: 'rgba(30,90,255,0.08)',   border: 'rgba(30,90,255,0.2)',  label: 'Information' },
  success: { icon: CheckCircle,   color: '#22c55e', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.2)',  label: 'Succès' },
  warning: { icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)', label: 'Avertissement' },
  error:   { icon: Zap,           color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',  label: 'Alerte' },
};

function timeAgo(isoString) {
  if (!isoString) return '';
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60)    return 'à l\'instant';
  if (diff < 3600)  return `il y a ${Math.floor(diff/60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff/3600)}h`;
  return `il y a ${Math.floor(diff/86400)}j`;
}

function formatDate(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/* ── Notification Detail Modal ── */
const NotifDetailModal = ({ notif, onClose, onMarkRead }) => {
  if (!notif) return null;
  const cfg  = TYPE_CONFIG[notif.type] || TYPE_CONFIG.info;
  const Icon = cfg.icon;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999999,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }} onClick={onClose}>
      <div
        style={{
          width: '100%', maxWidth: 520,
          background: 'var(--bg-card)', borderRadius: 20,
          border: '1px solid var(--border)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header coloré */}
        <div style={{ padding: '24px 24px 20px', background: cfg.bg, borderBottom: `1px solid ${cfg.border}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                background: cfg.bg, border: `1.5px solid ${cfg.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={22} style={{ color: cfg.color }} />
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: cfg.color, marginBottom: 4 }}>
                  {cfg.label}
                </div>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3, margin: 0 }}>
                  {notif.title}
                </h2>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 8, flexShrink: 0, display: 'flex' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Contenu */}
        <div style={{ padding: '24px' }}>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 24 }}>
            {notif.message}
          </p>

          {/* Méta-données */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px', borderRadius: 12, background: 'var(--bg-hover)', border: '1px solid var(--border)', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
              <Clock size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Reçue :</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{formatDate(notif.created_at)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
              <div style={{ width: 13, height: 13, borderRadius: '50%', background: notif.is_read ? '#22c55e' : cfg.color, flexShrink: 0 }} />
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Statut :</span>
              <span style={{ color: notif.is_read ? '#22c55e' : cfg.color, fontWeight: 700 }}>
                {notif.is_read ? '✓ Lue' : '● Non lue'}
              </span>
            </div>
            {notif.type && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                <Icon size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Type :</span>
                <span style={{ padding: '1px 8px', borderRadius: 9999, background: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: 11 }}>{cfg.label}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            {!notif.is_read && (
              <button
                onClick={() => { onMarkRead(notif.id); onClose(); }}
                className="btn-primary"
                style={{ flex: 1, justifyContent: 'center', padding: '10px', fontSize: 13 }}
              >
                <Check size={14} /> Marquer comme lue
              </button>
            )}
            <button onClick={onClose} className="btn-outline" style={{ flex: 1, justifyContent: 'center', padding: '10px', fontSize: 13 }}>
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══ NOTIFICATION BELL ══════════════════════════════════════════════ */
const NotificationBell = ({ user, topBar = false }) => {
  const [open, setOpen]         = useState(false);
  const [notifs, setNotifs]     = useState([]);
  const [loading, setLoading]   = useState(false);
  const [selected, setSelected] = useState(null); // détail modal
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
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id }),
    });
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  /* Panel style selon position (topBar = depuis header, sinon depuis sidebar) */
  const panelStyle = topBar
    ? {
        position: 'fixed',
        top: 64,          // juste sous la TopBar (60px + 4px)
        right: 16,
        width: 400,
        maxHeight: '75vh',
      }
    : {
        position: 'fixed',
        left: 264,
        bottom: 16,
        width: 380,
        maxHeight: '70vh',
      };

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* ── Bell button ── */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) fetchNotifs(); }}
        style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', gap: topBar ? 6 : 0,
          padding: topBar ? '6px 12px' : '6px',
          borderRadius: 8,
          border: topBar ? '1px solid var(--border)' : 'none',
          background: topBar ? 'var(--bg-card)' : 'none',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          transition: 'all 0.2s',
          fontWeight: 600, fontSize: 11,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = topBar ? 'var(--bg-card)' : 'none'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        title="Notifications"
      >
        <Bell size={topBar ? 15 : 18} />
        {topBar && <span>{unread > 0 ? `${unread} notif` : 'Notifications'}</span>}
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: topBar ? 2 : 0, right: topBar ? 2 : 0,
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

      {/* ── Panel ── */}
      {open && (
        <div style={{
          ...panelStyle,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          boxShadow: '0 16px 60px rgba(0,0,0,0.35)',
          zIndex: 99999,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={15} style={{ color: 'var(--blue)' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Notifications</span>
              {unread > 0 && (
                <span style={{ padding: '1px 7px', borderRadius: 9999, background: 'rgba(239,68,68,0.12)', color: '#ef4444', fontSize: 10, fontWeight: 700 }}>
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

          {/* Liste */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading && notifs.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Chargement...</div>
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
                  style={{
                    padding: '12px 16px', borderBottom: '1px solid var(--border)',
                    background: n.is_read ? 'transparent' : cfg.bg,
                    cursor: 'pointer', transition: 'background 0.2s',
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                  }}
                  onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
                  onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                  onClick={() => {
                    if (!n.is_read) markRead(n.id);
                    setSelected(n);
                    setOpen(false);
                  }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={15} style={{ color: cfg.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: n.is_read ? 500 : 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {n.title}
                      </span>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }}>{timeAgo(n.created_at)}</span>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {n.message}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5, fontSize: 10, color: cfg.color, fontWeight: 600 }}>
                      <ArrowRight size={10} /> Cliquer pour voir les détails
                    </div>
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

      {/* ── Detail Modal ── */}
      {selected && (
        <NotifDetailModal
          notif={selected}
          onClose={() => setSelected(null)}
          onMarkRead={markRead}
        />
      )}
    </div>
  );
};

export default NotificationBell;
