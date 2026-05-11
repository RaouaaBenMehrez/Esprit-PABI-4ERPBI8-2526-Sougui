import React, { useState } from 'react';
import { ArrowLeft, Mail, Phone, Lock, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import translations from '../../context/translations';

const API = 'http://127.0.0.1:5000/api';

export default function ForgotPassword({ onBack }) {
  const { lang } = useLanguage();
  const t = translations[lang];

  const [step, setStep]         = useState(1); // 1=contact, 2=code, 3=newpwd
  const [channel, setChannel]   = useState('email');
  const [contact, setContact]   = useState('');
  const [code, setCode]         = useState('');
  const [verifiedCode, setVerifiedCode] = useState('');
  const [newPwd, setNewPwd]     = useState('');
  const [confirmPwd, setConfirm]= useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);

  const inputStyle = {
    width: '100%', padding: '13px 14px 13px 40px', borderRadius: 10,
    border: '1.5px solid var(--border)', background: 'var(--bg-card)',
    color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  };
  const iconSt = {
    position: 'absolute', left: 13, top: '50%',
    transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none',
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact, channel }),
      });
      setStep(2);
    } catch {
      setError(t.forgot_err_send);
    } finally { setLoading(false); }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/verify-reset-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.success) { setVerifiedCode(code); setStep(3); }
      else setError(t.forgot_err_code);
    } catch { setError(t.forgot_err_code); }
    finally { setLoading(false); }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) { setError(t.forgot_err_match); return; }
    if (newPwd.length < 6)     { setError(t.forgot_err_short); return; }
    setError(''); setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verifiedCode, new_password: newPwd }),
      });
      const data = await res.json();
      if (data.success) setSuccess(true);
      else setError(data.message || t.forgot_err_code);
    } catch { setError(t.forgot_err_send); }
    finally { setLoading(false); }
  };

  const stepLabel = ['', t.forgot_via_email || '1', '2', '3'];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 440, background: 'var(--bg-card)', borderRadius: 20, padding: 40, border: '1px solid var(--border)', boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }}>

        {/* Header */}
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, marginBottom: 28, padding: 0 }}>
          <ArrowLeft size={15} /> {t.login_back}
        </button>

        {/* Step indicators */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {[1,2,3].map(s => (
            <div key={s} style={{ flex: 1, height: 3, borderRadius: 99, background: s <= step ? 'var(--blue)' : 'var(--border)', transition: 'background 0.3s' }} />
          ))}
        </div>

        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>{t.forgot_success}</h2>
            <button onClick={onBack} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14, marginTop: 24 }}>
              {t.forgot_back_login}
            </button>
          </div>
        ) : (
          <>
            <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 6 }}>
              {step === 1 ? t.forgot_title : step === 2 ? t.forgot_code_title : t.forgot_newpwd_title}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>
              {step === 1 ? t.forgot_subtitle : step === 2 ? `${t.forgot_code_subtitle} ${contact}` : t.forgot_newpwd_subtitle}
            </p>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 13, marginBottom: 16 }}>
                ⚠ {error}
              </div>
            )}

            {/* Step 1 */}
            {step === 1 && (
              <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                  {['email','sms'].map(ch => (
                    <button key={ch} type="button" onClick={() => setChannel(ch)}
                      style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: `1.5px solid ${channel === ch ? 'var(--blue)' : 'var(--border)'}`, background: channel === ch ? 'rgba(30,90,255,0.08)' : 'transparent', color: channel === ch ? 'var(--blue)' : 'var(--text-muted)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      {ch === 'email' ? t.forgot_via_email : t.forgot_via_sms}
                    </button>
                  ))}
                </div>
                <div style={{ position: 'relative' }}>
                  {channel === 'email' ? <Mail size={15} style={iconSt} /> : <Phone size={15} style={iconSt} />}
                  <input type={channel === 'email' ? 'email' : 'tel'} value={contact} onChange={e => setContact(e.target.value)}
                    placeholder={channel === 'email' ? t.forgot_email_ph : t.forgot_phone_ph}
                    style={inputStyle} required />
                </div>
                <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: 14 }}>
                  {loading ? t.forgot_sending : t.forgot_send_code}
                </button>
              </form>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={iconSt} />
                  <input type="text" value={code} onChange={e => setCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                    placeholder={t.forgot_code_ph} maxLength={6} style={{ ...inputStyle, fontSize: 24, fontWeight: 900, letterSpacing: 8, textAlign: 'center', paddingLeft: 14 }} required />
                </div>
                <button type="submit" className="btn-primary" disabled={loading || code.length < 6} style={{ width: '100%', justifyContent: 'center', padding: 14 }}>
                  {loading ? t.forgot_sending : t.forgot_verify}
                </button>
                <button type="button" onClick={() => handleSend({ preventDefault: () => {} })} style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
                  {t.forgot_resend}
                </button>
              </form>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={iconSt} />
                  <input type={showPw ? 'text' : 'password'} value={newPwd} onChange={e => setNewPwd(e.target.value)}
                    placeholder={t.forgot_newpwd_ph} style={inputStyle} required />
                  <button type="button" onClick={() => setShowPw(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={iconSt} />
                  <input type="password" value={confirmPwd} onChange={e => setConfirm(e.target.value)}
                    placeholder={t.forgot_confirm_ph} style={inputStyle} required />
                </div>
                <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: 14 }}>
                  {loading ? t.forgot_saving : t.forgot_save}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
