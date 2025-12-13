import { createMessage } from "@upyo/core";
import { SmtpTransport } from "@upyo/smtp";

import { getSecret } from "../../utils/secrets";
import { isRemote, trustedOrigins } from "../env";

const smtpHost = await getSecret("SmtpHost", false);
const smtpPort = Number(await getSecret("SmtpPort", false));
const smtpUser = await getSecret("SmtpUser", false);
const smtpPass = await getSecret("SmtpPass", false);
const smtpFrom = await getSecret("SmtpFrom", false);
const logoUrl = "https://hebo.ai/_next/image?url=%2Fhebo.png&w=48&q=75";

const transport = new SmtpTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

export async function sendVerificationOtpEmail({
  email,
  otp,
}: {
  email: string;
  otp: string;
}) {
  const magicLinkUrl = new URL("/signin/magic-link", trustedOrigins[0]);
  magicLinkUrl.searchParams.set("email", email);
  magicLinkUrl.searchParams.set("otp", otp);

  // In local dev, we may not have SMTP credentials, so we just log the OTP.
  if (!isRemote) {
    console.info(">>> OTP:", otp);
    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !smtpFrom) {
      return;
    }
  }

  const html = `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(180deg,#fefce8 0%,#f8fafc 45%,#eef2ff 100%);padding:32px 0;color:#0f172a;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <tr>
        <td align="center">
          <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;padding:32px 28px;box-shadow:0 8px 30px rgba(15,23,42,0.08);text-align:center;">
            <tr>
              <td style="padding-bottom:20px;text-align:left;">
                <div style="display:inline-flex;align-items:center;gap:10px;">
                  <img src="${logoUrl}" alt="Hebo icon" width="36" height="36" style="display:block;border-radius:10px;" />
                </div>
              </td>
            </tr>
            <tr>
              <td style="font-size:22px;font-weight:700;color:#0f172a;padding-bottom:10px;text-align:center;">
                Sign in to Hebo Cloud
              </td>
            </tr>
            <tr>
              <td style="font-size:14px;line-height:22px;color:#475569;padding-bottom:16px;text-align:center;">
                Hi! This is your one-time password for signing in.
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:12px 0 20px;">
                <div style="display:inline-block;font-size:26px;letter-spacing:6px;font-weight:800;color:#0f172a;background:#f8fafc;border:1px dashed #e2e8f0;padding:16px 20px;border-radius:14px;">
                  ${otp}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:18px;text-align:center;font-size:14px;line-height:22px;color:#0f172a;">
                Or you can click on <a href="${magicLinkUrl}" style="color:#0f172a;font-weight:700;text-decoration:underline;">this link</a> to sign in.
              </td>
            </tr>
            <tr>
              <td style="padding-top:10px;">
                <div style="border-top:1px solid #e2e8f0;margin:6px 0 10px;"></div>
                <div style="font-size:12px;line-height:18px;color:#475569;text-align:center;">
                  If you weren’t expecting this email, you can safely ignore it.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  const message = createMessage({
    from: `Hebo Cloud <${smtpFrom}>`,
    to: email,
    subject: "Sign in to Hebo Cloud",
    content: {
      text: `Sign in to Hebo Cloud\n\nHi! This is your one-time password for signing in:\n\n${otp}\n\nOr you can click this link to sign in:\n${magicLinkUrl}\n\nIf you were not expecting this email, you can safely ignore it.`,
      html,
    },
  });
  const receipt = await transport.send(message);
  if (!receipt.successful) {
    throw new Error(
      `Failed to send verification email: ${receipt.errorMessages.join(", ")}`,
    );
  }
}
