"use client";

import { FiCheck } from "@/components/ui/icons";
import { Panel } from "@/components/settings/panel";
import { THEME_OPTIONS, useTheme } from "@/components/shell/theme";
import { cn } from "@/lib/utils";

interface Paint {
  page: string;
  rail: string;
  card: string;
  line: string;
  ink: string;
  muted: string;
  accent: string;
}

const LIGHT: Paint = {
  page: "#f4f2ff",
  rail: "#fbfaf8",
  card: "#ffffff",
  line: "#e4e1ec",
  ink: "#111116",
  muted: "#6b6b78",
  accent: "#4f46e5",
};

const DARK: Paint = {
  page: "#09090f",
  rail: "#0c0c14",
  card: "#17171f",
  line: "#30303d",
  ink: "#f5f5f7",
  muted: "#9292a0",
  accent: "#6bb3ff",
};

function Preview({ paint }: { paint: Paint }) {
  return (
    <span
      aria-hidden
      className="block h-[132px] overflow-hidden rounded-[18px]"
      style={{ background: paint.page }}
    >
      <span className="flex h-full">
        <span
          className="flex w-[28%] shrink-0 flex-col gap-2 border-r p-2.5"
          style={{ background: paint.rail, borderColor: paint.line }}
        >
          <span
            className="h-4 w-4 rounded-md"
            style={{ background: paint.accent }}
          />
          {[0, 1, 2, 3].map((item) => (
            <span
              key={item}
              className="h-2 rounded-full"
              style={{
                background: item === 0 ? paint.ink : paint.muted,
                opacity: item === 0 ? 0.5 : 0.28,
                width: item === 2 ? "70%" : "88%",
              }}
            />
          ))}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span
            className="h-8 border-b"
            style={{ background: paint.rail, borderColor: paint.line }}
          />
          <span className="grid flex-1 grid-cols-2 gap-2 p-3">
            <span
              className="rounded-xl border p-2"
              style={{ background: paint.card, borderColor: paint.line }}
            >
              <span
                className="block h-2 w-2/3 rounded-full"
                style={{ background: paint.ink, opacity: 0.55 }}
              />
              <span
                className="mt-2 block h-2 w-full rounded-full"
                style={{ background: paint.muted, opacity: 0.28 }}
              />
              <span
                className="mt-1.5 block h-2 w-3/4 rounded-full"
                style={{ background: paint.muted, opacity: 0.22 }}
              />
            </span>
            <span
              className="rounded-xl border p-2"
              style={{ background: paint.card, borderColor: paint.line }}
            >
              <span
                className="block h-5 w-5 rounded-full"
                style={{ background: paint.accent, opacity: 0.82 }}
              />
              <span
                className="mt-2 block h-2 w-full rounded-full"
                style={{ background: paint.muted, opacity: 0.26 }}
              />
            </span>
          </span>
        </span>
      </span>
    </span>
  );
}

export function ThemePicker() {
  const [theme, choose] = useTheme();

  return (
    <Panel
      title="Dark Mode & Light Mode"
      description="Choose how Trove looks on this browser. The setting applies across the full app, marketing pages, sign-in screens, builders, and settings."
    >
      <div
        role="radiogroup"
        aria-label="Dark Mode and Light Mode"
        className="grid gap-4 sm:grid-cols-2"
      >
        {THEME_OPTIONS.map((option) => {
          const active = theme === option.value;
          const paint = option.value === "dark" ? DARK : LIGHT;
          const Icon = option.icon;

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => choose(option.value)}
              className={cn(
                "group rounded-[22px] border bg-raised p-2.5 text-left transition-[transform,border-color,box-shadow,background-color] duration-[var(--t-card)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                active
                  ? "border-accent shadow-[0_0_0_1px_var(--color-accent),var(--elev)]"
                  : "border-line hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--elev)]",
              )}
            >
              <Preview paint={paint} />

              <span className="flex items-center gap-3 px-1.5 pb-1 pt-3">
                <span
                  className={cn(
                    "grid size-9 place-items-center rounded-xl border",
                    active
                      ? "border-accent/35 bg-accent-soft text-accent"
                      : "border-line bg-sunk text-ink-3",
                  )}
                >
                  <Icon size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-ink">
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] text-ink-4">
                    {option.value === "light"
                      ? "Bright surfaces, soft lavender canvas"
                      : "Deep surfaces, higher contrast, reduced glare"}
                  </span>
                </span>
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full border transition",
                    active
                      ? "border-accent bg-accent text-white"
                      : "border-line bg-sunk text-transparent",
                  )}
                >
                  <FiCheck size={13} />
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 rounded-[16px] border border-line bg-sunk/65 px-4 py-3">
        <p className="text-[12px] leading-5 text-ink-3">
          Trove now uses the same theme state everywhere, including popovers,
          sidebars, authentication, integrations, settings, and studio pages.
        </p>
      </div>
    </Panel>
  );
}
