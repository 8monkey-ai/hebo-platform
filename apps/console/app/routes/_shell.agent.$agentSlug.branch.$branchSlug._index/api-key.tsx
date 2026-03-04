import { KeyRound } from "lucide-react";
import { useState } from "react";

import { Button } from "@hebo/shared-ui/components/Button";
import { Input } from "@hebo/shared-ui/components/Input";
import { cn } from "@hebo/shared-ui/lib/utils";

import { authService } from "~console/lib/auth";

export function GenerateApiKey() {
  const [loading, setLoading] = useState<"idle" | "loading" | "success">("idle");
  const [key, setKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateAPIKey = async () => {
    setLoading("loading");

    setError(null);
    setKey("Generating API Key ...");

    try {
      const newKey = await authService.generateApiKey("On-boarding Key");
      setKey(newKey.key ?? "Failed to generate key");
      setLoading("success");
    } catch (error_) {
      setError((error_ as Error).message);
      setKey((error_ as Error).message);
      setLoading("idle");
    }
  };

  return (
    <div className={cn("flex flex-row gap-2", error ? "text-destructive" : "text-foreground")}>
      <Input
        readOnly
        icon={KeyRound}
        copy={true}
        value={key ?? ""}
        placeholder="Generate API Key …"
        tabIndex={key ? 0 : -1}
        aria-disabled={!key}
        aria-label="Generated API key"
      />
      <Button
        disabled={loading !== "idle"}
        isLoading={loading === "loading"}
        type="button"
        onClick={handleGenerateAPIKey}
        aria-label="Generate new API key"
      >
        Generate
      </Button>
    </div>
  );
}
