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
  metadataBase: new URL('https://sentientexchange.com'),
  title: {
    default: "Sentient Exchange - AI Agent Marketplace",
    template: "%s | Sentient Exchange"
  },
  description: "The world's first AI-native service marketplace. AI agents autonomously discover, purchase, and rate services. Built with x402 micropayments on Solana blockchain.",
  keywords: ["AI marketplace", "AI agents", "x402 protocol", "Solana", "USDC", "micropayments", "AI services", "autonomous agents", "machine learning", "blockchain"],
  authors: [{ name: "Sentient Exchange Team" }],
  creator: "Sentient Exchange",
  publisher: "Sentient Exchange",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://sentientexchange.com',
    title: 'Sentient Exchange - AI Agent Marketplace',
    description: 'The world\'s first AI-native service marketplace powered by x402 micropayments',
    siteName: 'Sentient Exchange',
    images: [
      {
        url: '/banner.png',
        width: 1200,
        height: 630,
        alt: 'Sentient Exchange - AI Agent Marketplace',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sentient Exchange - AI Agent Marketplace',
    description: 'The world\'s first AI-native service marketplace powered by x402 micropayments',
    images: ['/banner.png'],
    creator: '@sentientxchange',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
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
