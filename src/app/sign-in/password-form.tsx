"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { loginEmail } from "@/lib/usernames";

/** Sign-in for accounts an admin created with a username and password. */
export function PasswordSignInForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signIn(form: FormData) {
    setPending(true);
    const error = await authClient.signIn
      .email({
        email: loginEmail(String(form.get("username") ?? "")),
        password: String(form.get("password") ?? ""),
      })
      .then((res) => res.error, (err: unknown) => err as { message?: string });
    if (error) {
      toast.error(error.message || "Couldn't sign in.");
      setPending(false);
      return;
    }
    // /continue routes by role, the same as after Google sign-in.
    router.push("/continue");
  }

  return (
    <form action={signIn}>
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="sign-in-username">Username</FieldLabel>
          <Input id="sign-in-username" name="username" required autoComplete="username" autoCapitalize="none" />
        </Field>
        <Field>
          <FieldLabel htmlFor="sign-in-password">Password</FieldLabel>
          <Input id="sign-in-password" name="password" type="password" required autoComplete="current-password" />
        </Field>
        <Button type="submit" size="lg" className="h-11 rounded-lg text-base" disabled={pending}>
          {pending && <Loader2Icon className="animate-spin" />}
          Sign in
        </Button>
      </FieldGroup>
    </form>
  );
}
