import React, { useEffect, useRef, useCallback } from 'react';

/**
 * InteractiveCanvas — Hero Landing Page Effect
 * Nodes connected by lines that "run away" from the cursor.
 * Inspired by nrtf-three.vercel.app style.
 */
const InteractiveCanvas = ({ theme }) => {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const nodesRef = useRef([]);
  const rafRef   = useRef(null);

  const COLOR_DARK  = 'rgba(100, 160, 255, ';
  const COLOR_LIGHT = 'rgba(30,  90, 255, ';
  const NODE_COLOR  = theme === 'dark' ? '#4d88ff' : '#1e5aff';
  const LINE_BASE   = theme === 'dark' ? COLOR_DARK : COLOR_LIGHT;

  const NUM_NODES     = 80;
  const LINK_DIST     = 130;
  const REPEL_RADIUS  = 110;
  const REPEL_FORCE   = 3.2;
  const DAMPING       = 0.92;
  const SPEED         = 0.55;

  const initNodes = useCallback((w, h) => {
    nodesRef.current = Array.from({ length: NUM_NODES }, () => ({
      x:  Math.random() * w,
      y:  Math.random() * h,
      vx: (Math.random() - 0.5) * SPEED,
      vy: (Math.random() - 0.5) * SPEED,
      r:  Math.random() * 2 + 1.5,
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      initNodes(canvas.width, canvas.height);
    };

    resize();
    window.addEventListener('resize', resize);

    const onMouse = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onLeave = () => { mouseRef.current = { x: -9999, y: -9999 }; };

    canvas.addEventListener('mousemove', onMouse);
    canvas.addEventListener('mouseleave', onLeave);

    const animate = () => {
      const { width: W, height: H } = canvas;
      ctx.clearRect(0, 0, W, H);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const nodes = nodesRef.current;

      // Update nodes
      for (const node of nodes) {
        // Repulsion from cursor
        const dx = node.x - mx;
        const dy = node.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < REPEL_RADIUS && dist > 0) {
          const force = (REPEL_RADIUS - dist) / REPEL_RADIUS * REPEL_FORCE;
          node.vx += (dx / dist) * force;
          node.vy += (dy / dist) * force;
        }

        // Damping & move
        node.vx *= DAMPING;
        node.vy *= DAMPING;

        // Speed clamp
        const spd = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
        if (spd > 4) { node.vx = (node.vx / spd) * 4; node.vy = (node.vy / spd) * 4; }
        if (spd < 0.08) {
          node.vx += (Math.random() - 0.5) * 0.15;
          node.vy += (Math.random() - 0.5) * 0.15;
        }

        node.x += node.vx;
        node.y += node.vy;

        // Bounce off edges
        if (node.x < 0)  { node.x = 0;  node.vx = Math.abs(node.vx); }
        if (node.x > W)  { node.x = W;  node.vx = -Math.abs(node.vx); }
        if (node.y < 0)  { node.y = 0;  node.vy = Math.abs(node.vy); }
        if (node.y > H)  { node.y = H;  node.vy = -Math.abs(node.vy); }
      }

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK_DIST) {
            const alpha = (1 - d / LINK_DIST) * 0.45;
            ctx.beginPath();
            ctx.strokeStyle = `${LINE_BASE}${alpha.toFixed(3)})`;
            ctx.lineWidth = 1;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (const node of nodes) {
        // Highlight if near cursor
        const dx = node.x - mx;
        const dy = node.y - my;
        const nearCursor = Math.sqrt(dx * dx + dy * dy) < REPEL_RADIUS;

        ctx.beginPath();
        ctx.arc(node.x, node.y, nearCursor ? node.r * 1.8 : node.r, 0, Math.PI * 2);
        ctx.fillStyle = nearCursor ? '#7baeff' : NODE_COLOR;
        ctx.globalAlpha = nearCursor ? 0.9 : 0.55;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', onMouse);
      canvas.removeEventListener('mouseleave', onLeave);
    };
  }, [theme, initNodes, LINE_BASE, NODE_COLOR]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'all', // needs mouse events but blocks nothing else
        zIndex: 0,
        opacity: theme === 'dark' ? 0.9 : 0.75,
      }}
    />
  );
};

export default InteractiveCanvas;
