"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-void-canvas text-cream-text">
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-mute">
          Something went wrong
        </p>
        <h2 className="mt-4 text-2xl font-semibold">Page error</h2>
        <p className="mt-3 text-sm text-zinc-mute">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <button
          type="button"
          onClick={unstable_retry}
          className="mt-8 inline-flex items-center gap-2 rounded-[5.6px] bg-ember-orange px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
