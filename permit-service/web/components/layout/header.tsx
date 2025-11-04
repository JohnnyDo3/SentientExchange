'use client'

import Link from 'next/link'
import { useState } from 'react'
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs'

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-orange-600 text-white p-2 rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-navy-900">AI Permit Tampa</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/how-it-works" className="text-navy-700 hover:text-orange-600 transition-colors">
              How It Works
            </Link>
            <Link href="/pricing" className="text-navy-700 hover:text-orange-600 transition-colors">
              Pricing
            </Link>
            <Link href="/about" className="text-navy-700 hover:text-orange-600 transition-colors">
              About
            </Link>

            <SignedIn>
              <Link href="/dashboard" className="text-navy-700 hover:text-orange-600 transition-colors">
                Dashboard
              </Link>
            </SignedIn>

            <Link href="/chat" className="btn btn-primary">
              Start Application
            </Link>

            <SignedOut>
              <Link href="/sign-in" className="text-navy-700 hover:text-orange-600 transition-colors font-semibold">
                Sign In
              </Link>
            </SignedOut>

            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-3">
            <Link
              href="/how-it-works"
              className="block py-2 text-navy-700 hover:text-orange-600 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              How It Works
            </Link>
            <Link
              href="/pricing"
              className="block py-2 text-navy-700 hover:text-orange-600 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            <Link
              href="/about"
              className="block py-2 text-navy-700 hover:text-orange-600 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </Link>
            <SignedIn>
              <Link
                href="/dashboard"
                className="block py-2 text-navy-700 hover:text-orange-600 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
            </SignedIn>
            <Link
              href="/chat"
              className="block btn btn-primary text-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              Start Application
            </Link>
            <SignedOut>
              <Link
                href="/sign-in"
                className="block py-2 text-navy-700 hover:text-orange-600 transition-colors font-semibold"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
            </SignedOut>
          </div>
        )}
      </nav>
    </header>
  )
}
