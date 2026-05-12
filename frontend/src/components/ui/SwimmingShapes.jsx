import React, { useEffect, useRef } from 'react';

/**
 * SwimmingShapes — CEO Banner 3D Effect
 * CSS-animated geometric shapes that swim/float inside the banner rectangle.
 */

const shapes = [
  // { type, size, top, left, animDuration, animDelay, rotX, rotY }
  { type: 'cube',     size: 44, top: '18%', left: '62%', dur: 9,  delay: 0,    rx: 25,  ry: 40  },
  { type: 'sphere',  size: 36, top: '55%', left: '73%', dur: 12, delay: 1.5,  rx: -30, ry: 20  },
  { type: 'ring',    size: 52, top: '25%', left: '82%', dur: 10, delay: 0.8,  rx: 60,  ry: 10  },
  { type: 'pyramid', size: 38, top: '60%', left: '55%', dur: 14, delay: 2.2,  rx: 20,  ry: -35 },
  { type: 'cube',    size: 28, top: '15%', left: '90%', dur: 8,  delay: 3.1,  rx: -15, ry: 55  },
  { type: 'sphere',  size: 24, top: '70%', left: '87%', dur: 11, delay: 0.4,  rx: 45,  ry: -25 },
  { type: 'ring',    size: 64, top: '40%', left: '66%', dur: 16, delay: 1.0,  rx: -20, ry: 30  },
  { type: 'cube',    size: 20, top: '80%', left: '78%', dur: 7,  delay: 2.8,  rx: 35,  ry: -50 },
  { type: 'pyramid', size: 56, top: '10%', left: '75%', dur: 13, delay: 0.2,  rx: -40, ry: 15  },
  { type: 'sphere',  size: 18, top: '50%', left: '93%', dur: 6,  delay: 4.0,  rx: 70,  ry: -20 },
];

const ShapeEl = ({ type, size, top, left, dur, delay, rx, ry }) => {
  const commonStyle = {
    position:  'absolute',
    top, left,
    width:  size,
    height: size,
    transformStyle: 'preserve-3d',
    animation: `swim3d_${type.slice(0,3)}${Math.round(size)} ${dur}s ease-in-out ${delay}s infinite alternate`,
    pointerEvents: 'none',
    willChange: 'transform',
  };

  const keyframeName = `swim_${Math.round(dur * 10)}_${Math.round(delay * 10)}`;

  if (type === 'cube') {
    return (
      <div style={commonStyle}>
        <style>{`
          @keyframes swim_cube_${Math.round(size)}_${Math.round(delay*10)} {
            0%   { transform: translate(0px, 0px)        rotateX(${rx}deg) rotateY(${ry}deg); }
            33%  { transform: translate(${-size*0.4}px, ${-size*0.6}px) rotateX(${rx+40}deg) rotateY(${ry+60}deg); }
            66%  { transform: translate(${size*0.3}px, ${size*0.5}px)  rotateX(${rx-30}deg) rotateY(${ry+100}deg); }
            100% { transform: translate(${-size*0.2}px, ${-size*0.3}px) rotateX(${rx+80}deg) rotateY(${ry+180}deg); }
          }
        `}</style>
        <div style={{
          ...commonStyle, top: 0, left: 0,
          animation: `swim_cube_${Math.round(size)}_${Math.round(delay*10)} ${dur}s ease-in-out ${delay}s infinite alternate`,
          border: '1.5px solid rgba(255,255,255,0.22)',
          borderRadius: 6,
          background: 'rgba(255,255,255,0.04)',
          boxShadow: '0 0 12px rgba(120,180,255,0.15), inset 0 0 8px rgba(255,255,255,0.05)',
        }} />
      </div>
    );
  }

  if (type === 'sphere') {
    return (
      <>
        <style>{`
          @keyframes swim_sphere_${Math.round(size)}_${Math.round(delay*10)} {
            0%   { transform: translate(0px, 0px) scale(1); }
            50%  { transform: translate(${-size*0.5}px, ${-size*0.7}px) scale(1.12); }
            100% { transform: translate(${size*0.3}px, ${size*0.4}px) scale(0.92); }
          }
        `}</style>
        <div style={{
          ...commonStyle,
          animation: `swim_sphere_${Math.round(size)}_${Math.round(delay*10)} ${dur}s ease-in-out ${delay}s infinite alternate`,
          borderRadius: '50%',
          border: '1.5px solid rgba(255,255,255,0.18)',
          background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.12), rgba(120,180,255,0.05))',
          boxShadow: '0 0 16px rgba(100,160,255,0.2)',
        }} />
      </>
    );
  }

  if (type === 'ring') {
    return (
      <>
        <style>{`
          @keyframes swim_ring_${Math.round(size)}_${Math.round(delay*10)} {
            0%   { transform: translate(0px, 0px)        rotateX(${rx}deg) rotateZ(0deg); }
            50%  { transform: translate(${-size*0.3}px, ${-size*0.5}px) rotateX(${rx+50}deg) rotateZ(90deg); }
            100% { transform: translate(${size*0.2}px, ${size*0.3}px)  rotateX(${rx+10}deg) rotateZ(180deg); }
          }
        `}</style>
        <div style={{
          ...commonStyle,
          animation: `swim_ring_${Math.round(size)}_${Math.round(delay*10)} ${dur}s ease-in-out ${delay}s infinite alternate`,
          borderRadius: '50%',
          border: `${Math.max(2, size * 0.08)}px solid rgba(180,210,255,0.25)`,
          background: 'transparent',
          boxShadow: '0 0 10px rgba(120,180,255,0.12)',
        }} />
      </>
    );
  }

  if (type === 'pyramid') {
    const half = size / 2;
    return (
      <>
        <style>{`
          @keyframes swim_pyr_${Math.round(size)}_${Math.round(delay*10)} {
            0%   { transform: translate(0px, 0px)        rotateY(${ry}deg) rotateZ(0deg); }
            40%  { transform: translate(${-size*0.4}px, ${-size*0.6}px) rotateY(${ry+90}deg) rotateZ(30deg); }
            100% { transform: translate(${size*0.25}px, ${size*0.35}px)  rotateY(${ry+200}deg) rotateZ(-20deg); }
          }
        `}</style>
        <div style={{
          ...commonStyle,
          animation: `swim_pyr_${Math.round(size)}_${Math.round(delay*10)} ${dur}s ease-in-out ${delay}s infinite alternate`,
          width: 0, height: 0,
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
          borderLeft: `${half}px solid transparent`,
          borderRight: `${half}px solid transparent`,
          borderBottom: `${size}px solid rgba(150,200,255,0.15)`,
          filter: 'drop-shadow(0 0 8px rgba(100,180,255,0.25))',
        }} />
      </>
    );
  }

  return null;
};

const SwimmingShapes = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;

    const onMouseMove = (e) => {
      const rect = parent.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const dx = (e.clientX - rect.left - cx) / cx;
      const dy = (e.clientY - rect.top  - cy) / cy;
      el.style.transform = `rotateX(${-dy * 4}deg) rotateY(${dx * 4}deg)`;
    };
    const onLeave = () => { el.style.transform = 'rotateX(0deg) rotateY(0deg)'; };

    parent.addEventListener('mousemove', onMouseMove);
    parent.addEventListener('mouseleave', onLeave);
    return () => {
      parent.removeEventListener('mousemove', onMouseMove);
      parent.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        perspective: 800,
        transformStyle: 'preserve-3d',
        transition: 'transform 0.3s ease',
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 0,
      }}
    >
      {shapes.map((s, i) => (
        <ShapeEl key={i} {...s} />
      ))}
    </div>
  );
};

export default SwimmingShapes;
