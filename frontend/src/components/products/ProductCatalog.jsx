import React, { useState } from 'react';
import ProductCard from './ProductCard';
import { Search, ShoppingBag, User, Heart, Filter, ChevronDown, List, Grid } from 'lucide-react';

const ProductCatalog = ({ onLogout, user, products }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState("Tout");
  const [priceRange, setPriceRange] = useState(400);

  const categories = ["BOUTIQUES", "DÉCORATION", "ARTS DE LA TABLE", "COUFFINS & FOUTAS", "GIFTS", "RECYCL'ART", "JEUX", "BLOG"];

  const filteredProducts = (products || []).filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === "Tout" || product.category.includes(activeCategory);
    return matchesSearch && matchesCategory && (product.price <= priceRange);
  });

  return (
    <div className="min-h-screen bg-sougui-bg flex flex-col font-sans">
      {/* --- TOP HEADER (As in Photo) --- */}
      <header className="bg-white px-10 py-5 flex items-center justify-between border-b border-gray-100 shadow-sm sticky top-0 z-50">
        {/* Logo */}
        <div className="flex items-center gap-2">
            <h1 className="font-serif text-3xl font-black text-sougui-bg tracking-tighter">🪬 Sougui</h1>
        </div>

        {/* Search Bar Central */}
        <div className="flex-1 max-w-2xl px-10">
          <div className="relative group">
            <input 
              type="text" 
              placeholder="Search for products"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-full py-3 px-6 pl-12 text-sm focus:bg-white focus:border-sougui-gold outline-none transition-all shadow-inner"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-sougui-gold" size={18} />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="text-right">
                <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Connecté tant que</div>
                <div className="text-xs font-black text-gray-900">{user?.username || user?.email}</div>
            </div>
            <button 
              onClick={onLogout}
              className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all border border-gray-100"
              title="Déconnexion"
            >
              <User size={18} />
            </button>
          </div>
          <div className="flex items-center gap-4 border-l border-gray-100 pl-8">
            <div className="relative cursor-pointer group">
                <ShoppingBag size={24} className="text-sougui-bg group-hover:text-sougui-gold transition-colors" />
                <span className="absolute -top-2 -right-2 bg-sougui-gold text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">0</span>
            </div>
            <div className="hidden lg:block text-xs font-bold text-gray-900">0,00 TND</div>
          </div>
        </div>
      </header>

      {/* --- HORIZONTAL NAVIGATION --- */}
      <nav className="bg-white border-b border-gray-100 py-3 overflow-x-auto hide-scrollbar shadow-sm">
        <div className="container mx-auto px-10 flex justify-center gap-10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat === "BOUTIQUES" ? "Tout" : cat)}
              className={`text-[11px] font-black tracking-widest transition-all hover:text-sougui-gold ${
                (activeCategory === cat || (cat === "BOUTIQUES" && activeCategory === "Tout")) ? 'text-sougui-gold border-b-2 border-sougui-gold pb-1' : 'text-gray-900 border-b-2 border-transparent pb-1'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </nav>

      {/* --- HERO / BREADCRUMB --- */}
      <section className="bg-[url('https://images.unsplash.com/photo-1513519245088-0e12902e5a38?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center h-80 relative flex items-center justify-center">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"></div>
        <div className="relative text-center">
            <h1 className="text-7xl font-sans font-black text-white tracking-tighter drop-shadow-2xl opacity-90 italic">Shop</h1>
            <div className="flex items-center justify-center gap-2 text-white/80 text-xs mt-4 uppercase tracking-[3px] font-bold">
                <span>Accueil</span> / <span className="text-sougui-gold">Shop</span>
            </div>
        </div>
      </section>

      {/* --- MAIN CONTENT (Two Columns) --- */}
      <div className="container mx-auto px-10 py-12 flex gap-12">
        
        {/* Sidebar Filters */}
        <aside className="w-72 flex-shrink-0 animate-in fade-in slide-in-from-left-4 duration-500">
           <div className="space-y-10">
              {/* Filter By Price */}
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 border-b-2 border-gray-100 pb-2 mb-6">Filter by Price</h3>
                <input 
                    type="range" 
                    min="20" 
                    max="1000" 
                    value={priceRange}
                    onChange={(e) => setPriceRange(e.target.value)}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-sougui-gold mb-4"
                />
                <div className="flex justify-between items-center text-xs font-bold text-gray-600">
                    <span>Prix : 20 TND — {priceRange} TND</span>
                    <button className="bg-gray-100 px-4 py-1.5 rounded-md hover:bg-sougui-gold hover:text-white transition-all uppercase text-[10px]">Filtrer</button>
                </div>
              </div>

              {/* Filter By Category */}
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 border-b-2 border-gray-100 pb-2 mb-6">Catégories</h3>
                <div className="space-y-3">
                   {["Artisanat", "Décoration", "Poterie", "Tissage", "Cuivre"].map(cat => (
                       <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                           <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-sougui-gold focus:ring-sougui-gold" />
                           <span className="text-sm text-gray-600 group-hover:text-sougui-gold transition-colors">{cat}</span>
                       </label>
                   ))}
                </div>
              </div>

              {/* Side Banner (Optional context) */}
              <div className="bg-sougui-bg p-6 rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-sougui-gold/10 rounded-full blur-2xl group-hover:bg-sougui-gold/20 transition-all"></div>
                  <h4 className="text-sougui-gold text-lg font-serif italic mb-2">Excellence Artisante</h4>
                  <p className="text-white/60 text-[10px] leading-relaxed">Chaque pièce est unique, façonnée à la main selon des traditions millénaires.</p>
              </div>
           </div>
        </aside>

        {/* Product Grid Area */}
        <main className="flex-1">
            {/* Toolbar */}
            <div className="flex justify-between items-center mb-10 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-10">
                    <div className="text-xs text-gray-400 font-medium">Affichage de {filteredProducts.length} résultats</div>
                    <div className="flex items-center gap-3">
                        <button className="p-2 bg-gray-100 rounded hover:bg-sougui-gold hover:text-white transition-all"><Grid size={14}/></button>
                        <button className="p-2 border border-gray-200 rounded hover:bg-gray-100 transition-all text-gray-400"><List size={14}/></button>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-gray-500">Trier par :</span>
                    <div className="flex items-center gap-1 cursor-pointer hover:text-sougui-gold font-bold text-xs uppercase tracking-wider text-gray-800">
                        Popularité <ChevronDown size={14} />
                    </div>
                </div>
            </div>

            {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
                    {filteredProducts.map((product) => (
                        <div key={product.Produit_key} className="animate-in fade-in zoom-in-95 duration-500">
                            <ProductCard product={product} user={user} />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                    <Search className="mx-auto text-gray-200 mb-4" size={48} />
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Aucun produit trouvé</h3>
                    <p className="text-gray-500">Ajustez vos filtres pour voir plus d'articles.</p>
                </div>
            )}
        </main>
      </div>

    </div>
  );
};

export default ProductCatalog;
