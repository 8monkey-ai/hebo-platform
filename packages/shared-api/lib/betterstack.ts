import { getSecret } from "../utils/secrets";

const fetchBetterStackConfig = async () => {
  const [endpoint, sourceToken] = await Promise.all([
    getSecret("BetterStackEndpoint", false),
    getSecret("BetterStackSourceToken", false),
  ]);

  if (!endpoint || !sourceToken) {
    return;
  }

  return { endpoint, sourceToken };
};

export const betterStackConfig = await fetchBetterStackConfig();
