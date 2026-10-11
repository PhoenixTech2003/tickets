import { getViewer } from "@/server/auth/viewer";
import { createPowerSyncToken } from "@/server/powersync/token";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "unauthenticated" }, { status: 401 });
  return Response.json(await createPowerSyncToken(viewer), {
    headers: { "Cache-Control": "no-store" },
  });
}
