/**
 * Live-build demo content: one business ("Ember & Oak" roastery), three real
 * artifacts. These are genuine, hand-built example outputs — the point of the
 * demo is that Trove ships files you keep, not answers you scroll past.
 */

export type ScenarioId = "memo" | "sheet";

export interface Scenario {
  id: ScenarioId;
  tab: string;
  fileName: string;
  prompt: string;
  steps: string[];
  doneLine: string;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "memo",
    tab: "Investor memo",
    fileName: "q3-investor-update.md",
    prompt: "Draft our Q3 investor update for Ember & Oak — lead with the wholesale win, keep it one page, honest about margins.",
    steps: [
      "Reading the brief",
      "Structuring the memo",
      "Writing the narrative",
      "Checking the numbers",
    ],
    doneLine: "Memo drafted — ready to send.",
  },
  {
    id: "sheet",
    tab: "Pricing model",
    fileName: "wholesale-pricing.csv",
    prompt: "Model wholesale pricing for the three house roasts — show margins at 12oz and 5lb, flag anything under 55%.",
    steps: [
      "Reading the brief",
      "Building the grid",
      "Computing margins",
      "Flagging the risks",
    ],
    doneLine: "Model complete — 2 bags under the margin floor.",
  },
];

/** Full standalone landing page rendered inside the demo's browser frame. */
export interface MemoSection {
  heading?: string;
  body?: string;
  quote?: string;
  bullets?: string[];
}

export const MEMO: { title: string; meta: string; sections: MemoSection[] } = {
  title: "Q3 Investor Update",
  meta: "Ember & Oak Roasting Co. · October 2026 · From: Maya Chen, Founder",
  sections: [
    {
      body: "Q3 was the quarter wholesale finally worked. We signed 14 new café accounts — including our first regional chain — and wholesale is now 38% of revenue, up from 22% in Q2. The roastery ran at 81% capacity in September without a single missed roast day.",
    },
    {
      heading: "The numbers",
      bullets: [
        "Revenue: $214k (+31% QoQ) — DTC $133k, wholesale $81k",
        "Gross margin: 58% (target 60%; green coffee prices up 9%)",
        "Subscription base: 2,140 active (+18%); churn steady at 3.1%",
        "Cash: $96k runway after the second roaster deposit",
      ],
    },
    {
      heading: "What we got wrong",
      body: "The 5lb food-service bags are priced too aggressively — margins sit at 51–54% against our 55% floor. We're repricing in November; two of our largest accounts have already agreed in principle. I'd rather have this conversation now than discover it in Q1.",
    },
    {
      quote: "Honest about margins, clear about the fix. That's the update I want to read.",
    },
    {
      heading: "Q4 focus",
      bullets: [
        "Reprice 5lb bags; protect the 55% margin floor",
        "Commission the second roaster by mid-December",
        "Launch the holiday gift set (pre-orders open Nov 10)",
      ],
    },
  ],
};

export interface DeckSlide {
  kicker: string;
  title: string;
  body: string;
  points?: string[];
}

export const DECK: DeckSlide[] = [
  {
    kicker: "Ember & Oak · Wholesale expansion",
    title: "Wholesale is working.",
    body: "Fourteen new café accounts in Q3 — including our first regional chain. Wholesale went from 22% to 38% of revenue in one quarter.",
  },
  {
    kicker: "The numbers",
    title: "$81k wholesale revenue, up 3×.",
    body: "The roastery ran at 81% capacity in September without a missed roast day. Demand is outpacing our single 12kg roaster.",
    points: ["14 new accounts signed", "38% of revenue from wholesale", "81% capacity utilization"],
  },
  {
    kicker: "The ask",
    title: "One roaster. One reprice. One holiday set.",
    body: "Commission the second roaster by December, reprice 5lb bags to protect the 55% margin floor, and launch the holiday gift set November 10.",
  },
];

export interface ResearchFinding {
  heading: string;
  body: string;
  source: string;
}

export const RESEARCH: { title: string; meta: string; findings: ResearchFinding[] } = {
  title: "Specialty coffee wholesale — market scan",
  meta: "Prepared for Ember & Oak · October 2026 · 6 sources",
  findings: [
    {
      heading: "Regional chains buy local, but audit hard",
      body: "Chains with 8–30 locations prefer regional roasters for freshness story, but require documented QC: cupping logs, roast-date guarantees, and 48-hour fulfillment SLAs. Two of the three chains interviewed dropped a roaster over missed deliveries, not price.",
      source: "Interviews: 3 regional café chains (OR/WA) · SCA wholesale survey 2025",
    },
    {
      heading: "The pricing gap sits at 5lb",
      body: "12oz wholesale clusters tightly at $13–15/lb with little room to move. The 5lb food-service tier is less efficient — most roasters underprice it to win accounts, then get stuck. Roasters holding a 55%+ margin on 5lb win fewer accounts but keep them longer.",
      source: "Wholesale price sheets: 11 PNW roasters · Roast Magazine cost study 2026",
    },
    {
      heading: "Inference: our edge is reliability, not price",
      body: "Ember & Oak's 81% capacity with zero missed roast days is the actual pitch. Price 5lb at the margin floor and sell the SLA — competing on price in this tier is a losing game the data doesn't support.",
      source: "Inference from findings 1–2 · Ember & Oak ops data Q3",
    },
  ],
};

export interface SheetRow {
  cells: (string | number)[];
  flag?: boolean;
  total?: boolean;
}
export const SHEET: { title: string; formula: string; head: string[]; rows: SheetRow[] } = {
  title: "Wholesale pricing model",
  formula: "=ROUND((D2-C2)/D2, 2)",
  head: ["Roast", "Bag", "COGS", "Wholesale", "Margin", "Status"],
  rows: [
    { cells: ["First Light", "12 oz", 8.4, 14.5, "42%"], flag: true },
    { cells: ["First Light", "5 lb", 31.2, 68.0, "54%"], flag: true },
    { cells: ["Ember Blend", "12 oz", 7.1, 13.0, "45%"], flag: true },
    { cells: ["Ember Blend", "5 lb", 26.8, 62.0, "57%"] },
    { cells: ["Night Oak", "12 oz", 7.9, 13.75, "43%"], flag: true },
    { cells: ["Night Oak", "5 lb", 29.4, 60.0, "51%"], flag: true },
    { cells: ["Blended margin", "", "", "", "49%"], total: true },
  ],
};

/** Pure helpers for exporting the demo artifacts (client components add the DOM download). */

export function memoMarkdown(): string {
  const lines = [`# ${MEMO.title}`, ``, `_${MEMO.meta}_`, ``];
  for (const s of MEMO.sections) {
    if (s.heading) lines.push(`## ${s.heading}`, ``);
    if (s.body) lines.push(s.body, ``);
    if (s.quote) lines.push(`> ${s.quote}`, ``);
    if (s.bullets) {
      for (const b of s.bullets) lines.push(`- ${b}`);
      lines.push(``);
    }
  }
  return lines.join("\n");
}

export function sheetCsv(): string {
  const rows = [
    SHEET.head.join(","),
    ...SHEET.rows.map((r) => r.cells.map((c) => `"${c}"`).join(",")),
  ];
  return rows.join("\n");
}
