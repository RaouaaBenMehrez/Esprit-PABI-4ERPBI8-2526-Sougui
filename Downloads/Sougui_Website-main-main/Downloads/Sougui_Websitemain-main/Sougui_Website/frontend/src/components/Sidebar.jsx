import React from 'react';
import { LayoutDashboard, TrendingUp, Users, ShoppingCart, Bot, LogOut } from 'lucide-react';

const Sidebar = ({ activePage, setActivePage }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'Analytics' },
    { id: 'ventes', label: 'Ventes & CA', icon: TrendingUp, section: 'Analytics' },
    { id: 'clients', label: 'Clients', icon: Users, section: 'Analytics' },
    { id: 'achats', label: 'Achats & Marge', icon: ShoppingCart, section: 'Analytics' },
    { id: 'agent', label: 'Sales Agent IA', icon: Bot, section: 'Intelligence' },
  ];

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sougui-surface border-r border-white/5 flex flex-col z-50">
      <div className="p-8 border-b border-white/5">
        <h1 className="font-serif text-2xl font-black text-sougui-gold tracking-tight">🪬 Sougui</h1>
        <p className="text-[10px] text-sougui-text-dim uppercase tracking-[2px] mt-1">Smart Business Suite</p>
      </div>

      <nav className="flex-1 py-6">
        {['Analytics', 'Intelligence'].map((section) => (
          <div key={section} className="mb-6">
            <h3 className="px-8 text-[9px] uppercase tracking-[3px] text-sougui-gold-dim mb-3">
              {section}
            </h3>
            {navItems
              .filter((item) => item.section === section)
              .map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  className={`w-full flex items-center gap-3 px-8 py-3 text-sm font-medium transition-all border-l-2 ${
                    activePage === item.id
                      ? 'text-sougui-gold border-sougui-gold bg-sougui-gold/5'
                      : 'text-sougui-text-dim border-transparent hover:text-sougui-text hover:bg-white/5'
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </button>
              ))}
          </div>
        ))}
      </nav>

      <div className="p-8 border-t border-white/5 text-center">
        <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-500 text-[10px] font-bold px-3 py-1 rounded-full mb-2">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          LIVE
        </div>
        <p className="text-[11px] text-sougui-text-dim">Données temps réel</p>
      </div>
    </aside>
  );
};

export default Sidebar;
