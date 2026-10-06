/**
 * Anonymous drafts — build-before-signup (P4: IKEA / endowment).
 *
 * Lets a visitor start a creation flow without an account, keeps the
 * in-progress work in localStorage, and restores it after they pass the
 * auth boundary. The draft survives navigation to /signup or /login and
 * back because it never leaves the device.
 *
 * Drafts are JSON-serializable payloads keyed by flow kind. They are
 * explicitly device-local: they never sync to the server and are cleared
 * once the work is actually created.
 */

export type AnonymousDraftKind = "tro";

const PREFIX = "trove:anon-draft:";

export interface AnonymousDraft<T = Record<string, unknown>> {
  kind: AnonymousDraftKind;
  /** Where to send the user so the draft can be restored. */
  returnTo: string;
  data: T;
  savedAt: number;
}

function keyFor(kind: AnonymousDraftKind): string {
  return `${PREFIX}${kind}`;
}

function storage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Persist an in-progress creation draft on this device. Overwrites any prior draft of the same kind. */
export function saveAnonymousDraft<T>(
  kind: AnonymousDraftKind,
  data: T,
  returnTo: string,
): void {
  const store = storage();
  if (!store) return;
  const draft: AnonymousDraft<T> = { kind, returnTo, data, savedAt: Date.now() };
  try {
    store.setItem(keyFor(kind), JSON.stringify(draft));
  } catch {
    /* storage full or blocked — the draft simply won't survive */
  }
}

/** Read a previously saved draft, or null when there isn't one (or it can't be parsed). */
export function loadAnonymousDraft<T = Record<string, unknown>>(
  kind: AnonymousDraftKind,
): AnonymousDraft<T> | null {
  const store = storage();
  if (!store) return null;
  let raw: string | null = null;
  try {
    raw = store.getItem(keyFor(kind));
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AnonymousDraft<T>;
    if (!parsed || typeof parsed !== "object" || parsed.kind !== kind) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** True when a draft of this kind is waiting on this device. */
export function hasAnonymousDraft(kind: AnonymousDraftKind): boolean {
  return loadAnonymousDraft(kind) !== null;
}

/** Discard the draft — call once the work has been created or the user starts over. */
export function clearAnonymousDraft(kind: AnonymousDraftKind): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(keyFor(kind));
  } catch {
    /* already gone */
  }
}
