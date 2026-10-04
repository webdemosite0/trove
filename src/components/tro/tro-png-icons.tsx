// Tro icon set — PNG assets (transparent) served from /tros-icons-transparent/.
// Original generated icon concepts, uploaded as-is. Usage: <TroPngIcon name="home" size={24} />

const ICON_FILES: Record<string, string> = {
  "home": "01-home.png",
  "library": "02-library.png",
  "chat": "03-chat.png",
  "team": "04-team.png",
  "artifacts": "05-artifacts.png",
  "search": "06-search.png",
  "new-tro": "07-new-tro.png",
  "profile": "08-profile.png",
  "instructions": "09-instructions.png",
  "knowledge": "10-knowledge.png",
  "memory": "11-memory.png",
  "tools": "12-tools.png",
  "tasks": "13-tasks.png",
  "activity": "14-activity.png",
  "schedule": "15-schedule.png",
  "notifications": "16-notifications.png",
  "approvals": "17-approvals.png",
  "permissions": "18-permissions.png",
  "browser": "19-browser.png",
  "desktop": "20-desktop.png",
  "files": "21-files.png",
  "connect": "22-connect.png",
  "code": "23-code.png",
  "research": "24-research.png",
  "document": "25-document.png",
  "spreadsheet": "26-spreadsheet.png",
  "deck": "27-deck.png",
  "website": "28-website.png",
  "download": "29-download.png",
  "share": "30-share.png",
  "ready": "31-ready.png",
  "working": "32-working.png",
  "waiting": "33-waiting.png",
  "failed": "34-failed.png",
  "retry": "35-retry.png",
  "stop": "36-stop.png",
};

export type TroPngIconName = keyof typeof ICON_FILES;

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
      src={`/tros-icons-transparent/${ICON_FILES[name]}`}
      width={size}
      height={size}
      alt={alt ?? `${name} icon`}
      className={className}
      draggable={false}
    />
  );
}

export const TRO_PNG_ICONS = Object.keys(ICON_FILES) as TroPngIconName[];
