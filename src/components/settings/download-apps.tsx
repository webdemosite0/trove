"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { SiAndroid, SiApple } from "react-icons/si";
import {
  FiCheck,
  FiDownload,
  FiExternalLink,
  FiFolder,
  FiMonitor,
  FiSmartphone,
} from "@/components/ui/icons";
import { Panel } from "@/components/settings/panel";
import { cn } from "@/lib/utils";

type PlatformId = "windows" | "macos" | "linux" | "android" | "ios";
type InstallChoice = { outcome: "accepted" | "dismissed"; platform: string };

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
}

type NativeDownloads = {
  available?: boolean;
  tag?: string;
  releaseUrl?: string;
  downloads?: {
    windows?: string | null;
    macos?: string | null;
    linux?: string | null;
  };
};

type Platform = {
  id: PlatformId;
  name: string;
  eyebrow: string;
  description: string;
  Icon: ComponentType<{ size?: number | string; className?: string }>;
  requirements: string;
  steps: string[];
  nativeExtension?: ".exe" | ".dmg" | ".AppImage";
};

const PLATFORMS: Platform[] = [
  {
    id: "windows",
    name: "Windows",
    eyebrow: "Native desktop",
    description:
      "Download the Trove installer with native local-project folder access.",
    Icon: FiMonitor,
    requirements: "Windows 10/11 · x64",
    nativeExtension: ".exe",
    steps: [
      "Download the Trove .exe installer.",
      "Open the installer and choose where Trove should be installed.",
      "Launch Trove, sign in, then use Project → Open local folder for native project access.",
    ],
  },
  {
    id: "macos",
    name: "macOS",
    eyebrow: "Native desktop",
    description:
      "A native Trove app with local project access and a dedicated workspace window.",
    Icon: SiApple,
    requirements: "macOS · Apple Silicon + Intel",
    nativeExtension: ".dmg",
    steps: [
      "Download the Trove .dmg.",
      "Open it and move Trove into Applications.",
      "Launch Trove and choose a local project from the chat Project menu.",
    ],
  },
  {
    id: "linux",
    name: "Linux",
    eyebrow: "Native desktop",
    description:
      "Run Trove as an AppImage with the same native project bridge.",
    Icon: FiMonitor,
    requirements: "Linux · x64",
    nativeExtension: ".AppImage",
    steps: [
      "Download the Trove AppImage.",
      "Mark it executable if your desktop does not do that automatically.",
      "Launch Trove and open a local project from chat.",
    ],
  },
  {
    id: "android",
    name: "Android",
    eyebrow: "Installable web app",
    description:
      "Install Trove from Chrome and launch it full-screen from your home screen.",
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
    eyebrow: "Installable web app",
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
  if (/linux/.test(platform) || /linux/.test(ua)) return "linux";
  return null;
}

function nativeUrl(native: NativeDownloads | null, platform: PlatformId) {
  if (!native?.downloads) return null;
  if (platform === "windows") return native.downloads.windows ?? null;
  if (platform === "macos") return native.downloads.macos ?? null;
  if (platform === "linux") return native.downloads.linux ?? null;
  return null;
}

export function DownloadApps() {
  const [current, setCurrent] = useState<PlatformId | null>(null);
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [selected, setSelected] = useState<PlatformId | null>(null);
  const [installed, setInstalled] = useState(false);
  const [native, setNative] = useState<NativeDownloads | null>(null);

  useEffect(() => {
    setCurrent(detectPlatform());

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => null);
    }

    void fetch("/api/downloads/native", { cache: "no-store" })
      .then(async (res) => (res.ok ? ((await res.json()) as NativeDownloads) : null))
      .then(setNative)
      .catch(() => setNative(null));

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

    const direct = nativeUrl(native, platform.id);
    if (direct) {
      window.location.assign(direct);
      return;
    }

    if (
      prompt &&
      platform.id === current &&
      (platform.id === "android" || platform.id === "windows" || platform.id === "macos")
    ) {
      await prompt.prompt();
      const choice = await prompt.userChoice.catch(() => null);
      if (choice?.outcome === "accepted") {
        setInstalled(true);
        setPrompt(null);
      }
    }
  }

  const recommendedNative = recommended ? nativeUrl(native, recommended.id) : null;

  return (
    <div className="space-y-5 pb-8">
      <section className="relative overflow-hidden rounded-[26px] border border-line-strong bg-raised p-5 shadow-[var(--elev)] sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 0% 0%, color-mix(in oklab, var(--color-violet) 22%, transparent), transparent 42%), radial-gradient(circle at 100% 0%, color-mix(in oklab, #38bdf8 18%, transparent), transparent 38%)",
          }}
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-[620px]">
            <span className="inline-flex rounded-full border border-accent/20 bg-accent-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
              Download Trove
            </span>
            <h2 className="mt-3 text-[24px] font-semibold tracking-[-0.03em] text-ink sm:text-[28px]">
              Native projects on your computer.
            </h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-3 sm:text-[14px]">
              Desktop Trove can open local code folders, write AI file edits inside the selected project, and run approved build/test/lint tasks with native confirmation.
            </p>
          </div>

          {recommended ? (
            <button
              type="button"
              onClick={() => void install(recommended)}
              className="btn-grad inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:-translate-y-0.5"
            >
              {installed ? <FiCheck size={16} /> : <FiDownload size={16} />}
              {recommendedNative
                ? `Download ${recommended.nativeExtension ?? "app"}`
                : installed
                  ? "Installed"
                  : `Install for ${recommended.name}`}
            </button>
          ) : null}
        </div>
      </section>

      <Panel
        title="Choose your platform"
        description={
          native?.available
            ? `Native desktop release ${native.tag || ""} is available. Mobile currently installs as a web app.`
            : "Native desktop installers are being built. Browser installation remains available while the release finishes."
        }
        className="border-line-strong bg-raised shadow-[var(--elev)]"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {PLATFORMS.map((platform) => {
            const active = selected === platform.id;
            const isCurrent = current === platform.id;
            const direct = nativeUrl(native, platform.id);

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
                    {direct
                      ? `Download ${platform.nativeExtension}`
                      : platform.nativeExtension
                        ? "Native build pending"
                        : "Install steps"}
                    {direct ? <FiDownload size={12} /> : <FiExternalLink size={12} />}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {native?.releaseUrl ? (
          <a
            href={native.releaseUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-accent hover:underline"
          >
            View desktop release
            <FiExternalLink size={12} />
          </a>
        ) : null}
      </Panel>

      {selected ? (
        <Panel
          title={`Install on ${PLATFORMS.find((platform) => platform.id === selected)?.name ?? "your device"}`}
          description={
            nativeUrl(native, selected)
              ? "Download the native build above. The first unsigned preview build may show an operating-system security warning until code signing is configured."
              : selected === "ios"
                ? "iOS requires Safari’s Add to Home Screen flow until a signed App Store build is configured."
                : selected === "android"
                  ? "Android currently uses the installable web app while the signed APK/Play Store build is prepared."
                  : "The native release is still building; use the browser install flow in the meantime."
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
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
            <FiFolder size={16} />
          </span>
          <div>
            <p className="text-[12.5px] font-semibold text-ink">Native local projects</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-4">
              The downloaded desktop app lets Trove work inside folders you explicitly choose without exposing arbitrary filesystem paths to the web page.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-line bg-canvas/70 p-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-300">
            <FiSmartphone size={16} />
          </span>
          <div>
            <p className="text-[12.5px] font-semibold text-ink">Mobile install</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-4">
              Android and iPhone/iPad remain installable today; signed native mobile packages require store/signing credentials.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
