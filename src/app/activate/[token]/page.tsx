"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";

type ValidationState =
  | { status: "loading" }
  | { status: "invalid" }
  | { status: "valid"; businessName: string }
  | { status: "activated" };

export default function ActivatePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [state, setState] = useState<ValidationState>({ status: "loading" });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/activate/${params.token}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.valid) {
          setState({ status: "valid", businessName: data.businessName });
        } else {
          setState({ status: "invalid" });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ status: "invalid" });
      });
    return () => {
      cancelled = true;
    };
  }, [params.token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setSubmitting(true);
    const res = await fetch(`/api/activate/${params.token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "No se pudo activar la cuenta");
      setSubmitting(false);
      return;
    }

    setState({ status: "activated" });
    setTimeout(() => router.push("/login"), 2000);
  }

  if (state.status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <p className="text-sm text-zinc-500">Validando enlace de activación...</p>
      </div>
    );
  }

  if (state.status === "invalid") {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-16 text-center">
        <div className="max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Enlace inválido o expirado
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Este enlace de activación ya no es válido. Pide a tu contable que
            te envíe una nueva invitación.
          </p>
        </div>
      </div>
    );
  }

  if (state.status === "activated") {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-16 text-center">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Cuenta activada. Redirigiendo al inicio de sesión...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-16 dark:bg-black">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h1 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Activar cuenta
        </h1>
        <p className="mb-6 text-sm text-zinc-500">{state.businessName}</p>

        <label htmlFor="password" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Nueva contraseña
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
        />

        <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Confirmar contraseña
        </label>
        <input
          id="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="mb-4 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
        />

        {error && (
          <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {submitting ? "Activando..." : "Activar cuenta"}
        </button>
      </form>
    </div>
  );
}
