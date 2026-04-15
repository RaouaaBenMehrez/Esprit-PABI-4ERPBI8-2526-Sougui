import React, { useState } from 'react';
import { Lock, User } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://127.0.0.1:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      
      if (data.success) {
        onLogin(data.user);
      } else {
        setError(data.message || 'Erreur lors de la connexion');
      }
    } catch (err) {
      setError('Impossible de se connecter au serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sougui-bg p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="font-serif text-5xl font-black text-sougui-gold mb-2">🪬 Sougui</h1>
          <p className="text-sougui-text-dim uppercase tracking-[3px] text-xs">Smart Business Suite</p>
        </div>

        <div className="premium-card p-10">
          <h2 className="text-2xl font-serif text-sougui-cream font-bold mb-6 text-center">Connexion</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs uppercase tracking-wider text-sougui-text-dim mb-2">Nom d'utilisateur</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-sougui-gold/50" size={18} />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-sougui-bg border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sougui-text focus:border-sougui-gold/50 outline-none transition-all"
                  placeholder="admin"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-sougui-text-dim mb-2">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-sougui-gold/50" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-sougui-bg border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sougui-text focus:border-sougui-gold/50 outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}

            <button 
              type="submit"
              disabled={loading}
              className="w-full gold-gradient py-4 rounded-xl text-sougui-bg font-black text-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? 'Connexion...' : 'S\'authentifier'}
            </button>
          </form>
        </div>
        
        <p className="text-center mt-8 text-sougui-text-dim text-xs">
          Lunar Hack 2.0 — Powered by Sougui AI
        </p>
      </div>
    </div>
  );
};

export default Login;
