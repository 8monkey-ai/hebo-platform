import { exec } from "node:child_process";
import { promisify } from "node:util";

import { getConnectionString } from "../src/connection";

export const handler = async () => {
  await promisify(exec)("npx prisma migrate deploy", {
    env: {
      ...process.env,
      DATABASE_URL: getConnectionString(),
    },
  });
  return { ok: true };
};
