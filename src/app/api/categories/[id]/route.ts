import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function assertOwnedCategory(categoryId: string, accountantId: string) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category || category.accountantId !== accountantId) {
    return null;
  }
  return category;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await assertOwnedCategory(id, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const data: Record<string, unknown> = {};
  if (typeof body?.name === "string") data.name = body.name.trim();
  if (typeof body?.icon === "string") data.icon = body.icon;
  if (typeof body?.color === "string") data.color = body.color;
  if (typeof body?.defaultDeductible === "boolean") data.defaultDeductible = body.defaultDeductible;
  if (typeof body?.defaultBtwRate === "number") data.defaultBtwRate = body.defaultBtwRate;

  try {
    const category = await prisma.category.update({ where: { id }, data });
    return NextResponse.json(category);
  } catch {
    return NextResponse.json(
      { error: "No se pudo actualizar la categoría" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await assertOwnedCategory(id, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const expenses = await prisma.expense.count({ where: { categoryId: id } });
  if (expenses > 0) {
    return NextResponse.json(
      { error: "No se puede eliminar: tiene gastos asociados" },
      { status: 400 }
    );
  }

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
