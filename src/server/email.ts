import { Resend } from "resend";

let client: Resend | null = null;

/** Sends via Resend when RESEND_API_KEY is set, otherwise logs. Never throws: email must not break the user's action. */
export async function sendEmail(msg: { to: string; subject: string; html: string }): Promise<void> {
  try {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      console.info(`[email:dev] to=${msg.to} subject="${msg.subject}"`);
      return;
    }
    client ??= new Resend(key);
    const { error } = await client.emails.send({
      from: process.env.EMAIL_FROM ?? "Shipping <noreply@example.com>",
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
    });
    if (error) console.error("[email] send failed", error);
  } catch (e) {
    console.error("[email] send failed", e);
  }
}
