import { setupWorker } from "msw/browser";

import { modelHandlers } from "~console/mocks/routes/models";
import { providerHandlers } from "~console/mocks/routes/providers";
import { traceHandlers } from "~console/mocks/routes/traces";
import { workspaceHandlers } from "~console/mocks/routes/workspaces";

import { addChaos } from "./middleware/chaos";
import { addDelays } from "./middleware/delays";

let handlers = [
  ...traceHandlers,
  ...workspaceHandlers,
  ...providerHandlers,
  ...modelHandlers,
];

const CHAOS = import.meta.env.DEV && import.meta.env.VITE_CHAOS_DISABLE !== "true";
handlers = addDelays(CHAOS ? addChaos(handlers) : handlers);

export const worker = setupWorker(...handlers);
