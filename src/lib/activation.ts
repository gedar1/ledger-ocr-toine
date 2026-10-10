import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export type ActivationResult =
  | { ok: true }
  | { ok: false; error: "invalid_or_expired" | "already_used" };

class ActivationError extends Error {
  constructor(public code: "invalid_or_expired" | "already_used") {
    super(code);
  }
}

export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Validates an invitation token for display purposes (e.g. the activation
 * page) WITHOUT consuming it. Returns null if the token doesn't exist, was
 * already used, or has expired.
 */
export async function findValidInvitation(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const invitation = await prisma.invitationToken.findUnique({
    where: { tokenHash },
    include: { clientProfile: true },
  });

  if (!invitation || invitation.usedAt || invitation.expiresAt <= new Date()) {
    return null;
  }

  return invitation;
}

/**
 * Validates and consumes an invitation token: sets the client's new
 * password, activates their ClientProfile, and marks the token used — all
 * inside a single transaction so a race between two requests for the same
 * token can never activate twice. Used directly by
 * POST /api/activate/[token]/route.ts and by scripts/verify-invitation.ts.
 */
export async function activateInvitation(
  rawToken: string,
  newPassword: string
): Promise<ActivationResult> {
  const tokenHash = hashToken(rawToken);
  const passwordHash = await bcrypt.hash(newPassword, 10);

  try {
    await prisma.$transaction(async (tx) => {
      const invitation = await tx.invitationToken.findUnique({
        where: { tokenHash },
        include: { clientProfile: true },
      });

      if (!invitation) {
        throw new ActivationError("invalid_or_expired");
      }
      if (invitation.usedAt) {
        throw new ActivationError("already_used");
      }
      if (invitation.expiresAt <= new Date()) {
        throw new ActivationError("invalid_or_expired");
      }

      // Atomic, race-safe single-use: the UPDATE itself only matches (and
      // locks) the row while usedAt is still null, so a concurrent second
      // attempt will see count === 0 even if it read the row before this
      // transaction committed.
      const consumed = await tx.invitationToken.updateMany({
        where: { id: invitation.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (consumed.count === 0) {
        throw new ActivationError("already_used");
      }

      await tx.user.update({
        where: { id: invitation.clientProfile.userId },
        data: { password: passwordHash },
      });

      await tx.clientProfile.update({
        where: { id: invitation.clientProfileId },
        data: { status: "ACTIVE" },
      });
    });

    return { ok: true };
  } catch (error) {
    if (error instanceof ActivationError) {
      return { ok: false, error: error.code };
    }
    throw error;
  }
}
