import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: { category: true, client: { select: { accountantId: true } } },
  });

  if (!expense) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const allowed =
    (session.user.role === "CLIENT" &&
      expense.clientId === session.user.clientProfileId) ||
    (session.user.role === "ACCOUNTANT" &&
      expense.client.accountantId === session.user.id);

  if (!allowed) {
    // 404, not 403, to avoid leaking the existence of another tenant's
    // expense.
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  return NextResponse.json(expense);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CLIENT" || !session.user.clientProfileId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const expense = await prisma.expense.findUnique({ where: { id } });

  if (!expense || expense.clientId !== session.user.clientProfileId) {
    // 404, not 403, to avoid leaking the existence of another tenant's
    // expense.
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  if (expense.status !== "PENDING" || expense.locked) {
    return NextResponse.json(
      { error: "El gasto ya fue revisado y no se puede editar" },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  const data: Record<string, unknown> = {};

  if (typeof body?.amount === "number" && body.amount > 0) {
    data.amount = body.amount;
  }
  if (typeof body?.description === "string" && body.description.trim()) {
    data.description = body.description.trim();
  }
  if (typeof body?.date === "string") {
    const parsed = new Date(body.date);
    if (!Number.isNaN(parsed.getTime())) data.date = parsed;
  }
  if (typeof body?.deductible === "boolean") {
    data.deductible = body.deductible;
  }
  if (typeof body?.btwRate === "number") {
    data.btwRate = body.btwRate;
  }

  if (typeof body?.categoryId === "string" && body.categoryId !== expense.categoryId) {
    // Re-verify the new category still belongs to this client's own
    // accountant — same rule as POST, never trust it blindly.
    const clientProfile = await prisma.clientProfile.findUnique({
      where: { id: session.user.clientProfileId },
      select: { accountantId: true },
    });
    const category = clientProfile
      ? await prisma.category.findUnique({ where: { id: body.categoryId } })
      : null;
    if (!clientProfile || !category || category.accountantId !== clientProfile.accountantId) {
      return NextResponse.json({ error: "Categoría inválida" }, { status: 400 });
    }
    data.categoryId = body.categoryId;
  }

  const updated = await prisma.expense.update({
    where: { id },
    data,
    include: { category: true },
  });

  return NextResponse.json(updated);
}
