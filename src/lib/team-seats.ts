import "server-only";

import { one, num, str } from "@/lib/db";

/** Free seats every workspace starts with (owner + up to 4 others). */
export const FREE_TEAM_SEATS = 5;

/** Price per extra seat when buying one-off (USD). */
export const EXTRA_SEAT_PRICE_USD = 10;

export interface SeatPackage {
  seats: number;
  /** Total price in USD for the package. */
  priceUsd: number;
  /** Optional display label. */
  label?: string;
}

/**
 * Volume packages. Per-seat effective price falls as quantity rises.
 * 100 for $800 matches product pricing ($8/seat).
 */
export const SEAT_PACKAGES: SeatPackage[] = [
  { seats: 10, priceUsd: 90, label: "10 seats" },
  { seats: 25, priceUsd: 200, label: "25 seats" },
  { seats: 50, priceUsd: 375, label: "50 seats" },
  { seats: 100, priceUsd: 800, label: "100 seats" },
  { seats: 250, priceUsd: 1750, label: "250 seats" },
];

export interface SeatSnapshot {
  /** Max members + pending invites allowed. */
  limit: number;
  /** Current members (including owner). */
  members: number;
  /** Pending (unaccepted, unexpired) invites. */
  pendingInvites: number;
  /** Seats currently consumed (members + pending invites). */
  used: number;
  /** How many more people can be invited right now. */
  remaining: number;
  /** True when used >= limit. */
  atLimit: boolean;
}

export function packageBySeats(seats: number): SeatPackage | null {
  return SEAT_PACKAGES.find((p) => p.seats === seats) || null;
}

/** Price in cents for a custom quantity of extra seats (no package). */
export function customSeatsPriceCents(quantity: number): number {
  const q = Math.max(0, Math.floor(quantity));
  return q * EXTRA_SEAT_PRICE_USD * 100;
}

export function packagePriceCents(pkg: SeatPackage): number {
  return Math.round(pkg.priceUsd * 100);
}

/**
 * Reads seat_limit for a team (defaults to FREE_TEAM_SEATS when column
 * missing or null) and counts members + open invites.
 */
export async function seatSnapshotForTeam(teamId: string): Promise<SeatSnapshot> {
  const team = await one(
    "SELECT seat_limit FROM teams WHERE id = ?",
    [teamId],
  ).catch(() => null);

  let limit = FREE_TEAM_SEATS;
  if (team && team.seat_limit != null) {
    const n = num(team.seat_limit);
    if (Number.isFinite(n) && n > 0) limit = Math.max(FREE_TEAM_SEATS, Math.floor(n));
  }

  const memberRow = await one(
    "SELECT COUNT(*) AS n FROM team_members WHERE team_id = ?",
    [teamId],
  ).catch(() => null);
  const members = num(memberRow?.n);

  const inviteRow = await one(
    "SELECT COUNT(*) AS n FROM team_invites WHERE team_id = ? AND accepted_at IS NULL AND expires_at > ?",
    [teamId, Date.now()],
  ).catch(() => null);
  const pendingInvites = num(inviteRow?.n);

  const used = members + pendingInvites;
  const remaining = Math.max(0, limit - used);

  return {
    limit,
    members,
    pendingInvites,
    used,
    remaining,
    atLimit: used >= limit,
  };
}

/** Ensures seat_limit column exists (idempotent for older DBs). */
export async function ensureSeatLimitColumn() {
  // Migration is also in schema MIGRATIONS; this is a safety net for code paths
  // that run before a cold-start migration completes.
  try {
    const { run } = await import("@/lib/db");
    await run(
      `ALTER TABLE teams ADD COLUMN seat_limit INTEGER NOT NULL DEFAULT ${FREE_TEAM_SEATS}`,
    );
  } catch {
    // duplicate column — already migrated
  }
}

export async function incrementTeamSeatLimit(teamId: string, extraSeats: number) {
  const add = Math.max(0, Math.floor(extraSeats));
  if (!add) return;
  await ensureSeatLimitColumn();
  const { run } = await import("@/lib/db");
  // CASE WHEN covers rows that somehow still have NULL seat_limit.
  await run(
    `UPDATE teams
        SET seat_limit = CASE
          WHEN seat_limit IS NULL OR seat_limit < ? THEN ? + ?
          ELSE seat_limit + ?
        END,
        updated_at = ?
      WHERE id = ?`,
    [FREE_TEAM_SEATS, FREE_TEAM_SEATS, add, add, Date.now(), teamId],
  );
}

export function seatsFromCheckoutMetadata(meta: Record<string, string> | null | undefined): {
  teamId: string;
  seats: number;
} | null {
  if (!meta) return null;
  const teamId = str(meta.teamId || meta.team_id);
  const seats = Math.floor(Number(meta.seats || meta.seat_count || 0));
  if (!teamId || seats < 1) return null;
  return { teamId, seats };
}
