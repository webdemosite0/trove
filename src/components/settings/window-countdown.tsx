"use client";

import { useEffect, useState } from "react";

function formatRemaining(ms: number) {
  if (ms <= 0) return "now";
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function WindowCountdown({
  resetsAtIso,
  exhausted,
}: {
  resetsAtIso: string;
  exhausted: boolean;
}) {
  const target = new Date(resetsAtIso).getTime();
  const [left, setLeft] = useState(() => Math.max(0, target - Date.now()));

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!exhausted && left <= 0) {
    return <span className="tabular-nums text-ink-3">Window open</span>;
  }

  return (
    <span className="tabular-nums">
      {exhausted ? "Opens in " : "Oldest usage ages out in "}
      <strong className="text-ink">{formatRemaining(left)}</strong>
    </span>
  );
}
