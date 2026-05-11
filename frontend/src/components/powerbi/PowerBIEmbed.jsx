import React, { useState, useRef } from 'react';
import { Maximize2, RefreshCw, ExternalLink } from 'lucide-react';

/**
 * PowerBIEmbed — composant réutilisable pour embedder un rapport Power BI
 * - navContentPaneEnabled=false  → masque les onglets en bas (Home, Overview, etc.)
 * - filterPaneEnabled=false      → masque le panneau Filtres à droite
 */
export default function PowerBIEmbed({ reportId, title = 'Rapport Power BI', ctid = '604f1a96-cbe8-43f8-abbf-f8eaf5d85730' }) {
  const [fullscreen, setFullscreen] = useState(false);
  const [key, setKey] = useState(0);
  const iframeRef = useRef();

  const baseUrl = `https://app.powerbi.com/reportEmbed?reportId=${reportId}&autoAuth=true&ctid=${ctid}`;
  const embedUrl = `${baseUrl}&navContentPaneEnabled=false&filterPaneEnabled=false`;

  const reload = () => setKey(k => k + 1);

  const containerStyle = fullscreen ? {
    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
    zIndex: 9999, background: '#0f1117',
  } : {
    position: 'relative', width: '100%', height: '100%',
  };

  return (
    <div style={containerStyle}>
      {/* Barre de contrôle */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px',
        background: fullscreen ? '#161b2e' : 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        borderRadius: fullscreen ? 0 : '16px 16px 0 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Logo PowerBI */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="14" width="4" height="8" rx="1" fill="#f2c811" />
            <rect x="8" y="9"  width="4" height="13" rx="1" fill="#f2c811" opacity=".8" />
            <rect x="14" y="4" width="4" height="18" rx="1" fill="#f2c811" opacity=".6" />
            <rect x="20" y="2" width="2" height="20" rx="1" fill="#f2c811" opacity=".4" />
          </svg>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Power BI</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', paddingLeft: 6, borderLeft: '1px solid var(--border)' }}>{title}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Reload */}
          <button onClick={reload} title="Rafraîchir"
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
            <RefreshCw size={13} /> Rafraîchir
          </button>
          {/* Ouvrir dans PBI */}
          <a href={`https://app.powerbi.com/reports/${reportId}`} target="_blank" rel="noreferrer"
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, textDecoration: 'none' }}>
            <ExternalLink size={13} /> Ouvrir
          </a>
          {/* Fullscreen */}
          <button onClick={() => setFullscreen(f => !f)} title={fullscreen ? 'Quitter plein écran' : 'Plein écran'}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: fullscreen ? 'rgba(242,200,17,0.15)' : 'transparent', color: fullscreen ? '#f2c811' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
            <Maximize2 size={13} /> {fullscreen ? 'Réduire' : 'Plein écran'}
          </button>
        </div>
      </div>

      {/* Iframe Power BI */}
      <div style={{
        position: 'relative',
        paddingBottom: fullscreen ? 'calc(100vh - 48px)' : '56.25%', /* 16:9 */
        height: fullscreen ? 'calc(100vh - 48px)' : 0,
        overflow: 'hidden',
        borderRadius: fullscreen ? 0 : '0 0 16px 16px',
        background: '#f7f9fc',
      }}>
        <iframe
          key={key}
          ref={iframeRef}
          title={title}
          src={embedUrl}
          frameBorder="0"
          allowFullScreen
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            border: 'none',
          }}
        />
      </div>

      {/* Fermer plein écran avec Echap */}
      {fullscreen && (
        <button onClick={() => setFullscreen(false)}
          style={{ position: 'fixed', top: 16, right: 16, zIndex: 10000, padding: '8px 16px', borderRadius: 8, background: 'rgba(0,0,0,0.7)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
          ✕ Fermer
        </button>
      )}
    </div>
  );
}
