/**
 * Shared contract for studio sidebar (StudioSplit) ↔ editor AI generation.
 *
 * QA-01: the sidebar must only report "Done" after the editor confirms the
 * generated content was validated and applied. Every editor signals
 * completion with a CustomEvent carrying a StudioGenResult detail — never a
 * bare "finished" event.
 *
 * QA-05: results are tagged by request ownership in the editors themselves;
 * a stale result arrives as { ok: true, applied: false, stale: true } so the
 * sidebar never claims a silent overwrite happened.
 */

export type StudioGenResult =
  | {
      ok: true;
      /** The generated content was validated and applied to the editor. */
      applied: boolean;
      /**
       * True when content was generated but NOT applied because a newer
       * manual edit or newer request superseded it. The editor must surface
       * an explicit Apply/Discard affordance in this case.
       */
      stale?: boolean;
      /** How many units were created (slides, layers…), when meaningful. */
      count?: number;
      /** Echo of the requesting sidebar prompt's id (request ownership). */
      reqId?: string;
    }
  | {
      ok: false;
      error: string;
      reqId?: string;
      /**
       * Defect 2 (P1): optional diagnostic breadcrumb — request id, editor
       * handler, elapsed ms, last progress signal — so a timeout/failure can
       * be traced from the chat command to the editor execution. The studio
       * sidebar renders it subtly under the error text.
       */
      details?: string;
    };

/** Extract a StudioGenResult from a completion event's detail, if present. */
export function studioResultOf(e: Event): StudioGenResult | null {
  const d = (e as CustomEvent<unknown>).detail;
  if (d && typeof d === "object" && "ok" in d) {
    return d as StudioGenResult;
  }
  return null;
}

/**
 * Wait for a single editor completion event, resolving with its
 * StudioGenResult. Resolves (never rejects) with an error result on timeout
 * so the sidebar can show a real error instead of a false "Done".
 * Call this BEFORE dispatching the prompt event so the listener is registered
 * first.
 */
export function waitForStudioResult(
  eventName: string,
  timeoutMessage = "The editor didn't respond in time. Try again.",
  timeoutMs = 180_000,
): Promise<StudioGenResult> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (r: StudioGenResult) => {
      if (settled) return;
      settled = true;
      window.removeEventListener(eventName, onEvent);
      clearTimeout(timer);
      resolve(r);
    };
    const onEvent = (e: Event) => {
      finish(
        studioResultOf(e) ?? {
          ok: false,
          error: "The editor finished without reporting a result.",
        },
      );
    };
    const timer = setTimeout(() => {
      finish({ ok: false, error: timeoutMessage });
    }, timeoutMs);
    window.addEventListener(eventName, onEvent);
  });
}
