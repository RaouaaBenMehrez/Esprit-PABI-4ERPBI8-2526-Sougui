import React, { useState, useEffect } from 'react';
import { User, Lock, Users, Shield, BarChart2, Mail, Eye, EyeOff, Trash2, Plus, Save, TestTube, Camera, Compass } from 'lucide-react';
import FaceLoginModal from '../auth/FaceLoginModal';

const API = 'http://127.0.0.1:5000/api';

const ROLE_LABELS = { ceo: '👑 CEO', admin: '👑 Admin', marketing: '📊 Marketing', commercial: '💼 Commercial' };
const ROLE_COLORS = { ceo: '#1e5aff', admin: '#1e5aff', marketing: '#7c3aed', commercial: '#059669' };

const Section = ({ title, children }) => (
  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, marginBottom: 20 }}>
    <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>{title}</h3>
    {children}
  </div>
);

const Input = ({ label, ...props }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 6 }}>{label}</label>}
    <input className="s-input" {...props} />
  </div>
);

const Btn = ({ children, onClick, variant = 'primary', disabled, style = {} }) => (
  <button onClick={onClick} disabled={disabled} className={variant === 'primary' ? 'btn-primary' : 'btn-ghost'}
    style={{ padding: '10px 20px', fontSize: 13, opacity: disabled ? 0.5 : 1, ...style }}>
    {children}
  </button>
);

// ── Onglet Profil ─────────────────────────────────────────────────────────────
const TabProfile = ({ user }) => {
  const [email, setEmail]   = useState('');
  const [avatar, setAvatar] = useState('');
  const [msg, setMsg]       = useState('');
  const fileRef             = React.useRef(null);

  useEffect(() => {
    fetch(`${API}/profile/${user.id}`).then(r => r.json()).then(d => {
      setEmail(d.email || '');
      setAvatar(d.avatar_url || '');
    }).catch(() => {});
  }, [user.id]);

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2_000_000) { setMsg('⚠ Image trop lourde (max 2 MB)'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setAvatar(ev.target.result);
    reader.readAsDataURL(file);
  };

  const save = async () => {
    const [r1, r2] = await Promise.all([
      fetch(`${API}/profile/update`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, email }) }),
      avatar
        ? fetch(`${API}/profile/avatar`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, avatar }) })
        : Promise.resolve({ ok: true }),
    ]);
    const d1 = await r1.json();
    setMsg(d1.success ? '✓ Profil mis à jour' : '✗ Erreur');
    setTimeout(() => setMsg(''), 3000);
  };

  return (
    <Section title="👤 Informations personnelles">
      {/* Avatar */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 24 }}>
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            width: 80, height: 80, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
            background: avatar ? 'transparent' : `${ROLE_COLORS[user.role] || '#1e5aff'}22`,
            border: `3px solid ${ROLE_COLORS[user.role] || '#1e5aff'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', position: 'relative',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          title="Cliquer pour changer la photo"
        >
          {avatar
            ? <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 28, fontWeight: 800, color: ROLE_COLORS[user.role] || '#1e5aff' }}>{user.username?.[0]?.toUpperCase()}</span>
          }
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: 0, transition: 'opacity 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0'}
          >
            <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>📷 Modifier</span>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
        <div>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)' }}>{user.username}</div>
          <div style={{ fontSize: 13, color: ROLE_COLORS[user.role] || '#1e5aff', fontWeight: 600, marginBottom: 8 }}>{ROLE_LABELS[user.role] || user.role}</div>
          <button onClick={() => fileRef.current?.click()}
            style={{ fontSize: 11, padding: '5px 12px', borderRadius: 8, background: 'var(--bg-hover)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            📷 Changer la photo
          </button>
          {avatar && (
            <button onClick={() => setAvatar('')}
              style={{ fontSize: 11, padding: '5px 12px', borderRadius: 8, background: 'none', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer', color: '#ef4444', marginLeft: 8 }}>
              ✕ Supprimer
            </button>
          )}
        </div>
      </div>
      <Input label="Nom d'utilisateur" value={user.username} disabled />
      <Input label="Email Gmail (pour notifications)" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@gmail.com" />
      {msg && <p style={{ fontSize: 12, color: msg.startsWith('✓') ? '#22c55e' : '#ef4444', marginBottom: 12 }}>{msg}</p>}
      <Btn onClick={save}><Save size={14} style={{ marginRight: 6 }} />Enregistrer le profil</Btn>
    </Section>
  );
};


// ── Onglet Sécurité ───────────────────────────────────────────────────────────
const TabSecurity = ({ user }) => {
  const [old_pw, setOld]   = useState('');
  const [new_pw, setNew]   = useState('');
  const [show, setShow]    = useState(false);
  const [msg, setMsg]      = useState('');
  const [faceModal, setFaceModal] = useState(null);

  const changePw = async () => {
    if (!old_pw || !new_pw) { setMsg('⚠ Remplissez tous les champs'); return; }
    const res  = await fetch(`${API}/profile/password`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, old_password: old_pw, new_password: new_pw }) });
    const data = await res.json();
    setMsg(data.success ? '✓ Mot de passe modifié avec succès' : `✗ ${data.message}`);
    if (data.success) { setOld(''); setNew(''); }
    setTimeout(() => setMsg(''), 4000);
  };

  return (
    <>
      <Section title="🔒 Changer le mot de passe">
        <Input label="Ancien mot de passe" type={show ? 'text' : 'password'} value={old_pw} onChange={e => setOld(e.target.value)} placeholder="••••••••" />
        <div style={{ position: 'relative' }}>
          <Input label="Nouveau mot de passe" type={show ? 'text' : 'password'} value={new_pw} onChange={e => setNew(e.target.value)} placeholder="••••••••" />
          <button type="button" onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: 12, top: 36, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        {msg && <p style={{ fontSize: 12, color: msg.startsWith('✓') ? '#22c55e' : '#ef4444', marginBottom: 12 }}>{msg}</p>}
        <Btn onClick={changePw}><Lock size={14} style={{ marginRight: 6 }} />Modifier le mot de passe</Btn>
      </Section>
      <Section title="📷 Reconnaissance faciale">
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>Enregistrez ou mettez à jour votre empreinte faciale pour vous connecter sans mot de passe.</p>
        <Btn onClick={() => setFaceModal({ mode: 'enroll', username: user.username, password: old_pw || '' })}>
          <Camera size={14} style={{ marginRight: 6 }} />Mettre à jour mon visage
        </Btn>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>⚠ Vous devrez saisir votre mot de passe dans la fenêtre suivante.</p>
      </Section>
      {faceModal && (
        <FaceLoginModal mode="enroll" enrollData={{ username: faceModal.username, password: faceModal.password }}
          onSuccess={() => setFaceModal(null)} onClose={() => setFaceModal(null)} />
      )}
    </>
  );
};

// ── Onglet Utilisateurs (Admin/CEO) ──────────────────────────────────────────
const AvatarCircle = ({ u, size = 36 }) => {
  const rc = ROLE_COLORS[u.role] || '#1e5aff';
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: `${rc}22`, border: `2px solid ${rc}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {u.avatar_url
        ? <img src={u.avatar_url} alt={u.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: size * 0.38, fontWeight: 800, color: rc }}>{(u.username?.[0] || '?').toUpperCase()}</span>
      }
    </div>
  );
};

const TabUsers = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [form, setForm]   = useState({ username: '', password: '', role: 'commercial', email: '' });
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg]     = useState('');

  const load = () => fetch(`${API}/users/list`).then(r => r.json()).then(setUsers).catch(() => {});
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.username || !form.password) { setMsg('⚠ Username et mot de passe requis'); return; }
    const res = await fetch(`${API}/users`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const d = await res.json();
    setMsg(d.success ? '✓ Utilisateur créé avec succès' : `✗ ${d.message}`);
    if (d.success) { setForm({ username: '', password: '', role: 'commercial', email: '' }); setShowForm(false); load(); }
    setTimeout(() => setMsg(''), 3000);
  };

  const del = async (uid, uname) => {
    if (!window.confirm(`Supprimer «${uname}» ?`)) return;
    await fetch(`${API}/users/${uid}`, { method: 'DELETE' });
    load();
  };

  const changeRole = async (uid, newRole) => {
    await fetch(`${API}/users/${uid}/role`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: newRole, changed_by: user.username }) });
    load();
    setMsg('✓ Rôle modifié · Notification envoyée');
    setTimeout(() => setMsg(''), 3000);
  };

  return (
    <div>
      {/* Header stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total', value: users.length, color: '#1e5aff', icon: '👥' },
          { label: 'Admins/CEO', value: users.filter(u => ['ceo','admin'].includes(u.role)).length, color: '#1e5aff', icon: '👑' },
          { label: 'Autres', value: users.filter(u => !['ceo','admin'].includes(u.role)).length, color: '#059669', icon: '🧑‍💼' },
        ].map(s => (
          <div key={s.label} style={{ padding: '14px 18px', borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <Section title="👥 Utilisateurs de la plateforme">
        {msg && <div style={{ padding: '10px 14px', borderRadius: 10, background: msg.startsWith('✓') ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${msg.startsWith('✓') ? '#22c55e' : '#ef4444'}33`, color: msg.startsWith('✓') ? '#22c55e' : '#ef4444', fontSize: 12, marginBottom: 14 }}>{msg}</div>}

        <div style={{ overflowX: 'auto', marginBottom: 16 }}>
          <table className="s-table">
            <thead><tr><th>Utilisateur</th><th>Email</th><th>Rôle</th><th>Créé le</th><th style={{ textAlign: 'center' }}>Actions</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <AvatarCircle u={u} size={32} />
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>{u.username}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>ID #{u.id}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{u.email || '—'}</td>
                  <td>
                    <select value={u.role} disabled={u.id === user.id}
                      onChange={e => changeRole(u.id, e.target.value)}
                      style={{ background: 'var(--bg-hover)', border: `1px solid ${ROLE_COLORS[u.role] || '#1e5aff'}44`, borderRadius: 8, padding: '4px 8px', fontSize: 11, fontWeight: 700, color: ROLE_COLORS[u.role] || '#1e5aff', cursor: u.id === user.id ? 'not-allowed' : 'pointer' }}>
                      <option value="ceo">👑 CEO</option>
                      <option value="admin">👑 Admin</option>
                      <option value="marketing">📊 Marketing</option>
                      <option value="commercial">💼 Commercial</option>
                    </select>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '—'}</td>
                  <td style={{ textAlign: 'center' }}>
                    {u.id !== user.id && (
                      <button onClick={() => del(u.id, u.username)} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, cursor: 'pointer', color: '#ef4444', padding: '4px 8px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Trash2 size={12} /> Supprimer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Btn onClick={() => setShowForm(s => !s)} variant="ghost">
          <Plus size={14} style={{ marginRight: 6 }} />{showForm ? 'Annuler' : 'Ajouter un utilisateur'}
        </Btn>

        {showForm && (
          <div style={{ marginTop: 16, padding: 20, background: 'var(--bg-hover)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="Nom d'utilisateur" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="username" />
              <Input label="Mot de passe" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
              <Input label="Email Gmail" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="user@gmail.com" />
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 6 }}>Rôle</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="s-input">
                  <option value="ceo">👑 CEO</option>
                  <option value="admin">👑 Admin</option>
                  <option value="marketing">📊 Marketing</option>
                  <option value="commercial">💼 Commercial</option>
                </select>
              </div>
            </div>
            <Btn onClick={create}><Plus size={14} style={{ marginRight: 6 }} />Créer l'utilisateur</Btn>
          </div>
        )}
      </Section>
    </div>
  );
};

// ── Onglet Permissions granulaires ────────────────────────────────────────────
const ALL_PERMS = [
  { key: 'dashboard',   label: 'Dashboard principal',  icon: '📊', desc: 'Accès aux KPIs et graphiques' },
  { key: 'powerbi',     label: 'Rapports Power BI',    icon: '📈', desc: 'Intégration Power BI' },
  { key: 'predictions', label: 'Prédictions IA',       icon: '🤖', desc: 'Modèles ML (Prophet, RF, XGBoost)' },
  { key: 'agent',       label: 'Agent IA',             icon: '💬', desc: 'Chatbot Sales & Marketing' },
  { key: 'clients',     label: 'Données clients',      icon: '🤝', desc: 'Vue portefeuille clients B2B' },
  { key: 'sales',       label: 'Transactions',         icon: '💰', desc: 'Historique des ventes' },
  { key: 'reports',     label: 'Rapports & Export',    icon: '📋', desc: 'Export CSV/Excel' },
  { key: 'settings',    label: 'Paramètres profil',    icon: '⚙',  desc: 'Accès aux paramètres du compte' },
];

const Toggle = ({ on, onToggle }) => (
  <div onClick={onToggle} style={{
    width: 42, height: 22, borderRadius: 11, cursor: 'pointer', flexShrink: 0,
    background: on ? 'linear-gradient(90deg,#1e5aff,#3b82f6)' : 'var(--bg-hover)',
    border: `1px solid ${on ? '#1e5aff' : 'var(--border)'}`,
    position: 'relative', transition: 'all 0.25s',
  }}>
    <div style={{
      position: 'absolute', top: 2, left: on ? 22 : 2,
      width: 16, height: 16, borderRadius: '50%',
      background: on ? '#fff' : 'var(--text-muted)',
      transition: 'left 0.25s', boxShadow: on ? '0 0 6px rgba(30,90,255,0.5)' : 'none',
    }} />
  </div>
);

const TabPermissions = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [perms, setPerms] = useState({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch(`${API}/users/list`).then(r => r.json()).then(list => {
      const others = list.filter(u => u.id !== user.id);
      setUsers(others);
      if (others.length > 0) pick(others[0]);
    }).catch(() => {});
  }, []); // eslint-disable-line

  const pick = (u) => {
    setSelected(u);
    const base = ALL_PERMS.reduce((acc, p) => ({ ...acc, [p.key]: true }), {});
    setPerms({ ...base, ...(u.permissions || {}) });
  };

  const toggle = (key) => setPerms(prev => ({ ...prev, [key]: !prev[key] }));

  const save = async () => {
    if (!selected) return;
    const res = await fetch(`${API}/users/${selected.id}/permissions`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissions: perms }),
    });
    const d = await res.json();
    setMsg(d.success ? '✓ Permissions sauvegardées · Notification envoyée' : '✗ Erreur');
    setTimeout(() => setMsg(''), 4000);
  };

  return (
    <div>
      <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(30,90,255,0.06)', border: '1px solid rgba(30,90,255,0.15)', fontSize: 12, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
        <strong style={{ color: '#1e5aff' }}>🎯 Contrôle granulaire des accès</strong> — Activez ou désactivez chaque fonctionnalité individuellement pour chaque utilisateur. Une notification sera envoyée à l'utilisateur.
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* Liste users */}
        <div style={{ width: 180, flexShrink: 0 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Sélectionner</div>
            {users.map(u => {
              const active = selected?.id === u.id;
              const rc = ROLE_COLORS[u.role] || '#1e5aff';
              return (
                <div key={u.id} onClick={() => pick(u)} style={{ padding: '10px 14px', cursor: 'pointer', background: active ? `${rc}10` : 'none', borderLeft: active ? `3px solid ${rc}` : '3px solid transparent', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.15s' }}>
                  <AvatarCircle u={u} size={28} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: 'var(--text-primary)' }}>{u.username}</div>
                    <div style={{ fontSize: 9, color: rc, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{u.role}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Toggles */}
        <div style={{ flex: 1 }}>
          {selected ? (
            <Section title={`🔐 Permissions de ${selected.username}`}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                {ALL_PERMS.map(p => (
                  <div key={p.key} style={{ padding: '12px 16px', borderRadius: 12, background: perms[p.key] ? 'rgba(30,90,255,0.05)' : 'var(--bg-hover)', border: `1px solid ${perms[p.key] ? 'rgba(30,90,255,0.2)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.2s' }}>
                    <span style={{ fontSize: 20 }}>{p.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: perms[p.key] ? 'var(--text-primary)' : 'var(--text-muted)' }}>{p.label}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.desc}</div>
                    </div>
                    <Toggle on={!!perms[p.key]} onToggle={() => toggle(p.key)} />
                  </div>
                ))}
              </div>
              {msg && <div style={{ padding: '10px 14px', borderRadius: 10, background: msg.startsWith('✓') ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', color: msg.startsWith('✓') ? '#22c55e' : '#ef4444', fontSize: 12, marginBottom: 12 }}>{msg}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <Btn onClick={save}><Save size={14} style={{ marginRight: 6 }} />Sauvegarder les permissions</Btn>
                <Btn variant="ghost" onClick={() => { const base = ALL_PERMS.reduce((a,p) => ({ ...a, [p.key]: true }), {}); setPerms(base); }}>Tout activer</Btn>
                <Btn variant="ghost" onClick={() => { const base = ALL_PERMS.reduce((a,p) => ({ ...a, [p.key]: false }), {}); setPerms(base); }}>Tout désactiver</Btn>
              </div>
            </Section>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <Shield size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
              <p>Sélectionnez un utilisateur</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};



// ── Onglet Dashboards BI (CEO) ────────────────────────────────────────────────
const TabDashboards = () => {
  const PBI_DEFAULT = 'https://app.powerbi.com/reportEmbed?reportId=fa5fa437-6265-43ec-a047-a6802e6f49c4&autoAuth=true&ctid=604f1a96-cbe8-43f8-abbf-f8eaf5d85730';
  const [urls, setUrls]  = useState({ pbi_ceo: PBI_DEFAULT, pbi_marketing: '', pbi_commercial: '' });
  const [msg, setMsg]    = useState('');

  useEffect(() => {
    fetch(`${API}/settings`).then(r => r.json()).then(cfg => {
      setUrls(prev => ({ ...prev, ...{ pbi_ceo: cfg.pbi_ceo || prev.pbi_ceo, pbi_marketing: cfg.pbi_marketing || prev.pbi_marketing, pbi_commercial: cfg.pbi_commercial || prev.pbi_commercial } }));
    }).catch(() => {});
  }, []);

  const save = async () => {
    const res = await fetch(`${API}/settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(urls) });
    const data = await res.json();
    setMsg(data.success ? '✓ URLs Power BI sauvegardées' : '✗ Erreur');
    setTimeout(() => setMsg(''), 3000);
  };

  return (
    <Section title="📊 URLs Power BI par rôle">
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>Modifiez les URLs d'intégration Power BI pour chaque rôle. Copiez l'URL depuis Power BI → Fichier → Publier → Intégrer.</p>
      {[['pbi_ceo', '👑 CEO'], ['pbi_marketing', '📊 Marketing'], ['pbi_commercial', '💼 Commercial']].map(([key, label]) => (
        <div key={key} style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 6 }}>{label}</label>
          <input className="s-input" value={urls[key]} onChange={e => setUrls(prev => ({ ...prev, [key]: e.target.value }))} placeholder="https://app.powerbi.com/reportEmbed?..." style={{ fontFamily: 'monospace', fontSize: 11 }} />
        </div>
      ))}
      {msg && <p style={{ fontSize: 12, color: msg.startsWith('✓') ? '#22c55e' : '#ef4444', marginBottom: 12 }}>{msg}</p>}
      <Btn onClick={save}><Save size={14} style={{ marginRight: 6 }} />Sauvegarder les URLs</Btn>
    </Section>
  );
};

// ── Onglet Email (CEO) ────────────────────────────────────────────────────────
const TabEmail = ({ user }) => {
  const [cfg, setCfg]     = useState({ gmail_sender: '', gmail_password: '' });
  const [testTo, setTestTo] = useState('');
  const [msg, setMsg]     = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetch(`${API}/settings`).then(r => r.json()).then(s => {
      setCfg({ gmail_sender: s.gmail_sender || '', gmail_password: s.gmail_password || '' });
    }).catch(() => {});
  }, []);

  const save = async () => {
    const res = await fetch(`${API}/settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg) });
    const data = await res.json();
    setMsg(data.success ? '✓ Config Gmail sauvegardée' : '✗ Erreur');
    setTimeout(() => setMsg(''), 3000);
  };

  const sendTest = async () => {
    setTesting(true);
    const res = await fetch(`${API}/settings/test-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: testTo }) });
    const data = await res.json();
    setMsg(data.success ? '✓ Email test envoyé !' : `✗ ${data.message}`);
    setTesting(false);
    setTimeout(() => setMsg(''), 5000);
  };

  return (
    <Section title="📧 Configuration Gmail SMTP">
      <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(30,90,255,0.06)', border: '1px solid rgba(30,90,255,0.15)', fontSize: 12, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.7 }}>
        <strong style={{ color: 'var(--blue)' }}>Comment obtenir un App Password Gmail :</strong><br />
        1. Allez sur <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}>myaccount.google.com/security</a><br />
        2. Activez la validation en 2 étapes<br />
        3. Cherchez «Mots de passe d'application» → créez-en un<br />
        4. Copiez le mot de passe à 16 caractères ci-dessous
      </div>
      <Input label="Email Gmail expéditeur" type="email" value={cfg.gmail_sender} onChange={e => setCfg(c => ({ ...c, gmail_sender: e.target.value }))} placeholder="sougui.notifications@gmail.com" />
      <Input label="App Password Gmail (16 caractères)" type="password" value={cfg.gmail_password} onChange={e => setCfg(c => ({ ...c, gmail_password: e.target.value }))} placeholder="xxxx xxxx xxxx xxxx" />
      {msg && <div style={{ padding: '10px 14px', borderRadius: 10, background: msg.startsWith('✓') ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', color: msg.startsWith('✓') ? '#22c55e' : '#ef4444', fontSize: 12, marginBottom: 12 }}>{msg}</div>}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Btn onClick={save}><Save size={14} style={{ marginRight: 6 }} />Sauvegarder</Btn>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flex: 1 }}>
          <div style={{ flex: 1 }}>
            <Input label="Email de test" type="email" value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="destinataire@gmail.com" />
          </div>
          <Btn onClick={sendTest} disabled={testing || !testTo} variant="ghost" style={{ marginBottom: 16 }}>
            <TestTube size={14} style={{ marginRight: 6 }} />{testing ? 'Envoi...' : 'Tester'}
          </Btn>
        </div>
      </div>
    </Section>
  );
};


const TABS_ADMIN = [
  { id: 'profile',     label: 'Profil',          icon: User },
  { id: 'security',   label: 'Sécurité',         icon: Lock },
  { id: 'users',      label: 'Utilisateurs',     icon: Users },
  { id: 'permissions',label: 'Rôles & Accès',    icon: Shield },
  { id: 'dashboards', label: 'Dashboards BI',    icon: BarChart2 },
  { id: 'email',      label: 'Email SMTP',       icon: Mail },
];
const TABS_OTHER = [
  { id: 'profile',  label: 'Profil',   icon: User },
  { id: 'security', label: 'Sécurité', icon: Lock },
];

const ProfileSettings = ({ user, onUpdateUser }) => {
  const isAdmin = ['ceo','admin'].includes(user?.role);
  const tabs    = isAdmin ? TABS_ADMIN : TABS_OTHER;
  const [tab, setTab] = useState('profile');
  const rc = ROLE_COLORS[user?.role] || '#1e5aff';

  return (
    <div className="anim-fade-up">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 14px', borderRadius: 9999, background: `${rc}12`, border: `1px solid ${rc}30`, marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: rc }}>
            ⚙ Paramètres
          </span>
        </div>
        <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 34, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 6 }}>
          Mon <span style={{ color: rc }}>Profil</span>
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {isAdmin ? '👑 Administration complète · Contrôle total des accès' : 'Gérez vos informations et votre sécurité'}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 24 }}>
        {/* Sidebar nav */}
        <div style={{ width: 210, flexShrink: 0 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            {tabs.map(t => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  width: '100%', padding: '13px 18px',
                  background: active ? `${rc}10` : 'none',
                  border: 'none', borderLeft: active ? `3px solid ${rc}` : '3px solid transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                  transition: 'all 0.15s', textAlign: 'left',
                }}>
                  <Icon size={15} style={{ color: active ? rc : 'var(--text-muted)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? rc : 'var(--text-secondary)' }}>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Restart Tour Button */}
          <div style={{
            marginTop: 16, padding: '14px 18px',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 16, textAlign: 'center',
          }}>
            <Compass size={20} style={{ color: rc, marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Guide Interactif</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>Relancer le tour de votre espace</div>
            <button
              onClick={() => {
                const safeRole = user?.role === 'admin' ? 'ceo' : (user?.role || 'ceo');
                localStorage.removeItem(`sougui_tour_done_${safeRole}`);
                window.location.reload();
              }}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 10,
                background: `${rc}15`, border: `1px solid ${rc}35`,
                cursor: 'pointer', fontSize: 11, fontWeight: 700, color: rc,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = `${rc}28`; }}
              onMouseLeave={e => { e.currentTarget.style.background = `${rc}15`; }}
            >
              <Compass size={13} /> Relancer le guide
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {tab === 'profile'      && <TabProfile     user={user} onUpdateUser={onUpdateUser} />}
          {tab === 'security'     && <TabSecurity    user={user} />}
          {tab === 'users'        && isAdmin && <TabUsers      user={user} />}
          {tab === 'permissions'  && isAdmin && <TabPermissions user={user} />}
          {tab === 'dashboards'   && isAdmin && <TabDashboards />}
          {tab === 'email'        && isAdmin && <TabEmail user={user} />}
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
