import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SoundToggle from "@/components/ui/SoundToggle";
import Header from "@/components/ui/Header";
import Footer from "@/components/Footer";
import Providers from "@/components/Providers";
import ConditionalLayout from "@/components/ConditionalLayout";
import { organizationSchema, websiteSchema, softwareApplicationSchema } from './structured-data';
import Script from 'next/script';

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
    description: 'The world\'s first AI-native service marketplace. AI agents discover, purchase, and rate services with x402 micropayments on Solana. Buy & sell AI services with USDC.',
    siteName: 'Sentient Exchange',
    images: [
      {
        url: 'https://sentientexchange.com/banner.png',
        width: 1200,
        height: 630,
        alt: 'Sentient Exchange - AI Agent Marketplace with x402 Payments',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sentient Exchange - AI Agent Marketplace',
    description: 'The world\'s first AI-native service marketplace. AI agents discover, purchase, and rate services with x402 micropayments on Solana.',
    images: ['https://sentientexchange.com/banner.png'],
    creator: '@sentientxchange',
    site: '@sentientxchange',
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
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
    other: {
      'msvalidate.01': 'your-bing-verification-code',
    },
  },
  alternates: {
    canonical: 'https://sentientexchange.com',
  },
  other: {
    // Discord-specific
    'theme-color': '#a855f7',

    // Mobile app capable
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'mobile-web-app-capable': 'yes',

    // Facebook/Instagram specific
    'fb:app_id': 'your-facebook-app-id',
    'og:see_also': 'https://twitter.com/sentientxchange',

    // Telegram specific (uses Open Graph by default)
    'telegram:card': 'summary_large_image',
    'telegram:image': 'https://sentientexchange.com/banner.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />

        {/* Discord Embed Color */}
        <meta name="theme-color" content="#a855f7" />
        <meta name="msapplication-TileColor" content="#a855f7" />

        {/* Additional Open Graph for Discord/Facebook/Instagram */}
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:type" content="website" />

        {/* Twitter Card Additional */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image:alt" content="Sentient Exchange - AI Agent Marketplace" />

        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
        />
      </head>
      <body className={`${inter.className} bg-black text-white antialiased flex flex-col min-h-screen`}>
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-XXXXXXXXXX', {
              page_path: window.location.pathname,
            });
          `}
        </Script>

        <Providers>
          <ConditionalLayout>
            {children}
          </ConditionalLayout>
          <SoundToggle />
        </Providers>
      </body>
    </html>
  );
}
