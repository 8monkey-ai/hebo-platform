import { redirect } from "react-router";

import { authService } from "~console/lib/auth";


export async function clientLoader() {
  await authService.signOut();
  return redirect("/signin");
}


export default function SignOut() {
  return null;
}

