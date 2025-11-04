'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface MarketplaceParticlesProps {
  count?: number;
}

export default function MarketplaceParticles({ count = 10000 }: MarketplaceParticlesProps) {
  const mesh = useRef<THREE.Points>(null);
  const mousePosition = useRef({ x: 0, y: 0 });

  // Generate particles
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Position (spread across space)
      positions[i3] = (Math.random() - 0.5) * 100;
      positions[i3 + 1] = (Math.random() - 0.5) * 100;
      positions[i3 + 2] = (Math.random() - 0.5) * 50;

      // Colors (purple to pink gradient)
      const colorChoice = Math.random();
      if (colorChoice < 0.33) {
        // Purple
        colors[i3] = 0.659; // R
        colors[i3 + 1] = 0.333; // G
        colors[i3 + 2] = 0.969; // B
      } else if (colorChoice < 0.66) {
        // Pink
        colors[i3] = 0.925; // R
        colors[i3 + 1] = 0.282; // G
        colors[i3 + 2] = 0.6; // B
      } else {
        // Blue-ish
        colors[i3] = 0.5;
        colors[i3 + 1] = 0.6;
        colors[i3 + 2] = 1.0;
      }

      // Sizes (varied)
      sizes[i] = Math.random() * 2 + 0.5;

      // Velocities (for movement)
      velocities[i3] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.01;
    }

    return { positions, colors, sizes, velocities };
  }, [count]);

  // Animation loop
  useFrame((state) => {
    if (!mesh.current) return;

    const positions = mesh.current.geometry.attributes.position.array as Float32Array;
    const velocities = particles.velocities;
    const time = state.clock.getElapsedTime();

    // Update particle positions
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Add velocity
      positions[i3] += velocities[i3];
      positions[i3 + 1] += velocities[i3 + 1];
      positions[i3 + 2] += velocities[i3 + 2];

      // Add wave motion
      positions[i3 + 1] += Math.sin(time + positions[i3] * 0.1) * 0.001;

      // Mouse interaction - repel particles
      const dx = positions[i3] - mousePosition.current.x * 50;
      const dy = positions[i3 + 1] - mousePosition.current.y * 50;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 15) {
        const force = (15 - dist) / 15;
        positions[i3] += (dx / dist) * force * 0.5;
        positions[i3 + 1] += (dy / dist) * force * 0.5;
      }

      // Boundaries (wrap around)
      if (positions[i3] > 50) positions[i3] = -50;
      if (positions[i3] < -50) positions[i3] = 50;
      if (positions[i3 + 1] > 50) positions[i3 + 1] = -50;
      if (positions[i3 + 1] < -50) positions[i3 + 1] = 50;
      if (positions[i3 + 2] > 25) positions[i3 + 2] = -25;
      if (positions[i3 + 2] < -25) positions[i3 + 2] = 25;
    }

    mesh.current.geometry.attributes.position.needsUpdate = true;

    // Rotate the whole system slowly
    mesh.current.rotation.y = time * 0.02;
  });

  // Track mouse position
  if (typeof window !== 'undefined') {
    window.addEventListener('mousemove', (e) => {
      mousePosition.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mousePosition.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });
  }

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particles.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={particles.colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={particles.sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.5}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
