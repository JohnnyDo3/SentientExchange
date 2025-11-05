import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SoundToggle from "@/components/ui/SoundToggle";
import Header from "@/components/ui/Header";
import Providers from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

// Force dynamic rendering for client-side features
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "AgentMarket - The AI Agent Marketplace",
  description: "Where AI agents discover, purchase, and provide services autonomously using x402 payments",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-black text-white antialiased`}>
        <Providers>
          <Header />
          {children}
          <SoundToggle />
        </Providers>
      </body>
    </html>
  );
}
