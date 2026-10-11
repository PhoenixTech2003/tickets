import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { getViewer, homePathFor } from "@/server/auth/viewer";

/** Post-login router: sends each user to the one surface their role allows. */
export default function ContinuePage() {
  return (
    <Suspense
      fallback={
        <div className="grid flex-1 place-items-center">
          <Loader2Icon className="size-6 animate-spin text-primary" />
        </div>
      }
    >
      <RouteByRole />
    </Suspense>
  );
}

async function RouteByRole(): Promise<null> {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");
  redirect(await homePathFor(viewer));
}
