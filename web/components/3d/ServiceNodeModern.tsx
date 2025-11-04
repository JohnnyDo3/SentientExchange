'use client';

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Service } from '@/lib/types';
import { Text, Html } from '@react-three/drei';

interface ServiceNodeProps {
  service: Service;
  position: THREE.Vector3;
  color: THREE.Color;
  mass: number;
  onClick: (service: Service) => void;
  onHover: (service: Service | null) => void;
}

export default function ServiceNodeModern({
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
  const baseSize = 0.6;
  const size = baseSize + (mass - 1) * 0.15;

  // Use service's custom color if available
  const serviceColor = service.color ? new THREE.Color(service.color) : color;

  // Gentle floating animation
  useFrame((state) => {
    if (meshRef.current) {
      // Subtle hover animation
      const hoverScale = hovered ? 1.15 : 1;
      const floatY = Math.sin(state.clock.elapsedTime * 0.5 + position.x) * 0.1;

      meshRef.current.scale.setScalar(hoverScale);
      meshRef.current.position.copy(position);
      meshRef.current.position.y += floatY;
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
    <group
      position={position}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Invisible larger hitbox for easier clicking */}
      <mesh>
        <sphereGeometry args={[size * 1.5, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Main glass sphere with soft glow */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[size, 64, 64]} />
        <meshPhysicalMaterial
          color={serviceColor}
          transparent
          opacity={0.4}
          roughness={0}
          metalness={0.1}
          transmission={0.9}
          thickness={0.5}
          clearcoat={1}
          clearcoatRoughness={0}
        />
      </mesh>

      {/* Inner core */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[size * 0.3, 32, 32]} />
        <meshStandardMaterial
          color={serviceColor}
          emissive={serviceColor}
          emissiveIntensity={hovered ? 0.8 : 0.3}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Service icon/emoji floating in center */}
      <Html
        position={[0, 0, 0]}
        center
        distanceFactor={8}
        style={{
          fontSize: `${size * 40}px`,
          userSelect: 'none',
          pointerEvents: 'none',
          textShadow: '0 2px 8px rgba(0,0,0,0.5)'
        }}
      >
        {service.image || '🔮'}
      </Html>

      {/* Soft ambient ring */}
      {hovered && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size * 1.3, size * 1.5, 64]} />
          <meshBasicMaterial
            color={serviceColor}
            transparent
            opacity={0.2}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Service name label (on hover) */}
      {hovered && (
        <Html
          position={[0, size + 1, 0]}
          center
          distanceFactor={10}
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600',
            whiteSpace: 'nowrap',
            border: `1px solid ${service.color || '#a855f7'}40`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            userSelect: 'none',
            pointerEvents: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {service.image && <span>{service.image}</span>}
            <span>{service.name}</span>
          </div>
        </Html>
      )}

      {/* Rating badge */}
      <Html
        position={[size + 0.3, size + 0.3, 0]}
        center
        distanceFactor={15}
        style={{
          background: 'rgba(16, 185, 129, 0.9)',
          backdropFilter: 'blur(10px)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '8px',
          fontSize: '11px',
          fontWeight: '700',
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          userSelect: 'none',
          pointerEvents: 'none'
        }}
      >
        ⭐ {service.reputation.rating.toFixed(1)}
      </Html>
    </group>
  );
}
