"use client";

import {
  ApprovalCard,
  type ApprovalQuestion,
} from "@/components/chat/approval-card";

/**
 * Agent / tool approval prompt — human-in-the-loop questions
 * before executing a sensitive action.
 */
export function ApprovalPrompt({
  title,
  questions,
  onApprove,
  onSkip,
}: {
  title?: string;
  questions: ApprovalQuestion[];
  onApprove?: (
    answers: Record<number, number[]>,
    custom: Record<number, string>,
  ) => void;
  onSkip?: () => void;
}) {
  if (!questions.length) return null;
  return (
    <div className="my-2">
      {title ? (
        <p className="mb-2 text-[12.5px] font-medium text-ink-3">{title}</p>
      ) : null}
      <ApprovalCard
        questions={questions}
        labels={{
          skip: "Skip",
          continue: "Continue",
          send: "Approve",
          sentMessage: "Approved",
          customPlaceholder: "Something else…",
        }}
        onSubmitted={(answers, custom) => onApprove?.(answers, custom)}
      />
      {onSkip ? (
        <button
          type="button"
          onClick={onSkip}
          className="mt-2 text-[12px] text-ink-4 hover:text-ink-2"
        >
          Cancel this step
        </button>
      ) : null}
    </div>
  );
}

export type { ApprovalQuestion };
export default ApprovalPrompt;
