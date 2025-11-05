'use client';

export const dynamic = 'force-dynamic';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">500</h1>
        <p className="text-xl mb-4">Something went wrong!</p>
        <p className="text-gray-400 mb-8">{error.message}</p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-purple-600 rounded-lg hover:bg-purple-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
