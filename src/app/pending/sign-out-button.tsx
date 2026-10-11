"use client";

import { Button } from "@/components/ui/button";
import { signOut } from "@/components/app/sign-out";

export function PendingSignOut() {
  return (
    <Button variant="outline" onClick={() => signOut()}>
      Sign out
    </Button>
  );
}
