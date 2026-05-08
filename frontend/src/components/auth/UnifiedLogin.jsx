import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, ShieldCheck, ShoppingBag, Camera, UserCheck } from 'lucide-react';
import logoUrl from '../../assets/Logo.png';
import FaceLoginModal from './FaceLoginModal';

const UnifiedLogin = ({ onLogin }) => {
  const [role, setRole]         = useState('admin');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  // ─── Face modal state ──────────────────────────────────────────────────────
  const [faceModal, setFaceModal] = useState(null);
  // faceModal = null | { mode: 'login' | 'enroll' }

  // ─── Formulaire d'enrôlement ─────────────────────────────────────────────
  const [enrollOpen, setEnrollOpen]   = useState(false);
  const [enrollUser, setEnrollUser]   = useState('');
  const [enrollPwd, setEnrollPwd]     = useState('');
  const [enrollError, setEnrollError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (role === 'admin') {
        const response = await fetch('http://127.0.0.1:5000/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: email, password }),
        });
        const data = await response.json();
        if (data.success) {
          onLogin({ ...data.user, role: 'admin' });
        } else {
          setError(data.message || 'Identifiants invalides');
        }
      } else {
        setTimeout(() => onLogin({ email, role: 'customer' }), 800);
      }
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      if (role === 'admin') setLoading(false);
    }
  };

  // ─── Succès login facial ──────────────────────────────────────────────────
  const handleFaceLoginSuccess = (user) => {
    setFaceModal(null);
    onLogin({ ...user, role: user.role || 'admin' });
  };

  // ─── Succès enrôlement facial ─────────────────────────────────────────────
  const handleFaceEnrollSuccess = () => {
    setFaceModal(null);
    setEnrollOpen(false);
    setEnrollUser('');
    setEnrollPwd('');
    setEnrollError('');
    setError('');
  };

  // ─── Lancer l'enrôlement après validation du formulaire ──────────────────
  const handleEnrollSubmit = (e) => {
    e.preventDefault();
    if (!enrollUser.trim() || !enrollPwd.trim()) {
      setEnrollError('Identifiant et mot de passe requis');
      return;
    }
    setEnrollError('');
    setFaceModal({ mode: 'enroll', username: enrollUser.trim(), password: enrollPwd.trim() });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #05080f 0%, #0a0f1e 100%)' }}
    >
      {/* Animated background glows */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-20%', left: '-10%',
          width: '600px', height: '600px',
          background: 'radial-gradient(ellipse, rgba(30,90,255,0.12) 0%, transparent 70%)',
          animation: 'pulse 4s ease-in-out infinite',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '-10%', right: '-5%',
          width: '500px', height: '500px',
          background: 'radial-gradient(ellipse, rgba(30,90,255,0.07) 0%, transparent 70%)',
          animation: 'pulse 5s ease-in-out infinite 1.5s',
        }}
      />

      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(30,90,255,0.25) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }}
      />

      <div className="w-full max-w-[420px] relative z-10">
        {/* Logo Header */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center justify-center w-24 h-24 mb-5 mx-auto"
            style={{
              background: 'rgba(30,90,255,0.08)',
              borderRadius: '24px',
              border: '1px solid rgba(30,90,255,0.2)',
              padding: '14px',
            }}
          >
            <img
              src={logoUrl}
              alt="Sougui"
              className="w-full h-full object-contain"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>

          <h1
            className="font-serif font-black mb-1"
            style={{ fontSize: '42px', color: '#e8eef8', letterSpacing: '-1px' }}
          >
            Sougui
          </h1>
          <div
            className="inline-block px-4 py-1.5 rounded-full mb-1"
            style={{
              background: 'rgba(30,90,255,0.1)',
              border: '1px solid rgba(30,90,255,0.2)',
            }}
          >
            <span
              className="text-[10px] uppercase font-bold tracking-[4px]"
              style={{ color: '#4d7fff' }}
            >
              Smart Business Suite
            </span>
          </div>
          <p className="text-xs mt-2" style={{ color: '#2d3f5e' }}>
            L'artisanat tunisien, piloté par l'intelligence
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-[24px] overflow-hidden"
          style={{
            background: 'rgba(10,15,30,0.9)',
            border: '1px solid rgba(30,90,255,0.15)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 40px rgba(30,90,255,0.06)',
          }}
        >
          {/* Role Switcher */}
          <div
            className="flex p-2 gap-2"
            style={{ background: 'rgba(0,0,0,0.3)' }}
          >
            {[
              { key: 'admin',    label: 'Admin',    Icon: ShieldCheck },
              { key: 'customer', label: 'Boutique', Icon: ShoppingBag },
            ].map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => { setRole(key); setError(''); setEnrollOpen(false); }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all"
                style={role === key
                  ? { background: '#1e5aff', color: '#ffffff', boxShadow: '0 4px 15px rgba(30,90,255,0.35)' }
                  : { color: '#4d6080' }
                }
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          <div className="p-8 pt-7">
            <h2
              className="font-serif text-2xl font-bold mb-1"
              style={{ color: '#e8eef8' }}
            >
              {role === 'customer' ? 'Accès Boutique' : 'Console de Gestion'}
            </h2>
            <p className="text-sm mb-7" style={{ color: '#4d6080' }}>
              {role === 'customer'
                ? 'Connectez-vous pour explorer nos collections artisanales.'
                : 'Espace réservé aux administrateurs Sougui.'}
            </p>

            {error && (
              <div
                className="mb-5 p-3.5 rounded-xl text-sm flex items-center gap-3"
                style={{
                  background: 'rgba(255,50,50,0.08)',
                  border: '1px solid rgba(255,50,50,0.2)',
                  color: '#ff6b6b',
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Input Identifiant */}
              <div>
                <label
                  className="block text-[10px] uppercase font-bold tracking-widest mb-2"
                  style={{ color: '#4d7fff' }}
                >
                  {role === 'customer' ? 'Email' : 'Identifiant'}
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-4 top-1/2 -translate-y-1/2"
                    size={16}
                    style={{ color: '#2d3f5e' }}
                  />
                  <input
                    type={role === 'customer' ? 'email' : 'text'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={role === 'customer' ? 'votre@email.com' : 'Nom d\'utilisateur'}
                    required
                    className="sougui-input pl-11"
                  />
                </div>
              </div>

              {/* Input Password */}
              <div>
                <label
                  className="block text-[10px] uppercase font-bold tracking-widest mb-2"
                  style={{ color: '#4d7fff' }}
                >
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2"
                    size={16}
                    style={{ color: '#2d3f5e' }}
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="sougui-input pl-11"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-3 transition-all"
                style={{
                  background: loading
                    ? 'rgba(30,90,255,0.4)'
                    : 'linear-gradient(135deg, #1e5aff 0%, #0f2d80 100%)',
                  boxShadow: loading ? 'none' : '0 8px 24px rgba(30,90,255,0.35)',
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Se connecter <ArrowRight size={18} /></>
                )}
              </button>
            </form>

            {/* ─── Boutons Face Auth (mode Admin seulement) ─────────────────── */}
            {role === 'admin' && (
              <div className="mt-5 space-y-3">
                {/* Séparateur */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px" style={{ background: 'rgba(30,90,255,0.1)' }} />
                  <span className="text-[10px] uppercase tracking-widest" style={{ color: '#2d3f5e' }}>
                    ou
                  </span>
                  <div className="flex-1 h-px" style={{ background: 'rgba(30,90,255,0.1)' }} />
                </div>

                {/* Bouton Login facial */}
                <button
                  id="btn-face-login"
                  type="button"
                  onClick={() => setFaceModal({ mode: 'login' })}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all"
                  style={{
                    background: 'rgba(30,90,255,0.08)',
                    border: '1px solid rgba(30,90,255,0.2)',
                    color: '#4d7fff',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(30,90,255,0.15)';
                    e.currentTarget.style.borderColor = 'rgba(30,90,255,0.4)';
                    e.currentTarget.style.transform = 'scale(1.01)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(30,90,255,0.08)';
                    e.currentTarget.style.borderColor = 'rgba(30,90,255,0.2)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <Camera size={16} />
                  Se connecter par reconnaissance faciale
                </button>

                {/* Toggle formulaire d'enrôlement */}
                <button
                  id="btn-face-enroll-toggle"
                  type="button"
                  onClick={() => { setEnrollOpen(o => !o); setEnrollError(''); }}
                  className="w-full py-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                  style={{ color: '#2d3f5e' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#4d7fff'}
                  onMouseLeave={e => e.currentTarget.style.color = '#2d3f5e'}
                >
                  <UserCheck size={14} />
                  {enrollOpen ? 'Annuler l\'enregistrement' : 'Enregistrer mon visage'}
                </button>

                {/* Formulaire d'enrôlement (accordéon) */}
                {enrollOpen && (
                  <div
                    className="rounded-2xl p-5 space-y-4"
                    style={{
                      background: 'rgba(30,90,255,0.04)',
                      border: '1px solid rgba(30,90,255,0.12)',
                    }}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#4d7fff' }}>
                      Confirmation d'identité
                    </p>
                    {enrollError && (
                      <p className="text-xs" style={{ color: '#ff6b6b' }}>{enrollError}</p>
                    )}
                    <form onSubmit={handleEnrollSubmit} className="space-y-3">
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2" size={14} style={{ color: '#2d3f5e' }} />
                        <input
                          type="text"
                          value={enrollUser}
                          onChange={e => setEnrollUser(e.target.value)}
                          placeholder="Nom d'utilisateur"
                          className="sougui-input pl-10 text-sm"
                          style={{ padding: '10px 10px 10px 36px' }}
                        />
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2" size={14} style={{ color: '#2d3f5e' }} />
                        <input
                          type="password"
                          value={enrollPwd}
                          onChange={e => setEnrollPwd(e.target.value)}
                          placeholder="Mot de passe"
                          className="sougui-input pl-10 text-sm"
                          style={{ padding: '10px 10px 10px 36px' }}
                        />
                      </div>
                      <button
                        id="btn-face-enroll-submit"
                        type="submit"
                        className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                        style={{
                          background: 'linear-gradient(135deg, #1e5aff 0%, #0f2d80 100%)',
                          color: '#fff',
                          boxShadow: '0 4px 16px rgba(30,90,255,0.3)',
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <Camera size={15} />
                        Ouvrir la caméra pour s'enregistrer
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {role === 'admin' && (
              <p className="text-center text-[11px] mt-5" style={{ color: '#2d3f5e' }}>
                Identifiants par défaut : <span style={{ color: '#4d7fff' }}>admin / admin123</span>
              </p>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] mt-8 tracking-widest uppercase" style={{ color: '#1e3060' }}>
          Sougui Artisanat Tunisien · Powered by AI
        </p>
      </div>

      {/* ─── Modal de reconnaissance faciale ───────────────────────────────── */}
      {faceModal && (
        <FaceLoginModal
          mode={faceModal.mode}
          role={faceModal.mode === 'login' ? '' : ''}
          enrollData={faceModal.mode === 'enroll'
            ? { username: faceModal.username, password: faceModal.password }
            : null
          }
          onSuccess={faceModal.mode === 'login' ? handleFaceLoginSuccess : handleFaceEnrollSuccess}
          onClose={() => setFaceModal(null)}
        />
      )}
    </div>
  );
};

export default UnifiedLogin;
