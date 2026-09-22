export const COMPONENT_CHIPS = [
  "Add a primary CTA button",
  "Add a navigation bar",
  "Add a card grid",
  "Add a pricing table",
  "Add form fields with labels",
  "Add empty state illustration area",
  "Add status badges",
  "Add a bottom tab bar",
  "Add a modal / dialog",
  "Add a data table",
  "Softer shadows and larger radius",
  "Switch to dark theme tokens",
] as const;

export function extractThemeHint(html: string): string {
  const root = html.match(/:root\s*\{([^}]+)\}/);
  if (!root) return "";
  return root[1]
    .split(";")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("--"))
    .slice(0, 16)
    .join("; ");
}

export function screenFileName(name: string) {
  return `${name.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "screen"}.html`;
}
