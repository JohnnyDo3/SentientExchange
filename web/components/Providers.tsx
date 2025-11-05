'use client';

import dynamic from 'next/dynamic';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { useState } from 'react';

// Dynamically import Solana providers with SSR disabled to avoid React context errors during build
const SolanaProviders = dynamic(
  () => import('./SolanaProviders').then(mod => ({ default: mod.SolanaProviders })),
  { ssr: false }
);

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SolanaProviders>
        <AuthProvider>
          {children}
        </AuthProvider>
      </SolanaProviders>
    </QueryClientProvider>
  );
}
