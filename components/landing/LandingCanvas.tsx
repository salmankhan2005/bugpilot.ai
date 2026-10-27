'use client';
import { useEffect, useRef } from 'react';

// Subtle canvas animation — evidence flow field
// Thin particle lines suggesting data paths between investigation stages
export default function LandingCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let w = canvas.offsetWidth;
    let h = canvas.offsetHeight;

    const resize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Reduce motion check
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    // Nodes representing investigation stages
    const nodeLabels = ['Explore', 'Check', 'Evidence', 'Analyse', 'Propose', 'Verify'];
    const nodeColors = [
      'rgba(168,200,121,0.6)', 'rgba(168,200,121,0.5)', 'rgba(201,136,74,0.5)',
      'rgba(168,200,121,0.5)', 'rgba(168,200,121,0.5)', 'rgba(168,200,121,0.7)',
    ];

    type Node = { x: number; y: number; vx: number; vy: number; r: number; colorIdx: number; pulse: number };
    const nodes: Node[] = nodeLabels.map((_, i) => ({
      x: w * (0.15 + (i / (nodeLabels.length - 1)) * 0.7),
      y: h * (0.3 + Math.sin(i * 1.3) * 0.2),
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.15,
      r: 4 + Math.random() * 3,
      colorIdx: i,
      pulse: Math.random() * Math.PI * 2,
    }));

    // Particles traveling along edges
    type Particle = { from: number; to: number; t: number; speed: number };
    const particles: Particle[] = [];
    for (let i = 0; i < 18; i++) {
      const from = Math.floor(Math.random() * (nodeLabels.length - 1));
      particles.push({ from, to: from + 1, t: Math.random(), speed: 0.003 + Math.random() * 0.004 });
    }

    const draw = (time: number) => {
      ctx.clearRect(0, 0, w, h);

      // Update nodes
      nodes.forEach(n => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 40 || n.x > w - 40) n.vx *= -1;
        if (n.y < 40 || n.y > h - 40) n.vy *= -1;
        n.pulse += 0.03;
      });

      // Draw edges
      for (let i = 0; i < nodes.length - 1; i++) {
        const a = nodes[i], b = nodes[i + 1];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = 'rgba(48,54,45,0.8)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw particles
      particles.forEach(p => {
        p.t += p.speed;
        if (p.t >= 1) { p.t = 0; }
        const a = nodes[p.from], b = nodes[p.to];
        if (!a || !b) return;
        const px = a.x + (b.x - a.x) * p.t;
        const py = a.y + (b.y - a.y) * p.t;
        const alpha = Math.sin(p.t * Math.PI) * 0.7;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(168,200,121,${alpha})`;
        ctx.fill();
      });

      // Draw nodes
      nodes.forEach((n, i) => {
        const pulseR = n.r + Math.sin(n.pulse) * 1.5;
        // Outer glow
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, pulseR * 4);
        grd.addColorStop(0, nodeColors[i].replace('0.', '0.15').replace('0.7', '0.15').replace('0.6', '0.12').replace('0.5', '0.10'));
        grd.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(n.x, n.y, pulseR * 4, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(n.x, n.y, pulseR, 0, Math.PI * 2);
        ctx.fillStyle = nodeColors[i];
        ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
      aria-hidden="true"
      aria-label="Evidence flow field visualization"
    />
  );
}
