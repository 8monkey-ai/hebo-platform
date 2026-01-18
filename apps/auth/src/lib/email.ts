import { createMessage } from "@upyo/core";
import { SmtpTransport } from "@upyo/smtp";

import { getSecret } from "@hebo/shared-api/utils/secrets";

const isProd = process.env.NODE_ENV === "production";

const smtpHost = await getSecret("SmtpHost", false);
const smtpPort = Number(await getSecret("SmtpPort", false));
const smtpUser = await getSecret("SmtpUser", false);
const smtpPass = await getSecret("SmtpPass", false);
const smtpFrom = await getSecret("SmtpFrom", false);
const logoUrl = "https://hebo.ai/icon.png";

const transport = new SmtpTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: { user: smtpUser, pass: smtpPass },
});

const hasSmtpConfig = () =>
  smtpHost && smtpPort && smtpUser && smtpPass && smtpFrom;

const emailTemplate = (title: string, subtitle: string, body: string) => `
<table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(180deg,#fefce8 0%,#f8fafc 45%,#eef2ff 100%);padding:32px 0;color:#0f172a;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <tr>
    <td align="center">
      <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;padding:32px 28px;box-shadow:0 8px 30px rgba(15,23,42,0.08);text-align:center;">
        <tr>
          <td style="padding-bottom:20px;text-align:left;">
            <img src="${logoUrl}" alt="Hebo icon" width="36" height="36" style="display:block;border-radius:10px;" />
          </td>
        </tr>
        <tr><td style="font-size:22px;font-weight:700;color:#0f172a;padding-bottom:10px;text-align:center;">${title}</td></tr>
        <tr><td style="font-size:14px;line-height:22px;color:#475569;padding-bottom:16px;text-align:center;">${subtitle}</td></tr>
        ${body}
        <tr>
          <td style="padding-top:10px;">
            <div style="border-top:1px solid #e2e8f0;margin:6px 0 10px;"></div>
            <div style="font-size:12px;line-height:18px;color:#475569;text-align:center;">If you weren't expecting this email, you can safely ignore it.</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

export async function sendVerificationOtpEmail({
  email,
  otp,
  consoleUrl,
}: {
  email: string;
  otp: string;
  consoleUrl?: string;
}) {
  if (!isProd) {
    console.info(">>> OTP:", otp);
    if (!hasSmtpConfig()) return;
  }
  if (!consoleUrl)
    return console.warn(
      "Missing origin header, cannot send verification email",
    );

  const magicLinkUrl = new URL("/signin/magic-link", consoleUrl);
  magicLinkUrl.searchParams.set("email", email);
  magicLinkUrl.searchParams.set("otp", otp);

  const html = emailTemplate(
    "Sign in to Hebo Cloud",
    "Hi! Here's your one-time password to sign in.",
    `<tr><td align="center" style="padding:12px 0 20px;"><div style="display:inline-block;font-size:26px;letter-spacing:6px;font-weight:800;color:#0f172a;background:#f8fafc;border:1px dashed #e2e8f0;padding:16px 20px;border-radius:14px;">${otp}</div></td></tr>
     <tr><td style="padding-bottom:18px;text-align:center;font-size:14px;line-height:22px;color:#0f172a;">Or click <a href="${magicLinkUrl}" style="color:#0f172a;font-weight:700;text-decoration:underline;">this link</a> to sign in.</td></tr>`,
  );

  const message = createMessage({
    from: `Hebo Cloud <${smtpFrom}>`,
    to: email,
    subject: "Sign in to Hebo Cloud",
    content: {
      text: `Sign in to Hebo Cloud\n\nHi! Here's your one-time password to sign in:\n\n${otp}\n\nOr click this link: ${magicLinkUrl}\n\nIf you weren't expecting this email, you can safely ignore it.`,
      html,
    },
  });
  const receipt = await transport.send(message);
  if (!receipt.successful)
    throw new Error(
      `Failed to send email: ${receipt.errorMessages.join(", ")}`,
    );
}

export async function sendOrganizationInvitationEmail({
  email,
  invitationId,
  organizationName,
  inviterName,
  inviterEmail,
  consoleUrl,
}: {
  email: string;
  invitationId: string;
  organizationName: string;
  inviterName: string | null;
  inviterEmail: string;
  consoleUrl?: string;
}) {
  const acceptUrl = new URL("/accept-invitation", consoleUrl);
  if (!isProd) {
    console.info(
      `>>> Organization Invitation: ${acceptUrl.toString()}?id=${invitationId}`,
    );
    if (!hasSmtpConfig()) return;
  }
  if (!consoleUrl)
    return console.warn("Missing origin header, cannot send invitation email");

  acceptUrl.searchParams.set("id", invitationId);
  const inviter = inviterName || inviterEmail;
  const subject = `You've been invited to ${organizationName}`;

  const html = emailTemplate(
    subject,
    `Hi! ${inviter} has invited you to join <strong>${organizationName}</strong> on Hebo Cloud.`,
    `<tr><td style="padding:20px 0;"><a href="${acceptUrl}" style="display:inline-block;background:#0f172a;color:#fff;padding:14px 32px;border-radius:10px;font-weight:600;text-decoration:none;">Accept Invitation</a></td></tr>`,
  );

  const message = createMessage({
    from: `Hebo Cloud <${smtpFrom}>`,
    to: email,
    subject,
    content: {
      text: `${subject}\n\nHi! ${inviter} has invited you to join ${organizationName} on Hebo Cloud.\n\nClick this link to accept: ${acceptUrl}\n\nIf you weren't expecting this invitation, you can safely ignore it.`,
      html,
    },
  });
  const receipt = await transport.send(message);
  if (!receipt.successful)
    throw new Error(
      `Failed to send email: ${receipt.errorMessages.join(", ")}`,
    );
}
