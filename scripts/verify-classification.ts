/**
 * One-off verification script for FEAT-004's "exactly one systemOne call"
 * requirement. A real TYPESAFE_API_KEY is not available in this
 * environment, so this cannot be verified end-to-end against the live
 * TypeSafe AI API — instead it verifies the SAME claim structurally, by
 * monkey-patching the global `fetch` (which @typesafe-ai/sdk's
 * TypeSafeClient falls back to via `config.fetch ?? defaultFetch`, see
 * node_modules/@typesafe-ai/sdk/dist/index.mjs) to count every request to
 * POST /v1/systemone and returning a valid, hand-built SystemOneResult
 * body, then calling JevClassificationService.classify() once and
 * asserting the counting fetch was invoked exactly once.
 *
 * Run with: npx tsx scripts/verify-classification.ts
 *
 * Temporarily overrides process.env.TYPESAFE_API_KEY and globalThis.fetch
 * for the duration of the script only, restoring both afterward. Makes no
 * real network calls and touches no database rows.
 */
import { JevClassificationService } from "../src/lib/classification";

async function main() {
  let allPassed = true;

  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.TYPESAFE_API_KEY;

  // Bypass the placeholder-key detection in classify() with a fake,
  // clearly-non-real key — no real request ever leaves this process,
  // since fetch itself is stubbed below.
  process.env.TYPESAFE_API_KEY = "ts-fake-key-for-structural-verification";

  let fetchCallCount = 0;
  // Wrapped in an object rather than a plain `let`: TypeScript's control-
  // flow narrowing doesn't widen a closure-reassigned `let` back to its
  // declared type at the read site below, and infers `never` instead.
  // Mutating a property on an object sidesteps that narrowing entirely.
  const captured: { lastPath: string | null } = { lastPath: null };

  globalThis.fetch = (async (input: string | URL | Request) => {
    fetchCallCount += 1;
    const url = typeof input === "string" ? input : input.toString();
    captured.lastPath = url;

    const body = {
      model: "jev-latest",
      answers: {
        category: {
          type: "choice",
          choice: "Transporte",
          confidence: 0.42,
          probabilities: { Transporte: 0.42, Alimentacion: 0.58 },
        },
        btwRate: {
          type: "choice",
          choice: "21",
          confidence: 0.9,
          probabilities: { "0": 0.05, "9": 0.05, "21": 0.9 },
        },
        deductible: { type: "noul", noul: 0.75 },
      },
      usage: { input_tokens: 10, output_tokens: 5 },
    };

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const service = new JevClassificationService();
    const result = await service.classify({
      ocrText: "Supermercado El Corte - Total 23,40 EUR",
      description: "Compra de oficina",
      categories: [
        { id: "cat-1", name: "Transporte" },
        { id: "cat-2", name: "Alimentacion" },
      ],
    });

    const calledOnce = fetchCallCount === 1;
    console.log(
      `[Case 1] classify() triggers exactly one HTTP call: ${calledOnce ? "PASS" : "FAIL"} (count=${fetchCallCount})`,
    );
    allPassed = allPassed && calledOnce;

    const hitSystemOne = captured.lastPath?.includes("/v1/systemone") ?? false;
    console.log(
      `[Case 2] that call targets POST /v1/systemone: ${hitSystemOne ? "PASS" : "FAIL"} (path=${captured.lastPath})`,
    );
    allPassed = allPassed && hitSystemOne;

    const mappedCorrectly =
      result.categoryId === "cat-1" &&
      result.categoryConfidence === 0.42 &&
      result.btwRate === 21 &&
      result.btwConfidence === 0.9 &&
      result.deductible === true &&
      result.deductibleConfidence === 0.75;
    console.log(
      `[Case 3] response is mapped to the expected ClassificationResult shape: ${mappedCorrectly ? "PASS" : "FAIL"}`,
    );
    allPassed = allPassed && mappedCorrectly;

    console.log(allPassed ? "\nALL CASES PASS" : "\nSOME CASES FAILED");
    if (!allPassed) process.exitCode = 1;
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) {
      delete process.env.TYPESAFE_API_KEY;
    } else {
      process.env.TYPESAFE_API_KEY = originalApiKey;
    }
  }
}

main().catch((error) => {
  console.error("Verification script crashed:", error);
  process.exitCode = 1;
});
