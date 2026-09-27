"use client";

// RESTORE MARKER - will be fixed
export function useChatThread() {
  return {
    turns: [] as { id: number; role: "user" | "model"; text: string }[],
    busy: false,
    error: null as string | null,
    setError: (_: string | null) => {},
    send: (_text: string, _files?: unknown) => {},
    stop: () => {},
    retry: () => {},
    regenerate: () => {},
    clear: () => {},
    bottom: { current: null } as React.RefObject<HTMLDivElement | null>,
    reset: () => {},
  };
}
