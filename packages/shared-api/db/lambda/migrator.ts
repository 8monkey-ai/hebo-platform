import { exec } from "node:child_process";
import { promisify } from "node:util";

import { getConnectionString } from "../postgres";

export const handler = async (event: { schema: string }) => {
  // oxlint-disable-next-line strict-void-return -- exec overloads confuse the checker
  // FUTURE: un-pin as soon as we upgrade to Prisma 8
  await promisify(exec)("npx prisma@7.4.2 migrate deploy --config ./prisma.config.ts", {
    env: {
      ...process.env,
      POSTGRES_URL: getConnectionString(event.schema),
    },
  });
  return { ok: true };
};
