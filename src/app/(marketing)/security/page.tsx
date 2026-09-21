import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Security",
  description: "How to report a security issue affecting Trove.",
  alternates: { canonical: "/security" },
};

export default function SecurityPage() {
  return (
    <article className="mx-auto max-w-[720px] px-5 pb-24 pt-16 lg:px-8 lg:pt-24">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-4">
        Trust & safety
      </p>
      <h1 className="mt-3 text-[clamp(1.85rem,1.2rem+2vw,2.5rem)] font-semibold tracking-tight text-ink">
        Security
      </h1>
      <p className="mt-4 text-[15.5px] leading-relaxed text-ink-2">
        If you believe you found a vulnerability in Trove, please report it privately
        before publishing details so we have a chance to investigate and protect users.
      </p>

      <div className="mt-8 space-y-5 text-[15px] leading-relaxed text-ink-2">
        <section>
          <h2 className="text-[17px] font-semibold text-ink">How to report</h2>
          <p className="mt-2">
            Email{" "}
            <a href={`mailto:${site.email}?subject=Trove%20security%20report`} className="text-accent hover:underline">
              {site.email}
            </a>{" "}
            with the affected URL or feature, reproduction steps, impact, and a safe
            proof of concept if one is needed to explain the issue.
          </p>
        </section>

        <section>
          <h2 className="text-[17px] font-semibold text-ink">Please avoid</h2>
          <p className="mt-2">
            Do not access data that is not yours, disrupt the service, run destructive
            tests, exfiltrate secrets, or use social engineering. Stop testing once you
            have enough evidence to demonstrate the issue.
          </p>
        </section>

        <section>
          <h2 className="text-[17px] font-semibold text-ink">Useful details</h2>
          <p className="mt-2">
            Include your browser or client, approximate time, request IDs if visible,
            and whether the issue affects accounts, billing, integrations, published
            websites, or AI-generated work. Never send real passwords, API keys, or
            payment card details.
          </p>
        </section>
      </div>
    </article>
  );
}
