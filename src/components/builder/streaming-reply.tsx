"use client";

import { StreamingText, sourcesFromSearch } from "@/components/chat/streaming-text";

/**
 * AI builder streaming reply — live caret while tokens arrive,
 * sources + follow-ups when the step finishes.
 */
export function BuilderStreamingReply({
  text,
  live = true,
  searchSources,
  followUps,
  onFollowUp,
}: {
  text: string;
  live?: boolean;
  searchSources?: { title: string; url: string; domain?: string }[];
  followUps?: string[];
  onFollowUp?: (prompt: string) => void;
  className?: string;
}) {
  if (!text && !live) return null;
  return (
    <StreamingText
      text={text}
      live={live}
      sources={sourcesFromSearch(searchSources)}
      followUps={followUps}
      labels={{
        sources: searchSources?.length
          ? `${searchSources.length} sources`
          : "Sources",
        followUps: "Next steps",
      }}
      onFollowUp={(prompt) => onFollowUp?.(prompt)}
    />
  );
}

export default BuilderStreamingReply;
