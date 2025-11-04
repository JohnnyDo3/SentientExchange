'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ConnectionBeamProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  strength: number; // 0-1, affects opacity and particle count
  color?: THREE.Color;
}

export default function ConnectionBeam({
  start,
  end,
  strength,
  color = new THREE.Color(0xa855f7)
}: ConnectionBeamProps) {
  const lineRef = useRef<THREE.Line>(null);
  const particlesRef = useRef<THREE.Points>(null);

  // Create line geometry
  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array([
      start.x, start.y, start.z,
      end.x, end.y, end.z
    ]);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, [start, end]);

  // Create particles along the beam
  const particleCount = Math.floor(strength * 20) + 5;
  const particleGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const t = i / particleCount;
      positions[i * 3] = THREE.MathUtils.lerp(start.x, end.x, t);
      positions[i * 3 + 1] = THREE.MathUtils.lerp(start.y, end.y, t);
      positions[i * 3 + 2] = THREE.MathUtils.lerp(start.z, end.z, t);

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geometry;
  }, [start, end, particleCount, color]);

  // Animate particles flowing along the beam
  useFrame((state) => {
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        // Calculate flow parameter (0 to 1) that cycles over time
        let t = ((state.clock.elapsedTime * 0.5 + i / particleCount) % 1);

        // Interpolate position along the beam
        positions[i * 3] = THREE.MathUtils.lerp(start.x, end.x, t);
        positions[i * 3 + 1] = THREE.MathUtils.lerp(start.y, end.y, t);
        positions[i * 3 + 2] = THREE.MathUtils.lerp(start.z, end.z, t);
      }

      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // Pulse the line opacity
    if (lineRef.current) {
      const material = lineRef.current.material as THREE.LineBasicMaterial;
      const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.2 + 0.8;
      material.opacity = strength * 0.4 * pulse;
    }
  });

  return (
    <group>
      {/* Connection line */}
      <line ref={lineRef} geometry={lineGeometry}>
        <lineBasicMaterial
          color={color}
          transparent
          opacity={strength * 0.4}
          linewidth={2}
        />
      </line>

      {/* Flowing particles */}
      <points ref={particlesRef} geometry={particleGeometry}>
        <pointsMaterial
          size={0.15}
          transparent
          opacity={0.8}
          vertexColors
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
