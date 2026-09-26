import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FiArrowRight, FiCheck } from "@/components/ui/icons";

import { FEATURES, featureBySlug } from "@/lib/features";
import { site } from "@/lib/site";

/** One page per capability, built at compile time — the content is static. */
export function generateStaticParams() {
  return FEATURES.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const feature = featureBySlug(slug);
  if (!feature) return {};

  const url = `/features/${feature.slug}`;
  return {
    title: feature.title,
    description: feature.description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: `${feature.title} · ${site.name}`,
      description: feature.description,
    },
    twitter: {
      card: "summary_large_image",
      title: `${feature.title} · ${site.name}`,
      description: feature.description,
    },
  };
}

export default async function FeaturePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const feature = featureBySlug(slug);
  if (!feature) notFound();

  const others = FEATURES.filter((f) => f.slug !== feature.slug).slice(0, 4);
  const Icon = feature.icon;

  return (
    <div className="mx-auto max-w-[920px] px-5 pb-24 pt-14 lg:px-8 lg:pt-20">
      <article>
        {/* Hero */}
        <header className="max-w-[640px]">
          <span
            aria-hidden
            className="mb-6 grid h-12 w-12 place-items-center rounded-2xl"
            style={{ background: `${feature.tone}1f`, color: feature.tone }}
          >
            <Icon size={24} />
          </span>

          <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.1em] text-ink-4">
            {feature.label}
          </p>

          <h1 className="text-[clamp(2rem,1.2rem+2.4vw,3rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-ink">
            {feature.headline}
          </h1>

          <p className="mt-5 text-[17px] leading-relaxed text-ink-2">
            {feature.standfirst}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="btn-grad inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-semibold"
            >
              Start free
              <FiArrowRight size={15} aria-hidden />
            </Link>
            <Link
              href={feature.href}
              className="inline-flex items-center rounded-full border border-line-strong px-5 py-2.5 text-[14px] font-medium text-ink-2 transition-colors hover:bg-hover hover:text-ink"
            >
              Open in workspace
            </Link>
          </div>
        </header>

        {/* Key capabilities */}
        <section className="mt-12 rounded-2xl border border-line bg-rail/50 p-6">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-4">
            What you get
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {feature.facts.map((f) => (
              <li
                key={f}
                className="flex items-start gap-2.5 text-[14px] text-ink-2"
              >
                <FiCheck
                  size={16}
                  className="mt-0.5 shrink-0 text-positive"
                  aria-hidden
                />
                {f}
              </li>
            ))}
          </ul>
        </section>

        {/* How it works / detail */}
        <div className="mt-14 space-y-10">
          {feature.sections.map((s, i) => (
            <section key={s.heading}>
              <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-ink">
                <span className="mr-2 text-ink-4">{String(i + 1).padStart(2, "0")}</span>
                {s.heading}
              </h2>
              <p className="mt-2.5 max-w-[62ch] text-[15px] leading-relaxed text-ink-2">
                {s.body}
              </p>
            </section>
          ))}
        </div>

        {/* Related */}
        {others.length ? (
          <section className="mt-16">
            <h2 className="text-[19px] font-semibold text-ink">
              Related capabilities
            </h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {others.map((o) => {
                const OIcon = o.icon;
                return (
                  <li key={o.slug}>
                    <Link
                      href={`/features/${o.slug}`}
                      className="flex items-start gap-3 rounded-2xl border border-line bg-canvas p-4 transition hover:border-line-strong hover:bg-hover/40"
                    >
                      <OIcon
                        size={18}
                        className="mt-0.5 shrink-0"
                        style={{ color: o.tone }}
                        aria-hidden
                      />
                      <span>
                        <span className="block text-[14px] font-medium text-ink">
                          {o.label}
                        </span>
                        <span className="mt-0.5 block text-[12.5px] text-ink-4">
                          {o.title}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {/* CTA */}
        <div className="mt-14 rounded-[var(--r-hero)] border border-line bg-rail p-7">
          <h2 className="text-[19px] font-semibold text-ink">
            Try it on the free plan
          </h2>
          <p className="mt-2 max-w-[52ch] text-[14.5px] leading-relaxed text-ink-3">
            200 credits a month, core tools included, no card. Enough to build
            something real and decide if it fits your work.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="btn-grad inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-semibold"
            >
              Create an account
              <FiArrowRight size={15} aria-hidden />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center rounded-full border border-line-strong px-5 py-2.5 text-[14px] font-medium text-ink-2 transition-colors hover:bg-hover hover:text-ink"
            >
              See pricing
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}
