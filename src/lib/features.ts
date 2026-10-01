import type { IconType } from "@/components/ui/icons";
import { TbWorld, TbRobot, TbMicroscope, TbFileText, TbTable, TbPresentation, TbUsers, TbPalette } from "@/components/ui/icons";

export interface FeatureExample {
  kind: "site" | "doc" | "sheet" | "deck" | "research" | "crew";
  title: string;
  caption: string;
}

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
  example?: FeatureExample;
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
  {
    slug: "websites",
    label: "Websites",
    title: "AI website builder",
    description:
      "Describe the site you need and Trove designs, writes, and builds it — with a live preview you can click through. Publish on troveai.site or keep refining in chat.",
    icon: TbWorld,
    tone: "#0284c7",
    headline: "Describe the site. Get the site.",
    standfirst:
      "Trove is an AI website builder that ships real pages, not mockups: layout, copy, and styling in one pass, rendered in a live preview you can click through. Then refine it in chat — “make the hero bolder”, “add a pricing section” — or publish it when it's ready.",
    sections: [
      {
        heading: "A live preview, not a picture",
        body: "Every site renders as a real page you can scroll, click, and resize. What you see in the preview is what your visitors get — no “design concept” that a developer still has to build.",
      },
      {
        heading: "Copy is included",
        body: "A website with lorem ipsum is a template. Trove writes the actual headlines, product descriptions, and calls to action from your brief — then lets you rewrite any line in chat.",
      },
      {
        heading: "Publish or take the files",
        body: "Publish to yourname.troveai.site in one click, or export the HTML and host it anywhere. The site stays in your workspace, so next month's update is a conversation, not a rebuild.",
      },
    ],
    facts: [
      "Real multi-section pages with a clickable live preview",
      "Copywriting from your brief — headlines, CTAs, product copy",
      "Refine in chat: layout, tone, sections, imagery",
      "One-click publish on *.troveai.site, or export the HTML",
    ],
    href: "/websites",
    example: {
      kind: "site",
      title: "Ember & Oak — roastery landing page",
      caption: "Built from one paragraph: “Launch site for Ember & Oak — our small-batch roastery. Warm, premium, with the three house roasts and a subscription CTA.”",
    },
  },
  {
    slug: "documents",
    label: "Documents",
    title: "AI document generator",
    description:
      "Reports, memos, proposals, and briefs — drafted with real structure and your voice, then refined in chat. Export to DOCX or Markdown when it's ready to send.",
    icon: TbFileText,
    tone: "#8b5cf6",
    headline: "Drafts with structure, not walls of text.",
    standfirst:
      "Trove writes documents the way a good colleague would: a clear point up front, sections that earn their place, and numbers checked against what you gave it. You review, redirect, and tighten in chat — then export a file that's ready to send.",
    sections: [
      {
        heading: "Built to be edited",
        body: "The first draft is the starting point. Ask for a shorter intro, a harder-nosed risks section, or a different tone, and the document updates in place — no copy-paste between chat and editor.",
      },
      {
        heading: "Honest with numbers",
        body: "Give it your figures and it will use them, flag what's missing, and say so when a claim needs a source. A draft that invents metrics is worse than no draft.",
      },
      {
        heading: "Leaves as a real file",
        body: "Export to DOCX for the team or Markdown for the repo. Formatting, headings, and lists survive the trip — the file works where your work lives.",
      },
    ],
    facts: [
      "Memos, reports, proposals, briefs, and plans",
      "In-place revision through conversation",
      "Tone and structure you can redirect at any point",
      "Export to DOCX or Markdown",
    ],
    href: "/documents",
    example: {
      kind: "doc",
      title: "Q3 investor update — Ember & Oak",
      caption: "Built from one line: “Draft our Q3 investor update — lead with the wholesale win, keep it one page, honest about margins.”",
    },
  },
  {
    slug: "spreadsheets",
    label: "Spreadsheets",
    title: "AI spreadsheet generator",
    description:
      "Budgets, pricing models, and trackers with real formulas and consistent math — not numbers typed into a grid. Open in Excel or Sheets, or keep refining in chat.",
    icon: TbTable,
    tone: "#d97706",
    headline: "Models with math that checks out.",
    standfirst:
      "A spreadsheet is only useful if the formulas are right. Trove builds sheets as working models — inputs, computed cells, and totals that reconcile — then shows its workings so you can audit every number before you trust it.",
    sections: [
      {
        heading: "Formulas, not typed numbers",
        body: "Margins, totals, and projections are computed from inputs, so changing one assumption flows through the whole model. The formula bar shows exactly how each cell is derived.",
      },
      {
        heading: "It flags what needs attention",
        body: "Set a floor — a margin target, a budget cap — and the sheet calls out the rows that breach it, instead of burying the problem in row 47.",
      },
      {
        heading: "Refine by talking",
        body: "“Add a 5lb column”, “what if green coffee rises 10%?” — the model updates and the math stays consistent. Export to CSV for Excel or Sheets whenever you need the file.",
      },
    ],
    facts: [
      "Working formulas with a visible formula bar",
      "Thresholds and flags for rows that need attention",
      "Scenario tweaks in plain language",
      "CSV export for Excel and Google Sheets",
    ],
    href: "/spreadsheets",
    example: {
      kind: "sheet",
      title: "Wholesale pricing model — Ember & Oak",
      caption: "Built from one line: “Model wholesale pricing for the three house roasts — show margins at 12oz and 5lb, flag anything under 55%.”",
    },
  },
  {
    slug: "decks",
    label: "Decks",
    title: "AI presentation maker",
    description:
      "Pitch decks and slide narratives with a real point of view — a story arc, not bullet-point soup. Refine slide by slide in chat, export to PPTX.",
    icon: TbPresentation,
    tone: "#e11d48",
    headline: "Decks with a point of view.",
    standfirst:
      "Most AI decks are ten slides of generic bullets. Trove builds presentations around an argument: the story arc first, then one idea per slide, with speaker notes that say what the slide can't. You refine it slide by slide until it sounds like you.",
    sections: [
      {
        heading: "Story before slides",
        body: "Every deck starts with the narrative — the problem, the proof, the ask — so the slides argue something instead of decorating a topic.",
      },
      {
        heading: "One idea per slide",
        body: "Slides stay focused: a headline that makes the point, supporting detail underneath, nothing that belongs in an appendix pretending it's content.",
      },
      {
        heading: "Refine the hard slides",
        body: "“The traction slide feels weak — lead with the wholesale number.” Target the slides that matter instead of regenerating the whole deck and losing the good ones.",
      },
    ],
    facts: [
      "Narrative-first structure: problem, proof, ask",
      "One idea per slide with speaker notes",
      "Slide-by-slide refinement in chat",
      "Export to PPTX",
    ],
    href: "/slides",
    example: {
      kind: "deck",
      title: "Wholesale expansion pitch — Ember & Oak",
      caption: "Built from one line: “Three-slide pitch for our wholesale expansion — the win, the numbers, the ask.”",
    },
  },
  {
    slug: "research",
    label: "Research",
    title: "AI research assistant",
    description:
      "Structured research briefs with sources you can check — market scans, competitor teardowns, and decision memos that become the foundation for the work that follows.",
    icon: TbMicroscope,
    tone: "#0d9488",
    headline: "Research you can build on.",
    standfirst:
      "Trove research doesn't end with a summary — it ends with a brief: findings organized by the decision you need to make, with sources attached so you can verify what matters. And it stays in your workspace, so next week's document can cite this week's research.",
    sections: [
      {
        heading: "Organized by decision",
        body: "A research brief answers the question you actually asked — should we launch this, what do competitors charge, where's the gap — instead of dumping everything the internet knows about a topic.",
      },
      {
        heading: "Sources you can check",
        body: "Claims link to where they came from. The brief distinguishes what the sources support from what's inference, so you know what to trust and what to verify.",
      },
      {
        heading: "Compounds over time",
        body: "Research lives in your workspace, not in a dead chat. Next month's pricing memo can build on this month's market scan without starting from zero.",
      },
    ],
    facts: [
      "Decision-oriented briefs, not link dumps",
      "Sources attached to claims",
      "Clear separation of evidence and inference",
      "Saved in your workspace for future work",
    ],
    href: "/research",
    example: {
      kind: "research",
      title: "Specialty coffee market scan — Ember & Oak",
      caption: "Built from one line: “Scan the specialty coffee market — who owns wholesale, where's the pricing gap for a roastery our size?”",
    },
  },
  {
    slug: "tros",
    label: "Tros",
    title: "Hire AI specialists — the Tros",
    description:
      "Ten AI specialists with real roles — research, design, finance, sales, and more. Give a Tro a brief and it works its own job: asking questions, using your connected apps, and saving real artifacts.",
    icon: TbUsers,
    tone: "#7c3aed",
    headline: "Hire a specialist, not a chatbot.",
    standfirst:
      "Tros are Trove's specialist crew: ten mascots with real jobs — Atlas runs the operation, Scout does the research, Zara watches the money. Brief one like you'd brief a colleague, and it plans the work, asks when it's unsure, uses your connected apps, and hands back files.",
    sections: [
      {
        heading: "They ask before they guess",
        body: "A Tro that hits an ambiguity asks you — in an approval card, right in the chat — instead of confidently building the wrong thing. You stay in charge of the judgment calls.",
      },
      {
        heading: "They use your tools",
        body: "Connect Gmail, Drive, Slack, and 4,000+ other apps, and your Tros work with real data: drafting from your inbox, filing to your drive, posting where your team looks.",
      },
      {
        heading: "They hand back artifacts",
        body: "A Tro's work product is a real file — a brief, a model, a design — saved to its workspace library. Pick up where you left off next week; it remembers the brief.",
      },
    ],
    facts: [
      "Ten specialists: research, design, finance, sales, support, and more",
      "Approval cards for judgment calls — nothing ships without you",
      "4,000+ connected apps via Composio",
      "Real artifacts saved to each Tro's library",
    ],
    href: "/tros",
    example: {
      kind: "crew",
      title: "Meet the Tros",
      caption: "Ten specialists, one workspace. Hire one from the Tros home and brief it like a colleague.",
    },
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
