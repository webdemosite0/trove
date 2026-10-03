import Link from "next/link";

import { Wordmark } from "@/components/brand/logo";
import { FEATURES } from "@/lib/features";
import { site } from "@/lib/site";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-line bg-rail/60">
      <div className="mx-auto max-w-[1140px] px-5 py-12 lg:px-8">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-[280px]">
            <Link href="/" aria-label="Trove home" className="inline-flex">
              <Wordmark size={19} sweep={false} />
            </Link>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-3">
              AI workspace for docs, sheets, decks, code, and agents —
              refine in chat or export when you need to.
            </p>
            <a
              href={site.instagramUrl}
              target="_blank"
              rel="noopener noreferrer me"
              className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-ink-2 transition-colors hover:text-ink"
            >
              <span aria-hidden>◎</span>
              {site.instagram}
            </a>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <nav aria-label="Product">
              <h2 className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-4">
                Product
              </h2>
              <ul className="space-y-0.5">
                {FEATURES.map((f) => (
                  <li key={f.slug}>
                    <Link
                      href={`/features/${f.slug}`}
                      className="flex min-h-[40px] items-center text-[13.5px] text-ink-2 transition-colors hover:text-ink"
                    >
                      {f.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/pricing"
                    className="flex min-h-[40px] items-center text-[13.5px] text-ink-2 transition-colors hover:text-ink"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="/templates"
                    className="flex min-h-[40px] items-center text-[13.5px] text-ink-2 transition-colors hover:text-ink"
                  >
                    Templates
                  </Link>
                </li>
                <li>
                  <Link
                    href="/about"
                    className="flex min-h-[40px] items-center text-[13.5px] text-ink-2 transition-colors hover:text-ink"
                  >
                    About
                  </Link>
                </li>
              </ul>
            </nav>

            <nav aria-label="Get started">
              <h2 className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-4">
                Start
              </h2>
              <ul className="space-y-0.5">
                <li>
                  <Link
                    href="/signup"
                    className="flex min-h-[40px] items-center text-[13.5px] text-ink-2 transition-colors hover:text-ink"
                  >
                    Create an account
                  </Link>
                </li>
                <li>
                  <Link
                    href="/login"
                    className="flex min-h-[40px] items-center text-[13.5px] text-ink-2 transition-colors hover:text-ink"
                  >
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link
                    href="/chat"
                    className="flex min-h-[40px] items-center text-[13.5px] text-ink-2 transition-colors hover:text-ink"
                  >
                    Open chat
                  </Link>
                </li>
              </ul>
            </nav>

            <nav aria-label="Legal">
              <h2 className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-4">
                Legal
              </h2>
              <ul className="space-y-0.5">
                <li>
                  <Link
                    href="/privacy"
                    className="flex min-h-[40px] items-center text-[13.5px] text-ink-2 transition-colors hover:text-ink"
                  >
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="flex min-h-[40px] items-center text-[13.5px] text-ink-2 transition-colors hover:text-ink"
                  >
                    Terms
                  </Link>
                </li>
                <li>
                  <Link
                    href="/security"
                    className="flex min-h-[40px] items-center text-[13.5px] text-ink-2 transition-colors hover:text-ink"
                  >
                    Security
                  </Link>
                </li>
                <li>
                  <Link
                    href="/sitemap.xml"
                    className="flex min-h-[40px] items-center text-[13.5px] text-ink-2 transition-colors hover:text-ink"
                  >
                    Sitemap
                  </Link>
                </li>
              </ul>
            </nav>

            <nav aria-label="Resources">
              <h2 className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-4">
                Resources
              </h2>
              <ul className="space-y-0.5">
                {[
                  { label: "Examples", href: "/templates" },
                  { label: "Changelog", href: "/changelog" },
                  { label: "Docs", href: "https://docs.troveai.site" },
                  { label: "About", href: "/about" },
                ].map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      {...(l.href.startsWith("http") ? { target: "_blank", rel: "noopener" } : {})}
                      className="flex min-h-[40px] items-center text-[13.5px] text-ink-2 transition-colors hover:text-ink"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div>
              <h2 className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-4">
                Contact
              </h2>
              <a
                href={`mailto:${site.email}`}
                className="flex min-h-[40px] items-center text-[13.5px] text-ink-2 transition-colors hover:text-ink"
              >
                {site.email}
              </a>
              <a
                href={site.instagramUrl}
                target="_blank"
                rel="noopener noreferrer me"
                className="flex min-h-[40px] items-center text-[13.5px] text-ink-2 transition-colors hover:text-ink"
              >
                Instagram {site.instagram}
              </a>
            </div>
          </div>
        </div>

        <p className="mt-10 border-t border-line pt-6 text-[12.5px] text-ink-4">
          © {year} {site.name}
        </p>
      </div>
    </footer>
  );
}
