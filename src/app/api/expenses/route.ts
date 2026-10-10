import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (session.user.role === "CLIENT") {
    if (!session.user.clientProfileId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const expenses = await prisma.expense.findMany({
      // Real multi-tenant isolation enforcement: scoped directly in the
      // WHERE clause, never by filtering an unscoped result in memory.
      where: { clientId: session.user.clientProfileId },
      include: { category: true },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(expenses);
  }

  // ACCOUNTANT
  const clientId = req.nextUrl.searchParams.get("clientId");

  if (clientId) {
    const clientProfile = await prisma.clientProfile.findUnique({
      where: { id: clientId },
      select: { accountantId: true },
    });
    if (!clientProfile || clientProfile.accountantId !== session.user.id) {
      // An accountant must never see another accountant's clients' expenses.
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const expenses = await prisma.expense.findMany({
      where: { clientId },
      include: { category: true },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(expenses);
  }

  // No ?clientId filter: list every expense across this accountant's own
  // clients only, scoped via the relation in the WHERE clause.
  const expenses = await prisma.expense.findMany({
    where: { client: { accountantId: session.user.id } },
    include: {
      category: true,
      client: { select: { businessName: true } },
    },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(expenses);
}

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

  const body = await req.json().catch(() => null);
  const amount = typeof body?.amount === "number" ? body.amount : NaN;
  const description =
    typeof body?.description === "string" ? body.description.trim() : "";
  const parsedDate =
    typeof body?.date === "string" ? new Date(body.date) : null;
  const categoryId =
    typeof body?.categoryId === "string" ? body.categoryId : "";

  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !description ||
    !categoryId ||
    !parsedDate ||
    Number.isNaN(parsedDate.getTime())
  ) {
    return NextResponse.json(
      { error: "Datos de gasto inválidos" },
      { status: 400 },
    );
  }

  // Resolve this client's own accountant so the chosen category can be
  // verified against it — never trust a client-supplied categoryId
  // blindly, that would let a client borrow another accountant's category.
  const clientProfile = await prisma.clientProfile.findUnique({
    where: { id: session.user.clientProfileId },
    select: { accountantId: true },
  });
  if (!clientProfile) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });
  if (!category || category.accountantId !== clientProfile.accountantId) {
    return NextResponse.json({ error: "Categoría inválida" }, { status: 400 });
  }

  const deductible =
    typeof body?.deductible === "boolean"
      ? body.deductible
      : category.defaultDeductible;
  const btwRate =
    typeof body?.btwRate === "number" ? body.btwRate : category.defaultBtwRate;

  // Optional receipt/OCR/classification fields, populated when this
  // expense was created from the FEAT-004 scan flow
  // (src/app/app/expenses/scan/page.tsx -> POST /api/receipts/scan). All
  // three are null for manually-created expenses, same as before FEAT-004.
  const receipt = typeof body?.receipt === "string" ? body.receipt : null;
  const ocrText = typeof body?.ocrText === "string" ? body.ocrText : null;
  const classificationConfidence =
    typeof body?.classificationConfidence === "number"
      ? body.classificationConfidence
      : null;

  const expense = await prisma.expense.create({
    data: {
      amount,
      currency: "EUR",
      description,
      date: parsedDate,
      categoryId,
      // Never trust a client-supplied clientId — always the session's own.
      clientId: session.user.clientProfileId,
      deductible,
      btwRate,
      receipt,
      ocrText,
      classificationConfidence,
      // Never auto-approved regardless of confidence — always PENDING,
      // the accountant always reviews manually (FEAT-004's CRITICAL
      // requirement).
      status: "PENDING",
    },
    include: { category: true },
  });

  return NextResponse.json(expense, { status: 201 });
}
