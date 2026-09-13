"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, ArrowRight, Globe2, FileText, Bot, Code2, Check, Sparkles, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const LANES = [
  { id: "site", label: "Websites", icon: Globe2, placeholder: "A thoughtful website for my next big idea…", example: "Build a responsive portfolio for an independent designer with a project gallery, about section, and contact form.", file: "portfolio.html", type: "Website", title: "A little more considered.", description: "An independent design studio shaping brands, spaces, and digital experiences.", tags: ["Brand strategy", "Digital design", "Art direction"] },
  { id: "docs", label: "Documents", icon: FileText, placeholder: "A clear, compelling proposal for my next project…", example: "Write a six-week brand design proposal with scope, milestones, deliverables, and a budget table.", file: "project-proposal.docx", type: "Document", title: "Good work starts with a clear plan.", description: "A six-week engagement. One shared direction. Every detail, accounted for.", tags: ["Discover", "Design", "Deliver"] },
  { id: "agents", label: "Agents", icon: Bot, placeholder: "An assistant that knows my business inside out…", example: "Help me create a support agent with instructions for answering pricing questions, identifying missing information, and escalating to a human.", file: "support-agent.md", type: "Agent brief", title: "Make room for your best work.", description: "A focused assistant with clear instructions, thoughtful answers, and a human handoff.", tags: ["Understand", "Find an answer", "Escalate"] },
  { id: "code", label: "Code", icon: Code2, placeholder: "A useful tool, built with clean, readable code…", example: "Write a TypeScript CSV parser with quoted-field handling, helpful error messages, and unit tests.", file: "parse-csv.ts", type: "Code", title: "Small tools. Real possibilities.", description: "Readable TypeScript, thoughtful edge cases, and tests that explain how it works.", tags: ["TypeScript", "Documented", "Testable"] },
] as const;

export function Hero({ freeCredits }: { freeCredits: number }) {
  const router = useRouter();
  const [selected, setSelected] = useState(0);
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const lane = LANES[selected];

  function go() {
    if (!value.trim() || pending) return;
    setPending(true);
    router.push(`${lane.id === "site" ? "/websites" : "/chat"}?q=${encodeURIComponent(value.trim())}`);
  }

  return (
    <section className="premium-hero" aria-labelledby="hero-title">
      <div className="premium-hero-grid">
        <div className="premium-intro">
          <p className="premium-eyebrow nx-rise"><span /> YOUR IDEAS. IN GOOD HANDS.</p>
          <h1 id="hero-title" className="premium-title nx-rise-big">Big ideas.<br />Beautifully <em>made.</em></h1>
          <p className="premium-description nx-rise">A workspace for the work you imagine. Turn a few words into websites, documents, and useful tools you can make your own.</p>
          <div className="premium-prompt nx-rise">
            <div className="premium-lanes" role="group" aria-label="What would you like to create?">
              {LANES.map((item, index) => (
                <button key={item.id} type="button" aria-pressed={selected === index} onClick={() => setSelected(index)} className={cn("premium-lane", selected === index && "is-selected")}><item.icon size={15} />{item.label}</button>
              ))}
            </div>
            <form onSubmit={(event) => { event.preventDefault(); go(); }} className="premium-composer composer" aria-busy={pending}>
              <label htmlFor="hero-idea" className="sr-only">Describe what you want to create</label>
              <textarea ref={input} id="hero-idea" maxLength={2000} rows={3} value={value} disabled={pending} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); go(); } }} placeholder={lane.placeholder} />
              <div className="premium-composer-footer"><span><Sparkles size={14} /> A little inspiration goes a long way</span><button className="premium-create" type="submit" disabled={!value.trim() || pending} aria-label={pending ? "Opening workspace" : "Create your project"}>{pending ? "Opening…" : "Create"}<ArrowUpRight size={18} /></button></div>
            </form>
            <button className="premium-example" type="button" onClick={() => { setValue(lane.example); input.current?.focus(); }}><Plus size={14} />Try a {lane.label === "Agents" ? "support agent" : lane.label === "Code" ? "CSV parser" : lane.label === "Documents" ? "project proposal" : "designer portfolio"} <ArrowRight size={13} /></button>
          </div>
          <p className="premium-free"><Check size={14} /> Free to start <span>·</span> {freeCredits.toLocaleString("en-US")} monthly credits <span>·</span> No card required</p>
        </div>
        <div className="premium-showcase nx-rise" aria-label={`${lane.type} example preview`}>
          <div className="premium-showcase-label"><span>FROM THOUGHT TO THING</span><span>0{selected + 1} / 04</span></div>
          <div className="premium-preview-window">
            <div className="premium-window-bar"><div className="premium-window-dots" aria-hidden="true"><i /><i /><i /></div><span>{lane.file}</span><lane.icon size={14} /></div>
            <div key={lane.id} className={cn("premium-preview-content", `preview-${lane.id}`)}>
              <div className="premium-preview-brand"><span>FORM<span className="premium-brand-dot">®</span></span><span>{lane.type} / EXAMPLE</span></div>
              <div className="premium-preview-body"><p className="premium-preview-kicker">THOUGHTFULLY PUT TOGETHER</p><h2>{lane.title}</h2><p>{lane.description}</p></div>
              {lane.id === "code" ? <pre className="premium-code"><code>{'export function parseCSV(input: string) {\n  const rows: string[][] = [];\n  // Every detail has a purpose.\n  return rows;\n}'}</code></pre> : <div className="premium-preview-tags">{lane.tags.map((tag, index) => <span key={tag}><span>0{index + 1}</span>{tag}<ArrowUpRight size={13} /></span>)}</div>}
              <div className="premium-preview-foot"><span>Made with intention.</span><ArrowUpRight size={24} /></div>
            </div>
          </div>
          <div className="premium-file-note"><span className="premium-file-icon"><FileText size={20} /></span><div><strong>Your next idea, made tangible.</strong><p>Create it. Refine it. Keep the file.</p></div><span className="premium-note-check"><Check size={15} /></span></div>
          <p className="premium-preview-caption">An illustrative example. Your creation starts with your prompt.</p>
        </div>
      </div>
      <div className="premium-hero-bottom"><span>ONE WORKSPACE. ENDLESS POSSIBILITIES.</span><a href="#capabilities">Explore what you can make <ArrowRight size={15} /></a></div>
    </section>
  );
}
