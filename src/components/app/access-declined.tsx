import Link from "next/link";
import { ShieldXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

export function AccessDeclined() {
  return (
    <Empty className="rounded-xl border border-destructive/30 bg-destructive/5 py-20">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
          <ShieldXIcon />
        </EmptyMedia>
        <EmptyTitle className="text-lg">Access declined</EmptyTitle>
        <EmptyDescription>This area is for admins only. Ask an admin if you need access.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to events</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
