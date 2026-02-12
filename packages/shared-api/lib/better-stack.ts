import { getSecret } from "../utils/secrets";

const getBetterStackConfig = async () => {
  const [endpoint, sourceToken] = await Promise.all([
    getSecret("BetterStackEndpoint"),
    getSecret("BetterStackSourceToken"),
  ]);

  if (!endpoint || !sourceToken) {
    return;
  }

  return { endpoint, sourceToken };
};

export const betterStackConfig = await getBetterStackConfig();
