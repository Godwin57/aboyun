"use client";

export function OfflineRetry({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="btn-gradient min-h-12 cursor-pointer rounded-xl px-5 text-base font-semibold"
    >
      {label}
    </button>
  );
}
