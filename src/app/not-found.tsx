import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-16">
      <div className="max-w-md text-center">
        <p className="text-xs font-medium uppercase tracking-[.25em] text-accent">Trove · 404</p>
        <h1 className="mt-5 text-4xl font-medium tracking-tight text-ink">A little off the map.</h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-3">We couldn’t find that page. It may have moved, or the link may be incomplete.</p>
        <Link href="/" className="btn-grad mt-8 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm"><ArrowLeft size={16} />Back to Trove</Link>
      </div>
    </main>
  );
}
