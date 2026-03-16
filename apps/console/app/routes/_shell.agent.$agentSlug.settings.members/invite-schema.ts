import { z } from "zod";

export const inviteSchema = z.object({
  email: z.email("Enter a valid email address"),
  role: z.enum(["member", "admin"]),
});
