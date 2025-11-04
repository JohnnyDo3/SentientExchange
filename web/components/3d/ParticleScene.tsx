'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import MarketplaceParticles from './MarketplaceParticles';

export default function ParticleScene() {
  return (
    <div className="fixed inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 0, 30], fov: 75 }}
        gl={{ alpha: true, antialias: true }}
      >
        <Suspense fallback={null}>
          <MarketplaceParticles count={10000} />
          <ambientLight intensity={0.5} />
        </Suspense>
      </Canvas>
    </div>
  );
}
