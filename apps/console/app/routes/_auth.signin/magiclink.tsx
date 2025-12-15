import { Loader2Icon } from "lucide-react";
import { useState } from "react";

import { Button } from "@hebo/shared-ui/components/Button";
import { Label } from "@hebo/shared-ui/components/Label";
import { Input } from "@hebo/shared-ui/components/Input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@hebo/shared-ui/components/InputOTP";

import { authService } from "~console/lib/auth";

export function MagicLinkSignIn() {
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [otp, setOtp] = useState<string>("");
  const [error, setError] = useState<string | undefined>();

  return (
    !linkSent ? (
      <form 
        className="flex flex-col gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          try {
            await authService.sendMagicLinkEmail(email!);
            setLinkSent(true);
          } catch (error) {
            error instanceof Error && setError(error.message);
          } finally {
            setLoading(false);
          }
        }}>

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

        <Button type="submit" disabled={loading}>
          { loading? <Loader2Icon className="animate-spin" /> : "Send Email" }
        </Button>
        
        {error && <div className="text-destructive text-sm">{error}</div>}
      </form>

    ) : (

      <form       
        className="flex flex-col gap-2 items-center"   
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          try {
            await authService.signInWithMagicLink(otp, email);
          } catch (error) {
            error instanceof Error && setError(error.message);
          } finally {
            setLoading(false);
          }
        }}>
        <Label>Enter the code from your email</Label>
        <div className="flex gap-2">
          <InputOTP 
            maxLength={6}
            pattern={"^[a-zA-Z0-9]+$"}
            value={otp}
            onChange={(value) => setOtp(value.toUpperCase())}
            disabled={loading}
            >
            <InputOTPGroup>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <InputOTPSlot className="bg-background" key={index} index={index} />
            ))}
            </InputOTPGroup>
          </InputOTP>
          <Button 
            type="submit"
            isLoading={loading}
            disabled={loading || otp.length !== 6}>
            Verify
          </Button>
        </div>
        {error && <div className="text-destructive text-sm">{error}</div>}
        <Button 
          type="button"
          variant='link'
          className='underline'
          onClick={() => {
            setError(undefined);
            setOtp("");
            setLinkSent(false);
          }}>
          Cancel
        </Button>
      </form>
    )
  )
}
