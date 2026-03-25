import { Loader2Icon } from "lucide-react";
import { useState } from "react";

import { Button } from "@hebo/shared-ui/components/Button";
import { Input } from "@hebo/shared-ui/components/Input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@hebo/shared-ui/components/InputOTP";
import { Label } from "@hebo/shared-ui/components/Label";

import { authService } from "~console/lib/auth";

export function MagicLinkSignIn() {
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [otp, setOtp] = useState<string>("");
  const [error, setError] = useState<string | undefined>();

  const handleVerifySubmit: React.SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();

    void (async () => {
      setLoading(true);
      try {
        await authService.signInWithMagicLink(otp, email);
      } catch (err) {
        if (err instanceof Error) setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  };

  const handleSendEmailSubmit: React.SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();

    void (async () => {
      setLoading(true);
      try {
        await authService.sendMagicLinkEmail(email);
        setLinkSent(true);
      } catch (err) {
        if (err instanceof Error) setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  };

  return linkSent ? (
    <form className="flex flex-col items-center gap-2" onSubmit={handleVerifySubmit}>
      <Label>Enter the code from your email</Label>
      <div className="flex gap-2">
        <InputOTP
          maxLength={6}
          pattern={"^[a-zA-Z0-9]+$"}
          value={otp}
          onChange={(value) => {
            setOtp(value.toUpperCase());
          }}
          disabled={loading}
        >
          <InputOTPGroup>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <InputOTPSlot className="bg-background" key={index} index={index} />
            ))}
          </InputOTPGroup>
        </InputOTP>
        <Button type="submit" isLoading={loading} disabled={loading || otp.length !== 6}>
          Verify
        </Button>
      </div>
      {error && (
        <div role="alert" className="text-sm text-destructive">
          {error}
        </div>
      )}
      <Button
        type="button"
        variant="link"
        className="underline"
        onClick={() => {
          setError(undefined);
          setOtp("");
          setLinkSent(false);
        }}
      >
        Cancel
      </Button>
    </form>
  ) : (
    <form className="flex flex-col gap-2" onSubmit={handleSendEmailSubmit}>
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

      <Button type="submit" disabled={loading}>
        {loading ? <Loader2Icon className="animate-spin" /> : "Send Email"}
      </Button>

      {error && <div className="text-sm text-destructive">{error}</div>}
    </form>
  );
}
