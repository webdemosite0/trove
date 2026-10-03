import Link from "next/link";
import { listUserProjects } from "@/lib/projects";
import { SiteGrid } from "@/components/websites/site-grid";

export const metadata = { title: "Websites" };
export const dynamic = "force-dynamic";

export default async function WebsitesPage() {
  const projects = await listUserProjects(40);

  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain bg-canvas">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-[26px] font-bold tracking-tight text-ink sm:text-[30px]">Websites</h1>
            <p className="mt-1 text-[14px] text-ink-3">
              {projects.length
                ? `${projects.length} site${projects.length === 1 ? "" : "s"} — tap one to keep building`
                : "Describe it. Get a complete website in seconds."}
            </p>
          </div>
          <Link
            href="/websites/new"
            className="flex min-h-[48px] shrink-0 items-center gap-2 rounded-full bg-accent px-5 text-[15px] font-semibold text-white shadow-lg shadow-accent/25 transition active:scale-95"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="hidden sm:inline">New website</span>
            <span className="sm:hidden">New</span>
          </Link>
        </div>

        {projects.length ? (
          <div className="mt-6">
            <SiteGrid projects={projects} />
          </div>
        ) : (
          <div className="mt-10 flex flex-col items-center rounded-[28px] border border-dashed border-line bg-raised/50 px-6 py-16 text-center">
            <div className="grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-violet-500 to-blue-600 text-white shadow-lg shadow-violet-500/25">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3 9h18M9 21V9" />
              </svg>
            </div>
            <h2 className="mt-5 text-[19px] font-bold text-ink">Build your first website</h2>
            <p className="mt-2 max-w-[36ch] text-[14px] leading-relaxed text-ink-3">
              Describe the site you want — a landing page, portfolio, restaurant site — and AI designs and codes it instantly.
            </p>
            <Link
              href="/websites/new"
              className="mt-6 flex min-h-[52px] items-center gap-2 rounded-full bg-accent px-7 text-[16px] font-semibold text-white shadow-lg shadow-accent/25 transition active:scale-95"
            >
              Start building
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14m-6-6 6 6-6 6" />
              </svg>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
