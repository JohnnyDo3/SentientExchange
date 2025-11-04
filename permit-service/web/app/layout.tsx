import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { ClerkProvider } from '@clerk/nextjs'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI Permit Tampa - HVAC Permit Automation for Contractors',
  description: 'Get your HVAC permit in 5 minutes. AI-powered permit forms for Tampa Bay contractors. No paperwork headaches.',
  keywords: ['HVAC permits', 'Tampa permits', 'contractor permits', 'permit automation', 'Hillsborough County'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" className="scroll-smooth">
        <body className={inter.className}>
          <Header />
          {children}
          <Footer />
        </body>
      </html>
    </ClerkProvider>
  )
}
