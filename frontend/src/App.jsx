import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import CeoDashboard from './components/dashboards/CeoDashboard';
import MarketingDashboard from './components/dashboards/MarketingDashboard';
import CommercialDashboard from './components/dashboards/CommercialDashboard';

/* ── Route types: 'landing' | 'login' | 'dashboard' ──────────── */
const App = () => {
  const [view, setView] = useState('landing');  // start on landing page
  const [user, setUser] = useState(null);

  const handleLogin = (userData) => {
    setUser(userData);
    setView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setView('landing');
  };

  const renderDashboard = () => {
    const role = user?.role;
    if (role === 'ceo')        return <CeoDashboard        user={user} onLogout={handleLogout} />;
    if (role === 'marketing')  return <MarketingDashboard  user={user} onLogout={handleLogout} />;
    if (role === 'commercial') return <CommercialDashboard user={user} onLogout={handleLogout} />;
    // Admin ou rôle inconnu → CEO par défaut
    return <CeoDashboard user={user} onLogout={handleLogout} />;
  };

  return (
    <ThemeProvider>
      {view === 'landing'   && <LandingPage onNavigate={setView} />}
      {view === 'login'     && <LoginPage onLogin={handleLogin} onBack={() => setView('landing')} />}
      {view === 'dashboard' && user && renderDashboard()}
    </ThemeProvider>
  );
};

export default App;
