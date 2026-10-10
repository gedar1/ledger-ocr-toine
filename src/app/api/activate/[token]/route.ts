import { NextRequest, NextResponse } from "next/server";
import { findValidInvitation, activateInvitation } from "@/lib/activation";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const invitation = await findValidInvitation(token);

  if (!invitation) {
    return NextResponse.json(
      { valid: false, error: "Token inválido o expirado" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    valid: true,
    businessName: invitation.clientProfile.businessName,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 8 caracteres" },
      { status: 400 }
    );
  }

  const result = await activateInvitation(token, password);

  if (!result.ok) {
    const message =
      result.error === "already_used"
        ? "Este enlace de activación ya fue utilizado"
        : "Enlace de activación inválido o expirado";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
