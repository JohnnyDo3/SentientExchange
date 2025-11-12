import Link from 'next/link';
import { Zap, Book, Wrench, Users } from 'lucide-react';

export default function DocsHomePage() {
  return (
    <div>
      {/* Hero */}
      <div className="mb-16">
        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          AgentMarket Documentation
        </h1>
        <p className="text-xl text-gray-300 mb-8">
          Production-ready AI service marketplace on Solana with autonomous agent payment
          protocol. Build, discover, and monetize AI services with client-side wallet
          signing and on-chain verification.
        </p>

        {/* Quick links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/docs/quickstart/claude-desktop"
            className="group p-6 rounded-lg border border-purple-900/30 bg-purple-900/10 hover:bg-purple-900/20 hover:border-purple-700/50 transition-all"
          >
            <Zap className="w-8 h-8 text-purple-400 mb-3" />
            <h3 className="text-lg font-semibold text-purple-300 mb-2">
              Get Started in 5 Minutes
            </h3>
            <p className="text-sm text-gray-400">
              Integrate AgentMarket with Claude Desktop using MCP
            </p>
          </Link>

          <Link
            href="/docs/concepts/architecture"
            className="group p-6 rounded-lg border border-blue-900/30 bg-blue-900/10 hover:bg-blue-900/20 hover:border-blue-700/50 transition-all"
          >
            <Book className="w-8 h-8 text-blue-400 mb-3" />
            <h3 className="text-lg font-semibold text-blue-300 mb-2">
              Understand the Architecture
            </h3>
            <p className="text-sm text-gray-400">
              Learn how the 3-layer system works under the hood
            </p>
          </Link>

          <Link
            href="/docs/quickstart/service-provider"
            className="group p-6 rounded-lg border border-green-900/30 bg-green-900/10 hover:bg-green-900/20 hover:border-green-700/50 transition-all"
          >
            <Wrench className="w-8 h-8 text-green-400 mb-3" />
            <h3 className="text-lg font-semibold text-green-300 mb-2">
              Build Your First Service
            </h3>
            <p className="text-sm text-gray-400">
              Create and monetize your own x402 AI service
            </p>
          </Link>
        </div>
      </div>

      {/* Audience sections */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold mb-8 text-purple-400">
          Choose Your Path
        </h2>

        <div className="space-y-6">
          {/* For Developers */}
          <div className="p-6 rounded-lg border border-purple-900/30 bg-black/40">
            <div className="flex items-start gap-4">
              <Users className="w-6 h-6 text-purple-400 mt-1" />
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-purple-300 mb-2">
                  For Developers
                </h3>
                <p className="text-gray-400 mb-4">
                  Integrate AgentMarket into your AI agents to discover and purchase AI services with autonomous payments.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/docs/quickstart/claude-desktop"
                    className="text-sm text-purple-400 hover:text-purple-300 underline"
                  >
                    Claude Desktop Setup →
                  </Link>
                  <Link
                    href="/docs/quickstart/api-integration"
                    className="text-sm text-purple-400 hover:text-purple-300 underline"
                  >
                    REST API Integration →
                  </Link>
                  <Link
                    href="/docs/guides/mcp-tools"
                    className="text-sm text-purple-400 hover:text-purple-300 underline"
                  >
                    13 MCP Tools →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* For Service Providers */}
          <div className="p-6 rounded-lg border border-blue-900/30 bg-black/40">
            <div className="flex items-start gap-4">
              <Wrench className="w-6 h-6 text-blue-400 mt-1" />
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-blue-300 mb-2">
                  For Service Providers
                </h3>
                <p className="text-gray-400 mb-4">
                  Build and monetize your own x402 AI services. Get paid in USDC on Solana for every API call.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/docs/quickstart/service-provider"
                    className="text-sm text-blue-400 hover:text-blue-300 underline"
                  >
                    Build a Service →
                  </Link>
                  <Link
                    href="/docs/guides/building-services"
                    className="text-sm text-blue-400 hover:text-blue-300 underline"
                  >
                    Service Development Guide →
                  </Link>
                  <Link
                    href="/docs/concepts/payment-protocol"
                    className="text-sm text-blue-400 hover:text-blue-300 underline"
                  >
                    x402 Protocol →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* For Contributors */}
          <div className="p-6 rounded-lg border border-green-900/30 bg-black/40">
            <div className="flex items-start gap-4">
              <Book className="w-6 h-6 text-green-400 mt-1" />
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-green-300 mb-2">
                  For Contributors
                </h3>
                <p className="text-gray-400 mb-4">
                  Understand the internals and contribute to the AgentMarket platform. Deep architecture documentation included.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/docs/concepts/architecture"
                    className="text-sm text-green-400 hover:text-green-300 underline"
                  >
                    Architecture Deep Dive →
                  </Link>
                  <Link
                    href="/docs/architecture/master-orchestrator"
                    className="text-sm text-green-400 hover:text-green-300 underline"
                  >
                    Orchestrator Internals →
                  </Link>
                  <Link
                    href="/docs/quickstart/local-development"
                    className="text-sm text-green-400 hover:text-green-300 underline"
                  >
                    Local Development →
                  </Link>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Features Overview */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold mb-8 text-purple-400">
          Platform Features
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border border-purple-900/30 bg-black/20">
            <h4 className="font-semibold text-purple-300 mb-2">13 MCP Tools</h4>
            <p className="text-sm text-gray-400">
              7 standard + 6 smart workflow tools to reduce API calls
            </p>
          </div>
          <div className="p-4 rounded-lg border border-purple-900/30 bg-black/20">
            <h4 className="font-semibold text-purple-300 mb-2">Client-Side Signing</h4>
            <p className="text-sm text-gray-400">
              Users control their own Solana wallets, no server custody
            </p>
          </div>
          <div className="p-4 rounded-lg border border-purple-900/30 bg-black/20">
            <h4 className="font-semibold text-purple-300 mb-2">Spending Limits</h4>
            <p className="text-sm text-gray-400">
              Budget controls for autonomous agents (per-tx, daily, monthly)
            </p>
          </div>
          <div className="p-4 rounded-lg border border-purple-900/30 bg-black/20">
            <h4 className="font-semibold text-purple-300 mb-2">Master Orchestrator</h4>
            <p className="text-sm text-gray-400">
              Multi-service workflows with automatic dependency resolution
            </p>
          </div>
          <div className="p-4 rounded-lg border border-purple-900/30 bg-black/20">
            <h4 className="font-semibold text-purple-300 mb-2">JWT + SIWE Auth</h4>
            <p className="text-sm text-gray-400">
              Secure authentication with both symmetric and wallet-based signing
            </p>
          </div>
          <div className="p-4 rounded-lg border border-purple-900/30 bg-black/20">
            <h4 className="font-semibold text-purple-300 mb-2">Enterprise Security</h4>
            <p className="text-sm text-gray-400">
              Rate limiting, helmet, CORS, SQL injection prevention
            </p>
          </div>
        </div>
      </div>

      {/* Next steps */}
      <div className="border-t border-purple-900/30 pt-8">
        <h2 className="text-2xl font-bold mb-4 text-purple-400">
          Ready to Get Started?
        </h2>
        <p className="text-gray-400 mb-6">
          Choose a quick start guide based on your use case, or dive into the concepts
          to understand how everything works.
        </p>
        <div className="flex gap-4">
          <Link
            href="/docs/quickstart/claude-desktop"
            className="px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors"
          >
            Start with Claude Desktop
          </Link>
          <Link
            href="/docs/concepts/introduction"
            className="px-6 py-3 rounded-lg border border-purple-600 hover:bg-purple-900/20 text-purple-300 font-semibold transition-colors"
          >
            Read the Concepts
          </Link>
        </div>
      </div>
    </div>
  );
}
