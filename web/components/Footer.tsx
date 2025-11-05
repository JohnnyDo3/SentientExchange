'use client';

import { Github, BookOpen, Coins } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-gray-800 bg-black/80 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Branding */}
            <div className="text-center md:text-left">
              <p className="font-bold text-white text-lg mb-1">Sentient Exchange</p>
              <p className="text-sm text-gray-400">
                AI-powered service orchestration with x402 micropayments
              </p>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6">
              <a
                href="https://github.com/coinbase/sentientexchange"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <Github className="w-4 h-4" />
                <span>GitHub</span>
              </a>
              <a
                href="https://modelcontextprotocol.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                <span>MCP Protocol</span>
              </a>
              <a
                href="https://docs.cdp.coinbase.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <Coins className="w-4 h-4" />
                <span>Coinbase CDP</span>
              </a>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-6 pt-6 border-t border-gray-800 text-center text-xs text-gray-500">
            <p>Built for the Coinbase x402 Protocol Hackathon</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
