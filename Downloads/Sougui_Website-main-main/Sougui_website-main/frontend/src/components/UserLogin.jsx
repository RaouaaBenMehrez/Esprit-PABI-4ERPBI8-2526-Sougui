import React, { useState } from 'react';
import { Mail, Lock, ArrowRight } from 'lucide-react';

const UserLogin = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      onLogin({ email, role: 'customer' });
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sougui-bg p-6 relative overflow-hidden">
      {/* Decorative blurred circles for modern look */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-sougui-gold/20 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-sougui-copper/20 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-[420px] relative z-10">
        <div className="text-center mb-10">
          <h1 className="font-serif text-5xl font-black text-sougui-gold mb-2 tracking-tight">🪬 Sougui Store</h1>
          <p className="text-sougui-text-dim uppercase tracking-[3px] text-xs">Portail Client Exclusif</p>
        </div>

        <div className="premium-card p-10 bg-sougui-surface/80 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl">
          <h2 className="text-2xl font-serif text-sougui-cream font-bold mb-8 text-center">Connexion Client</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-sougui-text-dim font-bold ml-1">Adresse Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-sougui-gold/50 group-focus-within:text-sougui-gold transition-colors" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-sougui-surface-light border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-sougui-text focus:border-sougui-gold focus:ring-1 focus:ring-sougui-gold outline-none transition-all"
                  placeholder="client@email.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-sougui-text-dim font-bold ml-1">Mot d'accès</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-sougui-gold/50 group-focus-within:text-sougui-gold transition-colors" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-sougui-surface-light border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-sougui-text focus:border-sougui-gold focus:ring-1 focus:ring-sougui-gold outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end">
              <a href="#" className="text-xs text-sougui-gold hover:text-sougui-gold-light transition-colors">Mot de passe oublié ?</a>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full gold-gradient py-4 rounded-xl text-sougui-bg font-black text-lg hover:shadow-[0_0_20px_rgba(201,168,76,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:scale-100"
            >
              {loading ? (
                <span className="block w-6 h-6 border-2 border-sougui-bg/30 border-t-sougui-bg rounded-full animate-spin"></span>
              ) : (
                <>Accéder à la boutique <ArrowRight size={20} /></>
              )}
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-sougui-text-dim text-sm">
              Nouveau client ? <a href="#" className="text-sougui-gold hover:underline font-medium">Créer un compte</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserLogin;
