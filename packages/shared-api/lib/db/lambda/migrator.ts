import { exec } from "node:child_process";
import { promisify } from "node:util";

import { getConnectionString } from "../connection";

export const handler = async (event: { schema: "api" | "auth" }) => {
  await promisify(exec)(
    "npx prisma migrate deploy --config ./prisma.config.ts",
    {
      env: {
        ...process.env,
        DATABASE_URL: getConnectionString(event.schema),
      },
    },
  );
  return { ok: true };
};
