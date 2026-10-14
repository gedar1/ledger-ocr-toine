"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  SyntheticEvent,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";

type ClientStatus = "INVITED" | "ACTIVE" | "SUSPENDED";
type StatusFilter = "ALL" | ClientStatus;

type ClientRow = {
  id: string;
  businessName: string;
  email: string;
  name: string;
  status: ClientStatus;
  kvkNumber: string | null;
  btwNumber: string | null;
  createdAt: string;
};

type ClientFilterState = {
  search: string;
  status: StatusFilter;
};

type ClientKpis = {
  total: number;
  active: number;
  invited: number;
  suspended: number;
};

const STATUS_CLASS: Record<ClientStatus, string> = {
  INVITED: "status-badge status-pending",
  ACTIVE: "status-badge status-approved",
  SUSPENDED: "status-badge status-rejected",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isClientStatus(value: unknown): value is ClientStatus {
  return value === "INVITED" || value === "ACTIVE" || value === "SUSPENDED";
}

function isClientRow(value: unknown): value is ClientRow {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.businessName === "string" &&
    typeof value.email === "string" &&
    typeof value.name === "string" &&
    isClientStatus(value.status) &&
    (typeof value.kvkNumber === "string" || value.kvkNumber === null) &&
    (typeof value.btwNumber === "string" || value.btwNumber === null) &&
    typeof value.createdAt === "string"
  );
}

function isStatusFilter(value: string): value is StatusFilter {
  return value === "ALL" || isClientStatus(value);
}

function getResponseError(value: unknown): string | null {
  return isRecord(value) && typeof value.error === "string"
    ? value.error
    : null;
}

async function fetchClients(): Promise<ClientRow[]> {
  const res = await fetch("/api/admin/clients");
  if (!res.ok) throw new Error("clients-request-failed");

  const data: unknown = await res.json();
  if (!Array.isArray(data) || !data.every(isClientRow)) {
    throw new Error("clients-request-failed");
  }
  return data;
}

function calculateClientKpis(clients: ClientRow[]): ClientKpis {
  return clients.reduce<ClientKpis>(
    (kpis, client) => {
      kpis.total += 1;
      if (client.status === "ACTIVE") kpis.active += 1;
      if (client.status === "INVITED") kpis.invited += 1;
      if (client.status === "SUSPENDED") kpis.suspended += 1;
      return kpis;
    },
    { total: 0, active: 0, invited: 0, suspended: 0 },
  );
}

function filterClients(
  clients: ClientRow[],
  filters: ClientFilterState,
): ClientRow[] {
  const search = filters.search.trim().toLocaleLowerCase();

  return clients.filter((client) => {
    const matchesStatus =
      filters.status === "ALL" || client.status === filters.status;
    if (!matchesStatus) return false;
    if (!search) return true;

    return [client.id, client.businessName, client.name, client.email].some(
      (value) => value.toLocaleLowerCase().includes(search),
    );
  });
}

function formatClientDate(createdAt: string, locale: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return createdAt;

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default function AdminClientsPage() {
  const t = useTranslations("AdminClients");
  const locale = useLocale();
  const statusLabel: Record<ClientStatus, string> = {
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
  const [filterState, setFilterState] = useState<ClientFilterState>({
    search: "",
    status: "ALL",
  });

  const kpis = useMemo(() => calculateClientKpis(clients), [clients]);
  const filteredClients = useMemo(
    () => filterClients(clients, filterState),
    [clients, filterState],
  );
  const hasActiveFilters =
    filterState.search.trim().length > 0 || filterState.status !== "ALL";

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

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
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
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setError(getResponseError(data) ?? t("errorFallback"));
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

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    setFilterState((current) => ({
      ...current,
      search: event.target.value,
    }));
  }

  function handleStatusChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextStatus = event.target.value;
    if (!isStatusFilter(nextStatus)) return;

    setFilterState((current) => ({
      ...current,
      status: nextStatus,
    }));
  }

  function clearFilters() {
    setFilterState({ search: "", status: "ALL" });
  }

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:py-12">
        <header className="flex flex-row items-center justify-between gap-6 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <p className="eyebrow">{t("eyebrow")}</p>
          {/* <div>
            <h1 className="display-font mt-3 text-4xl text-ink sm:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate">
              {t("intro")}
            </p>
          </div> */}
          <a href="#invite-client" className="button-primary self-start">
            {t("inviteAction")}
          </a>
        </header>

        <section className="mt-3" aria-labelledby="client-summary-heading">
          <h2 id="client-summary-heading" className="sr-only">
            {t("summaryTitle")}
          </h2>
          <div className="flex gap-3 ">
            {[
              { label: t("totalClients"), value: kpis.total },
              { label: t("activeClients"), value: kpis.active },
              { label: t("invitedClients"), value: kpis.invited },
              { label: t("suspendedClients"), value: kpis.suspended },
            ].map((kpi) => (
              <article
                key={kpi.label}
                className="card-base flex items-center gap-4 sm:p-4 p-5"
              >
                <p className="text-sm text-slate">{kpi.label}</p>
                <p className="display-font text-3xl text-ink">{kpi.value}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12" aria-labelledby="portfolio-heading">
          <div className="flex flex-col gap-5 border-b border-hairline-soft pb-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2
                id="portfolio-heading"
                className="text-2xl font-medium text-ink"
              >
                {t("portfolioTitle")}
              </h2>
              <p className="mt-2 text-sm text-slate">
                {filteredClients.length} / {clients.length}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] lg:min-w-[34rem]">
              <div>
                <label htmlFor="client-search" className="field-label">
                  {t("searchLabel")}
                </label>
                <input
                  id="client-search"
                  type="search"
                  value={filterState.search}
                  onChange={handleSearchChange}
                  placeholder={t("searchPlaceholder")}
                  className="text-input mt-2 w-full"
                />
              </div>
              <div>
                <label htmlFor="client-status" className="field-label">
                  {t("statusFilterLabel")}
                </label>
                <select
                  id="client-status"
                  value={filterState.status}
                  onChange={handleStatusChange}
                  className="text-input mt-2 w-full"
                >
                  <option value="ALL">{t("statusAll")}</option>
                  <option value="INVITED">{statusLabel.INVITED}</option>
                  <option value="ACTIVE">{statusLabel.ACTIVE}</option>
                  <option value="SUSPENDED">{statusLabel.SUSPENDED}</option>
                </select>
              </div>
            </div>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="button-secondary mt-4"
            >
              {t("clearFilters")}
            </button>
          )}
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
          ) : filteredClients.length === 0 ? (
            <div className="empty-state mt-5">
              <p className="text-sm text-slate">{t("filteredEmpty")}</p>
              <button
                type="button"
                onClick={clearFilters}
                className="button-secondary mt-5"
              >
                {t("clearFilters")}
              </button>
            </div>
          ) : (
            <ul
              className="mt-5 grid gap-4 md:grid-cols-2"
              aria-label={t("portfolioTitle")}
            >
              {filteredClients.map((client) => (
                <li
                  key={client.id}
                  className="card-base flex flex-col gap-5 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-base font-medium text-ink">
                        {client.businessName}
                      </p>
                      <p className="mt-1 text-sm text-slate">
                        {client.name} · {client.email}
                      </p>
                    </div>
                    <span className={STATUS_CLASS[client.status]}>
                      {statusLabel[client.status]}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline-soft pt-4">
                    <p className="text-sm text-steel">
                      {t("createdAtLabel")}:{" "}
                      {formatClientDate(client.createdAt, locale)}
                    </p>
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

        <form
          id="invite-client"
          onSubmit={handleSubmit}
          className="card-cream mt-8 p-6 sm:p-8"
        >
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
      </div>
    </main>
  );
}
