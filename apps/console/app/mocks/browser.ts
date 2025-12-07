import { setupWorker } from "msw/browser";

import { agentHandlers } from "~console/mocks/routes/agents";
import { branchHandlers } from "~console/mocks/routes/branches";
import { modelHandlers } from "~console/mocks/routes/models";
import { providerHandlers } from "~console/mocks/routes/providers";

import { addChaos } from "./middleware/chaos";
import { addDelays } from "./middleware/delays";

let handlers = [
  ...agentHandlers,
  ...branchHandlers,
  ...providerHandlers,
  ...modelHandlers,
];

const CHAOS =
  import.meta.env.DEV && import.meta.env.VITE_CHAOS_DISABLE !== "true";
handlers = addDelays(CHAOS ? addChaos(handlers) : handlers);

export const worker = setupWorker(...handlers);
