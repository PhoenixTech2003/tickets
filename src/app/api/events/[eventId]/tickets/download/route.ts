import { and, asc, eq } from "drizzle-orm";
import { zipSync } from "fflate";
import { db } from "@/server/db";
import { entrances, events, ticketBatches, tickets } from "@/server/db/schema/app";
import { AuthorizationError, requireEventManager } from "@/server/auth/permissions";
import { renderTicketsPdf, type PrintableTicket } from "@/server/tickets/pdf";
import { formatMoney } from "@/lib/money";

/**
 * GET /api/events/:eventId/tickets/download?batch=<batchId>&tz=<IANA zone>
 * Downloads a zip with one print-ready A4 PDF per batch (just the one batch
 * when `batch` is given). Voided tickets are left out.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/events/[eventId]/tickets/download">) {
  const { eventId } = await ctx.params;
  const url = new URL(request.url);
  const batchId = url.searchParams.get("batch");
  const timeZone = safeTimeZone(url.searchParams.get("tz"));

  try {
    await requireEventManager(eventId);
  } catch (error) {
    if (error instanceof AuthorizationError) return new Response(error.message, { status: 403 });
    throw error;
  }

  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event) return new Response("Event not found", { status: 404 });

  const rows = await db
    .select({
      code: tickets.code,
      entranceName: entrances.name,
      batchId: ticketBatches.id,
      batchLabel: ticketBatches.label,
      priceMinor: ticketBatches.priceMinor,
    })
    .from(tickets)
    .innerJoin(ticketBatches, eq(ticketBatches.id, tickets.batchId))
    .leftJoin(entrances, eq(entrances.id, tickets.entranceId))
    .where(
      and(
        eq(tickets.eventId, eventId),
        eq(tickets.voided, false),
        batchId ? eq(tickets.batchId, batchId) : undefined,
      ),
    )
    .orderBy(asc(ticketBatches.createdAt), asc(tickets.createdAt), asc(tickets.code));
  if (rows.length === 0) return new Response("No tickets to download", { status: 404 });

  // One PDF per batch, in the order the batches were generated.
  const batches = new Map<string, { name: string; tickets: PrintableTicket[] }>();
  for (const row of rows) {
    let batch = batches.get(row.batchId);
    if (!batch) {
      batch = { name: row.batchLabel || row.entranceName || "tickets", tickets: [] };
      batches.set(row.batchId, batch);
    }
    batch.tickets.push({
      code: row.code,
      entranceName: row.entranceName,
      serial: batch.tickets.length + 1,
      price: row.priceMinor == null ? null : formatMoney(row.priceMinor, event.currency, "en-GB"),
    });
  }

  const files: Record<string, Uint8Array> = {};
  let n = 0;
  for (const batch of batches.values()) {
    const pdf = await renderTicketsPdf(event, batch.tickets, timeZone);
    const name = `${String(++n).padStart(2, "0")}-${slug(batch.name)}-${batch.tickets.length}.pdf`;
    files[name] = pdf;
  }
  // PDFs are already compressed; storing them avoids burning CPU for nothing.
  const zip = zipSync(files, { level: 0 });

  const filename = `${slug(event.name)}-${batchId ? slug([...batches.values()][0].name) : "all"}-tickets.zip`;
  return new Response(Buffer.from(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

const slug = (text: string) => text.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "tickets";

function safeTimeZone(tz: string | null) {
  try {
    if (tz) {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      return tz;
    }
  } catch {}
  return "UTC";
}
