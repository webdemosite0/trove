/**
 * Display names for the `kind` recorded against every credit spend.
 */
export const KIND_LABEL: Record<string, string> = {
  chat: "Chat",
  agent: "Agent",
  docs: "Documents",
  sheets: "Spreadsheets",
  slides: "Decks",
  design: "Design",
  research: "Research",
  team: "Team",
  site: "Chat",
  code: "Chat",
};

export function kindLabel(kind: string): string {
  return KIND_LABEL[kind] ?? kind;
}
