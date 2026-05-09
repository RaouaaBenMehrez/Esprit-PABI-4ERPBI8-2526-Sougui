import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, User, Send, X, Mic, MicOff, Minimize2, MessageCircle, Volume2, VolumeX, Maximize2 } from 'lucide-react';

const AGENT  = 'http://localhost:8000';
const ORANGE = '#f97316';

const QUICK = ['Produits en stock', 'Cadeau mariage', 'Budget 50 DT', 'Poterie artisanale', 'Bijoux'];

const SIZES = {
  compact: { width: 340, height: 460 },
  normal:  { width: 400, height: 560 },
  large:   { width: 520, height: 680 },
};

// Default position (bottom-right)
const DEFAULT_POS = { x: null, y: null }; // null = use CSS default

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

/* ══ FLOATING AGENT — icône + chat bougent ensemble ══════════════════════ */
const FloatingAgent = ({ user }) => {
  const [open, setOpen]         = useState(false);
  const [size, setSize]         = useState('normal');
  const [messages, setMessages] = useState([{
    role: 'bot',
    content: `Bonjour${user?.username ? ` ${user.username}` : ''} ! Je suis Sougui, votre assistante artisanale. 🌿 Comment puis-je vous aider ?`
  }]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [agentOnline, setAgentOnline] = useState(false);

  // ── Drag unifié : UNE seule position pour icône + fenêtre ──
  const [pos, setPos]         = useState(DEFAULT_POS); // { x, y } = coin bas-droit de l'icône
  const dragging              = useRef(false);
  const dragOffset            = useRef({ x: 0, y: 0 });
  const btnRef                = useRef(null);
  const clickProtect          = useRef(false); // éviter click après drag

  // Voice
  const [listening, setListening]   = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const recogRef = useRef(null);

  const endRef = useRef(null);

  /* ── Agent health check ── */
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

  /* ── Global drag handlers ── */
  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const btnW = btnRef.current?.offsetWidth  || 56;
      const btnH = btnRef.current?.offsetHeight || 56;
      const newX = Math.min(Math.max(clientX - dragOffset.current.x, 0), window.innerWidth  - btnW);
      const newY = Math.min(Math.max(clientY - dragOffset.current.y, 0), window.innerHeight - btnH);
      setPos({ x: newX, y: newY });
      clickProtect.current = true;
    };
    const onUp = () => { dragging.current = false; };

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

  /* ── Start drag (sur le bouton) ── */
  const startDrag = useCallback((e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rect = btnRef.current?.getBoundingClientRect();
    dragOffset.current = { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) };
    dragging.current   = true;
    clickProtect.current = false;
    e.preventDefault();
  }, []);

  /* ── Toggle open (protégé contre faux clicks après drag) ── */
  const handleBtnClick = useCallback(() => {
    if (clickProtect.current) { clickProtect.current = false; return; }
    setOpen(o => !o);
  }, []);

  /* ── Calcul de position de la fenêtre chat (toujours au-dessus/gauche de l'icône) ── */
  const BTN_SIZE = 56;
  const GAP      = 12;
  const { width: winW, height: winH } = SIZES[size];

  let btnStylePos, winStylePos;

  if (pos.x !== null) {
    // Position custom après drag
    const bx = pos.x;
    const by = pos.y;
    btnStylePos = { position: 'fixed', left: bx, top: by };

    // Essayer d'afficher la fenêtre au-dessus du bouton
    let winTop  = by - winH - GAP;
    let winLeft = bx - winW + BTN_SIZE;
    // Recadrage si hors écran
    if (winTop < 8)                         winTop  = by + BTN_SIZE + GAP;
    if (winLeft < 8)                        winLeft = 8;
    if (winLeft + winW > window.innerWidth) winLeft = window.innerWidth - winW - 8;

    winStylePos = { position: 'fixed', left: winLeft, top: winTop };
  } else {
    // Position par défaut : coin bas-droit
    btnStylePos = { position: 'fixed', right: 28, bottom: 28 };
    winStylePos = { position: 'fixed', right: 28, bottom: 28 + BTN_SIZE + GAP };
  }

  /* ── Voice ── */
  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Votre navigateur ne supporte pas la reconnaissance vocale. Essayez Chrome.'); return; }
    if (recogRef.current) { try { recogRef.current.stop(); } catch {} }
    const recog = new SR();
    recog.lang = 'fr-FR'; recog.continuous = false; recog.interimResults = true;
    recog.onstart  = () => setListening(true);
    recog.onresult = (e) => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t; else interim += t;
      }
      setInput(final || interim);
    };
    recog.onend = () => {
      setListening(false);
      setInput(prev => { if (prev.trim()) setTimeout(() => document.getElementById('agent-send-btn')?.click(), 100); return prev; });
    };
    recog.onerror = (e) => { setListening(false); if (e.error !== 'no-speech' && e.error !== 'aborted') console.warn('[Voice]', e.error); };
    recogRef.current = recog;
    recog.start();
  }, []);

  const stopListening = useCallback(() => { try { recogRef.current?.stop(); } catch {} setListening(false); }, []);

  /* ── TTS ── */
  const speak = useCallback((text) => {
    if (!ttsEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text.slice(0, 200));
    utt.lang = 'fr-FR'; utt.rate = 1.05; utt.pitch = 1;
    const frVoice = window.speechSynthesis.getVoices().find(v => v.lang.startsWith('fr'));
    if (frVoice) utt.voice = frVoice;
    window.speechSynthesis.speak(utt);
  }, [ttsEnabled]);

  /* ── Send message ── */
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
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: user?.id ? `${user.id}-${user.role}` : `guest-${Date.now()}`, message: msg }),
          signal: AbortSignal.timeout(8000),
        });
        if (r.ok) {
          const data = await r.json();
          botReply = { role: 'bot', content: data.response || data.reponse || 'Réponse reçue.', products: data.produits_rag || [] };
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

  const cycleSize = () => {
    const order = ['compact', 'normal', 'large'];
    setSize(s => order[(order.indexOf(s) + 1) % order.length]);
  };

  const statusColor = agentOnline ? '#22c55e' : ORANGE;
  const statusLabel = agentOnline ? 'En ligne' : 'Mode local';

  return (
    <>
      {/* ── Floating button ── */}
      <div
        ref={btnRef}
        className="floating-agent-btn"
        style={{
          ...btnStylePos,
          cursor: dragging.current ? 'grabbing' : 'grab',
          zIndex: 9999,
          userSelect: 'none',
          width: BTN_SIZE, height: BTN_SIZE,
        }}
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        onClick={handleBtnClick}
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
          className="floating-agent-window anim-fade-up"
          style={{
            ...winStylePos,
            width: winW, height: winH,
            zIndex: 9998, display: 'flex', flexDirection: 'column',
            transition: 'width 0.2s, height 0.2s',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 14px', cursor: 'move', flexShrink: 0,
              background: `linear-gradient(135deg, ${ORANGE}22, var(--bg-surface))`,
              borderBottom: '1px solid var(--border)', userSelect: 'none',
              borderRadius: '16px 16px 0 0',
            }}
            onMouseDown={startDrag}
            onTouchStart={startDrag}
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

            <div style={{ display: 'flex', gap: 5 }}>
              <button onClick={(e) => { e.stopPropagation(); setTtsEnabled(t => !t); }}
                style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer', background: ttsEnabled ? `${ORANGE}20` : 'var(--bg-hover)', color: ttsEnabled ? ORANGE : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title={ttsEnabled ? 'Désactiver la voix' : 'Activer la voix'}>
                {ttsEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); cycleSize(); }}
                style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'var(--bg-hover)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title={`Taille : ${size}`}>
                {size === 'large' ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); setOpen(false); }}
                style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'var(--bg-hover)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Réduire">
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
                    {m.role === 'user' ? <User size={12} style={{ color: '#fff' }} /> : <Bot size={12} style={{ color: ORANGE }} />}
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
                          <div key={pi} style={{ padding: '7px 10px', borderRadius: 8, background: `${ORANGE}08`, border: `1px solid ${ORANGE}20`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${ORANGE}18`, border: `1px solid ${ORANGE}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bot size={12} style={{ color: ORANGE }} />
                </div>
                <div style={{ padding: '10px 12px', borderRadius: 12, background: 'var(--bg-surface)', border: '1px solid var(--border)', display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: ORANGE, animation: 'pulseDot 1.2s infinite', animationDelay: `${i * 0.2}s` }} />
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
                style={{ flexShrink: 0, padding: '4px 10px', borderRadius: 9999, background: 'var(--bg-hover)', border: '1px solid var(--border)', fontSize: 10, color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {q}
              </button>
            ))}
          </div>

          {/* Input form */}
          <form onSubmit={handleSubmit}
            style={{ display: 'flex', gap: 8, padding: '10px 12px', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)', flexShrink: 0, borderRadius: '0 0 16px 16px' }}>
            <button type="button" onClick={listening ? stopListening : startListening}
              style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: listening ? `${ORANGE}25` : 'var(--bg-hover)', border: `1px solid ${listening ? ORANGE : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', animation: listening ? 'pulseDot 1s infinite' : 'none' }}
              title={listening ? 'Cliquer pour arrêter' : 'Cliquer pour parler'}>
              {listening ? <MicOff size={14} style={{ color: ORANGE }} /> : <Mic size={14} style={{ color: 'var(--text-muted)' }} />}
            </button>

            <input type="text" value={input} onChange={e => setInput(e.target.value)}
              placeholder={listening ? '🎤 Écoute en cours...' : 'Écrivez votre message...'}
              className="s-input" style={{ flex: 1, padding: '8px 12px', fontSize: 12 }} />

            <button id="agent-send-btn" type="submit" disabled={loading || !input.trim()}
              style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0, background: (!loading && input.trim()) ? `linear-gradient(135deg, ${ORANGE}, #dc2626)` : 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (loading || !input.trim()) ? 0.5 : 1, transition: 'all 0.2s', boxShadow: input.trim() ? `0 4px 16px ${ORANGE}40` : 'none' }}>
              <Send size={14} style={{ color: '#fff' }} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default FloatingAgent;
