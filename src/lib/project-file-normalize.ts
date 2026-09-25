export function normalizeGeneratedProjectContent(
  path: string,
  value: string,
): string {
  const content = String(value ?? "");
  const lower = path.toLowerCase();

  // Markdown documents may intentionally consist entirely of a fenced example.
  if (/\.(?:md|mdx|txt)$/i.test(lower)) return content;

  const match = content.match(
    /^\s*```(?:[a-z0-9_+.-]+)?\s*\n([\s\S]*?)\n```\s*$/i,
  );
  if (!match) return content;

  return match[1].replace(/\s+$/, "") + "\n";
}

export function inferFencedProjectEdit(text: string): {
  path: string;
  content: string;
} | null {
  const blocks = [
    ...String(text || "").matchAll(
      /```([a-z0-9_+.-]*)\s*\n([\s\S]*?)\n```/gi,
    ),
  ];
  if (blocks.length !== 1) return null;

  const lang = String(blocks[0][1] || "").toLowerCase();
  const body = String(blocks[0][2] || "");
  if (!body.trim()) return null;

  const before = String(text || "").slice(
    Math.max(0, (blocks[0].index || 0) - 260),
    blocks[0].index || 0,
  );
  const named = before.match(
    /(?:save(?:\s+it)?\s+as|file|filename|path)\s*[`"']?([a-z0-9_./-]+\.[a-z0-9]+)[`"']?/i,
  );

  const inferred =
    named?.[1] ||
    ({
      html: "index.html",
      htm: "index.html",
      css: "src/styles.css",
      javascript: "src/main.js",
      js: "src/main.js",
      jsx: "src/App.jsx",
      typescript: "src/main.ts",
      ts: "src/main.ts",
      tsx: "src/App.tsx",
      json: "package.json",
    } as Record<string, string>)[lang];

  if (!inferred) return null;

  return {
    path: inferred.replace(/^\/+/, ""),
    content: normalizeGeneratedProjectContent(inferred, body),
  };
}
