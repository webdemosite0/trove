/**
 * Live-build demo content: one business ("Ember & Oak" roastery), three real
 * artifacts. These are genuine, hand-built example outputs — the point of the
 * demo is that Trove ships files you keep, not answers you scroll past.
 */

export type ScenarioId = "site" | "memo" | "sheet";

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
    id: "site",
    tab: "Website",
    fileName: "ember-and-oak.html",
    prompt: "Launch site for Ember & Oak — our small-batch roastery. Warm, premium, with the three house roasts and a subscription CTA.",
    steps: [
      "Reading the brief",
      "Laying out sections",
      "Writing the copy",
      "Polishing the design",
    ],
    doneLine: "Site built — preview is live below.",
  },
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
export const SITE_HTML = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ember &amp; Oak — Small-batch coffee, roasted close to home</title>
<style>
*{margin:0;box-sizing:border-box}body{font-family:-apple-system,'Segoe UI',Inter,sans-serif;background:#FAF7F1;color:#241A10;line-height:1.55}
.wrap{max-width:960px;margin:0 auto;padding:0 28px}
.top{display:flex;align-items:center;justify-content:space-between;padding:22px 0;border-bottom:1px solid #E7DCCB}
.brand{font-family:Georgia,'Times New Roman',serif;font-size:21px;letter-spacing:.02em}.brand b{color:#B4552D}
.nav{display:flex;gap:26px;font-size:13.5px;color:#6B5D4C}.nav a{color:inherit;text-decoration:none}
.cta{background:#241A10;color:#FAF7F1;border:0;border-radius:999px;padding:10px 22px;font-size:13.5px;font-weight:600;cursor:pointer}
.hero{padding:84px 0 60px;text-align:center}
.kicker{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#B4552D;font-weight:700}
.hero h1{font-family:Georgia,serif;font-size:52px;line-height:1.08;letter-spacing:-.01em;margin:18px 0 16px;font-weight:400}
.hero h1 em{font-style:italic;color:#B4552D}
.hero p{max-width:560px;margin:0 auto;color:#6B5D4C;font-size:16.5px}
.btns{display:flex;gap:12px;justify-content:center;margin-top:30px}
.btn2{border:1px solid #D8C9B2;background:transparent;border-radius:999px;padding:10px 22px;font-size:13.5px;font-weight:600;color:#241A10;cursor:pointer}
.roasts{padding:30px 0 70px}.roasts h2{font-family:Georgia,serif;font-size:30px;font-weight:400;text-align:center;margin-bottom:8px}
.sub{text-align:center;color:#6B5D4C;font-size:14.5px;margin-bottom:34px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.card{background:#fff;border:1px solid #EAE0CE;border-radius:14px;padding:26px 22px}
.swatch{height:64px;border-radius:10px;margin-bottom:18px}
.card h3{font-family:Georgia,serif;font-size:19px;font-weight:400;margin-bottom:6px}
.notes{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#A08B6F;font-weight:700;margin-bottom:10px}
.card p{font-size:13.5px;color:#6B5D4C;margin-bottom:16px}
.price{font-size:15px;font-weight:700}.price span{font-weight:400;color:#8A7B6C;font-size:12.5px}
.story{background:#241A10;color:#F3EDE2;border-radius:20px;padding:56px 48px;display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center;margin:10px 0 70px}
.story h2{font-family:Georgia,serif;font-size:32px;font-weight:400;line-height:1.2;margin-bottom:14px}
.story p{color:#C9BBA6;font-size:14.5px;margin-bottom:12px}
.badge{display:inline-block;border:1px solid #4A3A28;border-radius:999px;padding:6px 14px;font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;color:#D8B98A;margin-bottom:18px}
.sub-band{text-align:center;padding:20px 0 80px}.sub-band h2{font-family:Georgia,serif;font-size:30px;font-weight:400;margin-bottom:10px}
.sub-band p{color:#6B5D4C;font-size:14.5px;max-width:480px;margin:0 auto 24px}
footer{border-top:1px solid #E7DCCB;padding:26px 0 40px;display:flex;justify-content:space-between;font-size:12.5px;color:#8A7B6C}
@media(max-width:640px){.hero{padding:52px 0 40px}.hero h1{font-size:36px}.grid{grid-template-columns:1fr}.story{grid-template-columns:1fr;padding:36px 28px}.nav{display:none}.top{padding:16px 0}.wrap{padding:0 20px}}
</style></head><body>
<div class="wrap">
<div class="top"><div class="brand">Ember <b>&amp;</b> Oak</div>
<div class="nav"><a href="#">Roasts</a><a href="#">Our story</a><a href="#">Wholesale</a><a href="#">Journal</a></div>
<button class="cta">Subscribe</button></div>
<div class="hero"><div class="kicker">Roasted every Tuesday · Portland, OR</div>
<h1>Coffee, roasted <em>twelve miles</em> from your door.</h1>
<p>Three house roasts, bought directly from six farms we visit every year. Roasted in 12kg batches, shipped within 48 hours — never warehoused, never stale.</p>
<div class="btns"><button class="cta">Shop the roasts</button><button class="btn2">Start a subscription</button></div></div>
<div class="roasts"><h2>The house roasts</h2><div class="sub">The only three coffees we roast. We'd rather do three perfectly than thirty adequately.</div>
<div class="grid">
<div class="card"><div class="swatch" style="background:linear-gradient(135deg,#8A5A33,#5C3A1E)"></div><h3>First Light</h3><div class="notes">Washed · Ethiopia</div><p>Bergamot, white peach, black tea. Our brightest coffee — built for slow mornings and pour-overs.</p><div class="price">$22 <span>/ 12 oz</span></div></div>
<div class="card"><div class="swatch" style="background:linear-gradient(135deg,#6E4423,#3E2712)"></div><h3>Ember Blend</h3><div class="notes">Natural · Brazil + Colombia</div><p>Dark chocolate, toasted hazelnut, a whisper of smoke. The espresso that converted a thousand drip drinkers.</p><div class="price">$20 <span>/ 12 oz</span></div></div>
<div class="card"><div class="swatch" style="background:linear-gradient(135deg,#4E3018,#2A1A0C)"></div><h3>Night Oak</h3><div class="notes">Decaf · Colombia, Swiss Water</div><p>Cocoa, molasses, dried fig. Proof that decaf was never the problem — stale decaf was.</p><div class="price">$21 <span>/ 12 oz</span></div></div>
</div></div>
<div class="story"><div><div class="badge">Our story</div><h2>A roastery built on twelve kilograms at a time.</h2><p>We started in 2019 with a secondhand 12kg roaster and a stubborn belief: coffee tastes better when the distance from farm to cup is short and the roast date is yesterday.</p><p>Seven years later we still roast every Tuesday, still buy from the same six farms, and still cup every single batch before it ships.</p></div>
<div style="background:linear-gradient(135deg,#B4552D,#7A3A1E);border-radius:14px;min-height:280px;display:flex;align-items:flex-end;padding:24px;color:#FAF7F1;font-family:Georgia,serif;font-size:20px;font-style:italic">"The Ember Blend ruined every other espresso for me."</div></div>
<div class="sub-band"><h2>Never run out again.</h2><p>Subscriptions ship on your schedule, pause anytime, and save 15%. Your Tuesday roast, every Tuesday.</p><button class="cta">Build my subscription</button></div>
<footer><span>© 2026 Ember &amp; Oak Roasting Co.</span><span>Portland, Oregon · Roasted Tuesdays</span></footer>
</div></body></html>`;

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
    { cells: ["First Light", "12 oz", 8.4, 14.5, "42%"] },
    { cells: ["First Light", "5 lb", 31.2, 68.0, "54%"], flag: true },
    { cells: ["Ember Blend", "12 oz", 7.1, 13.0, "45%"] },
    { cells: ["Ember Blend", "5 lb", 26.8, 62.0, "57%"] },
    { cells: ["Night Oak", "12 oz", 7.9, 13.75, "43%"] },
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
