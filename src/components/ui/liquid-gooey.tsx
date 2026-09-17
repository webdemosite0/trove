"use client";

import {
  createContext,
  useContext,
  useId,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type Transition = "bouncy" | "smooth" | "snappy" | string;
type Effect = "morph" | "move" | "melt" | "bend";

const LiquidCtx = createContext<{ filterId: string } | null>(null);

const transitionCss: Record<string, string> = {
  bouncy: "transform 520ms cubic-bezier(0.34, 1.45, 0.64, 1)",
  smooth: "transform 380ms cubic-bezier(0.22, 1, 0.36, 1)",
  snappy: "transform 220ms cubic-bezier(0.2, 0.9, 0.3, 1)",
};

/**
 * Gooey wrapper — SVG blur + contrast so touching items melt together.
 * API aligned with libraries.dev liquid-gooey (no npm dependency).
 */
export function Liquid({
  children,
  blur = 8,
  contrast = 18,
  fill = "transparent",
  shadow,
  className,
  style,
}: {
  children: ReactNode;
  blur?: number;
  contrast?: number;
  fill?: string;
  shadow?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const uid = useId().replace(/:/g, "");
  const filterId = `trove-goo-${uid}`;
  const c = Math.max(1, contrast);

  return (
    <LiquidCtx.Provider value={{ filterId }}>
      <div
        className={cn("relative inline-flex items-center justify-center", className)}
        style={{
          background: fill === "transparent" ? undefined : fill,
          boxShadow: shadow,
          ...style,
        }}
      >
        <svg width={0} height={0} className="absolute" aria-hidden>
          <defs>
            <filter id={filterId}>
              <feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="blur" />
              <feColorMatrix
                in="blur"
                mode="matrix"
                values={`1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${c} -${(c / 2).toFixed(1)}`}
                result="goo"
              />
              <feComposite in="SourceGraphic" in2="goo" operator="atop" />
            </filter>
          </defs>
        </svg>
        <div
          className="relative flex items-center justify-center"
          style={{ filter: `url(#${filterId})` }}
        >
          {children}
        </div>
      </div>
    </LiquidCtx.Provider>
  );
}

function LiquidItem({
  children,
  x = 0,
  y = 0,
  effect = "morph",
  transition = "bouncy",
  delay = 0,
  className,
  style,
}: {
  children: ReactNode;
  x?: number;
  y?: number;
  effect?: Effect;
  transition?: Transition;
  delay?: number;
  className?: string;
  style?: CSSProperties;
}) {
  useContext(LiquidCtx);
  const t =
    transitionCss[transition] ||
    transitionCss.bouncy ||
    "transform 420ms cubic-bezier(0.34, 1.4, 0.64, 1)";

  return (
    <div
      className={cn("relative", className)}
      data-effect={effect}
      style={{
        transform: `translate3d(${x}px, ${y}px, 0)`,
        transition: t,
        transitionDelay: delay ? `${delay}ms` : undefined,
        willChange: "transform",
        ...style,
      }}
    >
      {/* Crisp content sits above the goo layer */}
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

Liquid.Item = LiquidItem;

export { LiquidItem };
