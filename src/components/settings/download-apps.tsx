"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { SiAndroid, SiApple } from "react-icons/si";
import {
  FiCheck,
  FiDownload,
  FiExternalLink,
  FiMonitor,
  FiSmartphone,
} from "@/components/ui/icons";
import { Panel } from "@/components/settings/panel";
import { cn } from "@/lib/utils";

type PlatformId = "windows" | "macos" | "android" | "ios";
type InstallChoice = { outcome: "accepted" | "dismissed"; platform: string };

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
}

type Platform = {
  id: PlatformId;
  name: string;
  eyebrow: string;
  description: string;
  Icon: ComponentType<{ size?: number | string; className?: string }>;
  requirements: string;
  steps: string[];
};

const PLATFORMS: Platform[] = [
  {
    id: "windows",
    name: "Windows",
    eyebrow: "Desktop app",
    description: "Pin Trove to Start or the taskbar and launch it in its own app window.",
    Icon: FiMonitor,
    requirements: "Windows 10/11 · Edge or Chrome",
    steps: [
      "Open Trove in Microsoft Edge or Google Chrome.",
      "Choose the Install app icon in the address bar, or open the browser menu and choose Apps → Install Trove.",
      "Confirm Install. Trove will then open like a normal desktop app.",
    ],
  },
  {
    id: "macos",
    name: "macOS",
    eyebrow: "Desktop app",
    description: "Keep Trove in the Dock and run it without browser tabs around your workspace.",
    Icon: SiApple,
    requirements: "macOS · Safari, Edge, or Chrome",
    steps: [
      "Open Trove in Safari, Edge, or Chrome.",
      "In Safari choose File → Add to Dock. In Chrome or Edge choose the Install app action in the address bar.",
      "Confirm the install and launch Trove from the Dock or Applications.",
    ],
  },
  {
    id: "android",
    name: "Android",
    eyebrow: "Mobile app",
    description: "Install Trove from Chrome and launch it full-screen from your home screen.",
    Icon: SiAndroid,
    requirements: "Android · Chrome recommended",
    steps: [
      "Open Trove in Chrome on your Android phone or tablet.",
      "Open the three-dot menu and choose Add to Home screen or Install app.",
      "Tap Install to add Trove to your launcher.",
    ],
  },
  {
    id: "ios",
    name: "iPhone & iPad",
    eyebrow: "Mobile app",
    description: "Add Trove to your iPhone or iPad Home Screen from Safari.",
    Icon: SiApple,
    requirements: "iOS / iPadOS · Safari",
    steps: [
      "Open Trove in Safari on your iPhone or iPad.",
      "Tap the Share button in Safari.",
      "Choose Add to Home Screen, then tap Add.",
    ],
  },
];

function detectPlatform(): PlatformId | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent.toLowerCase();
  const platform = (navigator.platform || "").toLowerCase();

  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  if (/win/.test(platform) || /windows/.test(ua)) return "windows";
  if (/mac/.test(platform) || /macintosh|mac os x/.test(ua)) return "macos";
  return null;
}

export function DownloadApps() {
  const [current, setCurrent] = useState<PlatformId | null>(null);
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [selected, setSelected] = useState<PlatformId | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setCurrent(detectPlatform());

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => null);
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const recommended = useMemo(
    () => PLATFORMS.find((platform) => platform.id === current) ?? null,
    [current],
  );

  async function install(platform: Platform) {
    setSelected(platform.id);

    if (
      prompt &&
      platform.id === current &&
      platform.id !== "ios"
    ) {
      await prompt.prompt();
      const choice = await prompt.userChoice.catch(() => null);
      if (choice?.outcome === "accepted") {
        setInstalled(true);
        setPrompt(null);
      }
    }
  }

  return (
    <div className="space-y-5 pb-8">
      <section className="relative overflow-hidden rounded-[26px] border border-line-strong bg-raised p-5 shadow-[var(--elev)] sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 0% 0%, color-mix(in oklab, var(--color-accent) 17%, transparent), transparent 42%), radial-gradient(circle at 100% 0%, color-mix(in oklab, var(--color-violet) 13%, transparent), transparent 38%)",
          }}
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-[620px]">
            <span className="inline-flex rounded-full border border-accent/20 bg-accent-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
              Download Trove
            </span>
            <h2 className="mt-3 text-[24px] font-semibold tracking-[-0.03em] text-ink sm:text-[28px]">
              Trove, without the browser chrome.
            </h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-3 sm:text-[14px]">
              Install the Trove web app on desktop or mobile. It opens in its own window,
              stays signed in, and gives you faster access to your workspace.
            </p>
          </div>

          {recommended ? (
            <button
              type="button"
              onClick={() => void install(recommended)}
              className="btn-grad inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:-translate-y-0.5"
            >
              {installed ? <FiCheck size={16} /> : <FiDownload size={16} />}
              {installed ? "Installed" : `Download for ${recommended.name}`}
            </button>
          ) : null}
        </div>
      </section>

      <Panel
        title="Choose your platform"
        description="Trove installs from the browser today, so there is no separate .exe, .dmg, or .apk to keep updated."
        className="border-line-strong bg-raised shadow-[var(--elev)]"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {PLATFORMS.map((platform) => {
            const active = selected === platform.id;
            const isCurrent = current === platform.id;

            return (
              <button
                key={platform.id}
                type="button"
                onClick={() => void install(platform)}
                className={cn(
                  "group rounded-2xl border p-4 text-left transition",
                  active
                    ? "border-accent/35 bg-accent-soft/60 shadow-[var(--sh-1)]"
                    : "border-line-strong bg-canvas hover:-translate-y-0.5 hover:border-accent/25 hover:bg-hover/70",
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-raised text-ink shadow-[var(--sh-1)]">
                    <platform.Icon size={21} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold text-ink">{platform.name}</span>
                      {isCurrent ? (
                        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-accent">
                          This device
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-4">
                      {platform.eyebrow}
                    </span>
                    <span className="mt-2 block text-[12.5px] leading-relaxed text-ink-3">
                      {platform.description}
                    </span>
                  </span>
                </div>

                <span className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
                  <span className="text-[11px] text-ink-4">{platform.requirements}</span>
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent">
                    {platform.id === "ios" || !isCurrent || !prompt ? "Install steps" : "Install now"}
                    <FiExternalLink size={12} />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </Panel>

      {selected ? (
        <Panel
          title={`Install on ${PLATFORMS.find((platform) => platform.id === selected)?.name ?? "your device"}`}
          description={
            selected === "ios"
              ? "iOS does not allow a website to trigger installation directly, so Safari’s Add to Home Screen flow is required."
              : "If your browser does not show an automatic install prompt, use these steps."
          }
          className="border-line-strong bg-raised shadow-[var(--elev)]"
        >
          <div className="rounded-2xl border border-line-strong bg-canvas p-4">
            <ol className="space-y-3">
              {PLATFORMS.find((platform) => platform.id === selected)?.steps.map((step, index) => (
                <li key={step} className="flex gap-3 text-[13px] leading-relaxed text-ink-2">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full border border-line bg-raised text-[10px] font-bold text-accent">
                    {index + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </Panel>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-2xl border border-line bg-canvas/70 p-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
            <FiMonitor size={16} />
          </span>
          <div>
            <p className="text-[12.5px] font-semibold text-ink">Desktop-like experience</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-4">
              Launch Trove from Start, the Dock, or your app launcher in a dedicated window.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-line bg-canvas/70 p-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
            <FiSmartphone size={16} />
          </span>
          <div>
            <p className="text-[12.5px] font-semibold text-ink">Home-screen access</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-4">
              Keep Trove one tap away on Android, iPhone, and iPad.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
