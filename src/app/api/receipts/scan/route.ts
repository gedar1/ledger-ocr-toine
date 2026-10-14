import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { uploadReceipt } from "@/lib/cloudinary";
import { extractReceiptData } from "@/lib/vision";
import { JevClassificationService } from "@/lib/classification";
import { ServiceUnavailableError } from "@/lib/errors";

const classificationService = new JevClassificationService();

/**
 * CLIENT-only (ACTIVE). Reads a multipart `image` field, uploads it to
 * Cloudinary, runs GPT-4o Vision extraction, loads the client's own
 * accountant's categories, then runs the (single) Jev systemOne
 * classification call. Returns everything the client needs to review/edit
 * before calling POST /api/expenses.
 *
 * All three external integrations (Cloudinary, OpenAI, TypeSafe) throw a
 * typed ServiceUnavailableError when their API key is a placeholder/unset
 * — caught here and mapped to a single clean 503 JSON response. This must
 * never crash the process or affect any other route (verified by the
 * /api/health smoke test run alongside this one).
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (
    !session?.user ||
    session.user.role !== "CLIENT" ||
    session.user.clientStatus !== "ACTIVE" ||
    !session.user.clientProfileId
  ) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("image");

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "No se envió ninguna imagen" },
      { status: 400 },
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const mimeType = file.type || "image/jpeg";

  try {
    const imageUrl = await uploadReceipt(buffer, mimeType);
    const extracted = await extractReceiptData(buffer, mimeType);

    const clientProfile = await prisma.clientProfile.findUnique({
      where: { id: session.user.clientProfileId },
      select: { accountantId: true },
    });
    if (!clientProfile) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const categories = await prisma.category.findMany({
      where: { accountantId: clientProfile.accountantId },
      select: { id: true, name: true },
    });

    const classification = await classificationService.classify({
      ocrText: extracted.ocrText,
      description: extracted.description,
      categories,
    });

    return NextResponse.json({
      imageUrl,
      ocrText: extracted.ocrText,
      amount: extracted.amount,
      description: extracted.description,
      date: extracted.date,
      suggestedCategoryId: classification.categoryId,
      categoryConfidence: classification.categoryConfidence,
      btwRate: classification.btwRate,
      btwConfidence: classification.btwConfidence,
      deductible: classification.deductible,
      deductibleConfidence: classification.deductibleConfidence,
    });
  } catch (error) {
    if (error instanceof ServiceUnavailableError) {
      return NextResponse.json(
        { error: "El servicio de análisis no está disponible" },
        { status: 503 },
      );
    }
    console.error("Receipt scan error:", error);
    return NextResponse.json(
      { error: "No se pudo procesar el recibo" },
      { status: 503 },
    );
  }
}
