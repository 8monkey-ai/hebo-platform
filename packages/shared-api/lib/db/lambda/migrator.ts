import { exec } from "node:child_process";
import { promisify } from "node:util";

import { getConnectionString } from "../connection";

const PRISMA_DIR = "/tmp/prisma-cli";

const install = `npm install --prefix ${PRISMA_DIR} prisma --no-save && rm -rf /tmp/.npm/_cacache`;
const migrate = `${PRISMA_DIR}/node_modules/.bin/prisma migrate deploy --config ./prisma.config.ts`;

export const handler = async (event: { schema: string }) => {
  await promisify(exec)(`${install} && ${migrate}`, {
    env: {
      ...process.env,
      DATABASE_URL: getConnectionString(event.schema),
    },
  });
  return { ok: true };
};
