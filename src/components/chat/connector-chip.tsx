"use client";

import { cn } from "@/lib/utils";

const META: Record<string, { label: string; mark: string; tone: string }> = {
  github: { label: "GitHub", mark: "⌘", tone: "#e6edf3" },
  vercel: { label: "Vercel", mark: "▲", tone: "#ffffff" },
  slack: { label: "Slack", mark: "S", tone: "#e01e5a" },
  notion: { label: "Notion", mark: "N", tone: "#ffffff" },
  linear: { label: "Linear", mark: "L", tone: "#5e6ad2" },
  gmail: { label: "Gmail", mark: "G", tone: "#ea4335" },
  "google-drive": { label: "Drive", mark: "D", tone: "#34a853" },
  "google-calendar": { label: "Calendar", mark: "C", tone: "#4285f4" },
  resend: { label: "Resend", mark: "R", tone: "#000000" },
  airtable: { label: "Airtable", mark: "A", tone: "#18bfff" },
  telegram: { label: "Telegram", mark: "T", tone: "#29a9eb" },
  figma: { label: "Figma", mark: "F", tone: "#a259ff" },
};

/** Inline @connector pill — matches premium chat chips (logo + name). */
export function ConnectorChip({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  const key = id.toLowerCase().replace(/^@/, "");
  const m = META[key] ?? {
    label: key.charAt(0).toUpperCase() + key.slice(1),
    mark: key.slice(0, 1).toUpperCase(),
    tone: "#a78bfa",
  };

  return (
    <span
      className={cn(
        "mx-0.5 inline-flex select-none items-center gap-1.5 rounded-full border border-white/10 bg-[#2a2a2c] py-0.5 pl-1 pr-2.5 align-middle text-[13px] font-medium text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]",
        className,
      )}
      contentEditable={false}
      data-connector={key}
    >
      <span
        className="grid size-5 place-items-center rounded-full text-[10px] font-bold"
        style={{
          background: `linear-gradient(145deg, color-mix(in srgb, ${m.tone} 40%, #3a3a3c), #2f2f31)`,
          color: m.tone,
        }}
        aria-hidden
      >
        {key === "github" ? (
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
        ) : key === "vercel" ? (
          <span className="text-[9px] leading-none">▲</span>
        ) : (
          m.mark
        )}
      </span>
      <span className="pr-0.5">{m.label}</span>
    </span>
  );
}

/** Split text and replace @service with chips. */
export function withConnectorChips(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = /@([a-z][\w-]{1,32})\b/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    nodes.push(<ConnectorChip key={`c${i++}`} id={m[1]} />);
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes.length ? nodes : [text];
}
