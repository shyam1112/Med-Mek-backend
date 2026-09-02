import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

// Lazily built so a missing/placeholder SMTP config doesn't crash the server
// at startup — it only surfaces when an email actually needs to go out.
const getTransporter = (): nodemailer.Transporter | null => {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
};

export const sendPasswordResetEmail = async (to: string, resetToken: string): Promise<boolean> => {
  const client = getTransporter();
  if (!client) {
    console.error(
      '[mailer] SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASS) — password reset email not sent.'
    );
    return false;
  }

  try {
    await client.sendMail({
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to,
      subject: 'MedMek — Password Reset Code',
      text:
        `You requested a password reset for your MedMek account.\n\n` +
        `Reset code: ${resetToken}\n\n` +
        `Enter this code on the "Reset Password" screen to set a new password. ` +
        `This code expires in 1 hour.\n\n` +
        `If you did not request this, you can safely ignore this email.`,
      html:
        `<p>You requested a password reset for your MedMek account.</p>` +
        `<p style="font-size:18px;font-weight:700;letter-spacing:1px;">${resetToken}</p>` +
        `<p>Enter this code on the "Reset Password" screen to set a new password. ` +
        `This code expires in <b>1 hour</b>.</p>` +
        `<p>If you did not request this, you can safely ignore this email.</p>`,
    });
    return true;
  } catch (err) {
    console.error('[mailer] Failed to send password reset email:', err);
    return false;
  }
};
