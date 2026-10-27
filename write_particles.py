import os

CONTENT = """\
'use client';

import { useEffect, useRef, useCallback } from 'react';

const MAX_LINK_DIST = 160;
const MOUSE_ATTRACT_DIST = 200;
const MOUSE_ATTRACT_FORCE = 0.018;
const PARTICLE_COUNT = 55;

export default function LandingParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -9999, y: -9999 });
  const particlesRef = useRef<any[]>([]);
  const frameRef = useRef<number>(0);

  const initParticles = useCallback((w: number, h: number) => {
    const particles: any[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: Math.random() * 1.8 + 0.8,
        opacity: Math.random() * 0.5 + 0.2,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.01 + 0.005,
        isGreen: Math.random() < 0.12,
      });
    }
    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = window.innerWidth;
    let h = (canvas.parentElement?.clientHeight) || window.innerHeight;

    const resize = () => {
      w = window.innerWidth;
      h = (canvas.parentElement?.clientHeight) || window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      initParticles(w, h);
    };

    canvas.width = w;
    canvas.height = h;
    initParticles(w, h);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const handleMouseLeave = () => { mouse.current = { x: -9999, y: -9999 }; };

    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('mousemove', handleMouseMove, { passive: true } as any);
    canvas.addEventListener('mouseleave', handleMouseLeave, { passive: true });

    const draw = () => {
      const dark = document.documentElement.classList.contains('dark');
      ctx.clearRect(0, 0, w, h);
      const particles = particlesRef.current;
      const mx = mouse.current.x;
      const my = mouse.current.y;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.pulsePhase += p.pulseSpeed;
        const dx = mx - p.x, dy = my - p.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < MOUSE_ATTRACT_DIST && d > 0) {
          const f = (1 - d / MOUSE_ATTRACT_DIST) * MOUSE_ATTRACT_FORCE;
          p.vx += dx / d * f;
          p.vy += dy / d * f;
        }
        p.vx *= 0.995; p.vy *= 0.995;
        p.x += p.vx; p.y += p.vy;
        if (p.x < -30) p.x = w + 30;
        if (p.x > w + 30) p.x = -30;
        if (p.y < -30) p.y = h + 30;
        if (p.y > h + 30) p.y = -30;
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i], p2 = particles[j];
          const ddx = p1.x - p2.x, ddy = p1.y - p2.y;
          const dist = Math.sqrt(ddx * ddx + ddy * ddy);
          if (dist < MAX_LINK_DIST) {
            const a = (1 - dist / MAX_LINK_DIST) * (dark ? 0.18 : 0.10);
            const g = p1.isGreen || p2.isGreen;
            ctx.strokeStyle = g
              ? `rgba(0,229,153,${a * 1.8})`
              : dark ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
          }
        }
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const pulse = Math.sin(p.pulsePhase) * 0.3 + 0.7;
        const fo = p.opacity * pulse;
        if (p.isGreen) {
          const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3);
          grd.addColorStop(0, `rgba(0,229,153,${fo * 0.9})`);
          grd.addColorStop(0.5, `rgba(0,229,153,${fo * 0.3})`);
          grd.addColorStop(1, 'rgba(0,229,153,0)');
          ctx.fillStyle = grd;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = p.isGreen
          ? `rgba(0,229,153,${fo})`
          : dark ? `rgba(255,255,255,${fo * 0.65})` : `rgba(0,0,0,${fo * 0.45})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', resize);
      document.removeEventListener('mousemove', handleMouseMove as any);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [initParticles]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}
    />
  );
}
"""

os.makedirs("components/landing", exist_ok=True)
with open("components/landing/LandingParticles.tsx", "w", encoding="utf-8") as f:
    f.write(CONTENT)
print("Written OK")
