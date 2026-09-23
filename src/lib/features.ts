import type { IconType } from "@/components/ui/icons";
import { TbWorld, TbRobot, TbMicroscope, TbFileText, TbTable, TbPresentation, TbUsers, TbPalette } from "@/components/ui/icons";

export interface Feature {
  slug: string;
  label: string;
  title: string;
  description: string;
  icon: IconType;
  tone: string;
  headline: string;
  standfirst: string;
  sections: { heading: string; body: string }[];
  facts: string[];
  href: string;
}

/** Product surface copy for marketing feature pages. */
export const FEATURES: Feature[] = [
  {
    slug: "ai-workspace",
    label: "Chat",
    title: "AI workspace chat",
    description:
      "Describe what you need — documents, analysis, research, or agents — and work it through in one conversation.",
    icon: TbWorld,
    tone: "#7c6fff",
    headline: "One chat for the work you do.",
    standfirst:
      "Trove is a workspace: write docs, build sheets, design screens, run agents, and research — without jumping between tools.",
    sections: [
      {
        heading: "Stay in the conversation",
        body: "Follow-ups refine what you already have. Ask for a shorter intro, a new section, or a different tone without starting over.",
      },
      {
        heading: "Real exports",
        body: "Documents, sheets, and decks export to the formats your team already uses.",
      },
      {
        heading: "Agents when you need specialists",
        body: "Save a role and instructions once, then brief the same agent again next week.",
      },
    ],
    facts: [
      "Chat, docs, sheets, decks, design, agents, research",
      "Follow-ups revise the current artefact",
      "Exports you can download and share",
    ],
    href: "/chat",
  },
  {
    slug: "ai-agents",
    label: "AI agents",
    title: "Build your own AI agents",
    description:
      "Give an agent a role, instructions and tools, and it becomes a specialist you can brief and talk to. Your agents are saved and reusable, not one-off prompts.",
    icon: TbRobot,
    tone: "#a78bfa",
    headline: "An agent is a specialist you write down once.",
    standfirst:
      "Most AI work is re-explaining context. An agent holds that context: a name, a role, the instructions it always follows, and the tools it is allowed to use. You brief it once and then just talk to it.",
    sections: [
      {
        heading: "Instructions it does not forget",
        body: "The role and the instructions belong to the agent, not to the conversation. Open it a week later and it still knows the brief you gave it.",
      },
      {
        heading: "Reusable specialists",
        body: "Save agents for support, writing, research, or ops — then reopen them whenever that work comes back.",
      },
    ],
    facts: [
      "Saved agents with role and instructions",
      "Brief in natural language",
      "Reusable across sessions",
    ],
    href: "/agents",
  },
];

export function featureBySlug(slug: string): Feature | undefined {
  return FEATURES.find((f) => f.slug === slug);
}

/** Everything else the workspace does. */
export const ALSO: { label: string; icon: IconType; note: string }[] = [
  { label: "Design", icon: TbPalette, note: "A brief becomes rendered screens and editable design tokens." },
  { label: "Slides", icon: TbPresentation, note: "Decks with speaker notes, exported to PowerPoint." },
  { label: "Spreadsheets", icon: TbTable, note: "An editable grid that exports to Excel." },
  { label: "Documents", icon: TbFileText, note: "Full documents you can export to Word." },
  { label: "Research", icon: TbMicroscope, note: "Findings with sources and open questions." },
  { label: "AI Team", icon: TbUsers, note: "Four specialists working one task in order." },
];
