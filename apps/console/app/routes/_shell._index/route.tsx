import { redirect } from "react-router";

import { api } from "~console/lib/service";

async function defaultAgentMiddleware() {
  const { data: agents = [] } = await api.agents.get();

  // FUTURE fade-in the next page
  // FUTURE remember last agent and branch in session storage
  if (agents?.length) {
    throw redirect(`/agent/${agents[0].slug}/branch/main`);
  }
  throw redirect("/agent/create");
}

export const clientMiddleware = [defaultAgentMiddleware];

export default function EmptyRoute() {
  return <></>
}
