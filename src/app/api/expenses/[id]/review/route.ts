import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: { client: { select: { accountantId: true } } },
  });

  if (!expense || expense.client.accountantId !== session.user.id) {
    // The expense's client must belong to this accountant.
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (expense.locked) {
    return NextResponse.json(
      { error: "Este gasto ya fue revisado" },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  const decision = body?.decision;
  const note = typeof body?.note === "string" ? body.note.trim() : "";

  if (decision !== "APPROVED" && decision !== "REJECTED") {
    return NextResponse.json(
      { error: "decision debe ser APPROVED o REJECTED" },
      { status: 400 }
    );
  }

  if (decision === "REJECTED" && !note) {
    return NextResponse.json(
      { error: "Se requiere una nota al rechazar un gasto" },
      { status: 400 }
    );
  }

  const updated = await prisma.expense.update({
    where: { id },
    data: {
      status: decision,
      reviewNote: note || null,
      reviewedById: session.user.id,
      reviewedAt: new Date(),
      // Both APPROVED and REJECTED lock the expense: once an accountant has
      // made a decision, the client can no longer edit it. Locking REJECTED
      // too (not just APPROVED) matches the "accountant always reviews
      // manually" intent for either outcome.
      locked: true,
    },
    include: { category: true },
  });

  return NextResponse.json(updated);
}
