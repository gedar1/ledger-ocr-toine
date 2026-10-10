import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let accountantId: string;
  if (session.user.role === "ACCOUNTANT") {
    accountantId = session.user.id;
  } else {
    const clientProfile = await prisma.clientProfile.findUnique({
      where: { userId: session.user.id },
      select: { accountantId: true },
    });
    if (!clientProfile) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    accountantId = clientProfile.accountantId;
  }

  const categories = await prisma.category.findMany({
    where: { accountantId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
  }

  const icon = typeof body?.icon === "string" ? body.icon : "tag";
  const color = typeof body?.color === "string" ? body.color : "#6366f1";
  const defaultDeductible =
    typeof body?.defaultDeductible === "boolean" ? body.defaultDeductible : true;
  const defaultBtwRate =
    typeof body?.defaultBtwRate === "number" ? body.defaultBtwRate : 21;

  try {
    const category = await prisma.category.create({
      data: {
        name,
        icon,
        color,
        defaultDeductible,
        defaultBtwRate,
        // Always forced server-side — never trust a client-supplied
        // accountantId, otherwise an accountant could write into another
        // accountant's category list.
        accountantId: session.user.id,
      },
    });
    return NextResponse.json(category, { status: 201 });
  } catch {
    return NextResponse.json({ error: "La categoría ya existe" }, { status: 400 });
  }
}
