import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Chat | SentientExchange',
  description: 'Chat with AI that can automatically use marketplace services'
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Full-screen layout for chat - no global header/footer
  return <>{children}</>;
}
