import { redirect } from "react-router";

import { authService } from "~console/lib/auth";

async function verifyMagicLinkMiddleware({ request }: { request: Request }) {
  const searchParams = new URL(request.url).searchParams;
  const email = searchParams.get("email");
  const otp = searchParams.get("otp");
  if (!email || !otp) throw redirect("/signin");

  try {
    await authService.signInWithMagicLink(otp.toUpperCase(), email);
  } catch {
    throw redirect("/signin");
  }
  throw redirect("/");
}

export const clientMiddleware = [verifyMagicLinkMiddleware];

export default function MagicLinkVerification() {
  return null;
}

