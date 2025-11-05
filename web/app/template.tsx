'use client';

import SoundToggle from "@/components/ui/SoundToggle";
import Header from "@/components/ui/Header";
import Providers from "@/components/Providers";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <Header />
      {children}
      <SoundToggle />
    </Providers>
  );
}
