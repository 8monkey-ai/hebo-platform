import { Eraser, HelpCircle, MoreVertical } from "lucide-react";
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
    const [configureOpen, setConfigureOpen] = useState(false);
    const [clearOpen, setClearOpen] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<Provider | undefined>(undefined);

    return (
        <div className="flex flex-col gap-2">
            {providers.map((provider) => {
                return (
                    <Item key={provider.slug} variant="outline" className="bg-background">
                        <ItemMedia>
                            {(() => {
                                const Icon = ProviderIcons[provider.slug as keyof typeof ProviderIcons] ?? HelpCircle;
                                return <Icon size={32} />;
                            })()}
                        </ItemMedia>
                        <ItemContent>
                            <ItemTitle>{provider.name}</ItemTitle>
                        </ItemContent>
                        <ItemActions>
                            {provider.config ? (
                                <>
                                    Last updated {formatDateTime(provider.updated_at ?? new Date(0))}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger render={
                                            <Button
                                            variant="ghost"
                                            size="icon"
                                            aria-label="Provider actions"
                                            >
                                                <MoreVertical className="size-4" aria-hidden="true" />
                                            </Button>
                                        } />
                                        <DropdownMenuContent className="min-w-44" align="end">
                                            <DropdownMenuItem
                                                className="text-destructive"
                                                onClick={() => {
                                                    setSelectedProvider(provider);
                                                    setClearOpen(true);
                                                }}
                                                >
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
                                    onClick={() => {
                                        setSelectedProvider(provider);
                                        setConfigureOpen(true);
                                    }}
                                    >
                                    Configure
                                </Button>
                            )}
                        </ItemActions>
                    </Item>
                );
            })}

            <ConfigureProviderDialog
                open={configureOpen}
                provider={selectedProvider}
                onOpenChange={(open) => {
                    setConfigureOpen(open);
                }}
                />

            <ClearCredentialsDialog
                open={clearOpen}
                provider={selectedProvider}
                onOpenChange={(open) => {
                    setClearOpen(open);
                }}
            />
        </div>
    );
}
