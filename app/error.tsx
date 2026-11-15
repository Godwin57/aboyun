"use client";

import Link from "next/link";

// Shown when a page fails to load, most often because the database could not be reached
// for a moment. Nothing is lost: trying again usually works.
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="app-bg flex min-h-screen items-center justify-center px-5 py-10">
      <div className="neu-card flex w-full max-w-md flex-col gap-4 p-8 text-center">
        <h1 className="font-heading text-3xl font-semibold">
          We can&apos;t reach the server
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          This is usually a network problem and passes in a moment. Your information is
          safe. Check your connection and try again.
        </p>
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="btn-gradient min-h-12 cursor-pointer rounded-xl px-6 text-base font-semibold"
          >
            Try again
          </button>
          <Link
            href="/login"
            className="neu-raised inline-flex min-h-12 items-center justify-center rounded-xl px-6 font-medium"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
