import { exec } from "node:child_process";
import { promisify } from "node:util";

export const handler = async () => {
  await promisify(exec)("npx prisma migrate deploy --config ./prisma.config.ts");
  return { ok: true };
};
