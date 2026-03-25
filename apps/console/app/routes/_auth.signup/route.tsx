import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { Button } from "@hebo/shared-ui/components/Button";
import { Input } from "@hebo/shared-ui/components/Input";
import { Label } from "@hebo/shared-ui/components/Label";

import { Logo } from "~console/components/ui/Logo";
import { authService } from "~console/lib/auth";

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  return (
    <div className="flex w-xs flex-col items-center gap-4">
      <Logo />
      <p className="text-center text-base">Create your account</p>

      <form
        className="flex w-full flex-col gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          setError(undefined);
          try {
            await authService.signUpWithPassword(name, email, password);
          } catch (err) {
            if (err instanceof Error) setError(err.message);
          } finally {
            setLoading(false);
          }
        }}
      >
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
          disabled={loading}
          required
        />

        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
          disabled={loading}
          required
        />

        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
          disabled={loading}
          minLength={8}
          required
        />

        <Button type="submit" disabled={loading}>
          {loading ? <Loader2Icon className="animate-spin" /> : "Sign Up"}
        </Button>

        {error && (
          <div role="alert" className="text-sm text-destructive">
            {error}
          </div>
        )}

        <p className="text-center text-sm">
          Already have an account?{" "}
          <Link to="/signin" viewTransition className="font-medium underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
