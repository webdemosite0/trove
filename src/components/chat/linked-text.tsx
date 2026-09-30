"use client";

import type { ReactNode } from "react";
import { withConnectorChips } from "@/components/chat/connector-chip";

const URL_RE =
  /https?:\/\/[^\s<>\[\]()"]+|www\.[^\s<>\[\]()"]+/gi;

function trimUrl(raw: string): { href: string; display: string } {
  let display = raw;
  while (/[.,;:!?)]+$/.test(display)) display = display.slice(0, -1);
  const href = display.startsWith("www.") ? `https://${display}` : display;
  return { href, display };
}

function linkClassName(tone: "accent" | "inherit" = "accent") {
  return tone === "inherit"
    ? "font-medium underline decoration-current/40 underline-offset-[3px] transition-colors hover:decoration-current"
    : "font-medium text-accent underline decoration-accent/30 underline-offset-[3px] transition-colors hover:decoration-accent";
}

export function withLinkedText(
  text: string,
  opts?: { tone?: "accent" | "inherit"; connectors?: boolean },
): ReactNode[] {
  const tone = opts?.tone ?? "accent";
  const useConnectors = opts?.connectors !== false;
  const nodes: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  const re = new RegExp(URL_RE.source, "gi");

  while ((m = re.exec(text))) {
    if (m.index > last) {
      const plain = text.slice(last, m.index);
      if (useConnectors) nodes.push(...withConnectorChips(plain));
      else nodes.push(plain);
    }

    const { href, display } = trimUrl(m[0]);
    nodes.push(
      <a
        key={`u${k++}`}
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className={linkClassName(tone)}
      >
        {display}
      </a>,
    );

    const stripped = m[0].slice(display.length);
    if (stripped) nodes.push(stripped);
    last = m.index + m[0].length;
  }

  if (last < text.length) {
    const plain = text.slice(last);
    if (useConnectors) nodes.push(...withConnectorChips(plain));
    else nodes.push(plain);
  }

  return nodes.length ? nodes : [text];
}
