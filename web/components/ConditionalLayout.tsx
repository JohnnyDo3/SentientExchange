'use client';

import { usePathname } from 'next/navigation';
import Header from './ui/Header';
import Footer from './Footer';

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Hide header/footer on chat page for full-screen experience
  const isFullScreen = pathname === '/chat';

  if (isFullScreen) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
