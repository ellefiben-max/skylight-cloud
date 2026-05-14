import nodemailer from "nodemailer";

function getTransport() {
  const apiKey = process.env.EMAIL_PROVIDER_API_KEY;
  const from = process.env.EMAIL_FROM ?? "noreply@example.com";

  if (process.env.EMAIL_SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_SMTP_HOST,
      port: Number(process.env.EMAIL_SMTP_PORT ?? 587),
      secure: process.env.EMAIL_SMTP_SECURE === "true",
      auth: { user: process.env.EMAIL_SMTP_USER, pass: process.env.EMAIL_SMTP_PASS },
    });
  }

  if (apiKey && process.env.EMAIL_PROVIDER === "resend") {
    return nodemailer.createTransport({
      host: "smtp.resend.com",
      port: 465,
      secure: true,
      auth: { user: "resend", pass: apiKey },
    });
  }

  // Dev fallback: log to console
  return nodemailer.createTransport({ jsonTransport: true });
}

export async function sendVerificationEmail(
  to: string,
  verifyUrl: string
): Promise<void> {
  const transport = getTransport();
  const info = await transport.sendMail({
    from: process.env.EMAIL_FROM ?? "Skylight Cloud <noreply@example.com>",
    to,
    subject: "Verify your Skylight Cloud email",
    text: `Click to verify your email: ${verifyUrl}\n\nLink expires in 24 hours.`,
    html: `<p>Click to verify your email:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>Link expires in 24 hours.</p>`,
  });

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log("[email:dev] Verification email:", JSON.stringify(info));
  }
}

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const transport = getTransport();
  const info = await transport.sendMail({
    from: process.env.EMAIL_FROM ?? "Skylight Cloud <noreply@example.com>",
    to,
    subject: `${otp} — Your Skylight Cloud login code`,
    text: `Your login verification code is: ${otp}\n\nThis code expires in 10 minutes. If you did not request this, ignore this email.`,
    html: `<p>Your login verification code is:</p><h2>${otp}</h2><p>Expires in 10 minutes.</p>`,
  });

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log("[email:dev] OTP email:", JSON.stringify(info));
  }
}
