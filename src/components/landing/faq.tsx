import { FiPlus } from "@/components/ui/icons";
import { SectionHead } from "@/components/landing/sections";

const QA: { q: string; a: string }[] = [
  {
    q: "What is Trove?",
    a: "An AI workspace. You describe what you need and Trove plans it, builds it, and keeps it — websites, documents, spreadsheets, decks, code, research, and agents from one place.",
  },
  {
    q: "What can I build with it?",
    a: "Multi-page websites (with live preview and publish), Vite + React apps, Word documents, Excel workbooks, PowerPoint decks, runnable code, research write-ups, and agents that carry out multi-step work.",
  },
  {
    q: "Can I publish a website live?",
    a: "Yes. Publish to a subdomain like yourname.troveai.site. You choose the slug, see the final URL before going live, and can republish or unpublish anytime.",
  },
  {
    q: "Do I need an account?",
    a: "Yes for saving and publishing. Sign in with email, Google, or Microsoft so your projects persist across devices.",
  },
  {
    q: "How do credits work?",
    a: "Credits are metered on the tokens a request actually uses, so a short answer costs less than a long build. The free plan includes 200 credits a month (about 200k tokens).",
  },
  {
    q: "Can Trove create real files?",
    a: "Yes — genuine .docx, .xlsx, .pptx and project downloads, not a copy button. They open in Word, Excel, PowerPoint, and your local tools.",
  },
  {
    q: "Can I create AI agents?",
    a: "Yes. Each agent gets its own brief, chat, and history. You can also put a team of specialists on a single task.",
  },
  {
    q: "Can I cancel anytime?",
    a: "The free plan needs no card, so there is nothing to cancel. Paid plans are monthly.",
  },
  {
    q: "Who makes Trove?",
    a: "A small studio. Write to official@troveai.site — a person reads that inbox.",
  },
];

export function Faq() {
  return (
    <section className="mx-auto max-w-[1140px] px-5 py-20 lg:px-8 lg:py-28">
      <SectionHead title="Frequently asked questions" />

      <div className="mx-auto mt-12 max-w-[720px] divide-y divide-zinc-200/90 rounded-2xl border border-zinc-200/90 bg-white/70 px-4 shadow-sm backdrop-blur-sm sm:px-6">
        {QA.map((item) => (
          <details key={item.q} className="group py-1">
            <summary
              className={
                "flex cursor-pointer list-none items-center gap-4 py-4 text-[15px] font-medium text-zinc-900 transition-colors hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
              }
            >
              <span className="flex-1">{item.q}</span>
              <FiPlus
                size={17}
                className="shrink-0 text-zinc-400 transition-transform duration-200 group-open:rotate-45"
              />
            </summary>
            <p className="pb-5 pr-10 text-[14.5px] leading-relaxed text-zinc-600">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
