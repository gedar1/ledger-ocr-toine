/**
 * Precached by src/app/sw.ts and served by Serwist's fallbacks.entries
 * whenever a document navigation can't be fulfilled from the network or
 * cache (i.e. the user is offline and hasn't visited this route before).
 * Deliberately static/simple — no data fetching, since it must render
 * entirely from the precache.
 */
export default function OfflinePage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-16 text-center dark:bg-black">
      <div className="max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Estás sin conexión
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No se pudo cargar esta página. Comprueba tu conexión a internet e
          inténtalo de nuevo.
        </p>
      </div>
    </div>
  );
}
