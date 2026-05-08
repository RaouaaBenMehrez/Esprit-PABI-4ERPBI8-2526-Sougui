import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Bot, Star } from 'lucide-react';

const AGENT_API = 'http://localhost:8000';

const ChatInterface = ({ user, isFullPage = false }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Bonjour ${user?.username || ''} ! Je suis l'assistante Sougui. Dites-moi ce que vous cherchez — cadeau, décoration, budget — et je vous guide parmi nos créations artisanales tunisiennes. 🪬`,
    },
  ]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [favorites, setFavorites] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    if (user) fetchFavorites();
  }, [user]);

  const fetchFavorites = async () => {
    try {
      const res  = await fetch(`${AGENT_API}/favorites/${user?.id || user?.username}`);
      const data = await res.json();
      setFavorites(data.favorites || []);
    } catch { /* silently fail */ }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    try {
      const res  = await fetch(`${AGENT_API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: user?.id || user?.username, message: userMsg }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        action:  data.action,
        products: data.produits_rag,
        intention: data.intention,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Désolée, l'agent IA est temporairement indisponible. Vérifiez que l'API tourne sur le port 8000.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`flex flex-col rounded-2xl overflow-hidden ${isFullPage ? 'h-[75vh]' : 'h-full'}`}
      style={{
        background: '#07090f',
        border: '1px solid rgba(30,90,255,0.12)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      {isFullPage && (
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{
            background: 'rgba(10,15,30,0.9)',
            borderBottom: '1px solid rgba(30,90,255,0.1)',
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(30,90,255,0.1)', border: '1px solid rgba(30,90,255,0.2)' }}
            >
              <Bot size={22} style={{ color: '#4d7fff' }} />
            </div>
            <div>
              <h2 className="font-bold text-sm" style={{ color: '#e8eef8' }}>Sougui Sales Agent</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#4d6080' }}>
                Gemini 2.5 Flash · RAG ChromaDB
              </p>
            </div>
          </div>
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}
          >
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold" style={{ color: '#22c55e' }}>En ligne</span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-5 space-y-5"
        style={{ background: '#07090f' }}
      >
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={m.role === 'user'
                  ? { background: 'linear-gradient(135deg, #1e5aff, #0f2d80)' }
                  : { background: 'rgba(30,90,255,0.08)', border: '1px solid rgba(30,90,255,0.15)' }
                }
              >
                {m.role === 'user'
                  ? <User size={16} style={{ color: '#fff' }} />
                  : <Bot size={16} style={{ color: '#4d7fff' }} />
                }
              </div>

              {/* Bubble */}
              <div
                className="p-4 rounded-2xl text-sm leading-relaxed"
                style={m.role === 'user'
                  ? {
                      background: 'linear-gradient(135deg, #1e5aff, #0f2d80)',
                      color: '#fff',
                      borderTopRightRadius: '4px',
                    }
                  : {
                      background: 'rgba(15,22,40,0.9)',
                      color: '#cbd5e8',
                      border: '1px solid rgba(30,90,255,0.1)',
                      borderTopLeftRadius: '4px',
                    }
                }
              >
                {m.content}

                {/* Product suggestions */}
                {m.products && m.products.length > 0 && (
                  <div
                    className="mt-4 pt-4 space-y-2"
                    style={{ borderTop: '1px solid rgba(30,90,255,0.1)' }}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5"
                      style={{ color: '#4d7fff' }}
                    >
                      <Star size={10} fill="currentColor" /> Suggestions Sougui
                    </p>
                    {m.products.map((prod, i) => (
                      <div
                        key={i}
                        className="rounded-xl p-3 flex justify-between items-center transition-all cursor-pointer"
                        style={{
                          background: 'rgba(30,90,255,0.06)',
                          border: '1px solid rgba(30,90,255,0.12)',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(30,90,255,0.25)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(30,90,255,0.12)')}
                        onClick={() => setInput(`Plus d'info sur ${prod.nom} (${prod.code})`)}
                      >
                        <div className="flex-1 min-w-0 pr-3">
                          <h4 className="text-xs font-bold truncate" style={{ color: '#e8eef8' }}>{prod.nom}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-black text-xs" style={{ color: '#4d7fff' }}>{prod.prix} DT</span>
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                              style={prod.en_stock
                                ? { background: 'rgba(34,197,94,0.1)', color: '#22c55e' }
                                : { background: 'rgba(239,68,68,0.1)', color: '#ef4444' }
                              }
                            >
                              {prod.en_stock ? 'Stock ✓' : 'Rupture'}
                            </span>
                          </div>
                          {prod.categorie && (
                            <p className="text-[10px] mt-0.5 italic" style={{ color: '#4d6080' }}>
                              {prod.categorie}
                            </p>
                          )}
                        </div>
                        <Send size={13} style={{ color: '#4d7fff' }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(30,90,255,0.08)', border: '1px solid rgba(30,90,255,0.15)' }}
              >
                <Bot size={16} style={{ color: '#4d7fff' }} />
              </div>
              <div
                className="p-4 rounded-2xl"
                style={{
                  background: 'rgba(15,22,40,0.9)',
                  border: '1px solid rgba(30,90,255,0.1)',
                  borderTopLeftRadius: '4px',
                }}
              >
                <div className="flex gap-1.5">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full animate-bounce"
                      style={{ background: '#1e5aff', animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Favorites */}
      {favorites.length > 0 && (
        <div
          className="px-5 py-3"
          style={{ background: 'rgba(10,15,30,0.9)', borderTop: '1px solid rgba(30,90,255,0.08)' }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5"
            style={{ color: '#4d7fff' }}
          >
            <Star size={10} fill="currentColor" /> Favoris
          </p>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar">
            {favorites.map((fav, i) => (
              <button
                key={i}
                onClick={() => setInput(`Infos sur : ${fav.name}`)}
                className="shrink-0 px-3 py-2 rounded-xl text-[11px] font-medium transition-all"
                style={{
                  background: 'rgba(30,90,255,0.06)',
                  border: '1px solid rgba(30,90,255,0.12)',
                  color: '#cbd5e8',
                }}
              >
                {fav.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex gap-3 p-5"
        style={{
          background: 'rgba(10,15,30,0.95)',
          borderTop: '1px solid rgba(30,90,255,0.08)',
        }}
      >
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Posez une question à l'agent IA Sougui..."
          className="flex-1 sougui-input"
        />
        <button
          type="submit"
          id="chat-submit-btn"
          disabled={loading || !input.trim()}
          className="p-4 rounded-2xl transition-all flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #1e5aff, #0f2d80)',
            color: '#fff',
            boxShadow: '0 4px 15px rgba(30,90,255,0.3)',
            opacity: (loading || !input.trim()) ? 0.5 : 1,
          }}
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};

export default ChatInterface;
