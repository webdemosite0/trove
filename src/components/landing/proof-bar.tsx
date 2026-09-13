import { PLANS } from "@/lib/credits";
import { TbDownload, TbCreditCardOff, TbSparkles, TbFiles } from "@/components/ui/icons";

const STATS = [
  { icon: TbSparkles, value: "7", label: "tools in one workspace" },
  { icon: TbDownload, value: "5", label: "real file formats" },
  { icon: TbFiles, value: PLANS[0].monthly.toLocaleString("en-US"), label: "free credits every month" },
  { icon: TbCreditCardOff, value: "0", label: "card required to start" },
];

/**
 * Proof that does not invent customers.
 *
 * Named logos and quotes stay off until they are true. These four numbers
 * are the product itself — anyone can check them in a minute.
 */
export function ProofBar() {
  return (
    <section aria-label="At a glance" className="mx-auto max-w-[1140px] px-5 pb-4 lg:px-8">
      <ul className="grid grid-cols-2 overflow-hidden rounded-[var(--r-panel)] border border-line bg-canvas shadow-[var(--sh-1)] sm:grid-cols-4">
        {STATS.map((s, i) => (
          <li
            key={s.label}
            className={`flex items-center gap-3 px-5 py-4 ${i >= 2 ? "border-t border-line sm:border-t-0" : ""} ${i % 2 === 1 ? "border-l border-line" : ""} ${i === 2 ? "sm:border-l" : ""}`}
          >
            <s.icon size={18} className="shrink-0 text-accent" />
            <div>
              <p className="text-[18px] font-semibold tabular-nums leading-none text-ink">
                {s.value}
              </p>
              <p className="mt-1 text-[12px] leading-snug text-ink-4">{s.label}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
