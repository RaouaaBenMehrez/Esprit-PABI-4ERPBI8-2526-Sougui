import React, { useState } from 'react';
import { Sun, Moon, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import logoUrl from '../assets/Logo.png';

const ROLES = [
  {
    key: 'ceo',
    label: 'CEO',
    icon: '👑',
    title: 'Direction Générale',
    desc: 'Accès complet : KPIs globaux, prévisions Prophet, stratégie globale.',
    color: '#1e5aff',
    bg: 'rgba(30,90,255,0.08)',
    hint: 'ceo / ceo123',
  },
  {
    key: 'marketing',
    label: 'Marketing',
    icon: '📊',
    title: 'Marketing & Communication',
    desc: 'Segmentation clients, XGBoost classification, tendances B2C.',
    color: '#7c3aed',
    bg: 'rgba(124,58,237,0.08)',
    hint: 'marketing / marketing123',
  },
  {
    key: 'commercial',
    label: 'Commercial',
    icon: '💼',
    title: 'Direction Commerciale',
    desc: 'Ventes, B2B, régression CA RandomForest, Sales Agent IA.',
    color: '#059669',
    bg: 'rgba(5,150,105,0.08)',
    hint: 'commercial / commercial123',
  },
];

const LoginPage = ({ onLogin, onBack }) => {
  const { theme, toggleTheme } = useTheme();
  const [selectedRole, setSelectedRole] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!selectedRole) { setError('Veuillez sélectionner un rôle.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://127.0.0.1:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        onLogin({ ...data.user, role: data.user.role || selectedRole.key });
      } else {
        setError(data.message || 'Identifiants invalides');
      }
    } catch {
      setError('Erreur de connexion au serveur. Vérifiez que le backend tourne sur le port 5000.');
    } finally {
      setLoading(false);
    }
  };

  const selectRole = (role) => {
    setSelectedRole(role);
    setUsername(role.key);
    setError('');
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: 'var(--bg-page)', overflow: 'hidden',
    }}>
      {/* Left Panel */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        padding: '40px', position: 'relative',
        background: 'linear-gradient(135deg, #05080f 0%, #0f1628 50%, #1e3a80 100%)',
      }}>
        {/* Background */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.1,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)',
          backgroundSize: '30px 30px', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', left: '10%',
          width: 400, height: 400,
          background: 'radial-gradient(ellipse, rgba(30,90,255,0.25) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
          <img src={logoUrl} alt="Sougui" style={{ width: 40, height: 40, objectFit: 'contain' }}
            onError={e => { e.target.style.display = 'none'; }} />
          <div>
            <div style={{ fontFamily: '"Playfair Display", serif', fontWeight: 900, fontSize: 22, color: '#fff' }}>Sougui</div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)' }}>Smart BI Suite</div>
          </div>
        </div>

        {/* Center content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 48, fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 20 }}>
            Intelligence<br /><span style={{ color: '#4d7fff' }}>Business</span><br />Artisanale
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.8, maxWidth: 380 }}>
            3 espaces personnalisés pour piloter Sougui.tn avec précision — analyse temps réel, prédictions IA et agent commercial intelligent.
          </p>

          <div style={{ display: 'flex', gap: 16, marginTop: 48, flexWrap: 'wrap' }}>
            {[['Prophet AI', 'Prévision CA'], ['XGBoost', 'Segmentation'], ['Gemini', 'Agent IA']].map(([name, label]) => (
              <div key={name} style={{
                padding: '10px 16px', borderRadius: 10,
                background: 'rgba(30,90,255,0.15)', border: '1px solid rgba(30,90,255,0.25)',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#4d7fff' }}>{name}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, position: 'relative', zIndex: 1 }}>
          © 2025 Sougui Artisanat Tunisien · ESPRIT 4ERPBI8
        </p>
      </div>

      {/* Right Panel — Form */}
      <div style={{
        width: 480, display: 'flex', flexDirection: 'column',
        background: 'var(--bg-page)', overflow: 'auto',
      }}>
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 40px' }}>
          <button onClick={onBack} className="btn-ghost">
            <ArrowLeft size={16} /> Retour
          </button>
          <button onClick={toggleTheme} className="btn-ghost" style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px' }}>
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>

        <div style={{ flex: 1, padding: '20px 40px 40px' }}>
          <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8 }}>
            Connexion
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 32 }}>
            Sélectionnez votre rôle puis saisissez vos identifiants.
          </p>

          {/* Role selector */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 12 }}>
              Choisir un rôle
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ROLES.map(role => {
                const active = selectedRole?.key === role.key;
                return (
                  <button
                    key={role.key}
                    onClick={() => selectRole(role)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 16px', borderRadius: 12,
                      background: active ? role.bg : 'var(--bg-card)',
                      border: `1.5px solid ${active ? role.color : 'var(--border)'}`,
                      cursor: 'pointer', transition: 'all 0.2s',
                      width: '100%', textAlign: 'left',
                    }}
                  >
                    <div style={{ fontSize: 24, lineHeight: 1 }}>{role.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: active ? role.color : 'var(--text-primary)' }}>
                        {role.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
                        {role.desc}
                      </div>
                    </div>
                    {active && (
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: role.color, flexShrink: 0 }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 8 }}>
                Identifiant
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Nom d'utilisateur"
                className="s-input"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 8 }}>
                Mot de passe
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="s-input"
                  required
                  style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 13 }}>
                ⚠ {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15, marginTop: 8,
                opacity: loading ? 0.7 : 1
              }}>
              {loading
                ? <><div className="anim-spin" style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%' }} /> Connexion...</>
                : 'Se connecter →'
              }
            </button>
          </form>

          {/* Hints */}
          {selectedRole && (
            <div style={{ marginTop: 24, padding: '14px 16px', borderRadius: 12, background: 'var(--bg-active)', border: '1px solid var(--border)', fontSize: 12 }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Demo : </span>
              <span style={{ color: 'var(--blue)', fontWeight: 700 }}>{selectedRole.hint}</span>
            </div>
          )}

          <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 4 }}>
              Comptes de démo disponibles
            </div>
            {ROLES.map(r => (
              <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: r.color, display: 'inline-block' }} />
                <span style={{ color: 'var(--text-secondary)' }}>{r.hint}</span>
                <span style={{ color: 'var(--text-muted)' }}>— {r.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
