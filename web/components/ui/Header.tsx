'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingCart, BarChart3, Zap, User, FileText, Menu, X } from 'lucide-react';
import { soundManager } from '@/lib/sound';
import UnifiedConnectButton from '@/components/wallet/UnifiedConnectButton';

export default function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/marketplace', label: 'Marketplace', icon: ShoppingCart },
    { href: '/swarm', label: 'Agent Swarm', icon: Zap },
    { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { href: '/docs', label: 'Docs', icon: FileText },
    { href: '/providers/my-services', label: 'My Services', icon: User }
  ];

  return (
    <>
      {/* Desktop Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'glass border-b border-gray-800' : 'bg-transparent'
        }`}
      >
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link
              href="/"
              onClick={() => soundManager.playClick()}
              className="flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple to-pink flex items-center justify-center">
                <span className="text-2xl">🤖</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold gradient-text">Sentient Exchange</h1>
                <p className="text-xs text-gray-400">AI Agent Marketplace</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden 2xl:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => soundManager.playClick()}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-purple to-pink text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* CTA Buttons */}
            <div className="hidden 2xl:flex items-center gap-4">
              <Link
                href="/providers/register"
                onClick={() => soundManager.playClick()}
                className="px-5 py-2.5 border border-gray-700 hover:border-purple text-white rounded-lg font-semibold hover:bg-gray-800 transition-all whitespace-nowrap"
              >
                Register Service
              </Link>
              <div className="flex-shrink-0">
                <UnifiedConnectButton />
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => {
                soundManager.playClick();
                setMobileMenuOpen(!mobileMenuOpen);
              }}
              className="2xl:hidden glass p-2 rounded-lg"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-white" />
              ) : (
                <Menu className="w-6 h-6 text-white" />
              )}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 2xl:hidden"
        />
      )}

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, x: '100%' }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed top-0 right-0 bottom-0 w-full sm:w-96 z-50 2xl:hidden bg-black border-l border-gray-800 overflow-y-auto overflow-x-hidden"
        >
          <div className="flex flex-col min-h-full">
            {/* Mobile Menu Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-gradient-to-br from-purple to-pink flex items-center justify-center">
                  <span className="text-2xl">🤖</span>
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold gradient-text truncate">Sentient Exchange</h2>
                  <p className="text-xs text-gray-400 truncate">AI Agent Marketplace</p>
                </div>
              </div>
              <button
                onClick={() => {
                  soundManager.playClick();
                  setMobileMenuOpen(false);
                }}
                className="glass p-2 rounded-lg hover:bg-gray-800 transition-colors flex-shrink-0 ml-2"
                aria-label="Close menu"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            {/* Mobile Navigation */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      soundManager.playClick();
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-purple to-pink text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Mobile CTA */}
            <div className="p-4 border-t border-gray-800 space-y-3 flex-shrink-0">
              <Link
                href="/providers/register"
                onClick={() => {
                  soundManager.playClick();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-700 hover:border-purple text-white rounded-lg font-semibold transition-colors w-full"
              >
                Register Service
              </Link>
              <div className="w-full overflow-x-auto">
                <div className="flex justify-center min-w-0">
                  <UnifiedConnectButton />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
}
