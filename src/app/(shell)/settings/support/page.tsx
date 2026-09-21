import Link from "next/link";
import { site } from "@/lib/site";

const cards = [
  {
    title: "Something is not working",
    body: "Refresh once, retry the action, then send us the page you were on and what you clicked. A screenshot helps.",
  },
  {
    title: "Preview or publishing",
    body: "Reopen Preview to restore an expired sandbox. If publishing fails, keep the project saved and retry instead of creating a duplicate.",
  },
  {
    title: "Billing or plan",
    body: "Open Plan & subscription first. If a payment succeeded but your plan did not update, contact support with the approximate payment time.",
  },
  {
    title: "Account access",
    body: "Use Account & security for sign-in and profile issues. Never send a password, API key, recovery code, or payment card number to support.",
  },
];

export default function SupportPage() {
  return (
    <section className="space-y-5">
      <div className="rounded-[22px] border border-black/[0.05] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,.04)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
          Help & Support
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink">
          Get unstuck quickly
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-3">
          Tell us what you were trying to do and where it stopped. Do not send passwords,
          API keys, private tokens, or full payment details.
        </p>

        <div className="mt-5 flex flex-wrap gap-2.5">
          <a
            href={`mailto:${site.email}?subject=Trove%20support`}
            className="inline-flex h-10 items-center rounded-xl bg-ink px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Email {site.email}
          </a>
          <Link
            href="/settings/account"
            className="inline-flex h-10 items-center rounded-xl border border-line bg-white px-4 text-sm font-medium text-ink transition-colors hover:bg-hover"
          >
            Account & security
          </Link>
          <a
            href="/status"
            className="inline-flex h-10 items-center rounded-xl border border-line bg-white px-4 text-sm font-medium text-ink transition-colors hover:bg-hover"
          >
            System status
          </a>
          <Link
            href="/security"
            className="inline-flex h-10 items-center rounded-xl border border-line bg-white px-4 text-sm font-medium text-ink transition-colors hover:bg-hover"
          >
            Security
          </Link>
          <a
            href={`mailto:${site.email}?subject=Trove%20abuse%20report`}
            className="inline-flex h-10 items-center rounded-xl border border-line bg-white px-4 text-sm font-medium text-ink transition-colors hover:bg-hover"
          >
            Report abuse
          </a>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {cards.map((card) => (
          <article
            key={card.title}
            className="rounded-[20px] border border-black/[0.05] bg-white/80 p-5 shadow-[0_12px_34px_rgba(15,23,42,.03)]"
          >
            <h2 className="text-sm font-semibold text-ink">{card.title}</h2>
            <p className="mt-2 text-[13px] leading-5 text-ink-3">{card.body}</p>
          </article>
        ))}
      </div>

      <div className="rounded-[20px] border border-black/[0.05] bg-white/70 p-5">
        <h2 className="text-sm font-semibold text-ink">Useful details for a bug report</h2>
        <p className="mt-2 text-[13px] leading-5 text-ink-3">
          Include the feature you were using, the approximate time, the browser/device,
          what you expected, what happened instead, and a screenshot if possible.
        </p>
      </div>
    </section>
  );
}
