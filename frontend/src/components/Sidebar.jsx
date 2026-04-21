import React from 'react';
import { LayoutDashboard, TrendingUp, Users, ShoppingCart, Bot, BrainCircuit } from 'lucide-react';
import logoUrl from '../assets/Logo.png';

const Sidebar = ({ activePage, setActivePage }) => {
  const navItems = [
    { id: 'dashboard',   label: 'Dashboard',      icon: LayoutDashboard, section: 'Analytics' },
    { id: 'ventes',      label: 'Ventes & CA',     icon: TrendingUp,      section: 'Analytics' },
    { id: 'clients',     label: 'Clients',         icon: Users,           section: 'Analytics' },
    { id: 'predictions', label: 'Prédictions IA',  icon: BrainCircuit,    section: 'Intelligence' },
    { id: 'agent',       label: 'Sales Agent IA',  icon: Bot,             section: 'Intelligence' },
  ];

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 flex flex-col z-50"
      style={{
        background: 'linear-gradient(180deg, #05080f 0%, #0a0f1e 100%)',
        borderRight: '1px solid rgba(30,90,255,0.1)',
      }}
    >
      {/* Logo Block */}
      <div className="flex flex-col items-center py-8 px-6"
        style={{ borderBottom: '1px solid rgba(30,90,255,0.08)' }}
      >
        <div className="w-20 h-20 flex items-center justify-center mb-3"
          style={{
            background: 'rgba(30,90,255,0.08)',
            borderRadius: '20px',
            border: '1px solid rgba(30,90,255,0.15)',
            padding: '10px',
          }}
        >
          <img
            src={logoUrl}
            alt="Sougui Logo"
            className="w-full h-full object-contain"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML =
                '<span style="font-size:32px;color:#1e5aff">🪬</span>';
            }}
          />
        </div>
        <h1 className="font-serif text-xl font-black tracking-tight mt-1"
          style={{ color: '#e8eef8' }}
        >
          Sougui
        </h1>
        <p className="text-[9px] uppercase tracking-[3px] mt-1 font-bold"
          style={{ color: '#4d6080' }}
        >
          Smart Business Suite
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-6 overflow-y-auto">
        {['Analytics', 'Intelligence'].map((section) => (
          <div key={section} className="mb-6">
            <h3
              className="px-6 mb-2 text-[9px] uppercase font-bold tracking-[3px]"
              style={{ color: '#2d3f5e' }}
            >
              {section}
            </h3>
            {navItems
              .filter((it) => it.section === section)
              .map((item) => {
                const active = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActivePage(item.id)}
                    className="sidebar-item w-full text-left"
                    style={active ? {
                      color: '#4d7fff',
                      borderLeftColor: '#1e5aff',
                      background: 'rgba(30,90,255,0.06)',
                    } : {}}
                  >
                    <item.icon size={17} />
                    {item.label}
                    {active && (
                      <span
                        className="ml-auto w-1.5 h-1.5 rounded-full"
                        style={{ background: '#1e5aff' }}
                      />
                    )}
                  </button>
                );
              })}
          </div>
        ))}
      </nav>

      {/* Live indicator */}
      <div className="p-6 text-center" style={{ borderTop: '1px solid rgba(30,90,255,0.08)' }}>
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-2"
          style={{
            background: 'rgba(30,90,255,0.08)',
            border: '1px solid rgba(30,90,255,0.15)',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: '#1e5aff' }}
          />
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#4d7fff' }}>
            LIVE
          </span>
        </div>
        <p className="text-[10px]" style={{ color: '#2d3f5e' }}>PostgreSQL · Données temps réel</p>
      </div>
    </aside>
  );
};

export default Sidebar;
