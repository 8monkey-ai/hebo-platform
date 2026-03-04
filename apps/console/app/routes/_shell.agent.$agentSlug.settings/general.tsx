import { Input } from "@hebo/shared-ui/components/Input";

import { AgentLogo } from "~console/components/ui/AgentLogo";

export function GeneralSettings({ agent }: { agent: { slug: string; name: string } }) {
  return (
    <div className="flex flex-row items-center gap-4">
      <div>
        <AgentLogo size={96} />
      </div>
      <div className="grid w-full grid-cols-[max-content_1fr] items-center gap-x-3 gap-y-2 text-sm">
        <label htmlFor="name">Name</label>
        <Input id="name" readOnly defaultValue={agent.name} />
        <label htmlFor="slug">Slug</label>
        <Input id="slug" readOnly defaultValue={agent.slug} />
      </div>
    </div>
  );
}
