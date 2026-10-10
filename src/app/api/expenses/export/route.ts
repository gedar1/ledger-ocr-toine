import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const CSV_HEADER = [
  "date",
  "description",
  "category",
  "amount",
  "btwRate",
  "deductible",
  "status",
];

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildCsv(
  rows: {
    date: Date;
    description: string;
    category: { name: string };
    amount: number;
    btwRate: number;
    deductible: boolean;
    status: string;
  }[],
): string {
  const lines = [CSV_HEADER.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.date.toISOString().slice(0, 10),
        escapeCsvField(row.description),
        escapeCsvField(row.category.name),
        row.amount.toFixed(2),
        String(row.btwRate),
        row.deductible ? "true" : "false",
        row.status,
      ].join(","),
    );
  }
  return lines.join("\n");
}

/**
 * CSV export of expenses with columns date, description, category,
 * amount, btwRate, deductible, status. Scoped by role the same way as
 * GET /api/expenses: CLIENT always exports their own clientId regardless
 * of any ?clientId query param, ACCOUNTANT must own the given ?clientId
 * (403 otherwise). Mirrors the header+rows+Content-Disposition approach
 * from the reference export route pattern (read-only reference) but with
 * this task's required columns.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (from) {
    const parsed = new Date(from);
    if (!Number.isNaN(parsed.getTime())) dateFilter.gte = parsed;
  }
  if (to) {
    const parsed = new Date(to);
    if (!Number.isNaN(parsed.getTime())) dateFilter.lte = parsed;
  }

  let clientId: string;

  if (session.user.role === "CLIENT") {
    if (!session.user.clientProfileId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    // CLIENT always exports their own data, regardless of any ?clientId
    // query param supplied — never trust a client-supplied clientId.
    clientId = session.user.clientProfileId;
  } else if (session.user.role === "ACCOUNTANT") {
    const requestedClientId = req.nextUrl.searchParams.get("clientId");
    if (!requestedClientId) {
      return NextResponse.json(
        { error: "clientId es requerido" },
        { status: 400 },
      );
    }
    const clientProfile = await prisma.clientProfile.findUnique({
      where: { id: requestedClientId },
      select: { accountantId: true },
    });
    if (!clientProfile || clientProfile.accountantId !== session.user.id) {
      // An accountant must never export another accountant's client's data.
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    clientId = requestedClientId;
  } else {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const expenses = await prisma.expense.findMany({
    where: {
      clientId,
      ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
    },
    include: { category: true },
    orderBy: { date: "desc" },
  });

  const csv = buildCsv(expenses);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gastos.csv"`,
    },
  });
}
