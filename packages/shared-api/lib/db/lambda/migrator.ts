import { exec } from "node:child_process";
import { promisify } from "node:util";

import { getConnectionString } from "../connection";

export const handler = async (event: { schema: string }) => {
  await promisify(exec)("npx prisma@7.4.2 migrate deploy --config ./prisma.config.ts", {
    env: {
      ...process.env,
      DATABASE_URL: getConnectionString(event.schema),
    },
  });
  return { ok: true };
};
