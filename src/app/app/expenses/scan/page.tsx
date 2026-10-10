"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";

type CategoryRow = {
  id: string;
  name: string;
  defaultDeductible: boolean;
  defaultBtwRate: number;
};
type ScanResult = {
  imageUrl: string;
  ocrText: string;
  amount: number | null;
  description: string | null;
  date: string | null;
  suggestedCategoryId: string | null;
  categoryConfidence: number;
  btwRate: number;
  btwConfidence: number;
  deductible: boolean;
  deductibleConfidence: number;
};
const LOW_CONFIDENCE_THRESHOLD = 0.6;

function ConfidenceBadge({ value }: { value: number }) {
  const t = useTranslations("ScanReceipt");
  const low = value < LOW_CONFIDENCE_THRESHOLD;
  return (
    <span
      className={`confidence-badge ${low ? "confidence-low" : "confidence-high"}`}
    >
      {low ? `${t("reviewConfidence")}: ` : `${t("confidence")}: `}
      {Math.round(value * 100)}%
    </span>
  );
}

async function fetchCategories(): Promise<CategoryRow[]> {
  const res = await fetch("/api/categories");
  if (!res.ok) throw new Error("categories-request-failed");
  return res.json();
}

export default function ScanReceiptPage() {
  const router = useRouter();
  const t = useTranslations("ScanReceipt");
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [categoriesAttempt, setCategoriesAttempt] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [deductible, setDeductible] = useState(true);
  const [btwRate, setBtwRate] = useState(21);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    async function run() {
      setCategoriesError(null);
      try {
        const data = await fetchCategories();
        if (active) setCategories(data);
      } catch {
        if (active) setCategoriesError(t("categoriesError"));
      }
    }
    void run();
    return () => {
      active = false;
    };
  }, [categoriesAttempt, t]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setScanError(null);
  }

  async function handleScan() {
    if (!file) {
      setScanError(t("selectImage"));
      return;
    }
    setScanning(true);
    setScanError(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/receipts/scan", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setScanError(
          res.status === 503 ? t("serviceUnavailable") : t("scanError"),
        );
        return;
      }
      const scan = data as ScanResult;
      setResult(scan);
      setAmount(scan.amount != null ? String(scan.amount) : "");
      setDescription(scan.description ?? "");
      setDate(scan.date ?? new Date().toISOString().slice(0, 10));
      setCategoryId(scan.suggestedCategoryId ?? categories[0]?.id ?? "");
      setDeductible(scan.deductible);
      setBtwRate(scan.btwRate);
    } catch {
      setScanError(t("scanError"));
    } finally {
      setScanning(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!result) return;
    setSubmitError(null);
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
          receipt: result.imageUrl,
          ocrText: result.ocrText,
          classificationConfidence: Math.min(
            result.categoryConfidence,
            result.btwConfidence,
            result.deductibleConfidence,
          ),
        }),
      });
      await res.json();
      if (!res.ok) {
        setSubmitError(t("submitError"));
        return;
      }
      router.push("/app/expenses");
    } catch {
      setSubmitError(t("submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8 lg:py-16">
        <p className="eyebrow">{t("brandEyebrow")}</p>
        <h1 className="display-font mt-3 text-4xl text-ink sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate">
          {t("uploadHint")}
        </p>

        <div className="card-cream mt-8 p-6 sm:p-8">
          <span className="badge-dark">01</span>
          <h2 className="mt-5 text-2xl font-medium text-ink">
            {t("uploadTitle")}
          </h2>
          <label htmlFor="receipt-image" className="field-label mt-6 block">
            {t("imageLabel")}
          </label>
          <input
            id="receipt-image"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="file-input mt-2 w-full"
          />
          {scanError && (
            <p role="alert" aria-live="polite" className="form-error mt-4">
              {scanError}
            </p>
          )}
          {categoriesError && (
            <p role="alert" aria-live="polite" className="form-error mt-4">
              {categoriesError}{" "}
              <button
                type="button"
                onClick={() => setCategoriesAttempt((attempt) => attempt + 1)}
                className="font-medium underline underline-offset-2"
              >
                {t("retry")}
              </button>
            </p>
          )}
          <button
            type="button"
            onClick={handleScan}
            disabled={!file || scanning}
            className="button-dark mt-6 w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            {scanning ? t("scanning") : t("scan")}
          </button>
        </div>

        {result && (
          <form
            onSubmit={handleSubmit}
            className="card-feature mt-5 p-6 sm:p-8"
          >
            <div className="flex flex-col gap-3 border-b border-hairline-soft pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <span className="badge-orange">02</span>
                <h2 className="mt-4 text-2xl font-medium text-ink">
                  {t("reviewTitle")}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate">
                  {t("reviewBody")}
                </p>
              </div>
              <span className="badge-cream">{t("humanReview")}</span>
            </div>
            <div className="relative mt-6 h-64 w-full overflow-hidden rounded-lg bg-surface">
              <Image
                src={result.imageUrl}
                alt={t("receiptAlt")}
                fill
                className="object-contain"
              />
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="scan-description" className="field-label">
                  {t("description")}
                </label>
                <input
                  id="scan-description"
                  required
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="text-input mt-2 w-full"
                />
              </div>
              <div>
                <label htmlFor="scan-amount" className="field-label">
                  {t("amount")}
                </label>
                <input
                  id="scan-amount"
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
                <label htmlFor="scan-date" className="field-label">
                  {t("date")}
                </label>
                <input
                  id="scan-date"
                  type="date"
                  required
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="text-input mt-2 w-full"
                />
              </div>
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="scan-category" className="field-label">
                    {t("category")}
                  </label>
                  <ConfidenceBadge value={result.categoryConfidence} />
                </div>
                <select
                  id="scan-category"
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
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
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="scan-btwRate" className="field-label">
                    {t("btwRate")}
                  </label>
                  <ConfidenceBadge value={result.btwConfidence} />
                </div>
                <select
                  id="scan-btwRate"
                  value={btwRate}
                  onChange={(event) => setBtwRate(Number(event.target.value))}
                  className="text-input mt-2 w-full"
                >
                  <option value={0}>0%</option>
                  <option value={9}>9%</option>
                  <option value={21}>21%</option>
                </select>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <span className="field-label">{t("deductible")}</span>
                  <ConfidenceBadge value={result.deductibleConfidence} />
                </div>
                <label className="mt-3 flex min-h-11 items-center gap-3 text-sm font-medium text-ink">
                  <input
                    type="checkbox"
                    checked={deductible}
                    onChange={(event) => setDeductible(event.target.checked)}
                    className="checkbox-control"
                  />
                  {t("markDeductible")}
                </label>
              </div>
            </div>
            {submitError && (
              <p role="alert" aria-live="polite" className="form-error mt-6">
                {submitError}
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
