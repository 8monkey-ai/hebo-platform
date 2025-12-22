import { Input } from "@hebo/shared-ui/components/Input";

import { AgentLogo } from "~console/components/ui/AgentLogo";

export function GeneralSettings({ agent }: { agent: { slug: string, name: string }} ) {
  return (
    <div className="flex flex-row gap-4 items-center">
      <div>
        <AgentLogo size={96} />
      </div>
      <div className="w-full grid grid-cols-[max-content_1fr] gap-x-3 gap-y-2 items-center text-sm">
        <label htmlFor="name">Name</label>
        <Input id="name" readOnly defaultValue={agent.name} />
        <label htmlFor="slug">Slug</label>
        <Input id="slug" readOnly defaultValue={agent.slug} />
      </div>
    </div>
  );
}
