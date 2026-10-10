/**
 * Email abstraction for invitation emails. The console stub below is the
 * active implementation until a real provider is confirmed with the
 * accountant (tentatively Resend, see RESEND_API_KEY in .env). Swapping in a
 * real provider only requires implementing EmailService and reassigning
 * `emailService` below — callers (e.g. POST /api/admin/clients) never change.
 */
export interface EmailService {
  sendInvitation(to: string, activationUrl: string): Promise<void>;
}

class ConsoleEmailService implements EmailService {
  async sendInvitation(to: string, activationUrl: string): Promise<void> {
    console.log(
      `[EmailService] Invitación para ${to}: visita ${activationUrl} para activar la cuenta.`
    );
  }
}

export const emailService: EmailService = new ConsoleEmailService();
