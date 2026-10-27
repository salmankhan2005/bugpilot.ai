'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import Link from 'next/link';

export default function Landing3DOfficeHero() {
  const mountRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    let width = container.clientWidth;
    let height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Pure Vercel Black
    scene.fog = new THREE.FogExp2(0x000000, 0.03);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 5.8, 8.5);
    camera.lookAt(0, 0.2, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Ambient & Directional Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.8);
    sunLight.position.set(6, 10, 5);
    scene.add(sunLight);

    const vercelGlowLight = new THREE.PointLight(0x00e599, 2.5, 10);
    vercelGlowLight.position.set(0, 2, 0);
    scene.add(vercelGlowLight);

    // Floor with grid
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 14),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.6 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const grid = new THREE.GridHelper(16, 16, 0x242424, 0x141414);
    grid.position.y = 0.005;
    scene.add(grid);

    // 3 Mini Workstations in isometric arrangement
    const stations = [
      { name: 'Arthur', role: 'Planner', x: -2.4, z: -0.6, shirt: 0x1e293b, active: false },
      { name: 'Elena', role: 'Explorer', x: 0, z: 0.4, shirt: 0x059669, active: true },
      { name: 'Connor', role: 'Checker', x: 2.4, z: -0.6, shirt: 0x334155, active: false },
    ];

    type HeroCharRef = {
      beaconOrb: THREE.Mesh;
      beaconRing: THREE.Mesh;
      screen: THREE.Mesh;
      arms: THREE.Mesh;
      head: THREE.Mesh;
      isActive: boolean;
    };

    const charRefs: HeroCharRef[] = [];

    stations.forEach(st => {
      const g = new THREE.Group();
      g.position.set(st.x, 0, st.z);

      // Desk
      const desk = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.05, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x856645, roughness: 0.5 })
      );
      desk.position.set(0, 0.7, 0);
      g.add(desk);

      // Legs
      const legMat = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.4 });
      [[-0.6, -0.32], [0.6, -0.32], [-0.6, 0.32], [0.6, 0.32]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 8), legMat);
        leg.position.set(lx, 0.35, lz);
        g.add(leg);
      });

      // Monitor
      const monitor = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 0.45, 0.03),
        legMat
      );
      monitor.position.set(0, 1.1, -0.2);
      g.add(monitor);

      const screenMat = new THREE.MeshStandardMaterial({
        color: st.active ? 0x00e599 : 0x222222,
        emissive: st.active ? 0x00e599 : 0x111111,
        emissiveIntensity: st.active ? 0.9 : 0.1,
      });
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.4), screenMat);
      screen.position.set(0, 1.1, -0.18);
      g.add(screen);

      // Keyboard
      const kb = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.015, 0.12), legMat);
      kb.position.set(0, 0.73, 0.1);
      g.add(kb);

      // Character
      const torso = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.16, 0.44, 12),
        new THREE.MeshStandardMaterial({ color: st.shirt, roughness: 0.6 })
      );
      torso.position.set(0, 0.72, 0.44);
      g.add(torso);

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xfbe6d4, roughness: 0.4 })
      );
      head.position.set(0, 1.05, 0.44);
      g.add(head);

      const arms = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.08, 0.32),
        new THREE.MeshStandardMaterial({ color: st.shirt, roughness: 0.6 })
      );
      arms.position.set(0, 0.8, 0.22);
      arms.rotation.x = 0.2;
      g.add(arms);

      // Blinking Beacon Orb & Radar Ring
      const beaconOrb = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 12, 12),
        new THREE.MeshBasicMaterial({
          color: st.active ? 0x00e599 : 0x666666,
          transparent: true,
          opacity: st.active ? 0.95 : 0.2,
        })
      );
      beaconOrb.position.set(0, 1.4, 0.44);
      g.add(beaconOrb);

      const beaconRing = new THREE.Mesh(
        new THREE.RingGeometry(0.7, 0.85, 24),
        new THREE.MeshBasicMaterial({
          color: st.active ? 0x00e599 : 0x222222,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: st.active ? 0.7 : 0.1,
        })
      );
      beaconRing.rotation.x = Math.PI / 2;
      beaconRing.position.y = 0.01;
      g.add(beaconRing);

      scene.add(g);
      charRefs.push({ beaconOrb, beaconRing, screen, arms, head, isActive: st.active });
    });

    // Animation loop with active agent blinking
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Gentle camera sway
      camera.position.x = Math.sin(elapsed * 0.2) * 0.5;

      charRefs.forEach((char, i) => {
        char.head.position.y = 1.05 + Math.sin(elapsed * 2 + i) * 0.006;

        if (char.isActive) {
          // PROMINENT BLINKING INDICATOR (Live working beacon)
          const blink = (Math.sin(elapsed * 9) + 1) * 0.5;
          (char.beaconOrb.material as THREE.MeshBasicMaterial).opacity = 0.2 + blink * 0.8;
          char.beaconOrb.scale.setScalar(0.9 + blink * 0.4);

          const ringPulse = (elapsed * 2) % 1;
          char.beaconRing.scale.setScalar(1 + ringPulse * 0.3);
          (char.beaconRing.material as THREE.MeshBasicMaterial).opacity = (1 - ringPulse) * 0.7;

          // Typing animation
          char.arms.position.y = 0.8 + Math.sin(elapsed * 14) * 0.015;
          char.arms.position.z = 0.22 + Math.cos(elapsed * 14) * 0.01;
          (char.screen.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + blink * 0.5;
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth;
      height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 460 }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'default' }} />

      {/* Floating 3D Delegation Status Overlay with Blinking Badge */}
      <div style={{
        position: 'absolute',
        top: 24,
        right: 24,
        background: 'rgba(10, 10, 10, 0.85)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '12px 16px',
        maxWidth: 320,
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span className="agent-live-blinking" style={{
            width: 9,
            height: 9,
            borderRadius: '50%',
            background: 'var(--active-green)',
            boxShadow: '0 0 10px var(--active-green)',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ivory)', letterSpacing: '0.02em' }}>
            3D OFFICE · ILLUSTRATION
          </span>
          <span className="mono" style={{ fontSize: 10, color: 'var(--muted-text)', marginLeft: 'auto' }}>
            SAMPLE
          </span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--secondary-text)', margin: '0 0 12px', lineHeight: 1.45 }}>
          Illustrative office animation only; live run events appear inside a connected project workspace.
        </p>
        <Link
          href="/app"
          className="btn btn-primary btn-sm"
          style={{ width: '100%', justifyContent: 'center', gap: 6, textDecoration: 'none' }}
        >
          <span>Open workspace</span>
          <span>→</span>
        </Link>
      </div>

      {/* Active agent pill at bottom */}
      <div style={{
        position: 'absolute',
        bottom: 24,
        left: 24,
        background: 'rgba(10, 10, 10, 0.85)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border)',
        borderRadius: 999,
        padding: '6px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <span className="agent-live-blinking" style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: 'var(--active-green)',
        }} />
        <span style={{ fontSize: 12, color: 'var(--ivory)', fontWeight: 600 }}>Illustrative agent</span>
        <span style={{ fontSize: 11, color: 'var(--muted-text)' }}>· Sample QA task</span>
      </div>
    </div>
  );
}
