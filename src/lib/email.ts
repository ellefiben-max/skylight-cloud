import { Resend } from "resend";

function getResend(): Resend {
  const key = process.env.EMAIL_PROVIDER_API_KEY;
  if (!key) throw new Error("EMAIL_PROVIDER_API_KEY is not set");
  return new Resend(key);
}

const FROM = process.env.EMAIL_FROM ?? "Skylight Cloud <onboarding@resend.dev>";

export async function sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
  const { error } = await getResend().emails.send({
    from: FROM,
    to,
    subject: "Verify your Skylight Cloud email",
    text: `Click to verify your email: ${verifyUrl}\n\nLink expires in 24 hours.`,
    html: `<p>Click to verify your email:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>Link expires in 24 hours.</p>`,
  });
  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`);
}

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const { error } = await getResend().emails.send({
    from: FROM,
    to,
    subject: `${otp} — Your Skylight Cloud login code`,
    text: `Your login verification code is: ${otp}\n\nThis code expires in 10 minutes. If you did not request this, ignore this email.`,
    html: `<p>Your login verification code is:</p><h2>${otp}</h2><p>Expires in 10 minutes.</p>`,
  });
  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`);
}
