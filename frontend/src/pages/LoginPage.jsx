import React, { useState, useEffect, useRef } from 'react';
import { Sun, Moon, ArrowLeft, Eye, EyeOff, Camera, UserCheck, Lock, Mail, Globe } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import translations from '../context/translations';
import logoUrl from '../assets/Logo.png';
import FaceLoginModal from '../components/auth/FaceLoginModal';
import ForgotPassword from '../components/auth/ForgotPassword';
import InteractiveCanvas from '../components/ui/InteractiveCanvas';

const LoginPage = ({ onLogin, onBack }) => {
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang } = useLanguage();
  const t = translations[lang];

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showForgot, setShowForgot] = useState(false);

  // Face Auth state
  const [faceModal, setFaceModal]         = useState(null);
  const [enrollOpen, setEnrollOpen]       = useState(false);
  const [enrollUser, setEnrollUser]       = useState('');
  const [enrollPwd, setEnrollPwd]         = useState('');
  const [enrollError, setEnrollError]     = useState('');
  const [enrollSuccess, setEnrollSuccess] = useState(false);

  // Login classique — le rôle vient entièrement du backend
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('http://127.0.0.1:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        onLogin({ ...data.user });
      } else {
        setError(data.message || t.login_err_invalid);
      }
    } catch {
      setError(t.login_err_server);
    } finally {
      setLoading(false);
    }
  };

  const handleFaceLoginSuccess  = (user) => { setFaceModal(null); onLogin({ ...user }); };
  const handleFaceEnrollSuccess = () => {
    setFaceModal(null); setEnrollOpen(false);
    setEnrollUser(''); setEnrollPwd(''); setEnrollError(''); setEnrollSuccess(true);
  };
  const handleEnrollSubmit = (e) => {
    e.preventDefault();
    if (!enrollUser.trim() || !enrollPwd.trim()) { setEnrollError(t.login_err_invalid); return; }
    setEnrollError('');
    setFaceModal({ mode: 'enroll', username: enrollUser.trim(), password: enrollPwd.trim() });
  };

  const inputWrap = { position: 'relative' };
  const iconStyle = { position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' };

  if (showForgot) return <ForgotPassword onBack={() => setShowForgot(false)} />;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg-page)', overflow: 'hidden' }}>

      {/* ── Left Panel ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', padding: '40px',
        position: 'relative',
        background: 'linear-gradient(135deg, #05080f 0%, #0f1628 50%, #1e3a80 100%)',
        overflow: 'hidden',
      }}>
        {/* Interactive nodes canvas */}
        <InteractiveCanvas theme="dark" />
        <div style={{ position: 'absolute', bottom: '10%', left: '10%', width: 400, height: 400, background: 'radial-gradient(ellipse, rgba(30,90,255,0.25) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 2 }}>
          <img src={logoUrl} alt="Sougui" style={{ width: 40, height: 40, objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
          <div>
            <div style={{ fontFamily: '"Playfair Display", serif', fontWeight: 900, fontSize: 22, color: '#fff' }}>Sougui</div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)' }}>Smart BI Suite</div>
          </div>
        </div>

        {/* Center content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 2 }}>
          <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 48, fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 20 }}>
            {t.login_left_title_1}<br />
            <span style={{ color: '#4d7fff' }}>Business</span><br />
            {t.login_left_title_2}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.8, maxWidth: 380 }}>
            {t.login_left_subtitle}
          </p>

          <div style={{ display: 'flex', gap: 16, marginTop: 48, flexWrap: 'wrap' }}>
            {[
              [t.login_left_tag1_name, t.login_left_tag1_label],
              [t.login_left_tag2_name, t.login_left_tag2_label],
              [t.login_left_tag3_name, t.login_left_tag3_label],
            ].map(([name, label]) => (
              <div key={name} style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(30,90,255,0.15)', border: '1px solid rgba(30,90,255,0.25)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#4d7fff' }}>{name}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(30,90,255,0.12)', border: '1px solid rgba(30,90,255,0.25)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Camera size={14} color="#4d7fff" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#4d7fff' }}>{t.login_left_badge}</span>
            </div>
          </div>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, position: 'relative', zIndex: 2 }}>{t.login_left_copy}</p>
      </div>

      {/* ── Right Panel ── */}
      <div style={{ width: 480, display: 'flex', flexDirection: 'column', background: 'var(--bg-page)', overflow: 'auto' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 40px' }}>
          <button onClick={onBack} className="btn-ghost"><ArrowLeft size={16} /> {t.login_back}</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={toggleLang} style={{
              padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border)',
              background: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12,
              color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <Globe size={13} />{t.lang_switch}
            </button>
            <button onClick={toggleTheme} className="btn-ghost" style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px' }}>
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>

        <div style={{ flex: 1, padding: '20px 40px 40px' }}>
          <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8 }}>
            {t.login_title}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 36 }}>
            {t.login_subtitle}
          </p>

          {/* Login Form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 8 }}>
                {t.login_username_label}
              </label>
              <div style={inputWrap}>
                <Mail size={15} style={iconStyle} />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder={t.login_username_ph}
                  className="s-input"
                  style={{ paddingLeft: 40 }}
                  required
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
                  {t.login_password_label}
                </label>
                <button type="button" onClick={() => setShowForgot(true)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--blue)', fontWeight: 600 }}>
                  {t.forgot_link}
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={iconStyle} />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t.login_password_ph}
                  className="s-input"
                  style={{ paddingLeft: 40, paddingRight: 44 }}
                  required
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
              style={{ width: '100%', justifyContent: 'center', padding: '15px', fontSize: 15, marginTop: 4, opacity: loading ? 0.7 : 1, borderRadius: 14 }}>
              {loading
                ? <><div className="anim-spin" style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%' }} /> {t.login_loading}</>
                : t.login_btn
              }
            </button>

            {/* Google login button */}
            <button type="button"
              onClick={() => alert('Google OAuth — configuration backend requise')}
              style={{
                width: '100%', padding: '13px 16px', borderRadius: 12, marginTop: 2,
                background: 'transparent', border: '1.5px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              {t.login_google}
            </button>
          </form>

          {/* Face Auth */}
          <div style={{ marginTop: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t.login_biometry}</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            <button id="btn-face-login" type="button" onClick={() => setFaceModal({ mode: 'login' })}
              style={{
                width: '100%', padding: '13px 16px', borderRadius: 12,
                background: 'rgba(30,90,255,0.06)', border: '1.5px solid rgba(30,90,255,0.2)',
                color: '#4d7fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                transition: 'all 0.2s', marginBottom: 10,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(30,90,255,0.14)'; e.currentTarget.style.borderColor = 'rgba(30,90,255,0.45)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(30,90,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(30,90,255,0.2)'; }}
            >
              <Camera size={16} /> {t.login_face_btn}
            </button>

            <button id="btn-face-enroll-toggle" type="button"
              onClick={() => { setEnrollOpen(o => !o); setEnrollError(''); setEnrollSuccess(false); }}
              style={{
                width: '100%', padding: '10px 16px', borderRadius: 10,
                background: 'none', border: 'none', color: 'var(--text-muted)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#4d7fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <UserCheck size={14} />
              {enrollOpen ? t.login_face_cancel : t.login_face_enroll}
            </button>

            {enrollSuccess && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e', fontSize: 12, marginTop: 8, textAlign: 'center' }}>
                {t.login_face_enrolled}
              </div>
            )}

            {enrollOpen && (
              <div style={{ marginTop: 12, padding: '18px 20px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 14 }}>{t.login_enroll_title}</div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>{t.login_enroll_desc}</p>
                {enrollError && (
                  <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 12, marginBottom: 12 }}>
                    ⚠ {enrollError}
                  </div>
                )}
                <form onSubmit={handleEnrollSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ position: 'relative' }}>
                    <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input type="text" value={enrollUser} onChange={e => setEnrollUser(e.target.value)} placeholder={t.login_enroll_user_ph} className="s-input" style={{ paddingLeft: 36, fontSize: 13 }} />
                  </div>
                  <div style={{ position: 'relative' }}>
                    <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input type="password" value={enrollPwd} onChange={e => setEnrollPwd(e.target.value)} placeholder={t.login_enroll_pwd_ph} className="s-input" style={{ paddingLeft: 36, fontSize: 13 }} />
                  </div>
                  <button id="btn-face-enroll-submit" type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 13 }}>
                    <Camera size={15} /> {t.login_enroll_submit}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal reconnaissance faciale */}
      {faceModal && (
        <FaceLoginModal
          mode={faceModal.mode}
          role=""
          enrollData={faceModal.mode === 'enroll' ? { username: faceModal.username, password: faceModal.password } : null}
          onSuccess={faceModal.mode === 'login' ? handleFaceLoginSuccess : handleFaceEnrollSuccess}
          onClose={() => setFaceModal(null)}
        />
      )}
    </div>
  );
};

export default LoginPage;
