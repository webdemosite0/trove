// Tro icon set — PNG assets (transparent, 256px) served from /tro-icons/.
// These are the original generated icon concepts; for themeable vector
// versions see the SVG set. Usage: <TroPngIcon name="home" size={24} />

const ICON_NAMES = [
  "home", "library", "chat", "team", "artifacts", "search",
  "new-tro", "profile", "instructions", "knowledge", "memory", "tools",
  "tasks", "activity", "schedule", "notifications", "approvals", "permissions",
  "browser", "desktop", "files", "connect", "code", "research",
  "document", "spreadsheet", "deck", "website", "download", "share",
  "ready", "working", "waiting", "failed", "retry", "stop",
] as const;

export type TroPngIconName = (typeof ICON_NAMES)[number];

export function TroPngIcon({
  name,
  size = 24,
  className,
  alt,
}: {
  name: TroPngIconName;
  size?: number;
  className?: string;
  alt?: string;
}) {
  return (
    <img
      src={`/tro-icons/${name}.png`}
      width={size}
      height={size}
      alt={alt ?? `${name} icon`}
      className={className}
      draggable={false}
    />
  );
}

export const TRO_PNG_ICONS: readonly TroPngIconName[] = ICON_NAMES;
