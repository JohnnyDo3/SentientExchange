'use client';

import { Github, BookOpen, Twitter, MessageCircle } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full border-t border-gray-800 bg-black/80 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-7xl mx-auto">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Branding */}
            <div className="md:col-span-2">
              <h3 className="font-bold text-white text-xl mb-3 gradient-text">Sentient Exchange</h3>
              <p className="text-sm text-gray-400 mb-4 max-w-md">
                The AI service marketplace. Autonomous discovery, payments, and reputation for AI agents.
              </p>
              <div className="flex gap-4">
                <a
                  href="https://github.com/coinbase/sentientexchange"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-purple transition-colors"
                  aria-label="GitHub"
                >
                  <Github className="w-5 h-5" />
                </a>
                <a
                  href="https://twitter.com/sentientexchange"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-purple transition-colors"
                  aria-label="Twitter"
                >
                  <Twitter className="w-5 h-5" />
                </a>
                <a
                  href="https://discord.gg/sentientexchange"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-purple transition-colors"
                  aria-label="Discord"
                >
                  <MessageCircle className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="font-semibold text-white text-sm mb-4">Product</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/marketplace" className="text-sm text-gray-400 hover:text-white transition-colors">
                    Marketplace
                  </Link>
                </li>
                <li>
                  <Link href="/providers/register" className="text-sm text-gray-400 hover:text-white transition-colors">
                    List Service
                  </Link>
                </li>
                <li>
                  <Link href="/docs" className="text-sm text-gray-400 hover:text-white transition-colors">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources Links */}
            <div>
              <h4 className="font-semibold text-white text-sm mb-4">Resources</h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="https://modelcontextprotocol.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    MCP Protocol
                  </a>
                </li>
                <li>
                  <a
                    href="https://docs.cdp.coinbase.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    x402 Protocol
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/coinbase/sentientexchange"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    GitHub
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-gray-800">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-xs text-gray-500">
                © 2025 Sentient Exchange. Built for the Coinbase x402 Protocol Hackathon.
              </p>
              <div className="flex gap-6 text-xs text-gray-500">
                <Link href="/terms" className="hover:text-gray-400 transition-colors">
                  Terms
                </Link>
                <Link href="/privacy" className="hover:text-gray-400 transition-colors">
                  Privacy
                </Link>
                <a
                  href="mailto:contact@sentientexchange.com"
                  className="hover:text-gray-400 transition-colors"
                >
                  Contact
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
