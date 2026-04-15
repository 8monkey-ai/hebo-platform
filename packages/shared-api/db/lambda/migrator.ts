import { exec } from "node:child_process";
import { promisify } from "node:util";

import { getConnectionString } from "../postgres";

export const handler = async (event: { schema: string }) => {
  await promisify(exec)("npx prisma migrate deploy --config ./prisma.config.ts", {
    env: {
      ...process.env,
      POSTGRES_URL: getConnectionString(event.schema),
    },
  });
  return { ok: true };
};
