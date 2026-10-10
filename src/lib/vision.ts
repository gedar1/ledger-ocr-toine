import OpenAI from "openai";
import { ServiceUnavailableError } from "@/lib/errors";

export interface ExtractedReceiptData {
  ocrText: string;
  amount: number | null;
  description: string | null;
  date: string | null;
}

/**
 * Extracts structured data from a receipt photo using a GPT-4o Vision-
 * capable model. Mirrors the message-shape pattern read (read-only) from
 * c:\Users\GermanDarioArbelaez\Documents\project-agent\expense-tracker-ocr\src\app\api\ocr\route.ts
 * — a system prompt requesting JSON-only output plus a user message whose
 * content is an array with a text part and an `image_url` part carrying a
 * base64 `data:` URI at `detail: "high"` (confirmed against the installed
 * openai 6.49.0 types in node_modules/openai/resources/chat/completions/completions.d.ts:
 * ChatCompletionContentPartImage = { type: "image_url", image_url: { url, detail } }).
 *
 * OPENAI_API_KEY is a placeholder in .env until a real key is provided —
 * detected up front and turned into a typed ServiceUnavailableError the
 * caller (POST /api/receipts/scan) maps to a clean 503, instead of letting
 * the OpenAI SDK fail unpredictably (or, worse, succeed against a bogus key
 * string that happens to parse).
 */
export async function extractReceiptData(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractedReceiptData> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.startsWith("sk-...")) {
    throw new ServiceUnavailableError("OPENAI_API_KEY no configurada");
  }

  const openai = new OpenAI({ apiKey });

  const base64 = buffer.toString("base64");

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `Eres un asistente que analiza imagenes de recibos, tickets y facturas. Extrae la informacion y responde SOLO con un JSON valido (sin markdown, sin backticks) con esta estructura:
{
  "ocrText": "texto completo extraido del recibo",
  "amount": numero total (el monto mas alto o el total final) o null,
  "description": "descripcion corta del gasto (nombre del negocio o concepto principal)" o null,
  "date": "fecha del recibo en formato YYYY-MM-DD si es visible, o null"
}
Si no puedes extraer algun campo, usa null para ese campo.`,
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Analiza este recibo y extrae la informacion:" },
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64}`, detail: "high" },
          },
        ],
      },
    ],
    max_tokens: 1000,
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content?.trim() ?? "";

  try {
    const jsonStr = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(jsonStr) as Partial<ExtractedReceiptData>;
    return {
      ocrText: typeof parsed.ocrText === "string" ? parsed.ocrText : content,
      amount: typeof parsed.amount === "number" ? parsed.amount : null,
      description: typeof parsed.description === "string" ? parsed.description : null,
      date: typeof parsed.date === "string" ? parsed.date : null,
    };
  } catch {
    // Markdown-fence-strip + JSON.parse failed — fall back to returning the
    // raw text as ocrText with the other fields null, same fallback shape
    // used by the reference OCR route.
    return { ocrText: content, amount: null, description: null, date: null };
  }
}
