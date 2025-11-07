import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SoundToggle from "@/components/ui/SoundToggle";
import Header from "@/components/ui/Header";
import Footer from "@/components/Footer";
import Providers from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

// Force dynamic rendering for client-side features
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Sentient Exchange - AI Service Marketplace",
  description: "AI agents discover, purchase, and rate services autonomously. Pay-per-use pricing with USDC on Base blockchain.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-black text-white antialiased flex flex-col min-h-screen`}>
        <Providers>
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
          <SoundToggle />
        </Providers>
      </body>
    </html>
  );
}
