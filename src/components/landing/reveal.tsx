"use client";

import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * Intersection-based reveal — fades/slides in once when entering viewport.
 * Respects prefers-reduced-motion via CSS.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
  y = 28,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "li" | "article" | "span";
  y?: number;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const style = {
    "--reveal-delay": `${delay}ms`,
    "--reveal-y": `${y}px`,
  } as CSSProperties;

  return (
    <Tag
      ref={ref as never}
      className={cn("lp-reveal", on && "lp-reveal--on", className)}
      style={style}
    >
      {children}
    </Tag>
  );
}
