import { useState } from "react";
import { Link } from "react-router";

import { Button } from "@hebo/shared-ui/components/Button";
import { Input } from "@hebo/shared-ui/components/Input";
import { Label } from "@hebo/shared-ui/components/Label";

import { authService } from "~console/lib/auth";

export function PasswordSignIn() {
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  return emailSubmitted ? (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
          await authService.signInWithPassword(email, password);
        } catch (err) {
          if (err instanceof Error) setError(err.message);
        } finally {
          setLoading(false);
        }
      }}
    >
      <Label htmlFor="password">Password</Label>
      <div className="flex gap-2">
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          required
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        />
        <Button type="submit" isLoading={loading}>
          Sign In
        </Button>
      </div>

      {error ? (
        <div role="alert" className="py-2 text-center text-sm text-destructive">
          {error}
          {"! "}
          <Link to="/signup" viewTransition className="font-medium text-foreground underline">
            Sign up instead?
          </Link>
        </div>
      ) : (
        <p className="py-2 text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link to="/signup" viewTransition className="font-medium underline">
            Sign up
          </Link>
        </p>
      )}
    </form>
  ) : (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError(undefined);
        setEmailSubmitted(true);
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

      <Button type="submit">Continue</Button>
    </form>
  );
}
