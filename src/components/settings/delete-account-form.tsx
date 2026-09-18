"use client";

import { useActionState } from "react";
import { deleteAccount, type DeleteAccountState } from "@/app/actions/account";

const initialState: DeleteAccountState = {};

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccount, initialState);

  return (
    <form action={action} className="space-y-3">
      <p className="text-[13px] leading-6 text-ink-3">
        This permanently deletes your Trove account and saved workspace data. This cannot be undone.
      </p>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-medium text-ink-2">
          Type DELETE MY ACCOUNT to confirm
        </span>
        <input
          name="confirmation"
          autoComplete="off"
          className="h-10 w-full max-w-[360px] rounded-[var(--r-control)] border border-line bg-raised px-3 text-[13px] text-ink outline-none transition focus:border-critical/60"
          placeholder="DELETE MY ACCOUNT"
        />
      </label>
      {state.error ? (
        <p className="text-[12.5px] text-critical">{state.error}</p>
      ) : null}
      <button
        disabled={pending}
        className="rounded-[var(--r-control)] border border-critical/40 px-4 py-2 text-[13px] font-medium text-critical transition-colors hover:bg-critical/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete account"}
      </button>
    </form>
  );
}
