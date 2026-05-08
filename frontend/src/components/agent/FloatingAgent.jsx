import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, User, Send, X, Mic, MicOff, Minimize2, MessageCircle, Volume2, VolumeX, Maximize2, ChevronUp } from 'lucide-react';

const AGENT  = 'http://localhost:8000';
const ORANGE = '#f97316';

const QUICK = ['Produits en stock', 'Cadeau mariage', 'Budget 50 DT', 'Poterie artisanale', 'Bijoux'];

const SIZES = {
  compact: { width: 340, height: 460 },
  normal:  { width: 400, height: 560 },
  large:   { width: 520, height: 680 },
};

function buildFallback(msg) {
  const m = msg.toLowerCase();
  if (m.includes('bonjour') || m.includes('salut')) return "Bonjour ! Je suis Sougui, votre assistante artisanale. 🌿 Comment puis-je vous aider aujourd'hui ?";
  if (m.includes('poterie') || m.includes('céramique')) return 'Nous avons une belle collection de poterie et céramique tunisienne, entre 15 DT et 180 DT. Souhaitez-vous voir les détails ?';
  if (m.includes('bijoux') || m.includes('bijou')) return 'Nos bijoux artisanaux (argent, cuivre, corail) vont de 25 DT à 350 DT. Quel type vous intéresse ?';
  if (m.includes('tapis') || m.includes('berbère')) return 'Nos tapis Berbères et Kilims sont faits main, entre 120 DT et 450 DT selon la taille.';
  if (m.includes('cadeau') || m.includes('mariage') || m.includes('anniversaire')) return "Pour un cadeau exceptionnel : coffrets céramique (45 DT) ou bijoux en argent (80 DT). C'est pour quelle occasion ?";
  if (m.includes('prix') || m.includes('budget') || m.includes('dt')) return 'Nos prix vont de 8 DT (petits souvenirs) à 450 DT (grands tapis). Quel est votre budget ?';
  if (m.includes('stock') || m.includes('disponible') || m.includes('dispo')) return 'Tous nos produits affichés sont en stock. Tapis sur commande : 2-3 semaines.';
  if (m.includes('textile') || m.includes('tissu') || m.includes('fouta')) return 'Nos textiles artisanaux (foutas, cheich, broderies) sont faits à la main. Prix : 20-180 DT.';
  if (m.includes('livraison') || m.includes('délai')) return 'Livraison en 24-48h sur Tunis, 3-5 jours ailleurs. Gratuite au-dessus de 150 DT.';
  return "Je suis votre assistante Sougui. Parlez-moi de l'occasion, du budget ou du type de produit artisanal que vous cherchez !";
}

/* ══ FLOATING AGENT ═══════════════════════════════════════════════════ */
const FloatingAgent = ({ user }) => {
  const [open, setOpen]       = useState(false);
  const [size, setSize]       = useState('normal');
  const [messages, setMessages] = useState([{
    role: 'bot',
    content: `Bonjour${user?.username ? ` ${user.username}` : ''} ! Je suis Sougui, votre assistante artisanale. 🌿 Comment puis-je vous aider ?`
  }]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [agentOnline, setAgentOnline] = useState(false);

  // Voice
  const [listening, setListening]   = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const recogRef = useRef(null);

  // Drag — button
  const [btnPos, setBtnPos] = useState({ x: null, y: null }); // null → use CSS default (right/bottom)
  const btnDragRef   = useRef(false);
  const btnOffsetRef = useRef({ x: 0, y: 0 });
  const btnRef       = useRef(null);

  // Drag — window
  const [winPos, setWinPos]   = useState({ x: null, y: null });
  const winDragRef   = useRef(false);
  const winOffsetRef = useRef({ x: 0, y: 0 });
  const winRef       = useRef(null);

  const endRef = useRef(null);

  /* ── Agent health check ─────────────────────────────────────────── */
  useEffect(() => {
    const check = () =>
      fetch(`${AGENT}/health`, { signal: AbortSignal.timeout(3000) })
        .then(r => r.json())
        .then(d => setAgentOnline(d?.pret === true))
        .catch(() => setAgentOnline(false));
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, open]);

  /* ── Global mouse drag handler ──────────────────────────────────── */
  useEffect(() => {
    const onMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      if (btnDragRef.current && btnRef.current) {
        const bw = btnRef.current.offsetWidth;
        const bh = btnRef.current.offsetHeight;
        setBtnPos({
          x: Math.min(Math.max(clientX - btnOffsetRef.current.x, 0), window.innerWidth  - bw),
          y: Math.min(Math.max(clientY - btnOffsetRef.current.y, 0), window.innerHeight - bh),
        });
      }
      if (winDragRef.current && winRef.current) {
        const ww = winRef.current.offsetWidth;
        const wh = winRef.current.offsetHeight;
        setWinPos({
          x: Math.min(Math.max(clientX - winOffsetRef.current.x, 0), window.innerWidth  - ww),
          y: Math.min(Math.max(clientY - winOffsetRef.current.y, 0), window.innerHeight - wh),
        });
      }
    };
    const onUp = () => { btnDragRef.current = false; winDragRef.current = false; };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend',  onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend',  onUp);
    };
  }, []);

  /* ── Start drag — button ────────────────────────────────────────── */
  const startDragBtn = useCallback((e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rect = btnRef.current?.getBoundingClientRect();
    btnOffsetRef.current = {
      x: clientX - (rect?.left ?? 0),
      y: clientY - (rect?.top  ?? 0),
    };
    btnDragRef.current = true;
    e.preventDefault();
  }, []);

  /* ── Start drag — window ────────────────────────────────────────── */
  const startDragWin = useCallback((e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rect = winRef.current?.getBoundingClientRect();
    winOffsetRef.current = {
      x: clientX - (rect?.left ?? 0),
      y: clientY - (rect?.top  ?? 0),
    };
    winDragRef.current = true;
    e.preventDefault();
  }, []);

  /* ── Voice — Microphone ─────────────────────────────────────────── */
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Votre navigateur ne supporte pas la reconnaissance vocale. Essayez Chrome.');
      return;
    }
    if (recogRef.current) {
      try { recogRef.current.stop(); } catch {}
    }
    const recog = new SpeechRecognition();
    recog.lang           = 'fr-FR';
    recog.continuous     = false;
    recog.interimResults = true;

    recog.onstart = () => setListening(true);

    recog.onresult = (e) => {
      let interim = '';
      let final   = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      setInput(final || interim);
    };

    recog.onend = () => {
      setListening(false);
      // Auto-send if we got a final transcript
      setInput(prev => {
        if (prev.trim()) {
          // schedule send after state update
          setTimeout(() => {
            document.getElementById('agent-send-btn')?.click();
          }, 100);
        }
        return prev;
      });
    };

    recog.onerror = (e) => {
      setListening(false);
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        console.warn('[Voice] Erreur reconnaissance:', e.error);
      }
    };

    recogRef.current = recog;
    recog.start();
  }, []);

  const stopListening = useCallback(() => {
    try { recogRef.current?.stop(); } catch {}
    setListening(false);
  }, []);

  /* ── TTS ────────────────────────────────────────────────────────── */
  const speak = useCallback((text) => {
    if (!ttsEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt  = new SpeechSynthesisUtterance(text.slice(0, 200));
    utt.lang   = 'fr-FR';
    utt.rate   = 1.05;
    utt.pitch  = 1;
    // prefer a French voice if available
    const voices = window.speechSynthesis.getVoices();
    const frVoice = voices.find(v => v.lang.startsWith('fr'));
    if (frVoice) utt.voice = frVoice;
    window.speechSynthesis.speak(utt);
  }, [ttsEnabled]);

  /* ── Send message ───────────────────────────────────────────────── */
  const sendMessage = useCallback(async (msgText) => {
    const msg = (msgText !== undefined ? msgText : input).trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(p => [...p, { role: 'user', content: msg }]);
    setLoading(true);

    let botReply = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await fetch(`${AGENT}/chat`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            session_id: user?.id ? `${user.id}-${user.role}` : `guest-${Date.now()}`,
            message:    msg,
          }),
          signal: AbortSignal.timeout(8000),
        });
        if (r.ok) {
          const data = await r.json();
          botReply = {
            role:     'bot',
            content:  data.response || data.reponse || 'Réponse reçue.',
            products: data.produits_rag || [],
          };
          break;
        }
      } catch { /* retry */ }
    }

    if (!botReply) botReply = { role: 'bot', content: buildFallback(msg) };

    setMessages(p => [...p, botReply]);
    speak(botReply.content);
    setLoading(false);
  }, [input, loading, user, speak]);

  const handleSubmit = (e) => { e.preventDefault(); sendMessage(); };

  /* ── Size cycle ─────────────────────────────────────────────────── */
  const cycleSize = () => {
    const order = ['compact', 'normal', 'large'];
    setSize(s => order[(order.indexOf(s) + 1) % order.length]);
  };

  /* ── Status ─────────────────────────────────────────────────────── */
  const statusColor = agentOnline ? '#22c55e' : ORANGE;
  const statusLabel = agentOnline ? 'En ligne' : 'Mode local';

  /* ── Computed positions ─────────────────────────────────────────── */
  const btnStyle = btnPos.x !== null
    ? { position: 'fixed', left: btnPos.x, top: btnPos.y, right: 'auto', bottom: 'auto' }
    : { position: 'fixed', right: 28, bottom: 28 };

  const { width: winW, height: winH } = SIZES[size];

  const winStyle = winPos.x !== null
    ? { position: 'fixed', left: winPos.x, top: winPos.y, right: 'auto', bottom: 'auto', width: winW, height: winH }
    : { position: 'fixed', right: 28, bottom: 96, width: winW, height: winH };

  return (
    <>
      {/* ── Floating button ── */}
      <div
        ref={btnRef}
        className="floating-agent-btn"
        style={{ ...btnStyle, cursor: btnDragRef.current ? 'grabbing' : 'grab', zIndex: 9999 }}
        onMouseDown={startDragBtn}
        onTouchStart={startDragBtn}
        onClick={() => { if (!btnDragRef.current) setOpen(o => !o); }}
        title="Sougui Sales Agent — cliquer ou déplacer"
      >
        <div className="pulse-ring" />
        {open
          ? <X size={22} style={{ color: '#fff', position: 'relative', zIndex: 1 }} />
          : <MessageCircle size={22} style={{ color: '#fff', position: 'relative', zIndex: 1 }} />
        }
      </div>

      {/* ── Chat window ── */}
      {open && (
        <div
          ref={winRef}
          className="floating-agent-window anim-fade-up"
          style={{ ...winStyle, zIndex: 9998, display: 'flex', flexDirection: 'column', transition: 'width 0.2s, height 0.2s' }}
        >
          {/* Header — draggable */}
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 14px', cursor: 'move', flexShrink: 0,
              background: `linear-gradient(135deg, ${ORANGE}22, var(--bg-surface))`,
              borderBottom: '1px solid var(--border)', userSelect: 'none', borderRadius: '16px 16px 0 0',
            }}
            onMouseDown={startDragWin}
            onTouchStart={startDragWin}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: `linear-gradient(135deg, ${ORANGE}, #dc2626)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Bot size={17} style={{ color: '#fff' }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>Sougui Agent</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor, animation: 'pulseDot 2s infinite' }} />
                  <span style={{ fontSize: 10, color: statusColor, fontWeight: 600 }}>{statusLabel}</span>
                </div>
              </div>
            </div>

            {/* Header actions */}
            <div style={{ display: 'flex', gap: 5 }}>
              {/* TTS toggle */}
              <button
                onClick={(e) => { e.stopPropagation(); setTtsEnabled(t => !t); }}
                style={{
                  width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: ttsEnabled ? `${ORANGE}20` : 'var(--bg-hover)',
                  color: ttsEnabled ? ORANGE : 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                title={ttsEnabled ? 'Désactiver la voix' : 'Activer la voix'}
              >
                {ttsEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
              </button>

              {/* Resize cycle */}
              <button
                onClick={(e) => { e.stopPropagation(); cycleSize(); }}
                style={{
                  width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: 'var(--bg-hover)', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                title={`Taille : ${size} → cliquer pour changer`}
              >
                {size === 'large' ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              </button>

              {/* Close */}
              <button
                onClick={(e) => { e.stopPropagation(); setOpen(false); }}
                style={{
                  width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: 'var(--bg-hover)', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                title="Réduire"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflow: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }} className="hide-scroll">
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ display: 'flex', gap: 8, maxWidth: '85%', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    ...(m.role === 'user'
                      ? { background: 'linear-gradient(135deg, var(--blue), var(--blue-dim))' }
                      : { background: `${ORANGE}18`, border: `1px solid ${ORANGE}30` })
                  }}>
                    {m.role === 'user'
                      ? <User size={12} style={{ color: '#fff' }} />
                      : <Bot  size={12} style={{ color: ORANGE }} />
                    }
                  </div>
                  <div>
                    <div style={{
                      padding: '9px 12px', borderRadius: 12, fontSize: 12, lineHeight: 1.6,
                      ...(m.role === 'user'
                        ? { background: 'linear-gradient(135deg, var(--blue), var(--blue-dim))', color: '#fff', borderTopRightRadius: 4 }
                        : { background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderTopLeftRadius: 4 })
                    }}>
                      {m.content}
                    </div>
                    {m.products?.length > 0 && (
                      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {m.products.slice(0, 3).map((p, pi) => (
                          <div key={pi} style={{
                            padding: '7px 10px', borderRadius: 8,
                            background: `${ORANGE}08`, border: `1px solid ${ORANGE}20`,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          }}>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>{p.nom}</div>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.categorie}</div>
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 800, color: ORANGE }}>{p.prix} DT</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: `${ORANGE}18`, border: `1px solid ${ORANGE}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Bot size={12} style={{ color: ORANGE }} />
                </div>
                <div style={{
                  padding: '10px 12px', borderRadius: 12, background: 'var(--bg-surface)',
                  border: '1px solid var(--border)', display: 'flex', gap: 4, alignItems: 'center',
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: '50%', background: ORANGE,
                      animation: 'pulseDot 1.2s infinite', animationDelay: `${i * 0.2}s`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Quick actions */}
          <div style={{ padding: '6px 12px', display: 'flex', gap: 5, overflow: 'auto', flexShrink: 0 }} className="hide-scroll">
            {QUICK.map(q => (
              <button key={q} onClick={() => sendMessage(q)}
                style={{
                  flexShrink: 0, padding: '4px 10px', borderRadius: 9999,
                  background: 'var(--bg-hover)', border: '1px solid var(--border)',
                  fontSize: 10, color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap',
                }}>
                {q}
              </button>
            ))}
          </div>

          {/* Input form */}
          <form onSubmit={handleSubmit}
            style={{ display: 'flex', gap: 8, padding: '10px 12px', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)', flexShrink: 0, borderRadius: '0 0 16px 16px' }}>

            {/* Mic button — click to start, click again to stop */}
            <button type="button"
              onClick={listening ? stopListening : startListening}
              style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: listening ? `${ORANGE}25` : 'var(--bg-hover)',
                border: `1px solid ${listening ? ORANGE : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.2s',
                animation: listening ? 'pulseDot 1s infinite' : 'none',
              }}
              title={listening ? 'Cliquer pour arrêter et envoyer' : 'Cliquer pour parler'}
            >
              {listening
                ? <MicOff size={14} style={{ color: ORANGE }} />
                : <Mic    size={14} style={{ color: 'var(--text-muted)' }} />
              }
            </button>

            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={listening ? '🎤 Écoute en cours... (cliquer micro pour envoyer)' : 'Écrivez votre message...'}
              className="s-input"
              style={{ flex: 1, padding: '8px 12px', fontSize: 12 }}
            />

            {/* Send button — has id for auto-send from voice */}
            <button
              id="agent-send-btn"
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0,
                background: (!loading && input.trim()) ? `linear-gradient(135deg, ${ORANGE}, #dc2626)` : 'var(--bg-hover)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: (loading || !input.trim()) ? 0.5 : 1, transition: 'all 0.2s',
                boxShadow: input.trim() ? `0 4px 16px ${ORANGE}40` : 'none',
              }}
            >
              <Send size={14} style={{ color: '#fff' }} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default FloatingAgent;
