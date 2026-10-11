import { getViewer } from "@/server/auth/viewer";
import { applyUpload, uploadBody } from "@/server/powersync/upload";

/** Receives the PowerSync client upload queue (see src/lib/powersync/connector.ts). */
export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = uploadBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid batch" }, { status: 400 });

  return Response.json({ outcomes: await applyUpload(viewer, parsed.data.ops) });
}
