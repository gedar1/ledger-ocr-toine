"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

export function ReviewActions({ expenseId }: { expenseId: string }) {
  const router = useRouter();
  const t = useTranslations("ReviewPanel");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function review(decision: "APPROVED" | "REJECTED") {
    setError(null);
    if (decision === "REJECTED" && !note.trim()) {
      setError(t("noteLabel"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/expenses/${expenseId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note: note.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("errorFallback"));
        return;
      }
      router.refresh();
    } catch {
      setError(t("errorFallback"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="review-actions">
      <label htmlFor={`review-note-${expenseId}`} className="field-label">
        {t("noteLabel")}
      </label>
      <input
        id={`review-note-${expenseId}`}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder={t("notePlaceholder")}
        className="text-input mt-2 w-full"
      />
      {error && (
        <p role="alert" aria-live="polite" className="form-error mt-2">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={submitting}
          onClick={() => review("APPROVED")}
          className="button-primary min-h-10 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("approve")}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => review("REJECTED")}
          className="button-secondary min-h-10 px-4 py-2 text-primary-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("reject")}
        </button>
      </div>
    </div>
  );
}
