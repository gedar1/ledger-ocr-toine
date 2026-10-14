"use client";

import { useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/locale-switcher";

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations("Login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!result || result.error) {
        setError(t("error"));
        return;
      }

      const session = await getSession();
      if (session?.user.role === "ACCOUNTANT") {
        router.push("/admin");
      } else if (session?.user.role === "CLIENT") {
        router.push("/app");
      } else {
        router.push("/");
      }
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-surface px-5 py-12 sm:px-8">
      <div className="w-full max-w-1/5">
        <div className="mb-5 flex justify-end">
          <LocaleSwitcher />
        </div>
        <form onSubmit={handleSubmit} className="contact-form-panel p-7 sm:p-9">
          <p className="eyebrow">Libro Mayor_</p>
          <h1 className="display-font mt-5 text-4xl text-ink">{t("title")}</h1>
          <p className="mt-3 text-sm leading-6 text-slate">{t("intro")}</p>

          <div className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="field-label">
                {t("emailLabel")}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="text-input mt-2 w-full"
              />
            </div>
            <div>
              <label htmlFor="password" className="field-label">
                {t("passwordLabel")}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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
            disabled={loading}
            className="button-dark mt-6 w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? t("submitting") : t("submit")}
          </button>
        </form>
      </div>
    </main>
  );
}
