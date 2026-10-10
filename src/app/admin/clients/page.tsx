"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

type ClientRow = {
  id: string;
  businessName: string;
  email: string;
  name: string;
  status: "INVITED" | "ACTIVE" | "SUSPENDED";
  kvkNumber: string | null;
  btwNumber: string | null;
  createdAt: string;
};
const STATUS_CLASS: Record<ClientRow["status"], string> = {
  INVITED: "status-badge status-pending",
  ACTIVE: "status-badge status-approved",
  SUSPENDED: "status-badge status-rejected",
};

async function fetchClients(): Promise<ClientRow[]> {
  const res = await fetch("/api/admin/clients");
  if (!res.ok) throw new Error("clients-request-failed");
  return res.json();
}

export default function AdminClientsPage() {
  const t = useTranslations("AdminClients");
  const statusLabel: Record<ClientRow["status"], string> = {
    INVITED: t("statusInvited"),
    ACTIVE: t("statusActive"),
    SUSPENDED: t("statusSuspended"),
  };
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [kvkNumber, setKvkNumber] = useState("");
  const [btwNumber, setBtwNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    async function run() {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await fetchClients();
        if (active) setClients(data);
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

  async function reloadClients() {
    try {
      const data = await fetchClients();
      setClients(data);
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
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          email,
          name,
          kvkNumber: kvkNumber || undefined,
          btwNumber: btwNumber || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("errorFallback"));
        return;
      }
      setBusinessName("");
      setEmail("");
      setName("");
      setKvkNumber("");
      setBtwNumber("");
      await reloadClients();
    } catch {
      setError(t("errorFallback"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:py-16">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="display-font mt-3 text-4xl text-ink sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate">
          {t("intro")}
        </p>

        <form onSubmit={handleSubmit} className="card-cream mt-8 p-6 sm:p-8">
          <div className="flex flex-col gap-2 border-b border-beige-deep pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="badge-dark">01</span>
              <h2 className="mt-4 text-2xl font-medium text-ink">
                {t("inviteFormTitle")}
              </h2>
            </div>
            <span className="text-sm text-ink-tint">{t("requiredHint")}</span>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="businessName" className="field-label">
                {t("businessNameLabel")} *
              </label>
              <input
                id="businessName"
                required
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                className="text-input mt-2 w-full"
              />
            </div>
            <div>
              <label htmlFor="name" className="field-label">
                {t("contactNameLabel")} *
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
              <label htmlFor="email" className="field-label">
                {t("emailLabel")} *
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="text-input mt-2 w-full"
              />
            </div>
            <div>
              <label htmlFor="kvkNumber" className="field-label">
                {t("kvkLabel")}
              </label>
              <input
                id="kvkNumber"
                value={kvkNumber}
                onChange={(event) => setKvkNumber(event.target.value)}
                className="text-input mt-2 w-full"
              />
            </div>
            <div>
              <label htmlFor="btwNumber" className="field-label">
                {t("btwLabel")}
              </label>
              <input
                id="btwNumber"
                value={btwNumber}
                onChange={(event) => setBtwNumber(event.target.value)}
                className="text-input mt-2 w-full"
              />
            </div>
          </div>
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

        <section className="mt-12" aria-labelledby="my-clients-heading">
          <div className="flex items-end justify-between border-b border-hairline-soft pb-4">
            <h2
              id="my-clients-heading"
              className="text-2xl font-medium text-ink"
            >
              {t("myClients")}
            </h2>
            <span className="text-sm text-steel">{clients.length}</span>
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
          ) : clients.length === 0 ? (
            <div className="empty-state mt-5">
              <p className="text-sm text-slate">{t("empty")}</p>
            </div>
          ) : (
            <ul className="mt-5 grid gap-3" aria-label={t("myClients")}>
              {clients.map((client) => (
                <li
                  key={client.id}
                  className="card-base flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-base font-medium text-ink">
                      {client.businessName}
                    </p>
                    <p className="mt-1 text-sm text-slate">
                      {client.name} · {client.email}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={STATUS_CLASS[client.status]}>
                      {statusLabel[client.status]}
                    </span>
                    <Link
                      href={`/admin/clients/${client.id}/expenses`}
                      className="button-secondary min-h-10 px-3 py-2 text-xs"
                    >
                      {t("expensesLink")} ↗
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
