import React, { useEffect, useRef } from 'react';

/**
 * FloatingOrbs — Commercial Dashboard Header
 * Golden/green glowing orbs that float up and react gently to cursor hover.
 */
const FloatingOrbs = ({ color = '#059669' }) => {
  const containerRef = useRef(null);
  const orbsRef = useRef([]);

  const NUM_ORBS = 18;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const orbs = orbsRef.current;

    const onMouseMove = (e) => {
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      orbs.forEach((orb) => {
        if (!orb) return;
        const ox = parseFloat(orb.dataset.x);
        const oy = parseFloat(orb.dataset.y);
        const dx = mx - ox;
        const dy = my - oy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const radius = 80;
        if (dist < radius) {
          const force = (radius - dist) / radius;
          const nx = ox - dx * force * 0.25;
          const ny = oy - dy * force * 0.25;
          orb.style.left = `${nx}%`;
          orb.style.top  = `${ny}%`;
        }
      });
    };

    const onLeave = () => {
      orbs.forEach((orb) => {
        if (!orb) return;
        orb.style.left = `${orb.dataset.ox}%`;
        orb.style.top  = `${orb.dataset.oy}%`;
        orb.style.transition = 'left 0.8s ease, top 0.8s ease';
        setTimeout(() => { if (orb) orb.style.transition = ''; }, 900);
      });
    };

    el.addEventListener('mousemove', onMouseMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMouseMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `${r},${g},${b}`;
  };
  const rgb = hexToRgb(color);

  const orbData = Array.from({ length: NUM_ORBS }, (_, i) => {
    const x = 10 + Math.random() * 80;
    const y = 10 + Math.random() * 80;
    const size = 6 + Math.random() * 18;
    const dur = 4 + Math.random() * 6;
    const delay = Math.random() * 4;
    const opacity = 0.25 + Math.random() * 0.45;
    return { x, y, size, dur, delay, opacity, id: i };
  });

  return (
    <>
      <style>{`
        @keyframes float_orb {
          0%   { transform: translateY(0px) scale(1); }
          50%  { transform: translateY(-14px) scale(1.08); }
          100% { transform: translateY(0px) scale(1); }
        }
        @keyframes pulse_orb {
          0%, 100% { box-shadow: 0 0 6px 2px rgba(${rgb}, 0.3); }
          50%       { box-shadow: 0 0 14px 5px rgba(${rgb}, 0.55); }
        }
      `}</style>
      <div
        ref={containerRef}
        style={{
          position: 'absolute', inset: 0, overflow: 'hidden',
          pointerEvents: 'none', zIndex: 0,
        }}
      >
        {orbData.map((o) => (
          <div
            key={o.id}
            ref={(el) => { orbsRef.current[o.id] = el; }}
            data-x={o.x}
            data-y={o.y}
            data-ox={o.x}
            data-oy={o.y}
            style={{
              position: 'absolute',
              left: `${o.x}%`,
              top:  `${o.y}%`,
              width:  o.size,
              height: o.size,
              borderRadius: '50%',
              background: `rgba(${rgb}, ${o.opacity})`,
              animation: `float_orb ${o.dur}s ease-in-out ${o.delay}s infinite, pulse_orb ${o.dur * 1.3}s ease-in-out ${o.delay * 0.5}s infinite`,
              willChange: 'transform',
              filter: `blur(${o.size > 14 ? 2 : 0.5}px)`,
            }}
          />
        ))}
      </div>
    </>
  );
};

export default FloatingOrbs;
