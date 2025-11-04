'use client';

import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Environment } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Service } from '@/lib/types';
import {
  ServiceNode as ServiceNodeType,
  initializeNodes,
  updatePhysics,
  shouldDrawConnection,
  getConnectionStrength
} from '@/lib/physics';
import ServiceNodeModern from './ServiceNodeModern';
import ConnectionBeam from './ConnectionBeam';

interface GravityWellSceneProps {
  services: Service[];
  onServiceClick: (service: Service) => void;
  onServiceHover: (service: Service | null) => void;
}

function GravityWellScene({ services, onServiceClick, onServiceHover }: GravityWellSceneProps) {
  const [nodes, setNodes] = useState<ServiceNodeType[]>([]);
  const lastTime = useRef(0);

  // Initialize nodes when services change
  useEffect(() => {
    if (services.length > 0) {
      const initialized = initializeNodes(services, 15);
      setNodes(initialized);
    }
  }, [services]);

  // Physics simulation
  useFrame((state) => {
    if (nodes.length === 0) return;

    const currentTime = state.clock.elapsedTime;
    const deltaTime = currentTime - lastTime.current;
    lastTime.current = currentTime;

    // Limit delta time to prevent instability
    const clampedDelta = Math.min(deltaTime, 0.1);

    // Update physics - gravity well pulls everything toward center
    updatePhysics(nodes, clampedDelta, 0.1, 1.0, 0.9);

    // Trigger re-render
    setNodes([...nodes]);
  });

  // Calculate connections between services
  const connections = useRef<Array<{
    start: THREE.Vector3;
    end: THREE.Vector3;
    strength: number;
  }>>([]);

  useEffect(() => {
    const newConnections: typeof connections.current = [];

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];

        if (shouldDrawConnection(nodeA.service, nodeB.service, 2)) {
          const strength = getConnectionStrength(nodeA.service, nodeB.service);
          newConnections.push({
            start: nodeA.position.clone(),
            end: nodeB.position.clone(),
            strength
          });
        }
      }
    }

    connections.current = newConnections;
  }, [nodes]);

  return (
    <>
      {/* Modern Soft Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.4} color="#ffffff" />
      <pointLight position={[0, 10, 0]} intensity={0.3} color="#a855f7" />
      <pointLight position={[-10, -5, 10]} intensity={0.2} color="#06b6d4" />

      {/* Environment */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <Environment preset="night" />

      {/* Central glow at bottom of well */}
      <mesh position={[0, -10, 0]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#a855f7" transparent opacity={0.5} />
      </mesh>

      {/* Connection beams - DISABLED: Too chaotic with many services */}
      {/* {connections.current.map((connection, index) => (
        <ConnectionBeam
          key={`connection-${index}`}
          start={connection.start}
          end={connection.end}
          strength={connection.strength}
        />
      ))} */}

      {/* Service nodes */}
      {nodes.map(node => (
        <ServiceNodeModern
          key={node.id}
          service={node.service}
          position={node.position}
          color={node.color}
          mass={node.mass}
          onClick={onServiceClick}
          onHover={onServiceHover}
        />
      ))}

      {/* Orbit controls */}
      <OrbitControls
        enableZoom={true}
        enablePan={false}
        minDistance={10}
        maxDistance={50}
        autoRotate
        autoRotateSpeed={0.2}
        dampingFactor={0.05}
        rotateSpeed={0.5}
      />

      {/* Post-processing effects - Subtle modern bloom */}
      <EffectComposer>
        <Bloom
          intensity={0.4}
          luminanceThreshold={0.7}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

interface GravityWellProps {
  services: Service[];
  onServiceClick: (service: Service) => void;
  onServiceHover: (service: Service | null) => void;
  className?: string;
}

export default function GravityWell({
  services,
  onServiceClick,
  onServiceHover,
  className = ''
}: GravityWellProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 25], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
      >
        <GravityWellScene
          services={services}
          onServiceClick={onServiceClick}
          onServiceHover={onServiceHover}
        />
      </Canvas>
    </div>
  );
}
