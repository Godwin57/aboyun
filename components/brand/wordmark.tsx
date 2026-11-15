import Link from "next/link";

/** Wordmark: a teal disc with a marigold dot (mother and child), then the name. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="bg-primary text-primary-foreground relative flex size-9 items-center justify-center rounded-full">
        <span className="bg-primary-foreground size-3.5 rounded-full" />
        <span className="bg-accent absolute right-1 bottom-1 size-2.5 rounded-full" />
      </span>
      <span className="font-heading text-2xl font-semibold tracking-tight">Aboyun</span>
    </Link>
  );
}
