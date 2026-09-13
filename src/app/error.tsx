"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="grid min-h-[70vh] place-items-center px-6 py-16">
      <div className="max-w-md text-center">
        <span className="mx-auto mb-6 grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent"><RefreshCw size={22} /></span>
        <p className="text-xs font-medium uppercase tracking-widest text-ink-4">A brief interruption</p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight text-ink">Let’s try that again.</h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-3">This page couldn’t load. Try again, or return home to continue.</p>
        <div className="mt-7 flex justify-center gap-3">
          <button type="button" onClick={() => retry()} className="btn-grad rounded-xl px-5 py-3 text-sm">Try again</button>
          <Link href="/" className="rounded-xl border border-line px-5 py-3 text-sm text-ink-2 hover:bg-hover">Go home</Link>
        </div>
      </div>
    </main>
  );
}
