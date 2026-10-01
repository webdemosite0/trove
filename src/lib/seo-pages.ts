/**
 * P5 SEO landing pages — one keyword-targeted page per capability.
 * Each reuses a real artifact example and carries FAQ JSON-LD.
 */
import type { FeatureExample } from "@/lib/features";

export interface SeoFaq {
  q: string;
  a: string;
}

export interface SeoPage {
  slug: string;
  title: string;
  description: string;
  h1: string;
  standfirst: string;
  example: FeatureExample;
  steps: { heading: string; body: string }[];
  compare: { chatbot: string; trove: string };
  faqs: SeoFaq[];
  cta: string;
}

export const SEO_PAGES: SeoPage[] = [
  {
    slug: "ai-website-builder",
    title: "AI Website Builder — Describe It, Trove Builds It",
    description:
      "Trove's AI website builder turns a description into a real, publishable website — design, copy, and live preview included. Free to try.",
    h1: "The AI website builder that ships real sites",
    standfirst:
      "Describe the site you need in plain language. Trove designs it, writes the copy, and renders a live preview you can click through — then publishes it or hands you the files.",
    example: {
      kind: "site",
      title: "Ember & Oak — roastery landing page",
      caption: "Built from one paragraph. Real sections, real copy, publishable as-is.",
    },
    steps: [
      { heading: "Describe it", body: "“A warm, premium site for our roastery — three products, subscription CTA.” One paragraph is enough." },
      { heading: "Review the preview", body: "A real, clickable page renders in seconds. Scroll it, resize it, click every button." },
      { heading: "Refine or publish", body: "“Make the hero bolder” — or publish to yourname.troveai.site when it's ready." },
    ],
    compare: {
      chatbot: "Gives you HTML in a chat bubble to paste somewhere yourself.",
      trove: "Renders the live site, iterates in chat, and publishes it for you.",
    },
    faqs: [
      { q: "Do I need to know how to code?", a: "No. You describe the site; Trove handles layout, styling, and copy. If you do code, you can export the HTML and take it further yourself." },
      { q: "Can I publish the site on my own domain?", a: "You can publish instantly to yourname.troveai.site, or export the HTML and host it anywhere." },
      { q: "What kinds of sites can it build?", a: "Landing pages, portfolios, booking sites, small shops, and multi-page business sites — anything that doesn't need a custom backend." },
      { q: "How is this different from a template?", a: "Templates start from someone else's design. Trove starts from your description, so the structure, copy, and style match your brief from the first draft." },
      { q: "Is it free to try?", a: "Yes — the free plan includes 200 credits a month, no card required. That's enough to build and publish a real site." },
    ],
    cta: "Build my website",
  },
  {
    slug: "ai-presentation-maker",
    title: "AI Presentation Maker — Decks With a Point of View",
    description:
      "Trove's AI presentation maker builds pitch decks around an argument — story first, one idea per slide. Refine slide by slide, export to PPTX.",
    h1: "The AI presentation maker with a point of view",
    standfirst:
      "Most AI decks are ten slides of generic bullets. Trove starts from your argument — the problem, the proof, the ask — then builds one focused slide at a time.",
    example: {
      kind: "deck",
      title: "Wholesale expansion pitch — Ember & Oak",
      caption: "Three slides, one argument. Built from a single line.",
    },
    steps: [
      { heading: "State your argument", body: "“Pitch our wholesale expansion — the win, the numbers, the ask.” The story comes before the slides." },
      { heading: "Review the arc", body: "Each slide makes one point. Speaker notes say what the slide can't." },
      { heading: "Fix the weak slides", body: "“The traction slide feels thin — lead with the wholesale number.” Targeted edits, no regeneration roulette." },
    ],
    compare: {
      chatbot: "Generates a wall of bullets you still have to turn into slides.",
      trove: "Builds the slide narrative and refines it slide by slide until it sounds like you.",
    },
    faqs: [
      { q: "Can I export to PowerPoint?", a: "Yes — decks export to PPTX, ready to present or restyle in your own template." },
      { q: "Does it just make bullet slides?", a: "No. Every deck starts with the narrative arc, and each slide carries one idea with a headline that makes the point." },
      { q: "Can I change a single slide?", a: "Yes — point at the slide that's weak and tell Trove what's wrong with it. The rest of the deck stays untouched." },
      { q: "What decks is it best for?", a: "Pitch decks, board updates, sales narratives, and internal proposals — anywhere the story matters more than the template." },
      { q: "Is it free to try?", a: "Yes — 200 free credits a month, no card. Enough to build a full deck and decide if it fits." },
    ],
    cta: "Make my deck",
  },
  {
    slug: "ai-document-generator",
    title: "AI Document Generator — Drafts With Structure",
    description:
      "Trove's AI document generator drafts memos, reports, and proposals with real structure — then revises in place as you redirect it. Exports to DOCX.",
    h1: "The AI document generator that drafts like a colleague",
    standfirst:
      "Point up front, sections that earn their place, numbers checked against what you gave it. Then you review, redirect, and tighten — in chat, in place.",
    example: {
      kind: "doc",
      title: "Q3 investor update — Ember & Oak",
      caption: "One page, honest about margins. Built from a single line.",
    },
    steps: [
      { heading: "Brief it", body: "“Draft our Q3 investor update — lead with the wholesale win, honest about margins.”" },
      { heading: "Redirect it", body: "“Shorter intro, harder-nosed risks section.” The document updates in place." },
      { heading: "Send it", body: "Export to DOCX or Markdown — formatting survives the trip." },
    ],
    compare: {
      chatbot: "A wall of text you copy into a doc and reformat yourself.",
      trove: "A structured document that revises in place and exports as a real file.",
    },
    faqs: [
      { q: "What can it write?", a: "Memos, reports, proposals, briefs, plans, and updates — anything with a structure and an audience." },
      { q: "Will it invent numbers?", a: "It works from the figures you give it, flags what's missing, and says when a claim needs a source. A draft that invents metrics is worse than no draft." },
      { q: "Can it match my voice?", a: "Yes — tell it the tone you want, or paste a sample. Redirect anytime: “more direct, less corporate.”" },
      { q: "What formats can I export?", a: "DOCX for the team, Markdown for repos and docs sites. Headings, lists, and formatting carry over." },
      { q: "Is it free to try?", a: "Yes — 200 free credits a month, no card required." },
    ],
    cta: "Draft my document",
  },
  {
    slug: "ai-spreadsheet-generator",
    title: "AI Spreadsheet Generator — Models With Math That Checks Out",
    description:
      "Trove's AI spreadsheet generator builds working models with real formulas, visible workings, and automatic flags — not numbers typed into a grid.",
    h1: "The AI spreadsheet generator with real formulas",
    standfirst:
      "A spreadsheet is only useful if the formulas are right. Trove builds sheets as working models — inputs, computed cells, totals that reconcile — and shows its workings.",
    example: {
      kind: "sheet",
      title: "Wholesale pricing model — Ember & Oak",
      caption: "Margin math with a visible formula bar and automatic flags under 55%.",
    },
    steps: [
      { heading: "Describe the model", body: "“Model wholesale pricing — margins at 12oz and 5lb, flag anything under 55%.”" },
      { heading: "Audit the math", body: "The formula bar shows exactly how each cell is derived. Change an input and watch it flow through." },
      { heading: "Stress it", body: "“What if green coffee rises 10%?” — the model updates and stays consistent." },
    ],
    compare: {
      chatbot: "Types numbers into a grid that break the moment you change one.",
      trove: "Builds a working model where formulas, totals, and flags stay consistent.",
    },
    faqs: [
      { q: "Are the formulas real?", a: "Yes — margins, totals, and projections are computed from inputs, and the formula bar shows the derivation for every computed cell." },
      { q: "Can I open it in Excel?", a: "Yes — export to CSV for Excel or Google Sheets. The structure and values carry over cleanly." },
      { q: "What models does it handle?", a: "Pricing models, budgets, trackers, forecasts, and comparisons — anything where the math has to reconcile." },
      { q: "Can it flag problems?", a: "Set a floor — a margin target, a budget cap — and the sheet calls out the rows that breach it." },
      { q: "Is it free to try?", a: "Yes — 200 free credits a month, no card required." },
    ],
    cta: "Build my spreadsheet",
  },
  {
    slug: "ai-agents",
    title: "AI Agents — Hire Specialists, Not Chatbots",
    description:
      "Trove's Tros are AI agents with real roles: research, design, finance, sales, and more. Brief one like a colleague — it plans, asks, uses your apps, and hands back files.",
    h1: "AI agents you brief like colleagues",
    standfirst:
      "A Tro is a specialist with a job: it plans the work, asks when it's unsure, uses your connected apps, and saves real artifacts to its library. Ten of them, ready to hire.",
    example: {
      kind: "crew",
      title: "Meet the Tros",
      caption: "Ten specialists, one workspace. Research, design, finance, sales, support, and more.",
    },
    steps: [
      { heading: "Hire one", body: "Pick the specialist for the job — Scout for research, Zara for finance, Leo for sales." },
      { heading: "Brief it", body: "Describe the work like you would to a colleague. The Tro plans it and asks before guessing." },
      { heading: "Get the file", body: "The work lands as a real artifact in the Tro's library — briefs, models, designs." },
    ],
    compare: {
      chatbot: "Forgets your brief the moment the chat ends; you re-explain everything next time.",
      trove: "Each Tro keeps its role, instructions, and workspace — brief once, reuse forever.",
    },
    faqs: [
      { q: "What can a Tro actually do?", a: "Research, writing, analysis, design direction, finance modeling, sales outreach drafts, and support — each Tro specializes, and all of them can use your connected apps." },
      { q: "How are Tros different from custom GPTs?", a: "Tros ask approval before judgment calls, use 4,000+ connected apps with real data, and save their work as files you keep — not just chat answers." },
      { q: "Do they remember context?", a: "Yes — a Tro's role, instructions, and workspace persist across sessions. Open it next week and it still knows the brief." },
      { q: "Can I control what they do?", a: "Approval cards pause the Tro at judgment calls. Nothing ships without you." },
      { q: "Is it free to try?", a: "Yes — 200 free credits a month, no card. Enough to hire a Tro and put it to work." },
    ],
    cta: "Hire a Tro",
  },
  {
    slug: "ai-research",
    title: "AI Research — Briefs You Can Build On",
    description:
      "Trove's AI research produces decision-oriented briefs with sources attached — findings organized by the call you need to make, saved to your workspace.",
    h1: "AI research that ends in a decision",
    standfirst:
      "Not a link dump — a brief. Findings organized by the question you asked, sources attached to every claim, and a clear line between evidence and inference.",
    example: {
      kind: "research",
      title: "Specialty coffee market scan — Ember & Oak",
      caption: "Three findings, six sources, one clear inference. Built from a single line.",
    },
    steps: [
      { heading: "Ask the question", body: "“Who owns wholesale, and where's the pricing gap for a roastery our size?”" },
      { heading: "Get the brief", body: "Findings organized by decision, each with its sources. Inference labeled as inference." },
      { heading: "Build on it", body: "The brief lives in your workspace — next month's pricing memo cites this month's scan." },
    ],
    compare: {
      chatbot: "A summary you can't verify and can't find next week.",
      trove: "A sourced brief saved to your workspace that future work can cite.",
    },
    faqs: [
      { q: "Can I check the sources?", a: "Yes — claims link to where they came from, so you can verify what matters and know what's inference." },
      { q: "What can it research?", a: "Market scans, competitor teardowns, pricing landscapes, and decision memos — anything where the answer has to be checkable." },
      { q: "Does the research persist?", a: "Yes — briefs are saved in your workspace, so later documents and models can build on them instead of starting over." },
      { q: "How is this different from search?", a: "Search gives you links. Trove reads, synthesizes, and organizes by the decision you need to make." },
      { q: "Is it free to try?", a: "Yes — 200 free credits a month, no card required." },
    ],
    cta: "Start researching",
  },
];

export function seoPageBySlug(slug: string): SeoPage | undefined {
  return SEO_PAGES.find((p) => p.slug === slug);
}

export function seoFaqJsonLd(page: SeoPage): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  });
}
