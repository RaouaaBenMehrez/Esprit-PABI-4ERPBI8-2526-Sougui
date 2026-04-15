import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import KpiCard from './components/KpiCard';
import ChartWidget from './components/ChartWidget';
import AiInsightCard from './components/AiInsightCard';
import UnifiedLogin from './components/UnifiedLogin';
import ProductCatalog from './components/ProductCatalog';
import ChatBot from './components/ChatBot';
import ChatInterface from './components/ChatInterface';
import { DollarSign, MousePointer2, ShoppingBag, BarChart3, LogOut, Store, Gift, Handshake, Users, ShieldCheck } from 'lucide-react';

const API_BASE = "http://127.0.0.1:5000/api";

const App = () => {
  const [user, setUser] = useState(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [loginMode, setLoginMode] = useState('admin'); // 'admin' or 'customer'
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [sales, setSales] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        if (activePage === 'ventes') fetchSalesData();
        if (activePage === 'clients') fetchClientsData();
      } else if (user.role === 'customer') {
        fetchProductsData();
      }
    }
  }, [activePage, user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/dashboard`);
      if (!res.ok) throw new Error("API unreachable");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesData = async () => {
    try {
      const res = await fetch(`${API_BASE}/sales`);
      const json = await res.json();
      setSales(json);
    } catch (err) {
      console.error("Failed to fetch sales:", err);
    }
  };

  const fetchClientsData = async () => {
    try {
      const res = await fetch(`${API_BASE}/clients`);
      const json = await res.json();
      setClients(json);
    } catch (err) {
      console.error("Failed to fetch clients:", err);
    }
  };

  const fetchProductsData = async () => {
    try {
      const res = await fetch(`${API_BASE}/products`);
      const json = await res.json();
      setProducts(json);
    } catch (err) {
      console.error("Failed to fetch products:", err);
    }
  };

  // Logout handler
  const handleLogout = () => {
    setUser(null);
    setData(null);
    setProducts([]);
    setActivePage('dashboard');
  };

  // If not logged in, show unified login
  if (!user) {
    return <UnifiedLogin onLogin={setUser} />;
  }

  // Loading state for authenticated admin user
  if (user.role === 'admin' && (loading || !data)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-sougui-bg">
        <div className="text-sougui-gold animate-pulse font-serif text-2xl">Chargement de votre Suite...</div>
      </div>
    );
  }

  const kpiIcons = [Gift, Handshake, Users, ShieldCheck];

  return (
    <div className="flex min-h-screen">
      {user.role === 'admin' ? (
        <>
          <Sidebar activePage={activePage} setActivePage={setActivePage} />
          <main className="flex-1 ml-64 bg-sougui-bg overflow-y-auto pb-20">
            {/* Top Header */}
            <header className="px-10 py-6 border-b border-white/5 sticky top-0 bg-sougui-bg/80 backdrop-blur-md z-40 flex justify-between items-center">
              <div>
                <h2 className="text-sougui-text font-bold">Bienvenue, {user.username} 🪬</h2>
                <p className="text-sougui-text-dim text-xs mt-1">Sougui Artisanat · Dashboard Live</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="bg-sougui-gold/10 border border-sougui-gold/20 text-sougui-gold px-3 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase">
                  2023 – 2026
                </span>
                <button 
                  onClick={handleLogout}
                  className="text-sougui-text-dim hover:text-red-400 transition-colors p-2"
                  title="Déconnexion"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </header>

            <div className="p-10">
              {activePage === 'dashboard' && (
                <div className="animate-in fade-in duration-700">
                  {/* --- TOP ROW: BANNER & TOP CHARTS --- */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
                    {/* Sougui Banner */}
                    <div className="lg:col-span-7 bg-[#3F3D99] rounded-2xl overflow-hidden flex relative min-h-[220px] shadow-lg">
                      <div className="flex-1 p-8 text-white z-10 flex flex-col justify-center">
                        <h1 className="text-5xl font-sans font-black mb-4 tracking-tighter">Sougui.tn</h1>
                        <p className="text-sm text-white/80 max-w-sm leading-relaxed">
                          Sougui is a Tunisian startup that modernizes craftsmanship with refined, unique pieces for tableware and home decor, blending tradition and contemporary design.
                        </p>
                      </div>
                      <div className="flex-1 relative overflow-hidden hidden md:block">
                        <img 
                          src="https://images.unsplash.com/photo-1606722590583-6951b5ea92da?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                          alt="Artisanat" 
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#3F3D99] via-[#3F3D99]/40 to-transparent"></div>
                      </div>
                    </div>

                    {/* Top Right Charts */}
                    <div className="lg:col-span-3">
                         <ChartWidget title="Revenue Breakdown by Channel" type="pie" data={data.canalData} compact={true} />
                    </div>
                    <div className="lg:col-span-2">
                       <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-full flex flex-col items-center justify-center text-center">
                          <h3 className="text-[10px] uppercase font-bold text-gray-400 mb-4 tracking-widest">Dependency_Ratio</h3>
                          <div className="relative w-32 h-16 overflow-hidden">
                             <div className="absolute inset-0 rounded-t-full border-[12px] border-gray-100"></div>
                             <div className="absolute inset-0 rounded-t-full border-[12px] border-blue-500 clip-path-half" style={{ transform: `rotate(${((data.ratio || 0) / 1.77) * 180}deg)` }}></div>
                             <div className="absolute bottom-0 left-0 right-0 text-center font-black text-xl text-gray-800">{data.ratio}</div>
                          </div>
                          <div className="flex justify-between w-full text-[10px] text-gray-400 mt-2">
                             <span>0,00</span>
                             <span>1,77</span>
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* --- SECOND ROW: KPI CARDS --- */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    {data.kpis.map((kpi, idx) => (
                      <KpiCard key={idx} {...kpi} icon={kpiIcons[idx]} />
                    ))}
                  </div>

                  {/* --- THIRD ROW: TREND CHART --- */}
                  <div className="mb-8">
                    <ChartWidget title="Monthly Revenue Trend" type="line" data={data.mainChart} fullWidth={true} />
                  </div>

                  {/* --- BOTTOM ROW: THREE CHARTS --- */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <ChartWidget title="Revenue by Year" type="bar" data={data.mainChart} />
                    <ChartWidget title="Total Smart Revenue by Channel" type="bar" horizontal={true} data={data.canalData} />
                    <ChartWidget title="Seasonality" type="bar" data={data.seasonality} />
                  </div>
                </div>
              )}

              {activePage === 'ventes' && (
                <div className="animate-in fade-in duration-500">
                  <div className="mb-10">
                    <h1 className="font-serif text-4xl font-bold text-sougui-cream">Transactions <span className="text-sougui-gold">Détaillées</span></h1>
                  </div>
                  <div className="premium-card overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/5">
                          <th className="p-4 text-xs uppercase tracking-wider text-sougui-text-dim">Date</th>
                          <th className="p-4 text-xs uppercase tracking-wider text-sougui-text-dim">Client ID</th>
                          <th className="p-4 text-xs uppercase tracking-wider text-sougui-text-dim">Canal</th>
                          <th className="p-4 text-xs uppercase tracking-wider text-sougui-text-dim text-right">Montant (DT)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sales.map((sale) => (
                          <tr key={sale.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="p-4 text-sm">{sale.date}</td>
                            <td className="p-4 text-sm">#{sale.client_id}</td>
                            <td className="p-4 text-sm font-medium text-sougui-gold">{sale.channel}</td>
                            <td className="p-4 text-sm text-right font-bold">{sale.amount.toLocaleString()} DT</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activePage === 'clients' && (
                <div className="animate-in fade-in duration-500">
                  <div className="mb-10">
                    <h1 className="font-serif text-4xl font-bold text-sougui-cream">Portefeuille <span className="text-sougui-gold">Clients</span></h1>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {clients.map((client) => (
                      <div key={client.id} className="premium-card p-6 hover:-translate-y-1 transition-transform">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="font-bold text-sougui-cream">{client.name}</h3>
                          <span className={`text-[10px] px-2 py-1 rounded font-bold ${client.type === 'B2B' ? 'bg-blue-500/10 text-blue-400' : 'bg-sougui-gold/10 text-sougui-gold'}`}>
                            {client.type}
                          </span>
                        </div>
                        <div className="text-xs text-sougui-text-dim mb-1">Total dépensé</div>
                        <div className="text-xl font-serif text-sougui-gold font-bold">{client.total_spent.toLocaleString()} DT</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activePage === 'agent' && (
                <div className="animate-in zoom-in-95 duration-500 min-h-[700px]">
                  <ChatInterface user={user} isFullPage={true} />
                </div>
              )}
            </div>
          </main>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <ProductCatalog onLogout={handleLogout} user={user} products={products} />
        </div>
      )}
      <ChatBot user={user} />
    </div>
  );
};

export default App;
