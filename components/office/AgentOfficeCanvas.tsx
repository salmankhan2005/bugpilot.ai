'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { AgentStation, AgentRole } from '@/lib/domain/types';

interface AgentOfficeCanvasProps {
  stations: AgentStation[];
  selectedRole: AgentRole;
  onSelectRole: (role: AgentRole) => void;
}

export default function AgentOfficeCanvas({
  stations,
  selectedRole,
  onSelectRole,
}: AgentOfficeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webglSupported, setWebglSupported] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    // Check WebGL support
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglSupported(false);
        return;
      }
    } catch {
      setWebglSupported(false);
      return;
    }

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090b09);
    scene.fog = new THREE.FogExp2(0x090b09, 0.04);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 8.5, 12);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xa8c879, 0.8);
    dirLight.position.set(5, 12, 5);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xa8c879, 1.2, 15);
    pointLight.position.set(0, 4, 0);
    scene.add(pointLight);

    // 3. Grid Floor
    const gridHelper = new THREE.GridHelper(18, 36, 0x222a20, 0x141814);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // 4. Create Workstations
    const stationPositions: Record<AgentRole, [number, number, number]> = {
      orchestrator: [0, 0, -2.5],
      explorer:     [-3.2, 0, -0.5],
      checker:      [3.2, 0, -0.5],
      diagnostician:[-2.5, 0, 2.8],
      fix_advisor:  [2.5, 0, 2.8],
      verifier:     [0, 0, 4.0],
    };

    const stationMeshes: { mesh: THREE.Group; role: AgentRole; ring: THREE.Mesh }[] = [];

    stations.forEach(st => {
      const pos = stationPositions[st.role];
      const group = new THREE.Group();
      group.position.set(pos[0], pos[1], pos[2]);

      // Base pedestal
      const baseGeo = new THREE.CylinderGeometry(0.85, 0.95, 0.4, 24);
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x141814,
        roughness: 0.6,
        metalness: 0.2,
      });
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.y = 0.2;
      group.add(baseMesh);

      // Terminal screen console
      const consoleGeo = new THREE.BoxGeometry(0.7, 0.5, 0.1);
      const isSelected = st.role === selectedRole;
      const isActive = st.status === 'active';
      const screenColor = isActive ? 0xa8c879 : isSelected ? 0xd0e8a8 : 0x2d342b;

      const consoleMat = new THREE.MeshStandardMaterial({
        color: screenColor,
        emissive: screenColor,
        emissiveIntensity: isActive ? 0.6 : 0.1,
      });
      const consoleMesh = new THREE.Mesh(consoleGeo, consoleMat);
      consoleMesh.position.set(0, 0.65, 0);
      consoleMesh.rotation.x = -0.3;
      group.add(consoleMesh);

      // Halo ring
      const ringGeo = new THREE.RingGeometry(1.05, 1.15, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isActive ? 0xa8c879 : 0x273024,
        side: THREE.DoubleSide,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = 0.02;
      group.add(ringMesh);

      // Floating beacon
      const beaconGeo = new THREE.OctahedronGeometry(0.18, 0);
      const beaconMat = new THREE.MeshStandardMaterial({
        color: isActive ? 0xa8c879 : 0x5a6356,
        emissive: isActive ? 0xa8c879 : 0x000000,
        emissiveIntensity: isActive ? 0.8 : 0,
        wireframe: true,
      });
      const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
      beaconMesh.position.y = 1.3;
      group.add(beaconMesh);

      scene.add(group);
      stationMeshes.push({ mesh: group, role: st.role, ring: ringMesh });
    });

    // 5. Connective telemetry lines
    const lineMat = new THREE.LineBasicMaterial({ color: 0x273024, transparent: true, opacity: 0.7 });
    const orchPos = stationPositions['orchestrator'];
    Object.entries(stationPositions).forEach(([role, pos]) => {
      if (role === 'orchestrator') return;
      const points = [
        new THREE.Vector3(orchPos[0], 0.05, orchPos[2]),
        new THREE.Vector3(pos[0], 0.05, pos[2]),
      ];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(lineGeo, lineMat);
      scene.add(line);
    });

    // 6. Raycasting for interactions
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        let obj: THREE.Object3D | null = intersects[0].object;
        while (obj && obj.parent && obj.parent !== scene) {
          obj = obj.parent;
        }
        if (obj) {
          const match = stationMeshes.find(s => s.mesh === obj);
          if (match) {
            onSelectRole(match.role);
          }
        }
      }
    };

    container.addEventListener('pointerdown', onPointerDown);

    // 7. Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Gentle rotation & floating of beacons
      stationMeshes.forEach((item, idx) => {
        const beacon = item.mesh.children[3];
        if (beacon) {
          beacon.rotation.y = elapsed * 0.8 + idx;
          beacon.position.y = 1.3 + Math.sin(elapsed * 2 + idx) * 0.06;
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('pointerdown', onPointerDown);
      cancelAnimationFrame(animId);
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [stations, selectedRole, onSelectRole]);

  if (!webglSupported) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface-1)',
        color: 'var(--secondary-text)',
        fontSize: 13,
      }}>
        WebGL not supported in this view · Displaying Station Grid Mode
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        cursor: 'grab',
      }}
    />
  );
}
