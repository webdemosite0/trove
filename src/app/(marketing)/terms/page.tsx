import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms",
  description: `Terms of use for ${site.name} — the AI workspace that builds downloadable work.`,
  alternates: { canonical: "/terms" },
  openGraph: {
    title: `Terms · ${site.name}`,
    description: "Acceptable use, ownership of outputs, and service limits.",
    url: "/terms",
  },
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-[720px] px-5 pb-24 pt-16 lg:px-8 lg:pt-24">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-4">Legal</p>
      <h1 className="mt-3 text-[clamp(1.85rem,1.2rem+2vw,2.5rem)] font-semibold tracking-tight text-ink">
        Terms of use
      </h1>
      <p className="mt-3 text-[14px] text-ink-4">Last updated: September 2026</p>

      <div className="mt-8 space-y-5 text-[15.5px] leading-relaxed text-ink-2">
        <p>
          By using {site.name} you agree to these terms. The product generates
          software, documents, and other files from your prompts. You are
          responsible for how you use those outputs.
        </p>
        <h2 className="pt-2 text-[17px] font-semibold text-ink">Your content</h2>
        <p>
          You keep rights to the prompts you submit and the files you export,
          subject to the rights of any third-party material included. You grant
          us a limited license to process that content so we can run the service.
        </p>
        <h2 className="pt-2 text-[17px] font-semibold text-ink">Acceptable use</h2>
        <p>
          Do not use Trove to violate the law, abuse infrastructure, or generate
          content you are not allowed to create. We may suspend accounts that
          harm the service or other users.
        </p>
        <h2 className="pt-2 text-[17px] font-semibold text-ink">Credits and plans</h2>
        <p>
          Free and paid plans include monthly credits. Unused credits may expire
          according to the plan description on the pricing page. We may change
          pricing with notice on the site.
        </p>
        <h2 className="pt-2 text-[17px] font-semibold text-ink">Disclaimer</h2>
        <p>
          The service is provided as available. AI output can be wrong. Review
          generated code, legal text, and data before you rely on it.
        </p>
        <h2 className="pt-2 text-[17px] font-semibold text-ink">Contact</h2>
        <p>
          <a href={`mailto:${site.email}`} className="text-accent hover:underline">
            {site.email}
          </a>
        </p>
      </div>

      <p className="mt-10">
        <Link href="/privacy" className="text-[14px] text-accent hover:underline">
          Privacy →
        </Link>
      </p>
    </article>
  );
}
