'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { AgentRole } from '@/lib/domain/types';
import type { OfficeAgentState } from '@/lib/office/types';
import { WORKSTATION_CONFIGS, CAMERA_POIS } from '@/lib/office/adapter';

interface AgentOfficeSceneProps {
  agents: Record<string, OfficeAgentState>;
  selectedRole: AgentRole;
  onSelectRole: (role: AgentRole) => void;
  activePoiId: string;
}

// Character style definitions inspired by The Delegation
const AGENT_VISUALS: Record<AgentRole, {
  name: string;
  shirtColor: number;
  hasCap?: boolean;
  hasHeadphones?: boolean;
}> = {
  orchestrator: { name: 'Arthur', shirtColor: 0x1E293B },
  explorer:     { name: 'Elena',  shirtColor: 0x059669 },
  checker:      { name: 'Connor', shirtColor: 0x334155 },
  diagnostician:{ name: 'Dana',   shirtColor: 0xB45309, hasCap: true },
  fix_advisor:  { name: 'Felix',  shirtColor: 0x2563EB },
  verifier:     { name: 'Victor', shirtColor: 0x15803D, hasHeadphones: true },
};

function createAgentCallout(name: string, agent: OfficeAgentState) {
  const canvas = document.createElement('canvas');
  canvas.width = 520;
  canvas.height = 176;
  const ctx = canvas.getContext('2d')!;

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(1.55, 0.53, 1);

  let lastCallout = '';
  const update = (currentAgent: OfficeAgentState) => {
    const statusLabel = currentAgent.status === 'active'
      ? 'RUNNING'
      : currentAgent.status === 'done'
        ? 'DONE'
        : currentAgent.status === 'error'
          ? 'ERROR'
          : 'STANDBY';
    const callout = `${currentAgent.name}|${currentAgent.title}|${currentAgent.currentTask}|${statusLabel}`;
    if (callout === lastCallout) return;
    lastCallout = callout;

    const active = currentAgent.status === 'active';
    const failed = currentAgent.status === 'error';
    const accent = active ? '#00E599' : failed ? '#E5484D' : '#71717A';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(8, 10, 8, 0.96)';
    ctx.strokeStyle = active ? '#00E599' : failed ? '#E5484D' : 'rgba(255,255,255,0.24)';
    ctx.lineWidth = active ? 5 : 3;
    ctx.beginPath();
    ctx.roundRect(8, 8, 504, 154, 18);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(244, 160);
    ctx.lineTo(260, 174);
    ctx.lineTo(276, 160);
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(34, 39, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '600 26px "DM Sans", system-ui, sans-serif';
    ctx.fillText(`${name} · ${currentAgent.name}`, 54, 47, 430);

    ctx.textAlign = 'right';
    ctx.fillStyle = accent;
    ctx.font = '600 17px "DM Mono", monospace';
    ctx.fillText(statusLabel, 488, 47, 150);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#C5CCC5';
    ctx.font = '500 18px "DM Sans", system-ui, sans-serif';
    const words = currentAgent.currentTask.split(/\s+/);
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > 462 && line) {
        lines.push(line);
        line = word;
        if (lines.length === 2) break;
      } else {
        line = candidate;
      }
    }
    if (line && lines.length < 2) lines.push(line);
    if (lines.length === 2 && words.join(' ') !== lines.join(' ')) {
      let secondLine = lines[1];
      while (secondLine && ctx.measureText(`${secondLine}…`).width > 462) {
        secondLine = secondLine.slice(0, -1);
      }
      lines[1] = `${secondLine.trimEnd()}…`;
    }
    lines.forEach((text, index) => ctx.fillText(text, 28, 91 + index * 25, 462));
    texture.needsUpdate = true;
  };
  update(agent);
  return { sprite, texture, update };
}

export default function AgentOfficeScene({
  agents,
  selectedRole,
  onSelectRole,
  activePoiId,
}: AgentOfficeSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglError, setWebglError] = useState(false);
  const agentsRef = useRef(agents);
  const onSelectRoleRef = useRef(onSelectRole);

  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const targetCamPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 8.5, 12));
  const targetCamLook = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const currentCamLook = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  // Sync camera POI when activePoiId or selectedRole changes
  useEffect(() => {
    const poi = CAMERA_POIS.find(p => p.id === activePoiId || p.role === selectedRole);
    if (poi) {
      targetCamPos.current.set(...poi.position);
      targetCamLook.current.set(...poi.target);
    }
  }, [activePoiId, selectedRole]);

  useEffect(() => {
    agentsRef.current = agents;
    onSelectRoleRef.current = onSelectRole;
  }, [agents, onSelectRole]);

  useEffect(() => {
    if (!mountRef.current) return;

    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!gl) {
        const fallbackFrame = requestAnimationFrame(() => setWebglError(true));
        return () => cancelAnimationFrame(fallbackFrame);
      }
    } catch {
      const fallbackFrame = requestAnimationFrame(() => setWebglError(true));
      return () => cancelAnimationFrame(fallbackFrame);
    }

    const container = mountRef.current;
    let width = container.clientWidth;
    let height = container.clientHeight;

    // 1. Scene & Camera setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // True Vercel Pitch Black
    scene.fog = new THREE.FogExp2(0x000000, 0.022);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 8.5, 12);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: true, // prevents Z-fighting on coplanar surfaces
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff8ee, 1.7);
    sunLight.position.set(8, 14, 6);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.bias = -0.0001; // proper anti-acne bias (no shadow Z-fighting)
    sunLight.shadow.normalBias = 0.02; // handles thin/flat geometry
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.6);
    fillLight.position.set(-8, 6, -6);
    scene.add(fillLight);

    // 4. Procedural floor — slight Y offset so it won't Z-fight with static-floor in office.glb
    // Will be hidden once office.glb successfully loads
    const floorGeo = new THREE.PlaneGeometry(26, 22);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x141414,
      roughness: 0.65,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01; // 1cm below to avoid coplanar Z-fight with GLB floor
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(26, 26, 0x242424, 0x171717);
    grid.position.y = -0.008; // slightly above procedural floor, well below GLB floor
    scene.add(grid);

    // 5. Loaders for The Delegation models (office.glb and character.glb)
    const gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/vendor/draco/');
    gltfLoader.setDRACOLoader(dracoLoader);

    // Load authentic office.glb from the-delegation-main
    gltfLoader.load(
      '/models/office.glb',
      (gltf) => {
        const office = gltf.scene;
        office.scale.set(1.4, 1.4, 1.4);
        office.position.set(0, 0, 0);
        office.traverse((child) => {
          if ((child as any).isMesh) {
            const mesh = child as THREE.Mesh;
            if (mesh.name.toLowerCase().includes('navmesh')) {
              mesh.visible = false;
            } else {
              mesh.receiveShadow = true;
              mesh.castShadow = true;
            }
          }
        });
        // Hide procedural fallback floor/grid since office.glb has its own floor
        floor.visible = false;
        grid.visible = false;

        scene.add(office);
      },
      undefined,
      (err) => {
        console.warn('Could not load office.glb, procedural room active', err);
      }
    );

    // 6. Character & Workstation State Tracking
    type CharacterRef = {
      group: THREE.Group;
      role: AgentRole;
      arms?: THREE.Mesh;
      head?: THREE.Mesh;
      screen?: THREE.Mesh;
      speechBubble: THREE.Sprite;
      calloutTether: THREE.Mesh;
      updateCallout: (agent: OfficeAgentState) => void;
      beaconOrb: THREE.Mesh;
      beaconRing: THREE.Mesh;
      halo: THREE.Mesh;
      spinGroup: THREE.Group;
      outerSpinRing: THREE.Mesh;
      innerSpinRing: THREE.Mesh;
      orbitDot: THREE.Mesh;
      activityProp: THREE.Mesh | THREE.Group;
      mixer?: THREE.AnimationMixer;
      workAction?: THREE.AnimationAction;
      idleAction?: THREE.AnimationAction;
    };

    const characters: CharacterRef[] = [];
    const stationRayTargets: { group: THREE.Group; role: AgentRole; halo: THREE.Mesh }[] = [];
    const mixers: THREE.AnimationMixer[] = [];

    // Load authentic character.glb from the-delegation-main with animations
    gltfLoader.load(
      '/models/character.glb',
      (gltf) => {
        const characterModel = gltf.scene;
        const animations = gltf.animations;

        characters.forEach((charRef) => {
          const visual = AGENT_VISUALS[charRef.role];
          const isAgentActive = agentsRef.current[charRef.role]?.status === 'active';

          // Clone character with SkeletonUtils for independent skeletal animation
          const charInstance = SkeletonUtils.clone(characterModel) as THREE.Group;
          charInstance.scale.set(0.85, 0.85, 0.85);
          charInstance.position.set(0, 0.48, 0.45);

          // Apply distinct Delegation clothing color and accessories
          charInstance.traverse((child) => {
            if ((child as any).isMesh) {
              const mesh = child as THREE.Mesh;
              mesh.castShadow = true;
              mesh.receiveShadow = true;

              if (mesh.name === 'body') {
                mesh.material = new THREE.MeshStandardMaterial({
                  color: visual.shirtColor,
                  roughness: 0.6,
                });
              } else if (mesh.name === 'cap') {
                mesh.visible = !!visual.hasCap;
                if (visual.hasCap) {
                  mesh.material = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 });
                }
              } else if (mesh.name === 'headphones') {
                mesh.visible = !!visual.hasHeadphones;
              }
            }
          });

          // Animation Mixer
          const mixer = new THREE.AnimationMixer(charInstance);
          mixers.push(mixer);
          charRef.mixer = mixer;

          const sitWorkClip = THREE.AnimationClip.findByName(animations, 'Sit_Work') || animations[0];
          const sitIdleClip = THREE.AnimationClip.findByName(animations, 'Sit_Idle') || animations[1];

          if (sitWorkClip) {
            charRef.workAction = mixer.clipAction(sitWorkClip);
          }
          if (sitIdleClip) {
            charRef.idleAction = mixer.clipAction(sitIdleClip);
          }

          if (isAgentActive && charRef.workAction) {
            charRef.workAction.play();
          } else if (charRef.idleAction) {
            charRef.idleAction.play();
          }

          charRef.group.add(charInstance);
        });
      },
      undefined,
      (err) => {
        console.warn('Could not load character.glb, procedural characters active', err);
      }
    );

    // 7. Construct Interactive Workstations & Delegation Visuals
    WORKSTATION_CONFIGS.forEach((cfg) => {
      const isAgentActive = agentsRef.current[cfg.role]?.status === 'active';
      const agentData = agentsRef.current[cfg.role];
      const visual = AGENT_VISUALS[cfg.role];

      const stationGroup = new THREE.Group();
      stationGroup.position.set(...cfg.position);
      stationGroup.rotation.y = cfg.rotationY;

      // ── Desk Top ──
      const deskTop = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.05, 0.85),
        new THREE.MeshStandardMaterial({
          color: 0x8a6d4b, // Warm timber
          roughness: 0.45,
          metalness: 0.05,
        })
      );
      deskTop.position.set(0, 0.72, 0);
      deskTop.castShadow = true;
      deskTop.receiveShadow = true;
      stationGroup.add(deskTop);

      // Desk Legs
      const legMat = new THREE.MeshStandardMaterial({ color: 0x1f1f1f, roughness: 0.3, metalness: 0.8 });
      [[-0.72, -0.36], [0.72, -0.36], [-0.72, 0.36], [0.72, 0.36]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.72, 8), legMat);
        leg.position.set(lx, 0.36, lz);
        leg.castShadow = true;
        stationGroup.add(leg);
      });

      // ── Computer Monitor ──
      const monitorStand = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.25, 8), legMat);
      monitorStand.position.set(0, 0.9, -0.2);
      stationGroup.add(monitorStand);

      const monitorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.54, 0.04), legMat);
      monitorFrame.position.set(0, 1.16, -0.2);
      monitorFrame.castShadow = true;
      stationGroup.add(monitorFrame);

      // Display Screen with code activity
      const screenColor = isAgentActive ? 0x00e599 : (cfg.role === 'checker' ? 0xe5484d : 0x1e293b);
      const screenMat = new THREE.MeshStandardMaterial({
        color: screenColor,
        emissive: screenColor,
        emissiveIntensity: isAgentActive ? 0.85 : 0.15,
        roughness: 0.2,
      });
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.48), screenMat);
      screen.position.set(0, 1.16, -0.178);
      stationGroup.add(screen);

      // Keyboard & Trackpad
      const keyboard = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.015, 0.15),
        new THREE.MeshStandardMaterial({ color: 0x1f2420, roughness: 0.5 })
      );
      keyboard.position.set(0, 0.75, 0.12);
      stationGroup.add(keyboard);

      // Ergonomic Chair
      const chairMat = new THREE.MeshStandardMaterial({ color: 0x1c201b, roughness: 0.7 });
      const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.46), chairMat);
      chairSeat.position.set(0, 0.48, 0.46);
      stationGroup.add(chairSeat);

      const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.5, 0.05), chairMat);
      chairBack.position.set(0, 0.74, 0.66);
      chairBack.rotation.x = 0.08;
      stationGroup.add(chairBack);

      // ── Character Attachment Group ──
      const charGroup = new THREE.Group();
      stationGroup.add(charGroup);

      // ── Floating Delegation Speech / Status Bubble ──
      const calloutAgent = agentData ?? {
        role: cfg.role,
        name: cfg.label,
        title: cfg.label,
        workstationName: cfg.label,
        description: cfg.label,
        status: 'idle',
        currentTask: 'Waiting for run activity.',
        logs: [],
      } satisfies OfficeAgentState;
      const { sprite: speechBubble, update: updateCallout } = createAgentCallout(visual.name, calloutAgent);
      speechBubble.position.set(0, 2.08, 0.46);
      stationGroup.add(speechBubble);

      const tetherMaterial = new THREE.MeshBasicMaterial({
        color: isAgentActive ? 0x00e599 : 0x71717a,
        transparent: true,
        opacity: isAgentActive ? 0.9 : 0.45,
      });
      const calloutTether = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.24, 6),
        tetherMaterial,
      );
      calloutTether.position.set(0, 1.62, 0.46);
      stationGroup.add(calloutTether);

      // ── Active Beacon Light & Blinking Radar Ring (High Visibility Indicator) ──
      const beaconOrb = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 16, 16),
        new THREE.MeshBasicMaterial({
          color: isAgentActive ? 0x00e599 : 0x71717a,
          transparent: true,
          opacity: isAgentActive ? 0.95 : 0.2,
        })
      );
      beaconOrb.position.set(0, 1.48, 0.46);
      stationGroup.add(beaconOrb);

      // Radiating Floor Pulse Beacon Ring
      const beaconRing = new THREE.Mesh(
        new THREE.RingGeometry(0.9, 1.1, 32),
        new THREE.MeshBasicMaterial({
          color: isAgentActive ? 0x00e599 : 0x334135,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: isAgentActive ? 0.75 : 0.15,
        })
      );
      beaconRing.rotation.x = Math.PI / 2;
      beaconRing.position.y = 0.015;
      stationGroup.add(beaconRing);

      // Status Halo
      const halo = new THREE.Mesh(
        new THREE.RingGeometry(0.24, 0.28, 24),
        new THREE.MeshBasicMaterial({
          color: isAgentActive ? 0x00e599 : 0x52525b,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: isAgentActive ? 0.9 : 0.3,
        })
      );
      halo.rotation.x = Math.PI / 2;
      halo.position.set(0, 1.48, 0.46);
      stationGroup.add(halo);

      // ── Role Specific Spin Colors ──
      const ROLE_SPIN_COLORS: Record<AgentRole, { primary: number; secondary: number }> = {
        orchestrator: { primary: 0xa8c879, secondary: 0x5e8c31 },
        explorer:     { primary: 0x38bdf8, secondary: 0x0284c7 },
        checker:      { primary: 0xef4444, secondary: 0xb91c1c },
        diagnostician:{ primary: 0xf59e0b, secondary: 0xd97706 },
        fix_advisor:  { primary: 0xa78bfa, secondary: 0x7c3aed },
        verifier:     { primary: 0x10b981, secondary: 0x047857 },
      };
      const spinCol = ROLE_SPIN_COLORS[cfg.role] || { primary: 0x00e599, secondary: 0x10b981 };

      // ── Gyroscopic 3D Spinning Orbit Rings ──
      const spinGroup = new THREE.Group();
      spinGroup.position.set(0, 1.48, 0.46);

      const outerSpinRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.38, 0.014, 12, 36),
        new THREE.MeshBasicMaterial({
          color: spinCol.primary,
          transparent: true,
          opacity: isAgentActive ? 0.95 : 0.18,
        })
      );
      spinGroup.add(outerSpinRing);

      const innerSpinRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.28, 0.012, 12, 32),
        new THREE.MeshBasicMaterial({
          color: spinCol.secondary,
          transparent: true,
          opacity: isAgentActive ? 0.85 : 0.12,
        })
      );
      innerSpinRing.rotation.x = Math.PI / 4;
      spinGroup.add(innerSpinRing);

      const orbitDot = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 12, 12),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: isAgentActive ? 1.0 : 0.2,
        })
      );
      spinGroup.add(orbitDot);
      stationGroup.add(spinGroup);

      // ── Holographic Activity Prop above desk ──
      let activityProp: THREE.Mesh | THREE.Group;
      if (cfg.role === 'explorer') {
        activityProp = new THREE.Mesh(
          new THREE.ConeGeometry(0.18, 0.32, 16, 1, true),
          new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: isAgentActive ? 0.85 : 0.25 })
        );
        activityProp.position.set(0, 1.08, 0.12);
        activityProp.rotation.x = Math.PI;
      } else if (cfg.role === 'checker') {
        activityProp = new THREE.Mesh(
          new THREE.RingGeometry(0.06, 0.16, 16),
          new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide, transparent: true, opacity: isAgentActive ? 0.9 : 0.25 })
        );
        activityProp.position.set(0, 1.08, 0.12);
        activityProp.rotation.x = -Math.PI / 3;
      } else if (cfg.role === 'diagnostician') {
        activityProp = new THREE.Mesh(
          new THREE.BoxGeometry(0.15, 0.15, 0.15),
          new THREE.MeshBasicMaterial({ color: 0xf59e0b, wireframe: true, transparent: true, opacity: isAgentActive ? 0.9 : 0.25 })
        );
        activityProp.position.set(0, 1.12, 0.12);
      } else if (cfg.role === 'fix_advisor') {
        activityProp = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.13),
          new THREE.MeshBasicMaterial({ color: 0xa78bfa, wireframe: true, transparent: true, opacity: isAgentActive ? 0.9 : 0.25 })
        );
        activityProp.position.set(0, 1.12, 0.12);
      } else {
        activityProp = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.13),
          new THREE.MeshBasicMaterial({ color: 0x10b981, wireframe: true, transparent: true, opacity: isAgentActive ? 0.9 : 0.25 })
        );
        activityProp.position.set(0, 1.12, 0.12);
      }
      stationGroup.add(activityProp);

      scene.add(stationGroup);

      characters.push({
        group: charGroup,
        role: cfg.role,
        screen,
        speechBubble,
        calloutTether,
        updateCallout,
        beaconOrb,
        beaconRing,
        halo,
        spinGroup,
        outerSpinRing,
        innerSpinRing,
        orbitDot,
        activityProp,
      });

      stationRayTargets.push({ group: stationGroup, role: cfg.role, halo });
    });

    // 8. Raycasting for Clicking Stations/Agents
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      for (const target of stationRayTargets) {
        const hits = raycaster.intersectObjects(target.group.children, true);
        if (hits.length > 0) {
          onSelectRoleRef.current(target.role);
          break;
        }
      }
    };

    container.addEventListener('pointerdown', onPointerDown);

    // 9. Render & Blinking Animation Loop
    let animId: number;
    const timer = new THREE.Timer();
    timer.connect(document);

    const animate = () => {
      animId = requestAnimationFrame(animate);
      timer.update();
      const delta = timer.getDelta();
      const elapsed = timer.getElapsed();

      // Update animation mixers from character.glb
      mixers.forEach((m) => m.update(delta));

      // Smooth camera lerp
      camera.position.lerp(targetCamPos.current, 0.045);
      currentCamLook.current.lerp(targetCamLook.current, 0.045);
      camera.lookAt(currentCamLook.current);

      // Dynamic Blinking and Spinning indicators for agents
      characters.forEach((char) => {
        const isAgentActive = agentsRef.current[char.role]?.status === 'active';
        const agent = agentsRef.current[char.role];
        if (agent) {
          char.updateCallout(agent);
          const tetherMaterial = char.calloutTether.material as THREE.MeshBasicMaterial;
          tetherMaterial.color.set(agent.status === 'active' ? 0x00e599 : agent.status === 'error' ? 0xe5484d : 0x71717a);
          tetherMaterial.opacity = agent.status === 'active' ? 0.95 : 0.4;
        }

        // 1. Gyroscopic 3D Spinning Animation (High-speed spin when active)
        if (char.outerSpinRing && char.innerSpinRing && char.orbitDot) {
          if (isAgentActive) {
            char.outerSpinRing.rotation.y += delta * 3.8;
            char.outerSpinRing.rotation.z += delta * 2.2;
            (char.outerSpinRing.material as THREE.MeshBasicMaterial).opacity = 0.95;

            char.innerSpinRing.rotation.x += delta * 3.0;
            char.innerSpinRing.rotation.y -= delta * 3.4;
            (char.innerSpinRing.material as THREE.MeshBasicMaterial).opacity = 0.9;

            const orbitAngle = elapsed * 5.2;
            char.orbitDot.position.set(
              Math.cos(orbitAngle) * 0.40,
              Math.sin(elapsed * 7) * 0.10,
              Math.sin(orbitAngle) * 0.40
            );
            (char.orbitDot.material as THREE.MeshBasicMaterial).opacity = 1.0;
          } else {
            char.outerSpinRing.rotation.y += delta * 0.4;
            char.innerSpinRing.rotation.x += delta * 0.3;
            (char.outerSpinRing.material as THREE.MeshBasicMaterial).opacity = 0.15;
            (char.innerSpinRing.material as THREE.MeshBasicMaterial).opacity = 0.12;
            (char.orbitDot.material as THREE.MeshBasicMaterial).opacity = 0.15;
          }
        }

        // 2. Activity Prop motion (Radar, Reticle, Data Cube, Patch Prism, Shield)
        if (char.activityProp) {
          if (isAgentActive) {
            char.activityProp.rotation.y += delta * 3.2;
            char.activityProp.position.y = 1.10 + Math.sin(elapsed * 4) * 0.04;
            if ((char.activityProp as any).material) {
              ((char.activityProp as any).material as THREE.MeshBasicMaterial).opacity = 0.95;
            }
          } else {
            char.activityProp.rotation.y += delta * 0.5;
            if ((char.activityProp as any).material) {
              ((char.activityProp as any).material as THREE.MeshBasicMaterial).opacity = 0.2;
            }
          }
        }

        // 3. Switch character skeletal animation state when active/idle
        if (char.workAction && char.idleAction) {
          if (isAgentActive && !char.workAction.isRunning()) {
            char.idleAction.stop();
            char.workAction.play();
          } else if (!isAgentActive && !char.idleAction.isRunning()) {
            char.workAction.stop();
            char.idleAction.play();
          }
        }

        if (isAgentActive) {
          // PROMINENT BLINKING: High-speed blink oscillation at 9 rad/s
          const blinkFactor = (Math.sin(elapsed * 9) + 1) * 0.5;

          // Top Beacon Orb blinks brightly
          (char.beaconOrb.material as THREE.MeshBasicMaterial).opacity = 0.35 + blinkFactor * 0.65;
          char.beaconOrb.scale.setScalar(0.95 + blinkFactor * 0.35);

          // Radiating Floor Beacon pulses outward
          const pulseProgress = (elapsed * 2.5) % 1;
          char.beaconRing.scale.setScalar(1 + pulseProgress * 0.45);
          (char.beaconRing.material as THREE.MeshBasicMaterial).opacity = (1 - pulseProgress) * 0.85;

          // Monitor Screen Code Flashes
          if (char.screen) {
            (char.screen.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.55 + blinkFactor * 0.45;
          }

          // Speech Bubble bobs gently
          char.speechBubble.position.y = 2.08 + Math.sin(elapsed * 3) * 0.03;
        } else {
          // Idle state: steady subdued beacon
          (char.beaconOrb.material as THREE.MeshBasicMaterial).opacity = 0.18;
          char.beaconOrb.scale.setScalar(1);
          char.beaconRing.scale.setScalar(1);
          (char.beaconRing.material as THREE.MeshBasicMaterial).opacity = 0.15;
          if (char.screen) {
            (char.screen.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.15;
          }
          char.speechBubble.position.y = 2.08;
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
      container.removeEventListener('pointerdown', onPointerDown);
      cancelAnimationFrame(animId);
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      timer.dispose();
      dracoLoader.dispose();
    };
  }, []);

  if (webglError) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface-1)',
        color: 'var(--secondary-text)',
      }}>
        WebGL unavailable · Please use the accessible non-3D fallback mode
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        cursor: 'grab',
      }}
    />
  );
}
