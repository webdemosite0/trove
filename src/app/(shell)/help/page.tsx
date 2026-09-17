import Link from "next/link";
import { site } from "@/lib/site";

export const metadata = { title: "Help & support" };

const FAQ = [
  {
    q: "My website preview is not loading",
    a: "Refresh the preview once. If it still fails, save the project and reopen it. Trove keeps the last saved project while the isolated preview reconnects.",
  },
  {
    q: "A generation stopped before it finished",
    a: "Send the request again in the same project. Trove keeps your project files, so you should not need to start over.",
  },
  {
    q: "Where are my saved websites and files?",
    a: "Open Projects from Settings or return to Sites. Saved work is tied to the account that created it.",
  },
  {
    q: "How do credits work?",
    a: "Credits measure AI usage. Your current balance, monthly allowance and rolling usage window are visible under Settings → Usage.",
  },
  {
    q: "How do I report a bug?",
    a: "Email support with the page you were on, what you expected, and what happened. Do not send passwords, API keys, tokens or other secrets.",
  },
];

export default function HelpPage() {
  return (
    <main className="mx-auto w-full max-w-[920px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <section className="rounded-[28px] border border-black/[0.06] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,.06)] sm:p-8">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-accent">Trove Support</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-ink sm:text-4xl">
          Help when something gets in your way.
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-7 text-ink-3">
          Start with the quick answers below. If something is actually broken, send us the exact page and what happened so we can reproduce it quickly.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={`mailto:${site.email}?subject=Trove%20support`}
            className="rounded-xl bg-ink px-4 py-2.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
          >
            Email support
          </a>
          <Link
            href="/settings/usage"
            className="rounded-xl border border-line bg-white px-4 py-2.5 text-[13px] font-medium text-ink transition-colors hover:bg-hover"
          >
            Check usage
          </Link>
          <Link
            href="/api/health"
            className="rounded-xl border border-line bg-white px-4 py-2.5 text-[13px] font-medium text-ink transition-colors hover:bg-hover"
          >
            Service health
          </Link>
        </div>
      </section>

      <section className="mt-6 grid gap-3">
        {FAQ.map((item) => (
          <details
            key={item.q}
            className="group rounded-[20px] border border-black/[0.06] bg-white/80 px-5 py-4 shadow-[0_8px_30px_rgba(15,23,42,.03)]"
          >
            <summary className="cursor-pointer list-none text-[14px] font-semibold text-ink marker:hidden">
              <span className="flex items-center justify-between gap-4">
                {item.q}
                <span className="text-lg font-normal text-ink-4 transition-transform group-open:rotate-45">+</span>
              </span>
            </summary>
            <p className="mt-3 max-w-3xl text-[13.5px] leading-6 text-ink-3">{item.a}</p>
          </details>
        ))}
      </section>

      <section className="mt-6 rounded-[22px] border border-black/[0.06] bg-white/70 p-5">
        <h2 className="text-[14px] font-semibold text-ink">For faster bug reports</h2>
        <p className="mt-2 text-[13px] leading-6 text-ink-3">
          Include the project name, browser, page URL, and the last action you took. A screenshot helps. Never include passwords, payment details, API keys or connected-app tokens.
        </p>
        <p className="mt-3 text-[13px] text-ink-2">
          Support: <a className="font-medium text-accent hover:underline" href={`mailto:${site.email}`}>{site.email}</a>
        </p>
      </section>
    </main>
  );
}
