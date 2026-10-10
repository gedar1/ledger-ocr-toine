import { TypeSafeClient, choice, noul } from "@typesafe-ai/sdk";
import { ServiceUnavailableError } from "@/lib/errors";

export interface ClassificationCategory {
  id: string;
  name: string;
}

export interface ClassificationInput {
  ocrText: string;
  description: string | null;
  categories: ClassificationCategory[];
}

export interface ClassificationResult {
  categoryId: string | null;
  categoryConfidence: number;
  btwRate: number;
  btwConfidence: number;
  deductible: boolean;
  deductibleConfidence: number;
}

export interface ClassificationService {
  classify(input: ClassificationInput): Promise<ClassificationResult>;
}

const BTW_RATES = ["0", "9", "21"] as const;

/**
 * TypeSafe AI (Jev) implementation of ClassificationService. Shape
 * confirmed against the installed @typesafe-ai/sdk 0.6.0 types in
 * node_modules/@typesafe-ai/sdk/dist/index.d.mts (documented in this
 * task's context.json): `new TypeSafeClient({ apiKey })`, then
 * `client.systemOne({ state, questions })` where `questions` is built with
 * the exported `choice(instructions, criteria)` / `noul(instructions,
 * criteria)` helpers; `ChoiceResponse` carries `.choice` + `.confidence` +
 * `.probabilities`, `NoulResponse` carries only `.noul` (a 0-1 probability,
 * no separate confidence field).
 *
 * Per the task's explicit requirement, classify() makes exactly ONE
 * systemOne call per invocation, requesting category, btwRate, and
 * deductible together as three named questions.
 */
export class JevClassificationService implements ClassificationService {
  async classify(input: ClassificationInput): Promise<ClassificationResult> {
    const apiKey = process.env.TYPESAFE_API_KEY;
    if (!apiKey || apiKey.startsWith("ts-...")) {
      throw new ServiceUnavailableError("TYPESAFE_API_KEY no configurada");
    }

    const client = new TypeSafeClient({ apiKey });

    if (input.categories.length === 0) {
      throw new ServiceUnavailableError("No hay categorías disponibles para clasificar");
    }

    const categoryCriteria: Record<string, string | null> = {};
    for (const category of input.categories) {
      categoryCriteria[category.name] = null;
    }

    const state = [input.description, input.ocrText].filter(Boolean).join("\n\n");

    const { answers } = await client.systemOne({
      state,
      questions: {
        category: choice(
          "¿Cuál es la categoría de gasto más apropiada para este recibo?",
          categoryCriteria
        ),
        btwRate: choice("¿Cuál es la tasa de BTW (IVA) aplicable a este gasto?", {
          "0": "Tasa 0% (exenta)",
          "9": "Tasa reducida 9%",
          "21": "Tasa general 21%",
        }),
        deductible: noul("¿Este gasto es fiscalmente deducible?"),
      },
    });

    const matchedCategory = input.categories.find(
      (category) => category.name === answers.category.choice
    );

    const btwRate = BTW_RATES.includes(answers.btwRate.choice as (typeof BTW_RATES)[number])
      ? Number(answers.btwRate.choice)
      : 21;

    // NoulResponse has no separate confidence field — treat the noul
    // probability itself (distance from 0.5) as the deductible confidence,
    // via max(noul, 1-noul), per the task's "pick one and document" note.
    const deductibleConfidence = Math.max(answers.deductible.noul, 1 - answers.deductible.noul);

    return {
      categoryId: matchedCategory?.id ?? null,
      categoryConfidence: answers.category.confidence,
      btwRate,
      btwConfidence: answers.btwRate.confidence,
      deductible: answers.deductible.noul >= 0.5,
      deductibleConfidence,
    };
  }
}
