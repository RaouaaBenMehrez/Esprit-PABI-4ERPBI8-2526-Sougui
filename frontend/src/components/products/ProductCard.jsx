import React, { useState } from 'react';
import { ShoppingCart, Heart } from 'lucide-react';

const ProductCard = ({ product, user }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const toggleFavorite = async () => {
    if (!user) return;
    try {
      await fetch("http://localhost:8000/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id || user.username,
          product_code: product.code || product.Produit_key,
          product_name: product.name
        })
      });
      setIsFavorite(true);
    } catch (err) {
      console.error("Failed to save favorite:", err);
    }
  };

  return (
    <div 
      className="group bg-sougui-surface rounded-2xl overflow-hidden border border-white/5 hover:border-sougui-gold/30 transition-all duration-500 relative flex flex-col h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Badges */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        {product.promo_price > 0 && (
          <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
            Promo
          </span>
        )}
        {!product.stock && (
          <span className="bg-sougui-surface-light text-sougui-text-dim border border-white/10 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
            Rupture
          </span>
        )}
      </div>

      <div className="absolute top-4 right-4 z-10">
        <button 
          onClick={toggleFavorite}
          className={`w-8 h-8 rounded-full ${isFavorite ? 'bg-red-500 text-white' : 'bg-black/40 text-white/70'} backdrop-blur-md flex items-center justify-center hover:scale-110 transition-all`}
        >
          <Heart size={16} fill={isFavorite ? "currentColor" : "none"} className={isHovered ? "animate-pulse md:animate-none" : ""} />
        </button>
      </div>

      {/* Image Container with Zoom effect */}
      <div className="relative aspect-square overflow-hidden bg-sougui-surface-light">
        <img 
          src={product.image_url} 
          alt={product.name} 
          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out"
        />
        {/* Dark gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Quick Add Button that slides up */}
        <div className="absolute bottom-4 left-0 right-0 px-4 translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <button 
            disabled={!product.stock}
            className="w-full gold-gradient text-sougui-bg py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-sougui-gold/20 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
          >
            <ShoppingCart size={18} />
            {!product.stock ? 'Indisponible' : 'Ajouter au panier'}
          </button>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-5 flex flex-col flex-grow">
        <div className="text-xs font-bold uppercase tracking-wider text-sougui-gold/80 mb-2">
          {product.category}
        </div>
        <h3 className="font-serif text-lg text-sougui-cream font-bold leading-tight mb-4 flex-grow line-clamp-2 group-hover:text-sougui-gold transition-colors">
          {product.name}
        </h3>
        
        <div className="flex items-end justify-between mt-auto pt-4 border-t border-white/5">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-sougui-text-dim tracking-wider mb-1">Prix unitaire</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white group-hover:text-sougui-gold transition-colors">
                {product.promo_price > 0 ? product.promo_price : product.price}
                <span className="text-sm ml-1 text-sougui-text-dim font-normal">DT</span>
              </span>
              {product.promo_price > 0 && (
                <span className="text-sm text-sougui-text-dim line-through">
                  {product.price} DT
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
