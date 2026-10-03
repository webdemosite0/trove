/**
 * Public template gallery content. Every template is a real, complete
 * artifact — the same shapes Trove generates in the workspace. The Ember &
 * Oak set is shared with the landing demo and feature pages.
 */
import {
  DECK,
  MEMO,
  RESEARCH,
  SHEET,
  type DeckSlide,
  type MemoSection,
  type ResearchFinding,
  type SheetRow,
} from "@/components/landing/demo-outputs";

export type TemplateKind = "doc" | "sheet" | "deck" | "research";

export interface TemplateDoc {
  title: string;
  meta: string;
  sections: MemoSection[];
}
export interface TemplateSheet {
  title: string;
  formula?: string;
  head: string[];
  rows: SheetRow[];
  note?: string;
}
export interface TemplateDeck {
  slides: DeckSlide[];
}
export interface TemplateResearch {
  title: string;
  meta: string;
  findings: ResearchFinding[];
}

export interface Template {
  id: string;
  title: string;
  description: string;
  kind: TemplateKind;
  prompt: string;
  doc?: TemplateDoc;
  sheet?: TemplateSheet;
  deck?: TemplateDeck;
  research?: TemplateResearch;
}

const PROPOSAL: TemplateDoc = {
  title: "Website redesign proposal",
  meta: "Studio North · Prepared for Halcyon Legal · October 2026",
  sections: [
    {
      body: "Halcyon's site was built in 2019 for a firm half its current size. This proposal covers a full redesign: new information architecture, rewritten practice-area pages, and a contact flow that routes to the right partner in one step.",
    },
    {
      heading: "Scope",
      bullets: [
        "Discovery: 2 stakeholder workshops + analytics audit (week 1–2)",
        "Design: homepage, 6 practice pages, attorney profiles, contact flow (week 3–6)",
        "Build: responsive, CMS-editable, accessibility AA (week 5–9)",
        "Launch: migration, redirects, 30-day support (week 10)",
      ],
    },
    {
      heading: "Investment",
      bullets: [
        "Fixed fee: $48,000, split 40 / 40 / 20 across kickoff, design sign-off, launch",
        "Excludes: copywriting beyond polish, photography, ongoing retainer",
        "Valid for 30 days from the date above",
      ],
    },
    {
      heading: "Why us",
      body: "We've redesigned sites for four Am Law 200 firms. The common thread: partners who want a site that brings the right clients, not just a prettier brochure. References available on request.",
    },
  ],
};

const BUDGET: TemplateSheet = {
  title: "Freelance budget planner",
  formula: "=SUM(B2:B13)",
  head: ["Month", "Income", "Expenses", "Saved", "Runway"],
  rows: [
    { cells: ["Jan", 8200, 3400, "58%", "—"] },
    { cells: ["Feb", 9100, 3650, "60%", "—"] },
    { cells: ["Mar", 7800, 3900, "50%", "—"] },
    { cells: ["Apr", 10400, 4100, "61%", "—"] },
    { cells: ["May", 9600, 3800, "60%", "—"] },
    { cells: ["Jun", 11200, 4200, "63%", "—"] },
    { cells: ["H1 total", 56300, 23050, "59%", "14 mo"], total: true },
  ],
  note: "Saved % = (Income − Expenses) / Income. Runway assumes $4,200/mo burn.",
};

const LAUNCH: TemplateDoc = {
  title: "Product launch checklist",
  meta: "Internal · Owner: Priya Nair · Launch date: Nov 18, 2026",
  sections: [
    {
      heading: "4 weeks out",
      bullets: [
        "Freeze scope — no new features after Oct 21",
        "Landing page draft in Trove, reviewed by design",
        "Pricing page final; billing flows tested end-to-end",
      ],
    },
    {
      heading: "2 weeks out",
      bullets: [
        "Beta list notified; 50 early-access invites sent",
        "Status page live; on-call rotation confirmed",
        "Launch post drafted (founder voice, no hype)",
      ],
    },
    {
      heading: "Launch week",
      bullets: [
        "Ship Tuesday 9am; monitor error rates hourly",
        "Founder posts at 10am; team amplifies, no astroturfing",
        "Support inbox triaged twice daily; FAQ updated live",
      ],
    },
    {
      heading: "Day after",
      body: "Write the retro while it's fresh: what broke, what converted, what we'd cut. File it in the project so the next launch starts smarter.",
    },
  ],
};

export const TEMPLATES: Template[] = [
  {
    id: "investor-update",
    title: "Investor update memo",
    description: "A one-page Q3 update: lead with the win, honest about margins, clear on next quarter.",
    kind: "doc",
    prompt: "Draft our Q3 investor update — lead with the wholesale win, keep it one page, honest about margins.",
    doc: { title: MEMO.title, meta: MEMO.meta, sections: MEMO.sections },
  },
  {
    id: "pricing-model",
    title: "Wholesale pricing model",
    description: "Margin math across SKUs and pack sizes, with automatic flags under your floor.",
    kind: "sheet",
    prompt: "Model wholesale pricing for the three house roasts — show margins at 12oz and 5lb, flag anything under 55%.",
    sheet: {
      title: SHEET.title,
      formula: SHEET.formula,
      head: SHEET.head,
      rows: SHEET.rows,
      note: "Margin floor is 55% — the two 5 lb bags are flagged for repricing.",
    },
  },
  {
    id: "pitch-deck",
    title: "Wholesale pitch deck",
    description: "Three slides with an argument: the win, the numbers, the ask.",
    kind: "deck",
    prompt: "Three-slide pitch for our wholesale expansion — the win, the numbers, the ask.",
    deck: { slides: DECK },
  },
  {
    id: "market-scan",
    title: "Market research brief",
    description: "Findings organized by decision, with sources attached to every claim.",
    kind: "research",
    prompt: "Scan the specialty coffee market — who owns wholesale, where's the pricing gap for a roastery our size?",
    research: { title: RESEARCH.title, meta: RESEARCH.meta, findings: RESEARCH.findings },
  },
  {
    id: "redesign-proposal",
    title: "Project proposal",
    description: "Scope, timeline, and pricing in a proposal clients actually read to the end.",
    kind: "doc",
    prompt: "Write a website redesign proposal for a law firm — scope, 10-week timeline, fixed-fee pricing.",
    doc: PROPOSAL,
  },
  {
    id: "budget-planner",
    title: "Freelance budget planner",
    description: "Monthly income vs. expenses with savings rate and runway math built in.",
    kind: "sheet",
    prompt: "Build a freelance budget planner — monthly income and expenses, savings rate, runway in months.",
    sheet: BUDGET,
  },
  {
    id: "launch-checklist",
    title: "Product launch checklist",
    description: "Four weeks to launch day, broken into what actually matters each week.",
    kind: "doc",
    prompt: "Write a product launch checklist — 4 weeks out to day-after, practical and opinionated.",
    doc: LAUNCH,
  },
];

export const TEMPLATE_KINDS: { id: TemplateKind | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "doc", label: "Documents" },
  { id: "sheet", label: "Spreadsheets" },
  { id: "deck", label: "Decks" },
  { id: "research", label: "Research" },
];
