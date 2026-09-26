import { FiPlus } from "@/components/ui/icons";
import { SectionHead } from "@/components/landing/sections";

/**
 * The questions someone actually has before signing up, answered truthfully.
 */
const QA: { q: string; a: string }[] = [
  {
    q: "What is Trove?",
    a: "An AI workspace for real work. You describe what you need and get websites, documents, spreadsheets, decks, research, code, and agents — in projects you can refine, publish, and return to. Not a chat that disappears when you close the tab.",
  },
  {
    q: "What can I build with it?",
    a: "Static websites and React apps with live preview, Word documents, Excel workbooks, PowerPoint decks, runnable code, research write-ups, and agents with their own brief and history. Team workspaces add shared projects and invitations.",
  },
  {
    q: "Do I need an account?",
    a: "You can try without one. An account is what makes projects and conversations persist across devices and browsers.",
  },
  {
    q: "How do credits work?",
    a: "Credits measure AI generation only. A short answer costs less than a long document or multi-step build. Opening, editing, and exporting saved work does not use credits. Free includes 200 credits a month.",
  },
  {
    q: "Can I export real files?",
    a: "Yes. When you need work outside Trove, you can export genuine .docx, .xlsx, .pptx, and project archives. Inside the product, work stays editable in the same project.",
  },
  {
    q: "Can I create AI agents?",
    a: "Yes. Each agent gets its own brief, chat page, and saved history. You can also put specialists on a multi-step task and work from their outputs.",
  },
  {
    q: "Can I cancel anytime?",
    a: "The free plan needs no card, so there is nothing to cancel. Paid plans are monthly or yearly through the billing provider you used at checkout.",
  },
  {
    q: "Who makes Trove?",
    a: "A small studio. There is no sales team and no invented customer logos. Write to official@troveai.site — a person reads that inbox.",
  },
];

export function Faq() {
  return (
    <section className="mx-auto max-w-[1140px] px-5 py-20 lg:px-8 lg:py-28">
      <SectionHead title="Frequently asked questions" />

      <div className="mx-auto mt-12 max-w-[720px] divide-y divide-line border-y border-line">
        {QA.map((item) => (
          <details key={item.q} className="group py-1">
            <summary
              className={[
                "flex cursor-pointer list-none items-center gap-4 py-4",
                "text-[15px] font-medium text-ink transition-colors hover:text-accent",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
              ].join(" ")}
            >
              <span className="flex-1">{item.q}</span>
              <FiPlus
                size={17}
                className="shrink-0 text-ink-4 transition-transform duration-[var(--t-hover)] group-open:rotate-45"
              />
            </summary>
            <p className="pb-5 pr-10 text-[14.5px] leading-relaxed text-ink-3">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
