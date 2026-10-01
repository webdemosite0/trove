import type { Metadata } from "next";
import { FiCheck } from "@/components/ui/icons";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Security — how Trove protects your work",
  description:
    "How Trove handles authentication, sessions, transport security, and data isolation — plus how to report a vulnerability.",
  alternates: { canonical: "/security" },
};

const PRACTICES: { heading: string; body: string }[] = [
  {
    heading: "Passwords are never stored",
    body: "Passwords are hashed with scrypt and a unique per-user salt. We keep the hash, never the password — there is nothing to leak.",
  },
  {
    heading: "Sessions are opaque and revocable",
    body: "Sign-in creates a random 256-bit token, stored in our database only as a digest. The cookie is httpOnly, SameSite, and Secure in production — and every session is revoked when you reset your password.",
  },
  {
    heading: "Encrypted in transit, always",
    body: "HTTPS is enforced with HSTS, and responses carry hardened headers: no MIME sniffing, no framing by other sites, and a strict referrer and permissions policy.",
  },
  {
    heading: "Your workspace is yours alone",
    body: "Every data query is scoped to your account — projects, documents, agents, and artifacts are unreachable across accounts by construction, not by convention.",
  },
  {
    heading: "Integrations connect over OAuth",
    body: "Third-party apps connect through OAuth, never by pasting passwords into Trove. You can review and revoke access from the integrations page at any time.",
  },
  {
    heading: "Staging never leaks into search",
    body: "Preview deployments are served with noindex directives across robots, sitemap, metadata, and headers — only the production site is crawlable.",
  },
  {
    heading: "Payments never touch our servers",
    body: "Checkout and card handling run entirely through Lemon Squeezy. We see plan status, never card numbers.",
  },
  {
    heading: "AI providers see prompts, not your account",
    body: "Generating your work means sending prompts to third-party AI providers. They receive the text needed for the task — not your password, sessions, or other projects.",
  },
  {
    heading: "Connected apps act only with approval",
    body: "An integration can read your data automatically, but sending, posting, or filing anything needs your explicit tap on an approval card first.",
  },
  {
    heading: "Your data is portable — and deletable",
    body: "Export your workspace data anytime from account settings. To delete your account entirely, write to official@troveai.site and a person handles it.",
  },
  {
    heading: "Encrypted at rest",
    body: "Production data lives on managed database infrastructure with encryption at rest, and every connection to it is encrypted in transit.",
  },
];

export default function SecurityPage() {
  return (
    <article className="mx-auto max-w-[760px] px-5 pb-24 pt-16 lg:px-8 lg:pt-24">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-4">
        Trust & safety
      </p>
      <h1 className="mt-3 text-[clamp(1.85rem,1.2rem+2vw,2.5rem)] font-semibold tracking-tight text-ink">
        Security at Trove
      </h1>
      <p className="mt-4 max-w-[60ch] text-[15.5px] leading-relaxed text-ink-2">
        Your workspace holds real work — drafts, numbers, plans. Here is what we do to
        protect it, in concrete terms rather than badges.
      </p>

      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        {PRACTICES.map((p) => (
          <section
            key={p.heading}
            className="rounded-2xl border border-line bg-raised/60 p-5"
          >
            <h2 className="flex items-start gap-2 text-[14.5px] font-semibold text-ink">
              <FiCheck size={16} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden />
              {p.heading}
            </h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-3">{p.body}</p>
          </section>
        ))}
      </div>

      <div className="mt-14 space-y-6 border-t border-line pt-10">
        <div>
          <h2 className="text-[19px] font-semibold text-ink">Report a vulnerability</h2>
          <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-ink-2">
            If you believe you found a vulnerability in Trove, please report it privately
            before publishing details so we have a chance to investigate and protect users.
            Email{" "}
            <a href={`mailto:${site.email}?subject=Trove%20security%20report`} className="text-accent hover:underline">
              {site.email}
            </a>{" "}
            with the affected URL or feature, reproduction steps, impact, and a safe
            proof of concept if one is needed to explain the issue.
          </p>
        </div>
        <div>
          <h2 className="text-[17px] font-semibold text-ink">Please avoid</h2>
          <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-ink-2">
            Do not access data that is not yours, disrupt the service, run destructive
            tests, exfiltrate secrets, or use social engineering. Stop testing once you
            have enough evidence to demonstrate the issue. Never send real passwords, API
            keys, or payment card details.
          </p>
        </div>
      </div>
    </article>
  );
}
