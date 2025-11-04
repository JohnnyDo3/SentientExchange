'use client';

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Service } from '@/lib/types';
import { Text } from '@react-three/drei';

interface ServiceNodeProps {
  service: Service;
  position: THREE.Vector3;
  color: THREE.Color;
  mass: number;
  onClick: (service: Service) => void;
  onHover: (service: Service | null) => void;
}

export default function ServiceNode({
  service,
  position,
  color,
  mass,
  onClick,
  onHover
}: ServiceNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Calculate size based on mass (popularity)
  const baseSize = 0.5;
  const size = baseSize + (mass - 1) * 0.2; // Scale from 0.5 to ~1.5

  // Pulsing animation
  useFrame((state) => {
    if (meshRef.current) {
      // Gentle pulse based on time
      const pulse = Math.sin(state.clock.elapsedTime * 2 + position.x) * 0.05 + 1;
      const scale = hovered ? pulse * 1.3 : pulse;
      meshRef.current.scale.setScalar(scale);

      // Update position from physics (will be set by parent)
      meshRef.current.position.copy(position);
    }
  });

  const handlePointerOver = () => {
    setHovered(true);
    onHover(service);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    setHovered(false);
    onHover(null);
    document.body.style.cursor = 'auto';
  };

  const handleClick = () => {
    onClick(service);
  };

  return (
    <group position={position}>
      {/* Main sphere */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.8 : 0.4}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* Glow ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[size * 1.2, size * 1.4, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={hovered ? 0.6 : 0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Service name label (visible on hover) */}
      {hovered && (
        <Text
          position={[0, size + 0.8, 0]}
          fontSize={0.4}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {service.name}
        </Text>
      )}

      {/* Rating indicator (small sphere above) */}
      <mesh position={[0, size + 0.3, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial color="#fbbf24" />
      </mesh>

      {/* Capability badges (small spheres orbiting) */}
      {service.capabilities.slice(0, 3).map((_, index) => {
        const angle = (index / 3) * Math.PI * 2;
        const orbitRadius = size * 1.8;
        return (
          <mesh
            key={index}
            position={[
              Math.cos(angle) * orbitRadius,
              0,
              Math.sin(angle) * orbitRadius
            ]}
          >
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshBasicMaterial color="#a855f7" opacity={0.7} transparent />
          </mesh>
        );
      })}
    </group>
  );
}
