import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { eventOrganizers, eventScanners } from "@/server/db/schema/app";
import { getViewer, type Viewer } from "./viewer";

export class AuthorizationError extends Error {
  constructor(message = "You are not allowed to do that.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function requireActor() {
  const viewer = await getViewer();
  if (!viewer) throw new AuthorizationError("Please sign in again.");
  return viewer;
}

/** Admin-only operations. Declines anyone the admin plugin hasn't made admin. */
export async function requireAdmin() {
  const viewer = await requireActor();
  if (viewer.role !== "admin") throw new AuthorizationError("Admin access required.");
  return viewer;
}

export async function requireEventCreator() {
  const viewer = await requireActor();
  if (viewer.role !== "admin" && viewer.role !== "organizer") {
    throw new AuthorizationError("Only admins and event organizers can create events.");
  }
  return viewer;
}

async function organizerMembership(eventId: string, userId: string) {
  const [row] = await db
    .select({ isOwner: eventOrganizers.isOwner })
    .from(eventOrganizers)
    .where(and(eq(eventOrganizers.eventId, eventId), eq(eventOrganizers.userId, userId)))
    .limit(1);
  return row ?? null;
}

/** Admins, or organizers created/invited on this event. */
export async function requireEventManager(eventId: string) {
  const viewer = await requireActor();
  if (viewer.role === "admin") return viewer;
  if (viewer.role !== "ticket_scanner" && (await organizerMembership(eventId, viewer.id))) {
    return viewer;
  }
  throw new AuthorizationError("You don't manage this event.");
}

/** Deleting an event is reserved for admins and the organizer who created it. */
export async function requireEventOwner(eventId: string) {
  const viewer = await requireActor();
  if (viewer.role === "admin") return viewer;
  const membership = await organizerMembership(eventId, viewer.id);
  if (membership?.isOwner) return viewer;
  throw new AuthorizationError("Only the event owner or an admin can delete this event.");
}

export type ScanStation = { eventId: string; entranceId: string | null };

/**
 * Who may record a scan at a station. Scanners are bound to their assignment
 * (a scanner with no entrance can scan anywhere); admins and event managers
 * may scan at any entrance of events they control.
 */
export async function canScanAt(viewer: Viewer, station: ScanStation) {
  if (viewer.role === "admin") return true;
  const [assignment] = await db
    .select({ entranceId: eventScanners.entranceId, disabled: eventScanners.disabled })
    .from(eventScanners)
    .where(and(eq(eventScanners.eventId, station.eventId), eq(eventScanners.userId, viewer.id)))
    .limit(1);
  if (assignment && !assignment.disabled) {
    return assignment.entranceId === null || assignment.entranceId === station.entranceId;
  }
  if (viewer.role === "ticket_scanner") return false;
  return (await organizerMembership(station.eventId, viewer.id)) !== null;
}

