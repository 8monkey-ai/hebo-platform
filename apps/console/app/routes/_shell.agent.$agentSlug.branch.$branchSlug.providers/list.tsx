import { Eraser, FileSliders, HelpCircle, MoreVertical } from "lucide-react";
import { useState } from "react";

import { Button } from "@hebo/shared-ui/components/Button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@hebo/shared-ui/components/DropdownMenu";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle
} from "@hebo/shared-ui/components/Item";

import { Bedrock, Cohere, Groq, Vertex } from "~console/components/ui/Icons";

import { ConfigureProviderDialog } from "./configure";
import { ClearCredentialsDialog } from "./clear";
import { formatDateTime } from "~console/lib/utils";
import { Avatar } from "@hebo/shared-ui/components/Avatar";


const ProviderIcons = {
  bedrock: Bedrock,
  cohere: Cohere,
  vertex: Vertex,
  groq: Groq,
} as const;

type Provider = {
  slug: string;
  name: string;
  config?: Record<string, unknown>;
  updated_at: Date;
};

export function ProvidersList({ providers }: { providers: Provider[] }) {
    const [configureDialog, setConfigureDialog] = useState({
      open: false,
      provider: undefined as Provider | undefined
    });

    const [clearDialog, setClearDialog] = useState({
      open: false,
      provider: undefined as Provider | undefined
    });

    return (
        <div className="flex flex-col gap-2">
            {providers.map((provider) => {
                return (
                    <Item key={provider.slug} variant="outline" className="bg-background">
                        <ItemMedia>
                            <Avatar className="overflow-hidden" >
                                {(() => {
                                    const Icon = ProviderIcons[provider.slug as keyof typeof ProviderIcons] ?? HelpCircle;
                                    return <Icon size={32} />;
                                })()}
                            </Avatar>
                        </ItemMedia>
                        <ItemContent>
                            <ItemTitle>{provider.name}</ItemTitle>
                        </ItemContent>
                        <ItemActions>
                            {provider.config ? (
                                <>
                                    Last updated {formatDateTime(provider.updated_at ?? new Date(0))}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger className="size-4" render={
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                aria-label="Provider actions"
                                                >
                                                <MoreVertical aria-hidden="true" />
                                            </Button>
                                        } />
                                            <DropdownMenuContent className="min-w-44" align="end">
                                            <DropdownMenuItem onClick={() => setConfigureDialog({ open: true, provider })}>
                                                <FileSliders />
                                                Configure
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setClearDialog({ open: true, provider })} className="text-destructive">
                                                <Eraser />
                                                Clear Credentials
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </>
                            ) : (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setConfigureDialog({ open: true, provider })}
                                    >
                                    Configure
                                </Button>
                            )}
                        </ItemActions>
                    </Item>
                );
            })}

            <ConfigureProviderDialog
                {...configureDialog}
                onOpenChange={(open: boolean) => {
                  if (!open) setConfigureDialog(prev => 
                    {
                        if (!prev) return prev;
                        return {...prev, open}
                    }
                )}}
                onOpenChangeComplete={(open: boolean) => {
                  if (!open) setConfigureDialog({ open: false, provider: undefined});
                }}
                />

            <ClearCredentialsDialog
                {...clearDialog}
                onOpenChange={(open: boolean) => {
                  if (!open) setClearDialog({ open: false, provider: undefined});
                }}
            />
        </div>
    );
}
