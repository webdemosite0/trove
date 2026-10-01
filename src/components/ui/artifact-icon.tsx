"use client";

import type { ArtifactKind } from "@/lib/artifact-block";

/**
 * Animated artifact icons — one living glyph per artifact kind.
 * Each icon loops a subtle motion that suggests what the artifact *is*:
 * a document being written, a grid computing, slides stacking, a note
 * being jotted, code being typed. Respects prefers-reduced-motion.
 */

const CSS = `
.art-ico line, .art-ico rect, .art-ico path, .art-ico circle { vector-effect: non-scaling-stroke; }
@keyframes art-draw { 0% { stroke-dashoffset: 24; } 55% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: 0; } }
@keyframes art-cell { 0%, 100% { opacity: .25; } 50% { opacity: 1; } }
@keyframes art-rise { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1.6px); } }
@keyframes art-blink { 0%, 100% { opacity: 1; } 50% { opacity: .15; } }
@keyframes art-write { 0% { stroke-dashoffset: 30; } 60% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: 0; } }
.art-doc-1 { stroke-dasharray: 24; animation: art-draw 3.2s ease-in-out infinite; }
.art-doc-2 { stroke-dasharray: 24; animation: art-draw 3.2s ease-in-out .35s infinite; }
.art-doc-3 { stroke-dasharray: 24; animation: art-draw 3.2s ease-in-out .7s infinite; }
.art-cell { animation: art-cell 2.4s ease-in-out infinite; }
.art-cell-2 { animation-delay: .3s; } .art-cell-3 { animation-delay: .6s; }
.art-cell-4 { animation-delay: .9s; } .art-cell-5 { animation-delay: 1.2s; }
.art-deck-1 { animation: art-rise 2.8s ease-in-out infinite; }
.art-deck-2 { animation: art-rise 2.8s ease-in-out .25s infinite; }
.art-deck-3 { animation: art-rise 2.8s ease-in-out .5s infinite; }
.art-note-line { stroke-dasharray: 30; animation: art-write 3s ease-in-out infinite; }
.art-code-caret { animation: art-blink 1.4s steps(2) infinite; }
@media (prefers-reduced-motion: reduce) {
  .art-ico * { animation: none !important; }
  .art-doc-1, .art-doc-2, .art-doc-3, .art-note-line { stroke-dashoffset: 0 !important; }
  .art-cell { opacity: 1 !important; }
}
`;

function DocIcon() {
  return (
    <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M5 2.5h5.5L14 6v11.5H5z" opacity=".9" />
      <path d="M10.5 2.5V6H14" opacity=".9" />
      <line className="art-doc-1" x1="7" y1="9.5" x2="12" y2="9.5" />
      <line className="art-doc-2" x1="7" y1="12" x2="12" y2="12" />
      <line className="art-doc-3" x1="7" y1="14.5" x2="10.5" y2="14.5" />
    </g>
  );
}

function SheetIcon() {
  return (
    <g>
      <rect x="2.5" y="3.5" width="14" height="12" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" opacity=".9" />
      <line x1="2.5" y1="7.5" x2="16.5" y2="7.5" stroke="currentColor" strokeWidth="1.2" opacity=".5" />
      <line x1="2.5" y1="11.5" x2="16.5" y2="11.5" stroke="currentColor" strokeWidth="1.2" opacity=".5" />
      <line x1="7.2" y1="3.5" x2="7.2" y2="15.5" stroke="currentColor" strokeWidth="1.2" opacity=".5" />
      <line x1="11.8" y1="3.5" x2="11.8" y2="15.5" stroke="currentColor" strokeWidth="1.2" opacity=".5" />
      <rect className="art-cell art-cell-1" x="8" y="8.3" width="3" height="2.4" rx=".6" fill="currentColor" />
      <rect className="art-cell art-cell-2" x="12.6" y="8.3" width="3" height="2.4" rx=".6" fill="currentColor" opacity=".6" />
      <rect className="art-cell art-cell-3" x="3.3" y="12.3" width="3" height="2.4" rx=".6" fill="currentColor" opacity=".6" />
      <rect className="art-cell art-cell-4" x="8" y="12.3" width="3" height="2.4" rx=".6" fill="currentColor" />
      <rect className="art-cell art-cell-5" x="12.6" y="12.3" width="3" height="2.4" rx=".6" fill="currentColor" opacity=".6" />
    </g>
  );
}

function DeckIcon() {
  return (
    <g fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect className="art-deck-3" x="4" y="9.5" width="12" height="7" rx="1.5" opacity=".45" />
      <rect className="art-deck-2" x="5.5" y="6.5" width="12" height="7" rx="1.5" opacity=".7" />
      <rect className="art-deck-1" x="7" y="3.5" width="12" height="7" rx="1.5" opacity="1" />
      <line x1="9.5" y1="6.2" x2="14.5" y2="6.2" strokeLinecap="round" opacity=".8" />
      <line x1="9.5" y1="8.4" x2="12.5" y2="8.4" strokeLinecap="round" opacity=".5" />
    </g>
  );
}

function NoteIcon() {
  return (
    <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path className="art-note-line" d="M4 13.5c2.5 0 2.5-2 5-2s2.5 2 5 2 2-1.5 3-1.5" opacity=".9" />
      <path d="M13.5 3.5l3 3L9 14l-3.5.5L6 11z" opacity=".9" />
    </g>
  );
}

function CodeIcon() {
  return (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 6.5L3.5 9.5 7 12.5" opacity=".9" />
      <path d="M12 6.5l3.5 3L12 12.5" opacity=".9" />
      <line className="art-code-caret" x1="9.5" y1="5.5" x2="9.5" y2="13.5" />
    </g>
  );
}

export function ArtifactIcon({
  kind,
  size = 16,
  className,
}: {
  kind: ArtifactKind;
  size?: number;
  className?: string;
}) {
  return (
    <span className={`art-ico inline-flex ${className ?? ""}`} aria-hidden>
      <style>{CSS}</style>
      <svg width={size} height={size} viewBox="0 0 19 19" fill="none">
        {kind === "doc" && <DocIcon />}
        {kind === "sheet" && <SheetIcon />}
        {kind === "deck" && <DeckIcon />}
        {kind === "note" && <NoteIcon />}
        {kind === "code" && <CodeIcon />}
      </svg>
    </span>
  );
}
