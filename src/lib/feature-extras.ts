/**
 * Per-feature extras: example prompt, workflow steps, FAQ.
 * Merged into the FEATURES registry by the feature page template.
 */

export interface FeatureExtras {
  prompt: string;
  workflow: { label: string; detail: string }[];
  faqs: { q: string; a: string }[];
}

export const FEATURE_EXTRAS: Record<string, FeatureExtras> = {
  websites: {
    prompt: "“Create a premium SaaS website for an AI analytics company.”",
    workflow: [
      { label: "Planning", detail: "Trove reads your brief and plans the structure." },
      { label: "Building", detail: "Design, copy, and layout come together in seconds." },
      { label: "Preview", detail: "A real, clickable page renders — scroll it, click it." },
      { label: "Editing", detail: "“Make the hero bolder” — iterate in plain language." },
      { label: "Publishing", detail: "Ship to yourname.troveai.site or export the HTML." },
    ],
    faqs: [
      { q: "Do I need to know how to code?", a: "No. Describe the site; Trove handles layout, styling, and copy. If you code, export the HTML and take it further." },
      { q: "Can I use my own domain?", a: "Publish instantly to yourname.troveai.site, or export the HTML and host it anywhere." },
      { q: "What happens after publishing?", a: "The site stays a living project — ask for changes anytime and republish." },
    ],
  },
  documents: {
    prompt: "“Draft our Q3 investor update — lead with the wholesale win, honest about margins.”",
    workflow: [
      { label: "Brief", detail: "State the audience and the point — the doc is built around it." },
      { label: "Draft", detail: "A structured draft with real sections, not a wall of text." },
      { label: "Revise", detail: "“Shorter intro, harder-nosed risks.” It updates in place." },
      { label: "Export", detail: "Download as DOCX or Markdown — formatting survives." },
    ],
    faqs: [
      { q: "Will it invent numbers?", a: "It works from the figures you give it and flags what's missing. A draft that invents metrics is worse than no draft." },
      { q: "Can it match my voice?", a: "Yes — describe the tone or paste a sample. Redirect anytime." },
      { q: "What can I export?", a: "DOCX for the team, Markdown for repos and docs sites." },
    ],
  },
  spreadsheets: {
    prompt: "“Model wholesale pricing — margins at 12oz and 5lb, flag anything under 55%.”",
    workflow: [
      { label: "Describe", detail: "Say what the model should compute and what to flag." },
      { label: "Build", detail: "A working model with real formulas, not typed-in numbers." },
      { label: "Audit", detail: "The formula bar shows exactly how each cell is derived." },
      { label: "Stress-test", detail: "“What if costs rise 10%?” — change inputs, watch it flow through." },
    ],
    faqs: [
      { q: "Are the formulas real?", a: "Yes — margins and totals are computed from inputs, with the derivation visible for every computed cell." },
      { q: "Can I open it in Excel?", a: "Export to CSV for Excel or Google Sheets. Structure and values carry over." },
      { q: "Can it flag problems?", a: "Set a floor — a margin target, a budget cap — and the sheet calls out breaches." },
    ],
  },
  presentations: {
    prompt: "“Three-slide pitch for our wholesale expansion — the win, the numbers, the ask.”",
    workflow: [
      { label: "Argument", detail: "The story comes first — problem, proof, ask." },
      { label: "Slides", detail: "One idea per slide, headline that makes the point." },
      { label: "Refine", detail: "Point at the weak slide and say what's wrong. The rest stays." },
      { label: "Export", detail: "Download as PPTX, ready to present or restyle." },
    ],
    faqs: [
      { q: "Does it just make bullet slides?", a: "No. Every deck starts with the narrative arc; each slide carries one idea with speaker notes." },
      { q: "Can I change a single slide?", a: "Yes — target the slide that's weak and the rest of the deck stays untouched." },
      { q: "What decks is it best for?", a: "Pitch decks, board updates, sales narratives, and internal proposals." },
    ],
  },
  research: {
    prompt: "“Who owns wholesale in specialty coffee, and where's the pricing gap for a roastery our size?”",
    workflow: [
      { label: "Ask", detail: "Pose the question you'd ask a good analyst." },
      { label: "Research", detail: "Trove reads widely and keeps track of every source." },
      { label: "Brief", detail: "Findings organized by decision, inference labeled as inference." },
      { label: "Cite", detail: "The brief is saved — future work cites this month's scan." },
    ],
    faqs: [
      { q: "Can I check the sources?", a: "Yes — claims link to where they came from, so you can verify what matters." },
      { q: "How is this different from search?", a: "Search gives you links. Trove reads, synthesizes, and organizes by the decision you need to make." },
      { q: "Does the research persist?", a: "Yes — briefs live in your workspace, so later documents build on them." },
    ],
  },
  tros: {
    prompt: "“Scout, research the competitive landscape. Echo, turn it into a launch narrative.”",
    workflow: [
      { label: "Hire", detail: "Pick the specialist for the job — ten roles, one workspace." },
      { label: "Brief", detail: "Describe the work like you would to a colleague." },
      { label: "Work", detail: "The Tro plans, asks when unsure, and uses your connected apps." },
      { label: "Approve", detail: "Judgment calls pause for your tap. Nothing ships without you." },
      { label: "Keep", detail: "Work lands as real artifacts in the Tro's library." },
    ],
    faqs: [
      { q: "What can a Tro actually do?", a: "Research, writing, analysis, design direction, finance modeling, sales drafts, and support — each Tro specializes." },
      { q: "Do they remember context?", a: "Yes — a Tro's role, instructions, and workspace persist across sessions." },
      { q: "How are Tros different from chatbots?", a: "They ask approval before judgment calls, use your connected apps with real data, and save work as files you keep." },
    ],
  },
  agents: {
    prompt: "“Set up a weekly scan: new competitors, pricing changes, summarized every Monday.”",
    workflow: [
      { label: "Define", detail: "Give the agent a role and instructions it always follows." },
      { label: "Brief", detail: "Describe the job in plain language." },
      { label: "Approve", detail: "It pauses at judgment calls — you stay in charge." },
      { label: "Reuse", detail: "Reopen it next week; it still knows the brief." },
    ],
    faqs: [
      { q: "How are agents different from Tros?", a: "Tros are ten ready-made specialists. Agents are custom ones you define yourself — same engine, your job description." },
      { q: "Can agents use my apps?", a: "Yes — connect your apps and agents work with real data, approval-gated." },
      { q: "Do I pay per agent?", a: "No — agents are part of the toolkit on every plan. You pay for credits used, not seats for AI." },
    ],
  },
  integrations: {
    prompt: "“Connect Gmail, then draft follow-ups for everyone I met this week.”",
    workflow: [
      { label: "Connect", detail: "Pick an app — 4,000+ available." },
      { label: "Grant", detail: "Approve scoped access through the app's official OAuth." },
      { label: "Approve", detail: "Agents read automatically; actions need your tap." },
      { label: "Revoke", detail: "One click, anytime — access ends immediately." },
    ],
    faqs: [
      { q: "Is my password shared with Trove?", a: "Never. Every connection uses the provider's official OAuth flow." },
      { q: "What can agents do with my data?", a: "Read automatically; send, post, or file only with your approval." },
      { q: "How do I disconnect an app?", a: "One click on the integrations page. The agent loses access immediately." },
    ],
  },
};
