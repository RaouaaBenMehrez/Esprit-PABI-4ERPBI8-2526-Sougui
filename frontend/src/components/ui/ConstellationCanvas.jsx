import React, { useEffect, useRef, useCallback } from 'react';

/**
 * ConstellationCanvas — Marketing Dashboard Header
 * Purple particle constellation that gently attracts toward cursor.
 */
const ConstellationCanvas = ({ color = '#7c3aed' }) => {
  const canvasRef = useRef(null);
  const mouseRef  = useRef({ x: -9999, y: -9999 });
  const nodesRef  = useRef([]);
  const rafRef    = useRef(null);

  const NUM = 55, LINK = 100, ATTR = 0.018, DAMP = 0.90, SPD = 0.4;

  const hexRgb = (hex) => {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `${r},${g},${b}`;
  };
  const rgb = hexRgb(color);

  const init = useCallback((w, h) => {
    nodesRef.current = Array.from({ length: NUM }, () => ({
      x: Math.random()*w, y: Math.random()*h,
      vx:(Math.random()-0.5)*SPD, vy:(Math.random()-0.5)*SPD,
      r: Math.random()*2+1.2,
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      init(canvas.width, canvas.height);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const onMouse = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX-rect.left, y: e.clientY-rect.top };
    };
    const onLeave = () => { mouseRef.current = {x:-9999,y:-9999}; };
    canvas.addEventListener('mousemove', onMouse);
    canvas.addEventListener('mouseleave', onLeave);

    const draw = () => {
      const {width:W, height:H} = canvas;
      ctx.clearRect(0,0,W,H);
      const mx = mouseRef.current.x, my = mouseRef.current.y;

      for (const n of nodesRef.current) {
        const dx=mx-n.x, dy=my-n.y, d=Math.sqrt(dx*dx+dy*dy);
        if (d<150&&d>1) { n.vx+=(dx/d)*ATTR; n.vy+=(dy/d)*ATTR; }
        n.vx*=DAMP; n.vy*=DAMP;
        const spd=Math.sqrt(n.vx*n.vx+n.vy*n.vy);
        if (spd<0.05){n.vx+=(Math.random()-0.5)*0.12;n.vy+=(Math.random()-0.5)*0.12;}
        if (spd>3){n.vx=(n.vx/spd)*3;n.vy=(n.vy/spd)*3;}
        n.x+=n.vx; n.y+=n.vy;
        if(n.x<0){n.x=0;n.vx=Math.abs(n.vx);}
        if(n.x>W){n.x=W;n.vx=-Math.abs(n.vx);}
        if(n.y<0){n.y=0;n.vy=Math.abs(n.vy);}
        if(n.y>H){n.y=H;n.vy=-Math.abs(n.vy);}
      }

      const ns = nodesRef.current;
      for (let i=0;i<ns.length;i++) {
        for (let j=i+1;j<ns.length;j++) {
          const dx=ns[i].x-ns[j].x, dy=ns[i].y-ns[j].y;
          const d=Math.sqrt(dx*dx+dy*dy);
          if (d<LINK) {
            const a=(1-d/LINK)*0.5;
            ctx.beginPath();
            ctx.strokeStyle=`rgba(${rgb},${a.toFixed(3)})`;
            ctx.lineWidth=0.9;
            ctx.moveTo(ns[i].x,ns[i].y);
            ctx.lineTo(ns[j].x,ns[j].y);
            ctx.stroke();
          }
        }
      }
      for (const n of ns) {
        ctx.beginPath();
        ctx.arc(n.x,n.y,n.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(${rgb},0.7)`;
        ctx.fill();
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      canvas.removeEventListener('mousemove',onMouse);
      canvas.removeEventListener('mouseleave',onLeave);
    };
  }, [color, init, rgb]);

  return (
    <canvas ref={canvasRef} style={{
      position:'absolute', inset:0, width:'100%', height:'100%',
      pointerEvents:'all', zIndex:0, borderRadius:'inherit',
    }} />
  );
};

export default ConstellationCanvas;
