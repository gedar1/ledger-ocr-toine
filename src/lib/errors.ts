/**
 * Thrown by the OCR/classification/upload integrations (src/lib/vision.ts,
 * src/lib/classification.ts, src/lib/cloudinary.ts) when their external
 * provider's API key env var is missing or still the placeholder value
 * shipped in .env.example. Callers (POST /api/receipts/scan) catch this
 * specifically and map it to a clean 503 JSON response — never a crash,
 * never a 200 with garbage data.
 */
export class ServiceUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServiceUnavailableError";
  }
}
