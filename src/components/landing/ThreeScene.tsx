'use client';

import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

/* Deep-space starfield */
function Starfield() {
  const ref = useRef<THREE.Points>(null!);
  const count = 2000;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 15 + Math.random() * 35;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, []);

  useFrame((s) => {
    if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 0.005;
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial transparent color="#ffffff" size={0.015} sizeAttenuation depthWrite={false} opacity={0.6} />
    </Points>
  );
}

/* Main blue particle cloud */
function BlueParticles() {
  const ref = useRef<THREE.Points>(null!);
  const count = 1500;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 22;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 22;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 22;
    }
    return pos;
  }, []);

  useFrame((s) => {
    if (ref.current) {
      ref.current.rotation.x = s.clock.elapsedTime * 0.015;
      ref.current.rotation.y = s.clock.elapsedTime * 0.02;
    }
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial transparent color="#1E90FF" size={0.035} sizeAttenuation depthWrite={false} opacity={0.75} />
    </Points>
  );
}

/* Orange accent particles */
function OrangeParticles() {
  const ref = useRef<THREE.Points>(null!);
  const count = 600;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 18;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 18;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 18;
    }
    return pos;
  }, []);

  useFrame((s) => {
    if (ref.current) {
      ref.current.rotation.x = -s.clock.elapsedTime * 0.012;
      ref.current.rotation.y = -s.clock.elapsedTime * 0.018;
    }
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial transparent color="#FF8C00" size={0.028} sizeAttenuation depthWrite={false} opacity={0.6} />
    </Points>
  );
}

/* Animated orbital ring */
function OrbitalRing({ radius, color, speed, tiltX, tiltY, thickness, opacity }: {
  radius: number; color: string; speed: number; tiltX: number; tiltY: number;
  thickness: number; opacity: number;
}) {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame((s) => {
    if (ref.current) {
      ref.current.rotation.z = s.clock.elapsedTime * speed;
      ref.current.rotation.x = tiltX + Math.sin(s.clock.elapsedTime * speed * 0.5) * 0.15;
      ref.current.rotation.y = tiltY + Math.cos(s.clock.elapsedTime * speed * 0.3) * 0.1;
    }
  });

  return (
    <mesh ref={ref}>
      <torusGeometry args={[radius, thickness, 16, 100]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  );
}

/* Floating wireframe icosahedron */
function FloatingShape({ position, color, speed, size }: {
  position: [number, number, number]; color: string; speed: number; size: number;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const baseY = position[1];

  useFrame((s) => {
    if (ref.current) {
      ref.current.position.y = baseY + Math.sin(s.clock.elapsedTime * speed) * 0.6;
      ref.current.rotation.x = s.clock.elapsedTime * speed * 0.4;
      ref.current.rotation.y = s.clock.elapsedTime * speed * 0.3;
    }
  });

  return (
    <mesh ref={ref} position={position} scale={size}>
      <icosahedronGeometry args={[1, 0]} />
      <meshBasicMaterial color={color} transparent opacity={0.12} wireframe />
    </mesh>
  );
}

/* Perspective grid floor */
function GridFloor() {
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const s = 15;
    const d = 20;
    const step = (s * 2) / d;
    for (let i = 0; i <= d; i++) {
      const p = -s + i * step;
      pts.push(new THREE.Vector3(p, 0, -s), new THREE.Vector3(p, 0, s));
      pts.push(new THREE.Vector3(-s, 0, p), new THREE.Vector3(s, 0, p));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);

  return (
    <lineSegments geometry={geo} position={[0, -3.5, 0]} rotation={[0.15, 0, 0]}>
      <lineBasicMaterial color="#0066FF" transparent opacity={0.04} />
    </lineSegments>
  );
}

/* Central pulsing glow */
function GlowCore() {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame((s) => {
    if (ref.current) {
      const sc = 1 + Math.sin(s.clock.elapsedTime * 0.5) * 0.15;
      ref.current.scale.set(sc, sc, sc);
    }
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.6, 32, 32]} />
      <meshBasicMaterial color="#0044AA" transparent opacity={0.04} />
    </mesh>
  );
}

/* Mouse-reactive cinematic camera */
function CameraRig() {
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handler, { passive: true });
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const mx = mouse.current.x;
    const my = mouse.current.y;
    state.camera.position.x = Math.sin(t * 0.04) * 1.5 + mx * 0.4;
    state.camera.position.y = Math.cos(t * 0.03) * 0.8 - my * 0.3;
    state.camera.position.z = 6 + Math.sin(t * 0.02) * 0.5;
    state.camera.lookAt(0, 0, 0);
  });

  return null;
}

export default function ThreeScene() {
  return (
    <div className="landing__canvas">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        dpr={[1, 1.2]}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: '#000' }}
      >
        <ambientLight intensity={0.15} />

        <Starfield />
        <BlueParticles />
        <OrangeParticles />

        <OrbitalRing radius={2.5} color="#0066FF" speed={0.08} tiltX={0.3} tiltY={0} thickness={0.02} opacity={0.45} />
        <OrbitalRing radius={3.2} color="#FF8C00" speed={-0.06} tiltX={-0.2} tiltY={0.4} thickness={0.018} opacity={0.3} />
        <OrbitalRing radius={4} color="#1E90FF" speed={0.04} tiltX={0.5} tiltY={-0.3} thickness={0.012} opacity={0.2} />
        <OrbitalRing radius={5} color="#FF6600" speed={-0.03} tiltX={-0.4} tiltY={0.6} thickness={0.01} opacity={0.12} />

        <FloatingShape position={[-3.5, 2, -2]} color="#0066FF" speed={0.4} size={0.3} />
        <FloatingShape position={[4, -1, -3]} color="#FF8C00" speed={0.3} size={0.25} />
        <FloatingShape position={[-2.5, -2.5, -1]} color="#1E90FF" speed={0.5} size={0.2} />

        <GridFloor />
        <GlowCore />
        <CameraRig />
      </Canvas>
    </div>
  );
}
