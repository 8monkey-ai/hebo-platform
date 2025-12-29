import { exec } from "node:child_process";
import { promisify } from "node:util";

import { getConnectionString } from "~api/lib/db/client";

export const handler = async () => {
  await promisify(exec)(
    "npx prisma migrate deploy --config ./prisma.config.ts",
    {
      env: {
        ...process.env,
        DATABASE_URL: `${getConnectionString()}?schema=api`,
      },
    },
  );
  return { ok: true };
};
