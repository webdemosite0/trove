import type { Metadata } from "next";
import Link from "next/link";
import { one } from "@/lib/db";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Status",
  description: "Current service status for Trove.",
  alternates: { canonical: "/status" },
};

export const dynamic = "force-dynamic";

type Service = {
  name: string;
  ok: boolean;
  detail: string;
};

async function serviceStatus(): Promise<Service[]> {
  let databaseOk = false;
  try {
    await one("SELECT 1 AS ok");
    databaseOk = true;
  } catch {
    databaseOk = false;
  }

  const aiOk = Boolean(
    process.env.GEMINI_API_KEY?.trim() ||
      process.env.EXPLABS_API_KEY?.trim() ||
      process.env.OPENROUTER_API_KEY?.trim() ||
      process.env.XAI_API_KEY?.trim() ||
      process.env.PUTER_AUTH_TOKEN?.trim(),
  );

  const previewOk = Boolean(process.env.E2B_API_KEY?.trim());

  return [
    {
      name: "Accounts & saved work",
      ok: databaseOk,
      detail: databaseOk ? "Available" : "Temporarily unavailable",
    },
    {
      name: "AI generation",
      ok: aiOk,
      detail: aiOk ? "Available" : "Temporarily unavailable",
    },
    {
      name: "Website live preview",
      ok: previewOk,
      detail: previewOk ? "Available" : "Temporarily unavailable",
    },
  ];
}

export default async function StatusPage() {
  const services = await serviceStatus();
  const allGood = services.every((service) => service.ok);
  const available = services.filter((service) => service.ok).length;

  return (
    <main className="mx-auto max-w-[760px] px-5 pb-24 pt-16 lg:px-8 lg:pt-24">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-4">
        System status
      </p>

      <div className="mt-4 rounded-[24px] border border-line bg-raised p-6 shadow-[0_20px_60px_rgba(15,23,42,.05)] sm:p-8">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className={`mt-1.5 size-2.5 shrink-0 rounded-full ${
              allGood ? "bg-emerald-500" : "bg-amber-500"
            }`}
          />
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">
              {allGood ? "All core systems operational" : "Some systems are degraded"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-ink-3">
              {allGood
                ? "Trove's core account, AI, and website-preview services are available."
                : `${available} of ${services.length} core services are currently available. We are keeping this page intentionally simple and do not expose internal credentials or provider details.`}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-[22px] border border-line bg-raised">
        {services.map((service, index) => (
          <div
            key={service.name}
            className={`flex items-center justify-between gap-4 px-5 py-4 ${
              index ? "border-t border-line" : ""
            }`}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">{service.name}</p>
              <p className="mt-0.5 text-[12.5px] text-ink-4">{service.detail}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                service.ok
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {service.ok ? "Operational" : "Degraded"}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-[20px] border border-line bg-raised/75 p-5">
        <h2 className="text-sm font-semibold text-ink">Still having trouble?</h2>
        <p className="mt-2 text-[13px] leading-5 text-ink-3">
          A service can be operational while an individual project still needs help.
          Contact us with the page you were using, the approximate time, and a screenshot.
          Never send passwords, API keys, recovery codes, or full payment details.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href={`mailto:${site.email}?subject=Trove%20support`}
            className="text-[13px] font-medium text-accent hover:underline"
          >
            {site.email}
          </a>
          <Link href="/" className="text-[13px] font-medium text-ink-3 hover:text-ink">
            Back to Trove
          </Link>
        </div>
      </div>
    </main>
  );
}
