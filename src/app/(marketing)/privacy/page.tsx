import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: `How ${site.name} handles your account, prompts, and generated files.`,
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: `Privacy · ${site.name}`,
    description: "What we store, what we do not sell, and how to reach us.",
    url: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-[720px] px-5 pb-24 pt-16 lg:px-8 lg:pt-24">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-4">Legal</p>
      <h1 className="mt-3 text-[clamp(1.85rem,1.2rem+2vw,2.5rem)] font-semibold tracking-tight text-ink">
        Privacy
      </h1>
      <p className="mt-3 text-[14px] text-ink-4">Last updated: September 2026</p>

      <div className="mt-8 space-y-5 text-[15.5px] leading-relaxed text-ink-2">
        <p>
          Trove is an AI workspace. To run the product we store your account
          email, authentication details, and the work you create (conversations,
          sites, agents, files). We use this data to provide the service, bill
          credits, and improve reliability — not to sell personal data.
        </p>
        <h2 className="pt-2 text-[17px] font-semibold text-ink">What we collect</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Account identity (email, name if provided, sign-in provider)</li>
          <li>Prompts, messages, and generated outputs you keep in the product</li>
          <li>Usage and credit events needed for plan limits</li>
          <li>Basic technical logs (errors, request timing) for operations</li>
        </ul>
        <h2 className="pt-2 text-[17px] font-semibold text-ink">AI providers</h2>
        <p>
          Prompts may be sent to third-party model providers so we can generate
          answers and files. Do not submit secrets you are not allowed to share
          with those providers under their terms.
        </p>
        <h2 className="pt-2 text-[17px] font-semibold text-ink">Service providers</h2>
        <p>
          We use service providers to host the application and database, deliver
          email, process payments, run AI models and sandboxes, and connect apps
          you authorize. They receive only the data needed to provide those
          services under their own contractual and security obligations.
        </p>
        <h2 className="pt-2 text-[17px] font-semibold text-ink">Your data choices</h2>
        <p>
          Signed-in users can download a JSON export of saved account and
          workspace data from Account settings. You can also delete your account
          there after cancelling any active paid subscription. Depending on
          where you live, you may have additional access, correction, deletion,
          portability, or objection rights; contact us to exercise them.
        </p>
        <h2 className="pt-2 text-[17px] font-semibold text-ink">Cookies</h2>
        <p>
          We use session cookies to keep you signed in. We do not run advertising
          trackers on the product.
        </p>
        <h2 className="pt-2 text-[17px] font-semibold text-ink">Contact</h2>
        <p>
          Questions or deletion requests:{" "}
          <a href={`mailto:${site.email}`} className="text-accent hover:underline">
            {site.email}
          </a>
          .
        </p>
      </div>

      <p className="mt-10">
        <Link href="/terms" className="text-[14px] text-accent hover:underline">
          Terms of use →
        </Link>
      </p>
    </article>
  );
}
