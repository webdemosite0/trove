"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * Trove-styled markdown for assistant replies — headings, lists, tables,
 * code and quotes rendered as proper typography instead of raw syntax.
 * GFM (tables, strikethrough, task lists) enabled. Raw HTML is not rendered.
 */
export const Markdown = memo(function Markdown({
  text,
  className,
  compact,
}: {
  text: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "trove-md text-[15px] leading-[1.75] text-ink",
        compact && "text-[14px] leading-[1.7]",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-accent underline decoration-accent/30 underline-offset-[3px] transition-colors hover:decoration-accent"
            >
              {children}
            </a>
          ),
          h1: ({ children }) => (
            <h1 className="mb-2 mt-5 text-[19px] font-bold tracking-tight text-ink first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-1.5 mt-5 text-[17px] font-bold tracking-tight text-ink first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1.5 mt-4 text-[15.5px] font-semibold tracking-tight text-ink first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="mb-1 mt-3 text-[14.5px] font-semibold text-ink first:mt-0">
              {children}
            </h4>
          ),
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1.5 pl-5 marker:text-ink-4 last:mb-0">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1.5 pl-5 marker:font-medium marker:text-ink-3 last:mb-0">
              {children}
            </ol>
          ),
          li: ({ children, className: liClass, ...props }) => (
            <li
              className={cn(liClass?.includes("task-list-item") && "list-none pl-0", liClass)}
              {...props}
            >
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-3 border-l-2 border-accent/40 bg-accent/[0.06] py-2 pl-4 pr-3 text-ink-2 last:mb-0 [&>p]:mb-1 [&>p]:last:mb-0">
              {children}
            </blockquote>
          ),
          code: ({ className: codeClass, children, ...props }) => {
            const inline = !codeClass;
            return inline ? (
              <code
                className="rounded-md bg-sunk px-1.5 py-0.5 font-mono text-[0.86em] text-ink"
                {...props}
              >
                {children}
              </code>
            ) : (
              <code className={cn("font-mono text-[12.5px] leading-relaxed", codeClass)} {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="mb-3 overflow-x-auto rounded-xl border border-line bg-sunk/70 p-3.5 last:mb-0">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="mb-3 overflow-x-auto rounded-xl border border-line last:mb-0">
              <table className="w-full border-collapse text-[13.5px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-sunk/60">{children}</thead>,
          th: ({ children }) => (
            <th className="border-b border-line px-3 py-2 text-left font-semibold text-ink">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-line/60 px-3 py-2 align-top text-ink-2 last:border-b-0">
              {children}
            </td>
          ),
          hr: () => <hr className="my-5 border-line" />,
          strong: ({ children }) => (
            <strong className="font-semibold text-ink">{children}</strong>
          ),
          input: (props) => (
            <input
              {...props}
              disabled
              className="mr-1.5 size-3.5 translate-y-[1px] accent-violet-500"
            />
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
});
