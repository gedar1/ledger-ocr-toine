"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

type CategoryRow = {
  id: string;
  name: string;
  defaultDeductible: boolean;
  defaultBtwRate: number;
};

async function fetchCategories(): Promise<CategoryRow[]> {
  const res = await fetch("/api/categories");
  if (!res.ok) throw new Error("categories-request-failed");
  return res.json();
}

export default function NewExpensePage() {
  const router = useRouter();
  const t = useTranslations("NewExpense");
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState("");
  const [deductible, setDeductible] = useState(true);
  const [btwRate, setBtwRate] = useState(21);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    async function run() {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await fetchCategories();
        if (active) {
          setCategories(data);
          if (data[0]) {
            setCategoryId(data[0].id);
            setDeductible(data[0].defaultDeductible);
            setBtwRate(data[0].defaultBtwRate);
          }
        }
      } catch {
        if (active) setLoadError(t("loadError"));
      } finally {
        if (active) setLoading(false);
      }
    }
    void run();
    return () => {
      active = false;
    };
  }, [loadAttempt, t]);

  function handleCategoryChange(id: string) {
    setCategoryId(id);
    const category = categories.find((item) => item.id === id);
    if (category) {
      setDeductible(category.defaultDeductible);
      setBtwRate(category.defaultBtwRate);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          description,
          date,
          categoryId,
          deductible,
          btwRate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("error"));
        return;
      }
      router.push("/app/expenses");
    } catch {
      setError(t("error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 lg:py-16">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="display-font mt-3 text-4xl text-ink sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate">
          {t("intro")}
        </p>

        {loading ? (
          <div className="empty-state mt-8" aria-busy="true">
            <div className="loading-mark" aria-hidden="true" />
            <p className="mt-4 text-sm text-slate">{t("loadingCategories")}</p>
          </div>
        ) : loadError ? (
          <div className="empty-state mt-8">
            <p role="alert" className="text-sm text-slate">
              {loadError}
            </p>
            <button
              type="button"
              onClick={() => setLoadAttempt((attempt) => attempt + 1)}
              className="button-secondary mt-5"
            >
              {t("retry")}
            </button>
          </div>
        ) : categories.length === 0 ? (
          <div className="empty-state mt-8">
            <span className="badge-cream">{t("categoriesBadge")}</span>
            <p className="mt-4 text-sm leading-6 text-slate">
              {t("emptyCategories")}
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="card-feature mt-8 p-6 sm:p-8"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="description" className="field-label">
                  {t("description")}
                </label>
                <input
                  id="description"
                  required
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="text-input mt-2 w-full"
                />
              </div>
              <div>
                <label htmlFor="amount" className="field-label">
                  {t("amount")}
                </label>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="text-input mt-2 w-full"
                />
              </div>
              <div>
                <label htmlFor="date" className="field-label">
                  {t("date")}
                </label>
                <input
                  id="date"
                  type="date"
                  required
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="text-input mt-2 w-full"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="categoryId" className="field-label">
                  {t("category")}
                </label>
                <select
                  id="categoryId"
                  value={categoryId}
                  onChange={(event) => handleCategoryChange(event.target.value)}
                  className="text-input mt-2 w-full"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="btwRate" className="field-label">
                  {t("btwRate")}
                </label>
                <select
                  id="btwRate"
                  value={btwRate}
                  onChange={(event) => setBtwRate(Number(event.target.value))}
                  className="text-input mt-2 w-full"
                >
                  <option value={0}>0%</option>
                  <option value={9}>9%</option>
                  <option value={21}>21%</option>
                </select>
              </div>
              <label className="mt-8 flex min-h-11 items-center gap-3 text-sm font-medium text-ink">
                <input
                  type="checkbox"
                  checked={deductible}
                  onChange={(event) => setDeductible(event.target.checked)}
                  className="checkbox-control"
                />
                {t("deductible")}
              </label>
            </div>
            {error && (
              <p role="alert" aria-live="polite" className="form-error mt-6">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="button-primary mt-7 w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? t("saving") : t("save")}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
