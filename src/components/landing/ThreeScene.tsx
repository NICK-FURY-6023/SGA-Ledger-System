'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

function Particles() {
  const ref = useRef<THREE.Points>(null!);

  const particleCount = 3000;
  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = state.clock.elapsedTime * 0.02;
      ref.current.rotation.y = state.clock.elapsedTime * 0.03;
    }
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#1E90FF"
        size={0.03}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.8}
      />
    </Points>
  );
}

function OrangeParticles() {
  const ref = useRef<THREE.Points>(null!);

  const particleCount = 1000;
  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = -state.clock.elapsedTime * 0.015;
      ref.current.rotation.y = -state.clock.elapsedTime * 0.025;
    }
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#FF8C00"
        size={0.025}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.6}
      />
    </Points>
  );
}

function GlowRing() {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.z = state.clock.elapsedTime * 0.1;
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.3;
    }
  });

  return (
    <mesh ref={ref}>
      <torusGeometry args={[3, 0.02, 16, 100]} />
      <meshBasicMaterial color="#0066FF" transparent opacity={0.4} />
    </mesh>
  );
}

function SecondRing() {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.z = -state.clock.elapsedTime * 0.08;
      ref.current.rotation.y = Math.cos(state.clock.elapsedTime * 0.15) * 0.4;
    }
  });

  return (
    <mesh ref={ref}>
      <torusGeometry args={[4, 0.015, 16, 100]} />
      <meshBasicMaterial color="#FF8C00" transparent opacity={0.25} />
    </mesh>
  );
}

function CameraRig() {
  useFrame((state) => {
    state.camera.position.x = Math.sin(state.clock.elapsedTime * 0.05) * 0.5;
    state.camera.position.y = Math.cos(state.clock.elapsedTime * 0.03) * 0.3;
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function ThreeScene() {
  return (
    <div className="landing__canvas">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: '#000' }}
      >
        <ambientLight intensity={0.2} />
        <Particles />
        <OrangeParticles />
        <GlowRing />
        <SecondRing />
        <CameraRig />
      </Canvas>
    </div>
  );
}
