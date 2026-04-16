import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, ShieldCheck, ShoppingBag, Store } from 'lucide-react';

const UnifiedLogin = ({ onLogin }) => {
  const [role, setRole] = useState('customer'); // 'customer' or 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (role === 'admin') {
        const response = await fetch('http://127.0.0.1:5000/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: email, password })
        });
        const data = await response.json();
        if (data.success) {
          onLogin({ ...data.user, role: 'admin' });
        } else {
          setError(data.message || 'Identifiants invalides');
        }
      } else {
        // Simulate customer login for now
        setTimeout(() => {
          onLogin({ email, role: 'customer' });
        }, 800);
      }
    } catch (err) {
      setError("Erreur de connexion au serveur");
    } finally {
      if (role === 'admin') setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sougui-bg p-6 relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-sougui-gold/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-sougui-copper/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-[440px] relative z-10">
        <div className="text-center mb-10">
          <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-md">
            <span className="text-[10px] uppercase tracking-[4px] text-sougui-gold font-bold">Smart Business Suite</span>
          </div>
          <h1 className="font-serif text-6xl font-black text-white mb-2 tracking-tight">🪬 Sougui</h1>
        </div>

        <div className="premium-card p-1 bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-[2rem] overflow-hidden">
          {/* Internal Switcher */}
          <div className="flex p-2 gap-2 bg-black/20 rounded-t-[1.8rem]">
            <button 
              onClick={() => { setRole('customer'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all ${role === 'customer' ? 'bg-sougui-gold text-sougui-bg shadow-lg' : 'text-sougui-text-dim hover:text-white'}`}
            >
              <ShoppingBag size={14} /> Boutique
            </button>
            <button 
              onClick={() => { setRole('admin'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all ${role === 'admin' ? 'bg-sougui-gold text-sougui-bg shadow-lg' : 'text-sougui-text-dim hover:text-white'}`}
            >
              <ShieldCheck size={14} /> Admin
            </button>
          </div>

          <div className="p-10 pt-8">
            <div className="mb-8">
              <h2 className="text-2xl font-serif text-sougui-cream font-bold mb-2">
                {role === 'customer' ? 'Accès Boutique' : 'Console de Gestion'}
              </h2>
              <p className="text-sm text-sougui-text-dim">
                {role === 'customer' 
                  ? 'Connectez-vous pour explorer nos collections artisanales.' 
                  : 'Espace réservé aux administrateurs de la suite Sougui.'}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-sougui-gold font-black ml-1">
                  {role === 'customer' ? 'Email' : 'Identifiant'}
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-sougui-text-dim group-focus-within:text-sougui-gold transition-colors" size={18} />
                  <input 
                    type={role === 'customer' ? 'email' : 'text'} 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sougui-text focus:border-sougui-gold focus:ring-1 focus:ring-sougui-gold/50 outline-none transition-all placeholder:text-white/10"
                    placeholder={role === 'customer' ? 'votre@email.com' : 'Nom d\'utilisateur'}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-sougui-gold font-black ml-1">Mot de passe</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-sougui-text-dim group-focus-within:text-sougui-gold transition-colors" size={18} />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sougui-text focus:border-sougui-gold focus:ring-1 focus:ring-sougui-gold/50 outline-none transition-all placeholder:text-white/10"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full gold-gradient py-5 rounded-2xl text-sougui-bg font-black text-lg hover:shadow-[0_0_30px_rgba(201,168,76,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70"
              >
                {loading ? (
                  <span className="w-6 h-6 border-2 border-sougui-bg/30 border-t-sougui-bg rounded-full animate-spin"></span>
                ) : (
                  <>Se connecter <ArrowRight size={20} /></>
                )}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-8 text-center text-sougui-text-dim text-xs tracking-widest uppercase">
          Tunisian Excellence • Powered by Sougui AI
        </div>
      </div>
    </div>
  );
};

export default UnifiedLogin;
