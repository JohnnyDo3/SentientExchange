'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Home, ShoppingCart, User, BookOpen } from 'lucide-react';
import { soundManager } from '@/lib/sound';

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    soundManager.playClick();
    setIsOpen(!isOpen);
  };

  const handleNavClick = (href: string) => {
    soundManager.playClick();
    setIsOpen(false);
    window.location.href = href;
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggleMenu}
        className="fixed top-6 right-6 z-50 md:hidden glass p-3 rounded-lg"
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Menu className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden"
              onClick={toggleMenu}
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 20 }}
              className="fixed top-0 right-0 bottom-0 z-40 w-80 glass border-l border-purple/30 md:hidden"
            >
              <div className="flex flex-col h-full p-8 pt-20">
                {/* Navigation Links */}
                <nav className="flex-1 space-y-4">
                  <NavItem
                    icon={<Home className="w-6 h-6" />}
                    label="Home"
                    href="/"
                    onClick={() => handleNavClick('/')}
                  />
                  <NavItem
                    icon={<ShoppingCart className="w-6 h-6" />}
                    label="Marketplace"
                    href="/marketplace"
                    onClick={() => handleNavClick('/marketplace')}
                  />
                  <NavItem
                    icon={<User className="w-6 h-6" />}
                    label="Provider Portal"
                    href="/providers"
                    onClick={() => handleNavClick('/providers')}
                  />
                  <NavItem
                    icon={<BookOpen className="w-6 h-6" />}
                    label="Documentation"
                    href="/docs"
                    onClick={() => handleNavClick('/docs')}
                  />
                </nav>

                {/* Footer */}
                <div className="pt-8 border-t border-gray-800">
                  <p className="text-sm text-gray-400 text-center">
                    AgentMarket v1.0
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function NavItem({
  icon,
  label,
  href,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 w-full p-4 rounded-lg bg-gray-900/50 hover:bg-gradient-to-r hover:from-purple/20 hover:to-pink/20 border border-gray-800 hover:border-purple/50 transition-all group"
    >
      <div className="text-purple group-hover:text-pink transition-colors">
        {icon}
      </div>
      <span className="text-lg text-white font-semibold">{label}</span>
    </button>
  );
}
