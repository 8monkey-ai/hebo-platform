import { exec } from "node:child_process";
import { promisify } from "node:util";

import { getConnectionString } from "../postgres";

// oxlint-disable-next-line strict-void-return -- exec overloads confuse the checker
const execAsync = promisify(exec);

export const handler = async (event: { schema: string }) => {
  await execAsync("npx prisma migrate deploy --config ./prisma.config.ts", {
    env: {
      ...process.env,
      POSTGRES_URL: getConnectionString(event.schema),
    },
  });
  return { ok: true };
};
