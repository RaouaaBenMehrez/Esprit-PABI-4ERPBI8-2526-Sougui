import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import CeoDashboard from './components/dashboards/CeoDashboard';
import MarketingDashboard from './components/dashboards/MarketingDashboard';
import CommercialDashboard from './components/dashboards/CommercialDashboard';

const API = 'http://127.0.0.1:5000/api';

/* ── Route types: 'landing' | 'login' | 'dashboard' ──────────── */
const App = () => {
  const [view, setView] = useState(() => {
    // 1. Si l'utilisateur est connecté → dashboard
    if (localStorage.getItem('sougui_user')) return 'dashboard';
    // 2. Sinon, restaurer la dernière vue depuis sessionStorage (conserve la page au F5)
    return sessionStorage.getItem('sougui_view') || 'landing';
  });

  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sougui_user') || 'null'); }
    catch { return null; }
  });

  // Sauvegarder la vue courante dans sessionStorage (persiste au F5)
  useEffect(() => {
    sessionStorage.setItem('sougui_view', view);
  }, [view]);

  // Charger avatar + permissions après login (ou refresh)
  const enrichUser = async (userData) => {
    try {
      const res  = await fetch(`${API}/profile/${userData.id}`);
      const data = await res.json();
      return { ...userData, avatar_url: data.avatar_url || '', email: data.email || '', permissions: data.permissions || null };
    } catch { return userData; }
  };

  const handleLogin = async (userData) => {
    const enriched = await enrichUser(userData);
    setUser(enriched);
    localStorage.setItem('sougui_user', JSON.stringify(enriched));
    setView('dashboard');
  };

  // Re-enrichir au refresh (pour avoir l'avatar à jour)
  useEffect(() => {
    if (user?.id) {
      enrichUser(user).then(enriched => {
        setUser(enriched);
        localStorage.setItem('sougui_user', JSON.stringify(enriched));
      });
    }
  }, []); // eslint-disable-line

  // Mettre à jour user (avatar, email…) depuis les enfants
  const updateUser = (partial) => {
    setUser(prev => {
      const updated = { ...prev, ...partial };
      localStorage.setItem('sougui_user', JSON.stringify(updated));
      return updated;
    });
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('sougui_user');
    sessionStorage.setItem('sougui_view', 'landing');
    setView('landing');
  };

  const renderDashboard = () => {
    const role = user?.role;
    const props = { user, onLogout: handleLogout, onUpdateUser: updateUser };
    if (role === 'marketing')  return <MarketingDashboard  {...props} />;
    if (role === 'commercial') return <CommercialDashboard {...props} />;
    return <CeoDashboard {...props} />;   // ceo + admin + tout rôle inconnu
  };

  return (
    <LanguageProvider>
      <ThemeProvider>
        {view === 'landing'   && <LandingPage onNavigate={setView} />}
        {view === 'login'     && <LoginPage onLogin={handleLogin} onBack={() => setView('landing')} />}
        {view === 'dashboard' && user && renderDashboard()}
      </ThemeProvider>
    </LanguageProvider>
  );
};

export default App;
