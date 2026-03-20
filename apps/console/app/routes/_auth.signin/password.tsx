import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { Button } from "@hebo/shared-ui/components/Button";
import { Input } from "@hebo/shared-ui/components/Input";
import { Label } from "@hebo/shared-ui/components/Label";

import { authService } from "~console/lib/auth";

export function PasswordSignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(undefined);
        try {
          await authService.signInWithPassword(email, password);
        } catch (err) {
          if (err instanceof Error) setError(err.message);
        } finally {
          setLoading(false);
        }
      }}
    >
      <Label htmlFor="email">Email</Label>
      <Input
        id="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
        required
      />

      <Label htmlFor="password">Password</Label>
      <Input
        id="password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
        required
      />

      <Button type="submit" disabled={loading}>
        {loading ? <Loader2Icon className="animate-spin" /> : "Sign In"}
      </Button>

      {error && <div className="text-sm text-destructive">{error}</div>}

      <p className="text-center text-sm">
        Don't have an account?{" "}
        <Link to="/signup" className="font-medium underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
