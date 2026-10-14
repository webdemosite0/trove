"use client";

import { useEffect } from "react";

const SRC = "https://www.thunderbolt.com/gateway/api/v1/thunderbolt-ui/embed.js";

// The Thunderbolt chat bubble belongs on the public pages only. On sign-up,
// onboarding and in the app it sat on top of buttons (it's a fixed iframe with
// the highest z-index). The widget adds one empty <div> to <body> (its UI lives
// in a closed shadow root), so we remember that element and hide it whenever no
// public page is showing — client-side navigation would otherwise keep it on screen.
let host: HTMLElement | null = null;
let loading = false;
let mounted = 0;

function setVisible(visible: boolean) {
  if (host) host.style.display = visible ? "" : "none";
}

export function ChatBubble() {
  useEffect(() => {
    mounted += 1;
    if (host) {
      setVisible(true);
    } else if (!loading) {
      loading = true;
      const before = new Set(Array.from(document.body.children));
      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const node of Array.from(m.addedNodes)) {
            // The widget's host: a new, empty <div> straight under <body>.
            if (node instanceof HTMLDivElement && !before.has(node) && !node.id && !node.className && node.innerHTML === "") {
              host = node;
              observer.disconnect();
              setVisible(mounted > 0);
              return;
            }
          }
        }
      });
      observer.observe(document.body, { childList: true });
      setTimeout(() => observer.disconnect(), 30_000);
      const script = document.createElement("script");
      script.src = SRC;
      script.defer = true;
      document.head.appendChild(script);
    }
    return () => {
      mounted -= 1;
      if (mounted <= 0) setVisible(false);
    };
  }, []);
  return null;
}
