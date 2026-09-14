import { FiDownload, FiLock, FiFolder, FiRefreshCw } from "@/components/ui/icons";

const POINTS = [
  {
    title: "Your work stays yours",
    body: "Projects live in your workspace. Export files when you need them.",
    Icon: FiFolder,
  },
  {
    title: "Download the actual files",
    body: "Word, Excel, slides, site code — not trapped inside a chat thread.",
    Icon: FiDownload,
  },
  {
    title: "Keep building, don’t start over",
    body: "Refine the same project in chat. Changes apply to what you already made.",
    Icon: FiRefreshCw,
  },
  {
    title: "Built for real work",
    body: "Designed for deliverables you can share with a client or team.",
    Icon: FiLock,
  },
];

export function TrustSection() {
  return (
    <section className="relative border-y border-line bg-rail/40 px-5 py-20 lg:py-24">
      <div className="mx-auto max-w-[1140px]">
        <div className="mx-auto max-w-[42ch] text-center">
          <h2 className="text-[clamp(1.6rem,1.1rem+1.5vw,2.15rem)] font-semibold tracking-tight text-ink">
            Your projects are not trapped inside a chat.
          </h2>
          <p className="mt-3 text-[15.5px] leading-relaxed text-ink-3">
            Trove is built so finished work can leave the product — as files you own.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {POINTS.map((p) => {
            const Icon = p.Icon;
            return (
              <div
                key={p.title}
                className="rounded-[14px] border border-line bg-raised p-5"
              >
                <Icon size={20} className="text-accent" />
                <h3 className="mt-3 text-[15px] font-semibold text-ink">{p.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-3">{p.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
