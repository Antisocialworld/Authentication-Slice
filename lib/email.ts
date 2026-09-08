import nodemailer from "nodemailer";
import {
  PASSWORD_RESET_TOKEN_EXPIRY_TEXT,
  VERIFICATION_CODE_EXPIRY_TEXT,
} from "./verification-constants";

// Outgoing email for this app, sent via Gmail's SMTP server (smtp.gmail.com:465)
// when GMAIL_USER and GMAIL_APP_PASSWORD are set in .env. Otherwise falls back
// to logging the message to the server console so the app stays runnable for
// anyone who clones the repo without configuring Gmail sending.
const gmailUser = process.env.GMAIL_USER;
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

function hasGmailCredentials(): boolean {
  return Boolean(gmailUser && gmailAppPassword);
}

// Best-effort real delivery. Fire-and-forget: failures are logged, never
// thrown, so a mail outage can't break signup / resend / reset. Never logs the
// app password (or the transport config that carries it).
async function sendViaGmail(to: string, subject: string, text: string): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: gmailUser as string,
      pass: gmailAppPassword as string,
    },
  });

  try {
    await transporter.sendMail({
      from: gmailUser as string,
      to,
      subject,
      text,
    });
  } catch {
    console.error("[email] failed to send email, check Gmail SMTP credentials");
  } finally {
    transporter.close();
  }
}

// Shared delivery path for every outgoing message. Every specific kind of
// message (verification code, password reset link) funnels through here so the
// Gmail transport setup is defined exactly once instead of being duplicated.
export function deliverEmail(to: string, subject: string, text: string): void {
  if (!hasGmailCredentials()) {
    console.log(`[dev-email] to=${to} subject="${subject}" body:\n${text}`);
    return;
  }

  void sendViaGmail(to, subject, text);
}

export function deliverVerificationCode(email: string, code: string): void {
  deliverEmail(
    email,
    "Your verification code",
    `Your verification code is: ${code}\n\n${VERIFICATION_CODE_EXPIRY_TEXT}`
  );
}

// Distinct from deliverVerificationCode on purpose: this is a link-based
// message, not a typed code, but it ships over the same shared transport.
export function deliverPasswordResetLink(email: string, resetLink: string): void {
  deliverEmail(
    email,
    "Reset your password",
    `You requested a password reset for your Authentication Slice account.\n\n` +
      `Open this link to choose a new password:\n\n${resetLink}\n\n` +
      `${PASSWORD_RESET_TOKEN_EXPIRY_TEXT} It can only be used once. ` +
      `If you didn't request this, you can safely ignore this email.`
  );
}
