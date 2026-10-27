'use client';

import { useEffect, useRef } from 'react';

type Ring = {
  x: number;
  y: number;
  born: number;
};

const TAU = Math.PI * 2;
const SPACING = 44;
const DOT_RADIUS = 1.15;
const RING_WIDTH = 72;
const SPEED = 220;
const PING_INTERVAL = 6500;
const MAX_RINGS = 2;

export function SonarBackground() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!host || !canvas || !context) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const rings: Ring[] = [];
    let width = 0;
    let height = 0;
    let visible = true;
    let frame = 0;
    let timer = 0;
    let seeded = false;
    let nextPing = performance.now() + PING_INTERVAL;

    const addRing = (now: number) => {
      rings.push({
        x: width * (0.2 + Math.random() * 0.6),
        y: height * (0.2 + Math.random() * 0.6),
        born: now,
      });
      if (rings.length > MAX_RINGS) rings.shift();
    };

    const draw = (now: number) => {
      context.clearRect(0, 0, width, height);
      context.fillStyle = '#b5e779';

      const columns = Math.ceil(width / SPACING) + 1;
      const rows = Math.ceil(height / SPACING) + 1;
      const offsetX = (width - (columns - 1) * SPACING) / 2;
      const offsetY = (height - (rows - 1) * SPACING) / 2;
      const lifetime = (Math.hypot(width, height) + RING_WIDTH) / SPEED;
      const activeRings = reducedMotion.matches
        ? []
        : rings.filter((ring) => (now - ring.born) / 1000 < lifetime);
      rings.splice(0, rings.length, ...activeRings);

      const hot: { x: number; y: number; energy: number }[] = [];
      context.globalAlpha = 0.2;
      context.beginPath();
      for (let column = 0; column < columns; column += 1) {
        const x = offsetX + column * SPACING;
        for (let row = 0; row < rows; row += 1) {
          const y = offsetY + row * SPACING;
          let energy = 0;
          for (const ring of activeRings) {
            const age = (now - ring.born) / 1000;
            const radius = age * SPEED;
            const distance = Math.abs(Math.hypot(x - ring.x, y - ring.y) - radius);
            if (distance >= RING_WIDTH) continue;
            const edge = 1 - distance / RING_WIDTH;
            const smoothEdge = edge * edge * (3 - 2 * edge);
            energy = Math.max(energy, smoothEdge * (1 - age / lifetime));
          }
          if (energy < 0.01) {
            context.moveTo(x + DOT_RADIUS, y);
            context.arc(x, y, DOT_RADIUS, 0, TAU);
          } else {
            hot.push({ x, y, energy });
          }
        }
      }
      context.fill();
      context.shadowColor = 'rgba(181, 231, 121, 0.8)';
      context.shadowBlur = 8;
      for (const dot of hot) {
        context.globalAlpha = 0.3 + 0.6 * dot.energy;
        const radius = DOT_RADIUS * (1 + 1.5 * dot.energy);
        context.beginPath();
        context.arc(dot.x, dot.y, radius, 0, TAU);
        context.fill();
      }
      context.shadowBlur = 0;
      context.shadowColor = 'transparent';
      context.globalAlpha = 1;
    };

    const schedule = (delay: number) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(wake, Math.max(16, delay));
    };

    const tick = (now: number) => {
      frame = 0;
      if (!visible || document.hidden) return;

      if (reducedMotion.matches) {
        rings.length = 0;
        draw(now);
        return;
      }

      if (now >= nextPing) {
        addRing(now);
        nextPing = now + PING_INTERVAL;
      }
      draw(now);

      if (rings.length > 0) frame = window.requestAnimationFrame(tick);
      else schedule(nextPing - now);
    };

    function wake() {
      window.clearTimeout(timer);
      if (visible && !document.hidden && !frame) {
        frame = window.requestAnimationFrame(tick);
      }
    }

    const resize = () => {
      const rect = host.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!seeded && !reducedMotion.matches) {
        seeded = true;
        addRing(performance.now() - 500);
      }
      draw(performance.now());
      wake();
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible) wake();
      else {
        window.cancelAnimationFrame(frame);
        frame = 0;
        window.clearTimeout(timer);
      }
    });
    const resizeObserver = new ResizeObserver(resize);
    const onVisibilityChange = () => {
      if (!document.hidden) wake();
    };
    const onMotionPreferenceChange = () => {
      if (reducedMotion.matches) rings.length = 0;
      draw(performance.now());
      wake();
    };

    observer.observe(host);
    resizeObserver.observe(host);
    document.addEventListener('visibilitychange', onVisibilityChange);
    reducedMotion.addEventListener('change', onMotionPreferenceChange);
    resize();

    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      reducedMotion.removeEventListener('change', onMotionPreferenceChange);
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div ref={hostRef} className="bp-hero-sonar" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
