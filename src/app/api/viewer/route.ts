import { canUseDashboard, getViewer, hasScannerAssignment, homePathFor } from "@/server/auth/viewer";

/**
 * Who is signed in and which app areas they may open. The client gate caches
 * this on the device so the dashboard and scanner can start offline; every
 * data read and write is still authorized on the server.
 */
export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return Response.json(null, { status: 401, headers: { "Cache-Control": "no-store" } });

  const dashboard = await canUseDashboard(viewer);
  const scan = dashboard || viewer.role === "ticket_scanner" || (await hasScannerAssignment(viewer.id));
  const home = await homePathFor(viewer);

  return Response.json({ viewer, access: { dashboard, scan }, home }, { headers: { "Cache-Control": "no-store" } });
}
