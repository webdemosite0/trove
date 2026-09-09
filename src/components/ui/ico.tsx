import type { IconType } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/**
 * Motion vocabulary. Each one is matched to meaning rather than picked for
 * variety — a bell rings, a globe spins, a table pops into its grid.
 */
export type Motion =
  | "spin"
  | "ring"
  | "tilt"
  | "lift"
  | "grow"
  | "pop"
  | "hue"
  | "shake"
  | "nudge"
  | "back"
  | "down"
  | "send"
  | "exit"
  | "launch"
  | "panel"
  | "open"
  | "close"
  | "copy"
  | "lock"
  | "check"
  | "menu"
  | "fit"
  | "type"
  | "scan"
  | "tick"
  | "stack"
  | "mail"
  | "alert"
  | "sparkle";

/**
 * Grok-smooth lucide glyph with the existing motion classes.
 *
 * Stroke is 1.5 with round caps — the same weight Grok uses — so every
 * page reads as one icon family instead of Feather + Tabler mixed.
 */
export function Ico({
  icon: Icon,
  motion = "pop",
  size = 17,
  live = false,
  active = false,
  className,
  style,
  title,
}: {
  icon: IconType;
  motion?: Motion;
  size?: number;
  live?: boolean;
  active?: boolean;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}) {
  return (
    <span
      className={cn(
        "ico",
        `ico-${motion}`,
        live && "ico-live",
        active && "ico-active",
        className,
      )}
      style={style}
      title={title}
    >
      <Icon size={size} strokeWidth={1.5} absoluteStrokeWidth={false} />
    </span>
  );
}
