// @ts-nocheck
'use client';

import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Line, Text } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Clock, DollarSign } from 'lucide-react';

interface SwarmVisualizationProps {
  isRunning: boolean;
  query: string;
}

export default function SwarmVisualization({ isRunning, query: _query }: SwarmVisualizationProps) {
  const [activeAgents, setActiveAgents] = useState<Set<number>>(new Set());
  const [completedAgents, setCompletedAgents] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isRunning) {
      setActiveAgents(new Set());
      setCompletedAgents(new Set());
      setProgress(0);
      return;
    }

    // Simulate agent execution sequence
    const agents = [
      { id: 0, delay: 1000, duration: 2100 },
      { id: 1, delay: 1500, duration: 3400 },
      { id: 2, delay: 2000, duration: 4200 },
      { id: 3, delay: 2500, duration: 2800 },
    ];

    agents.forEach(({ id, delay, duration }) => {
      // Start agent
      setTimeout(() => {
        setActiveAgents(prev => new Set(prev).add(id));
      }, delay);

      // Complete agent
      setTimeout(() => {
        setActiveAgents(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setCompletedAgents(prev => new Set(prev).add(id));
      }, delay + duration);
    });

    // Update progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const next = prev + (100 / 120); // 120 frames = 12 seconds
        return Math.min(next, 100);
      });
    }, 100);

    return () => {
      clearInterval(progressInterval);
    };
  }, [isRunning]);

  return (
    <div className="relative w-full h-full">
      {/* 3D Canvas */}
      <Canvas camera={{ position: [0, 0, 15], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />

        {/* Coordinator Node (Center) */}
        <CoordinatorNode isActive={isRunning} />

        {/* Specialist Agent Nodes */}
        <AgentNode
          position={[-5, 3, 0]}
          label="Financial"
          color="#10b981"
          isActive={activeAgents.has(0)}
          isCompleted={completedAgents.has(0)}
        />
        <AgentNode
          position={[5, 3, 0]}
          label="News"
          color="#3b82f6"
          isActive={activeAgents.has(1)}
          isCompleted={completedAgents.has(1)}
        />
        <AgentNode
          position={[-5, -3, 0]}
          label="Technical"
          color="#a855f7"
          isActive={activeAgents.has(2)}
          isCompleted={completedAgents.has(2)}
        />
        <AgentNode
          position={[5, -3, 0]}
          label="Industry"
          color="#ec4899"
          isActive={activeAgents.has(3)}
          isCompleted={completedAgents.has(3)}
        />

        {/* Connection Lines */}
        <ConnectionLine
          start={[0, 0, 0]}
          end={[-5, 3, 0]}
          isActive={activeAgents.has(0) || completedAgents.has(0)}
        />
        <ConnectionLine
          start={[0, 0, 0]}
          end={[5, 3, 0]}
          isActive={activeAgents.has(1) || completedAgents.has(1)}
        />
        <ConnectionLine
          start={[0, 0, 0]}
          end={[-5, -3, 0]}
          isActive={activeAgents.has(2) || completedAgents.has(2)}
        />
        <ConnectionLine
          start={[0, 0, 0]}
          end={[5, -3, 0]}
          isActive={activeAgents.has(3) || completedAgents.has(3)}
        />

        {/* Particle Systems for Active Agents */}
        {Array.from(activeAgents).map((agentId) => {
          const positions = [[-5, 3, 0], [5, 3, 0], [-5, -3, 0], [5, -3, 0]];
          return (
            <DataParticles
              key={agentId}
              start={positions[agentId]}
              end={[0, 0, 0]}
            />
          );
        })}

        {/* Post-processing effects */}
        <EffectComposer>
          <Bloom luminanceThreshold={0.3} luminanceSmoothing={0.9} intensity={1.5} />
        </EffectComposer>

        <OrbitControls enableZoom={true} enablePan={false} />
      </Canvas>

      {/* Progress Overlay */}
      {isRunning && (
        <div className="absolute bottom-8 left-8 right-8 space-y-3">
          <AnimatePresence>
            {[0, 1, 2, 3].map((id) => {
              const labels = ['Financial analysis', 'News sentiment', 'Technical analysis', 'Industry intel'];
              const isActive = activeAgents.has(id);
              const isComplete = completedAgents.has(id);

              if (!isActive && !isComplete) return null;

              return (
                <motion.div
                  key={id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-3 glass rounded-xl px-4 py-3"
                >
                  {isComplete ? (
                    <CheckCircle className="w-5 h-5 text-green" />
                  ) : (
                    <Clock className="w-5 h-5 text-purple animate-spin" />
                  )}
                  <span className="flex-1 text-white">{labels[id]}</span>
                  {isComplete && <span className="text-green text-sm">complete</span>}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Cost/Time */}
          <div className="glass rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green" />
                <span className="text-white">$0.{Math.floor(progress * 0.85 / 100 * 100).toString().padStart(2, '0')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple" />
                <span className="text-white">{Math.floor(progress * 1.92)}s</span>
              </div>
            </div>
            <div className="text-gray-400 text-sm">{Math.floor(progress)}%</div>
          </div>
        </div>
      )}
    </div>
  );
}

function CoordinatorNode({ isActive }: { isActive: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.5;
    }
  });

  return (
    <group>
      <Sphere ref={meshRef} args={[1, 32, 32]}>
        <meshStandardMaterial
          color={isActive ? '#a855f7' : '#6b7280'}
          emissive={isActive ? '#a855f7' : '#000000'}
          emissiveIntensity={isActive ? 0.5 : 0}
        />
      </Sphere>
      <Text position={[0, -1.8, 0]} fontSize={0.4} color="white" anchorX="center">
        Coordinator
      </Text>
    </group>
  );
}

interface AgentNodeProps {
  position: [number, number, number];
  label: string;
  color: string;
  isActive: boolean;
  isCompleted: boolean;
}

function AgentNode({ position, label, color, isActive, isCompleted }: AgentNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current && isActive) {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.getElapsedTime() * 3) * 0.1);
    }
  });

  return (
    <group position={position}>
      <Sphere ref={meshRef} args={[0.6, 32, 32]}>
        <meshStandardMaterial
          color={isCompleted ? color : isActive ? color : '#374151'}
          emissive={isActive || isCompleted ? color : '#000000'}
          emissiveIntensity={isActive ? 0.8 : isCompleted ? 0.3 : 0}
        />
      </Sphere>
      <Text position={[0, -1.2, 0]} fontSize={0.3} color="white" anchorX="center">
        {label}
      </Text>
    </group>
  );
}

interface ConnectionLineProps {
  start: [number, number, number];
  end: [number, number, number];
  isActive: boolean;
}

function ConnectionLine({ start, end, isActive }: ConnectionLineProps) {
  return (
    <Line
      points={[start, end]}
      color={isActive ? '#a855f7' : '#374151'}
      lineWidth={isActive ? 2 : 1}
      transparent
      opacity={isActive ? 0.8 : 0.3}
    />
  );
}

function DataParticles({ start, end }: { start: [number, number, number]; end: [number, number, number] }) {
  const particlesRef = useRef<THREE.Points>(null);
  const count = 20;

  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const t = i / count;
    positions[i * 3] = start[0] + (end[0] - start[0]) * t;
    positions[i * 3 + 1] = start[1] + (end[1] - start[1]) * t;
    positions[i * 3 + 2] = start[2] + (end[2] - start[2]) * t;
  }

  useFrame((state) => {
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        const t = (i / count + state.clock.getElapsedTime() * 0.5) % 1;
        positions[i * 3] = start[0] + (end[0] - start[0]) * t;
        positions[i * 3 + 1] = start[1] + (end[1] - start[1]) * t;
        positions[i * 3 + 2] = start[2] + (end[2] - start[2]) * t;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.1} color="#a855f7" transparent opacity={0.8} />
    </points>
  );
}
