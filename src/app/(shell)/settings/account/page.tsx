import Link from "next/link";
import { FiLogOut, FiCheck, FiAlertCircle } from "@/components/ui/icons";

import { logOut } from "@/app/actions/auth";
import { deleteAccount } from "@/app/actions/account";
import { getProfile } from "@/app/actions/profile";
import { Panel, Row } from "@/components/settings/panel";
import { SignedOut } from "@/components/settings/signed-out";

export const metadata = { title: "Account" };

export default async function AccountSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ delete?: string }>;
}) {
  const profile = await getProfile();
  if (!profile) return <SignedOut />;
  const query = await searchParams;
  const deleteState = query.delete || "";

  const joined = new Date(profile.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-4">
      <Panel title="Account" description="The details behind your sign-in.">
        <dl className="divide-y divide-line">
          <Row label="Email">
            <span className="text-[13.5px] text-ink">{profile.email}</span>
          </Row>

          <Row
            label="Email verified"
            hint={
              profile.emailVerified
                ? undefined
                : "Some features stay locked until the address is proven."
            }
          >
            {profile.emailVerified ? (
              <span className="inline-flex items-center gap-1.5 text-[13px] text-positive">
                <FiCheck size={13} /> Verified
              </span>
            ) : (
              <Link
                href="/verify-email"
                className="inline-flex items-center gap-1.5 text-[13px] text-caution hover:underline"
              >
                <FiAlertCircle size={13} /> Verify now
              </Link>
            )}
          </Row>

          <Row
            label="Sign-in method"
            hint={
              profile.provider === "google"
                ? "Google handles the password."
                : undefined
            }
          >
            <span className="text-[13.5px] capitalize text-ink">
              {profile.provider}
            </span>
          </Row>

          <Row label="Plan">
            <Link
              href="/plans"
              className="text-[13.5px] capitalize text-accent hover:underline"
            >
              {profile.plan}
            </Link>
          </Row>

          <Row label="Member since">
            <span className="text-[13.5px] text-ink">{joined}</span>
          </Row>
        </dl>
      </Panel>

      <Panel
        title="Session"
        description="Signs you out on this device. Anything saved stays saved."
      >
        <form action={logOut}>
          <button className="flex items-center gap-2 rounded-[var(--r-control)] border border-critical/35 px-4 py-2 text-[13.5px] text-critical transition-colors hover:bg-critical/10">
            <FiLogOut size={14} /> Log out
          </button>
        </form>
      </Panel>

      <Panel
        title="Danger zone"
        description="Permanently delete your Trove account and first-party workspace data."
      >
        <div className="space-y-4">
          {deleteState === "billing" ? (
            <div className="rounded-xl border border-caution/30 bg-caution/8 px-3.5 py-3 text-[13px] leading-5 text-ink-2">
              Your paid subscription is still active.{" "}
              <Link href="/settings/subscription" className="font-medium text-accent hover:underline">
                Cancel the subscription first
              </Link>
              , then return here after the account is no longer billable.
            </div>
          ) : null}

          {deleteState === "confirm" ? (
            <div className="rounded-xl border border-critical/25 bg-critical/6 px-3.5 py-3 text-[13px] leading-5 text-critical">
              The confirmation email did not match this account.
            </div>
          ) : null}

          <p className="max-w-[680px] text-[13px] leading-5 text-ink-3">
            This removes saved conversations, sites, projects, agents, reminders,
            integrations and account data. It cannot be undone. Trove will not
            delete an account while a paid subscription could still renew.
          </p>

          <form action={deleteAccount} className="max-w-[520px] space-y-3">
            <label className="block text-[12.5px] font-medium text-ink-2" htmlFor="confirmEmail">
              Type <span className="font-mono text-ink">{profile.email}</span> to confirm
            </label>
            <input
              id="confirmEmail"
              name="confirmEmail"
              type="email"
              autoComplete="off"
              required
              placeholder={profile.email}
              className="h-10 w-full rounded-[var(--r-control)] border border-line bg-white px-3 text-[13.5px] text-ink outline-none transition focus:border-critical/50 focus:ring-2 focus:ring-critical/10"
            />
            <button
              type="submit"
              className="rounded-[var(--r-control)] border border-critical/40 px-4 py-2 text-[13.5px] font-medium text-critical transition-colors hover:bg-critical/10"
            >
              Permanently delete account
            </button>
          </form>
        </div>
      </Panel>
    </div>
  );
}
