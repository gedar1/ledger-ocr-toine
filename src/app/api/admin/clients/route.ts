import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { emailService } from "@/lib/email";
import { hashToken } from "@/lib/activation";

const INVITATION_TTL_MS = 48 * 60 * 60 * 1000;

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const clients = await prisma.clientProfile.findMany({
    where: { accountantId: session.user.id },
    include: { user: { select: { email: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    clients.map((client) => ({
      id: client.id,
      businessName: client.businessName,
      email: client.user.email,
      name: client.user.name,
      status: client.status,
      kvkNumber: client.kvkNumber,
      btwNumber: client.btwNumber,
      createdAt: client.createdAt,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const businessName = typeof body?.businessName === "string" ? body.businessName.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const kvkNumber = typeof body?.kvkNumber === "string" ? body.kvkNumber.trim() : null;
  const btwNumber = typeof body?.btwNumber === "string" ? body.btwNumber.trim() : null;

  if (!businessName || !email || !name) {
    return NextResponse.json(
      { error: "businessName, email y name son requeridos" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Ya existe un usuario con ese email" },
      { status: 400 }
    );
  }

  // Locked placeholder password: the client cannot sign in until they
  // activate via the emailed token and set their own password.
  const placeholderPassword = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);

  const client = await prisma.user.create({
    data: {
      email,
      name,
      password: placeholderPassword,
      role: "CLIENT",
      clientProfile: {
        create: {
          businessName,
          kvkNumber,
          btwNumber,
          status: "INVITED",
          accountantId: session.user.id,
          invitationTokens: {
            create: {
              tokenHash,
              expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
            },
          },
        },
      },
    },
    include: { clientProfile: true },
  });

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const activationUrl = `${appUrl}/activate/${rawToken}`;
  await emailService.sendInvitation(email, activationUrl);

  return NextResponse.json(
    {
      id: client.clientProfile!.id,
      businessName: client.clientProfile!.businessName,
      email: client.email,
      name: client.name,
      status: client.clientProfile!.status,
    },
    { status: 201 }
  );
}
