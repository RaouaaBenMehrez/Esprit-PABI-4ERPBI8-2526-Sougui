import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Bot, Star } from 'lucide-react';

const AGENT_API = "http://localhost:8000";

const ChatInterface = ({ user, isFullPage = false }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Bonjour ${user?.username || ''} ! Je suis Sougui, votre conseillère artisanale. Comment puis-je vous aider aujourd'hui ?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  const fetchFavorites = async () => {
    try {
      const res = await fetch(`${AGENT_API}/favorites/${user?.id || user?.username}`);
      const data = await res.json();
      setFavorites(data.favorites || []);
    } catch (err) {
      console.error("Failed to fetch favorites:", err);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch(`${AGENT_API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: user?.id || user?.username,
          message: userMsg
        })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.response, 
        action: data.action,
        products: data.produits_rag
      }]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [...prev, { role: 'assistant', content: "Désolée, j'ai un petit problème technique. Réessayez dans un moment !" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col bg-sougui-bg border border-gray-200 rounded-2xl overflow-hidden shadow-2xl ${isFullPage ? 'h-[75vh]' : 'h-full'}`}>
      {/* Header if Full Page */}
      {isFullPage && (
        <div className="bg-sougui-gold/5 p-6 border-b border-gray-100 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-sougui-gold/10 rounded-full flex items-center justify-center text-sougui-gold">
                <Bot size={28} />
              </div>
              <div>
                <h2 className="font-serif text-xl font-bold text-sougui-text">Sales Agent Intelligence</h2>
                <p className="text-sougui-text-dim text-xs uppercase tracking-widest font-bold">Assistant Virtuel Artisanat</p>
              </div>
           </div>
           <div className="flex gap-2">
              <div className="px-3 py-1 bg-green-500/10 text-green-600 text-[10px] font-bold rounded-full border border-green-500/20 uppercase">Online</div>
           </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-4 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${m.role === 'user' ? 'bg-sougui-gold text-white' : 'bg-gray-50 text-sougui-gold border border-gray-100'}`}>
                {m.role === 'user' ? <User size={20} /> : <Bot size={20} />}
              </div>
              <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                m.role === 'user' 
                ? 'bg-sougui-gold text-white rounded-tr-none font-medium' 
                : 'bg-gray-50 text-sougui-text border border-gray-100 rounded-tl-none shadow-sm'
              }`}>
                {m.content}
                
                {m.products && m.products.length > 0 && (
                  <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                    <p className="text-[10px] text-sougui-gold font-bold uppercase tracking-widest mb-2 flex items-center gap-1">
                      <Star size={10} fill="currentColor" /> Suggestions pour vous
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {m.products.map((prod, i) => (
                        <div key={i} className="bg-white border border-gray-100 rounded-xl p-3 flex justify-between items-center group hover:border-sougui-gold/40 transition-all shadow-sm">
                          <div className="flex-1 min-w-0 pr-3">
                            <h4 className="text-sougui-text text-xs font-bold truncate">{prod.nom}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sougui-gold font-black text-xs">{prod.prix} DT</span>
                              <span className="text-[9px] text-sougui-text-dim px-1.5 py-0.5 bg-gray-50 rounded border border-gray-100">ID: {prod.code}</span>
                              <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${prod.en_stock ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                                {prod.en_stock ? 'En Stock' : 'Rupture'}
                              </span>
                            </div>
                            <div className="text-[9px] text-sougui-text-dim mt-1 italic">
                              {prod.matiere && `Matière: ${prod.matiere}`} {prod.categorie && `· ${prod.categorie}`}
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              setInput(`Donne-moi plus d'informations sur le produit ${prod.nom} (${prod.code})`);
                              setTimeout(() => document.getElementById('chat-submit-btn')?.click(), 100);
                            }}
                            className="shrink-0 w-8 h-8 rounded-full bg-sougui-gold/10 text-sougui-gold flex items-center justify-center hover:bg-sougui-gold hover:text-white transition-all shadow-sm"
                          >
                            <Send size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {m.action === 'recommandation' && (
                  <div className="mt-3 pt-3 border-t border-gray-100 text-[10px] text-sougui-gold flex items-center gap-2 font-bold uppercase tracking-tighter">
                    <Star size={12} fill="currentColor" /> Recommandation Spéciale Sougui
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-50 p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-sougui-gold rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-sougui-gold rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 bg-sougui-gold rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Favorites / Context Bar */}
      {favorites.length > 0 && (
        <div className="bg-white/80 backdrop-blur-md border-t border-gray-100 p-3">
          <div className="text-[10px] text-sougui-gold uppercase tracking-widest px-3 mb-2 font-bold flex items-center gap-2">
            <Star size={10} fill="currentColor" /> Articles Favoris du Client
          </div>
          <div className="flex gap-2 px-2 overflow-x-auto hide-scrollbar pb-1">
            {favorites.map((fav, i) => (
              <button 
                key={i}
                onClick={() => setInput(`Analysez le potentiel de : ${fav.name}`)}
                className="shrink-0 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-[11px] text-sougui-text hover:border-sougui-gold/50 hover:bg-white transition-all shadow-sm"
              >
                {fav.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-6 bg-white border-t border-gray-100 flex gap-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Posez une question à l'agent commercial..."
          className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-sm text-sougui-text focus:outline-none focus:border-sougui-gold transition-all shadow-inner"
        />
        <button
          type="submit"
          id="chat-submit-btn"
          disabled={loading || !input.trim()}
          className="bg-sougui-gold text-white p-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-sougui-gold/20 disabled:opacity-50"
        >
          <Send size={24} />
        </button>
      </form>
    </div>
  );
};

export default ChatInterface;
