import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export function formatTimeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function generateAgentName(): string {
  const prefixes = ['Research', 'Data', 'Content', 'Media', 'Analysis', 'Crypto', 'Info', 'Smart'];
  const suffixes = ['Bot', 'Agent', 'AI', '_Pro', 'Analyzer', '_3000', '_Alpha', 'Mind'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${prefix}${suffix}`;
}

export function generateMockTransaction(): any {
  const services = [
    'vision-pro', 'sentiment-ai', 'summarizer', 'translator',
    'price-feed', 'image-resize', 'data-processor', 'code-analyzer'
  ];

  return {
    id: Math.random().toString(36).substr(2, 9),
    agent: generateAgentName(),
    service: services[Math.floor(Math.random() * services.length)],
    price: parseFloat((Math.random() * 0.05).toFixed(3)),
    timestamp: new Date().toISOString(),
    status: 'completed' as const,
  };
}
