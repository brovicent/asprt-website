"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("ErrorBoundary caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-4 text-center text-text-primary">
      <div className="w-full max-w-2xl space-y-4 rounded-xl border border-red-500/50 bg-red-500/10 p-6 text-red-500">
        <h2 className="text-xl font-bold">Terjadi Kesalahan Server</h2>
        <div className="rounded bg-black/50 p-4 text-left text-sm font-mono overflow-auto max-h-96">
          <p className="font-semibold">{error.name}: {error.message}</p>
          {error.stack && <pre className="mt-2 text-xs opacity-80 whitespace-pre-wrap">{error.stack}</pre>}
        </div>
        <button
          onClick={() => reset()}
          className="rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600 font-semibold"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );
}
