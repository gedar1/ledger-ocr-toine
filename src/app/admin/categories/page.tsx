"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

type CategoryRow = {
  id: string;
  name: string;
  icon: string;
  color: string;
  defaultDeductible: boolean;
  defaultBtwRate: number;
};
async function fetchCategories(): Promise<CategoryRow[]> {
  const res = await fetch("/api/categories");
  if (!res.ok) throw new Error("categories-request-failed");
  return res.json();
}

export default function AdminCategoriesPage() {
  const t = useTranslations("AdminCategories");
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [name, setName] = useState("");
  const [defaultBtwRate, setDefaultBtwRate] = useState(21);
  const [defaultDeductible, setDefaultDeductible] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    async function run() {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await fetchCategories();
        if (active) setCategories(data);
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
  async function reloadCategories() {
    try {
      const data = await fetchCategories();
      setCategories(data);
      setLoadError(null);
    } catch {
      setLoadError(t("loadError"));
    }
  }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, defaultBtwRate, defaultDeductible }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("errorFallback"));
        return;
      }
      setName("");
      setDefaultBtwRate(21);
      setDefaultDeductible(true);
      await reloadCategories();
    } catch {
      setError(t("errorFallback"));
    } finally {
      setSubmitting(false);
    }
  }
  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("category-delete-failed");
      await reloadCategories();
    } catch {
      setError(t("errorFallback"));
    }
  }

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 lg:py-16">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="display-font mt-3 text-4xl text-ink sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate">
          {t("intro")}
        </p>
        <form onSubmit={handleSubmit} className="card-cream mt-8 p-6 sm:p-8">
          <span className="badge-dark">01</span>
          <h2 className="mt-4 text-2xl font-medium text-ink">
            {t("newCategory")}
          </h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-[1fr_180px]">
            <div>
              <label htmlFor="name" className="field-label">
                {t("nameLabel")}
              </label>
              <input
                id="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="text-input mt-2 w-full"
              />
            </div>
            <div>
              <label htmlFor="defaultBtwRate" className="field-label">
                {t("btwRateLabel")}
              </label>
              <select
                id="defaultBtwRate"
                value={defaultBtwRate}
                onChange={(event) =>
                  setDefaultBtwRate(Number(event.target.value))
                }
                className="text-input mt-2 w-full"
              >
                <option value={0}>0%</option>
                <option value={9}>9%</option>
                <option value={21}>21%</option>
              </select>
            </div>
          </div>
          <label className="mt-5 flex min-h-11 items-center gap-3 text-sm font-medium text-ink">
            <input
              type="checkbox"
              checked={defaultDeductible}
              onChange={(event) => setDefaultDeductible(event.target.checked)}
              className="checkbox-control"
            />
            {t("deductibleLabel")}
          </label>
          {error && (
            <p role="alert" aria-live="polite" className="form-error mt-5">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="button-dark mt-6 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? t("submitting") : t("submit")}
          </button>
        </form>
        <section className="mt-12" aria-labelledby="category-list-heading">
          <div className="flex items-end justify-between border-b border-hairline-soft pb-4">
            <h2
              id="category-list-heading"
              className="text-2xl font-medium text-ink"
            >
              {t("activeCategories")}
            </h2>
            <span className="text-sm text-steel">{categories.length}</span>
          </div>
          {loading ? (
            <div className="empty-state mt-5" aria-busy="true">
              <div className="loading-mark" aria-hidden="true" />
              <p className="mt-4 text-sm text-slate">{t("loading")}</p>
            </div>
          ) : loadError ? (
            <div className="empty-state mt-5">
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
            <div className="empty-state mt-5">
              <p className="text-sm text-slate">{t("empty")}</p>
            </div>
          ) : (
            <ul className="mt-5 grid gap-3" aria-label={t("title")}>
              {categories.map((category) => (
                <li
                  key={category.id}
                  className="card-base flex items-center justify-between gap-4 p-5"
                >
                  <div>
                    <p className="text-base font-medium text-ink">
                      {category.name}
                    </p>
                    <p className="mt-1 text-sm text-slate">
                      BTW {category.defaultBtwRate}% ·{" "}
                      {category.defaultDeductible
                        ? t("deductible")
                        : t("notDeductible")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(category.id)}
                    className="button-secondary min-h-10 px-3 py-2 text-xs text-primary-deep"
                  >
                    {t("delete")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
