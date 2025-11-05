'use client';

export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-xl mb-8">Page not found</p>
        <a href="/" className="px-6 py-3 bg-purple-600 rounded-lg hover:bg-purple-700">
          Go Home
        </a>
      </div>
    </div>
  );
}
