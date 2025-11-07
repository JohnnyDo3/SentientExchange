import { DocsSidebar } from '@/components/docs/DocsSidebar';

export const metadata = {
  title: 'Documentation - AgentMarket',
  description: 'Production-ready AI service marketplace on Solana with x402 payment protocol',
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-white pt-20">
      <div className="flex">
        {/* Sidebar */}
        <DocsSidebar />

        {/* Content */}
        <main className="flex-1">
          <div className="max-w-4xl mx-auto px-8 py-12">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
