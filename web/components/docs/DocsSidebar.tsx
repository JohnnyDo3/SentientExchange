'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight, Book, Zap, Code, Wrench, Cog, Rocket } from 'lucide-react';
import { useState } from 'react';

interface NavSection {
  title: string;
  icon: React.ReactNode;
  items: NavItem[];
}

interface NavItem {
  title: string;
  href: string;
  badge?: string;
}

const navigation: NavSection[] = [
  {
    title: 'Getting Started',
    icon: <Zap className="w-4 h-4" />,
    items: [
      { title: 'Claude Desktop', href: '/docs/quickstart/claude-desktop', badge: '5 min' },
      { title: 'API Integration', href: '/docs/quickstart/api-integration', badge: '10 min' },
      { title: 'Build a Service', href: '/docs/quickstart/service-provider', badge: '15 min' },
      { title: 'Local Development', href: '/docs/quickstart/local-development' },
    ],
  },
  {
    title: 'Concepts',
    icon: <Book className="w-4 h-4" />,
    items: [
      { title: 'Introduction', href: '/docs/concepts/introduction' },
      { title: 'Architecture', href: '/docs/concepts/architecture' },
      { title: 'Payment Protocol', href: '/docs/concepts/payment-protocol' },
      { title: 'Service Registry', href: '/docs/concepts/service-registry' },
      { title: 'Orchestration', href: '/docs/concepts/orchestration' },
      { title: 'Security Model', href: '/docs/concepts/security-model' },
    ],
  },
  {
    title: 'Guides',
    icon: <Wrench className="w-4 h-4" />,
    items: [
      { title: 'MCP Tools', href: '/docs/guides/mcp-tools' },
      { title: 'Smart Workflows', href: '/docs/guides/smart-workflows' },
      { title: 'Spending Limits', href: '/docs/guides/spending-limits' },
      { title: 'Payment Execution', href: '/docs/guides/payment-execution' },
      { title: 'Building Services', href: '/docs/guides/building-services' },
      { title: 'Authentication', href: '/docs/guides/authentication' },
      { title: 'Database', href: '/docs/guides/database' },
      { title: 'WebSocket API', href: '/docs/guides/websocket' },
    ],
  },
  {
    title: 'API Reference',
    icon: <Code className="w-4 h-4" />,
    items: [
      { title: 'MCP Protocol', href: '/docs/api/mcp-protocol' },
      { title: 'REST Endpoints', href: '/docs/api/rest-endpoints' },
      { title: 'WebSocket Events', href: '/docs/api/websocket-events' },
      { title: 'Error Codes', href: '/docs/api/error-codes' },
    ],
  },
  {
    title: 'Architecture',
    icon: <Cog className="w-4 h-4" />,
    items: [
      { title: 'Master Orchestrator', href: '/docs/architecture/master-orchestrator' },
      { title: 'Payment Routing', href: '/docs/architecture/payment-routing' },
      { title: 'Database Adapters', href: '/docs/architecture/database-adapters' },
      { title: 'Security Middleware', href: '/docs/architecture/security-middleware' },
      { title: 'SSE Transport', href: '/docs/architecture/sse-transport' },
    ],
  },
  {
    title: 'Deployment',
    icon: <Rocket className="w-4 h-4" />,
    items: [
      { title: 'Railway', href: '/docs/deployment/railway' },
      { title: 'Docker', href: '/docs/deployment/docker' },
      { title: 'Environment Variables', href: '/docs/deployment/environment-variables' },
      { title: 'CI/CD', href: '/docs/deployment/ci-cd' },
    ],
  },
];

export function DocsSidebar() {
  const pathname = usePathname();
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(navigation.map(section => section.title))
  );

  const toggleSection = (title: string) => {
    const newOpenSections = new Set(openSections);
    if (newOpenSections.has(title)) {
      newOpenSections.delete(title);
    } else {
      newOpenSections.add(title);
    }
    setOpenSections(newOpenSections);
  };

  return (
    <nav className="sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto border-r border-purple-900/30 bg-black/40 backdrop-blur-sm px-4 py-6 w-64">
      {/* Logo */}
      <Link
        href="/docs"
        className="flex items-center gap-2 mb-8 text-purple-400 hover:text-purple-300 transition-colors"
      >
        <Book className="w-6 h-6" />
        <span className="font-bold text-lg">Docs</span>
      </Link>

      {/* Navigation */}
      <div className="space-y-6">
        {navigation.map((section) => {
          const isOpen = openSections.has(section.title);

          return (
            <div key={section.title}>
              {/* Section header */}
              <button
                onClick={() => toggleSection(section.title)}
                className="flex items-center justify-between w-full text-left mb-2 text-gray-400 hover:text-purple-300 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {section.icon}
                  <span className="text-sm font-semibold uppercase tracking-wider">
                    {section.title}
                  </span>
                </div>
                {isOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {/* Section items */}
              {isOpen && (
                <div className="space-y-1 ml-6">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center justify-between py-2 px-3 rounded text-sm transition-colors ${
                          isActive
                            ? 'bg-purple-900/30 text-purple-300 font-medium'
                            : 'text-gray-400 hover:text-purple-300 hover:bg-purple-900/10'
                        }`}
                      >
                        <span>{item.title}</span>
                        {item.badge && (
                          <span className="text-xs px-2 py-0.5 rounded bg-purple-900/30 text-purple-400">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
