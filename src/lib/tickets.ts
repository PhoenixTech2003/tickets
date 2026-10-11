/**
 * Shared ticket logic. Runs both in the browser (offline verification against
 * the PowerSync SQLite copy) and on the server (authoritative re-verification
 * of uploaded scans), so it must stay free of server/client-only imports.
 */

// No 0/O, 1/I/L, 5/S, 2/Z to keep handwritten and read-aloud codes unambiguous.
export const CODE_ALPHABET = "346789ABCDEFGHJKMNPQRTUVWXY";
export const CODE_LENGTH = 6;
export const MAX_BATCH = 1000;
const LETTERS = /[A-Z]/;
const DIGITS = /[0-9]/;

export function normalizeCode(input: string) {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, CODE_LENGTH);
}

export function isWellFormedCode(code: string) {
  return (
    code.length === CODE_LENGTH &&
    [...code].every((c) => CODE_ALPHABET.includes(c)) &&
    LETTERS.test(code) &&
    DIGITS.test(code)
  );
}

/** Cryptographically random 6-char code with at least one letter and one digit. */
export function generateCode(): string {
  // Rejection sampling keeps every character equally likely (no modulo bias).
  const limit = 256 - (256 % CODE_ALPHABET.length);
  const bytes = new Uint8Array(32);
  for (;;) {
    crypto.getRandomValues(bytes);
    const code = Array.from(bytes)
      .filter((b) => b < limit)
      .slice(0, CODE_LENGTH)
      .map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length])
      .join("");
    if (isWellFormedCode(code)) return code;
  }
}

export type ScanVerdict =
  | "accepted"
  | "already_used"
  | "wrong_entrance"
  | "invalid"
  | "voided"
  | "event_disabled"
  | "entrance_disabled";

export type VerifyInput = {
  /** null when no ticket with that code exists for the event. */
  ticket: {
    entranceId: string | null;
    voided: boolean;
    redeemedAt: string | Date | null;
  } | null;
  eventDisabled: boolean;
  /** The entrance the ticket is tied to, if any. */
  ticketEntrance: { id: string; disabled: boolean } | null;
  /** The entrance the scanner is standing at; null = roaming, any entrance. */
  stationEntranceId: string | null;
};

export function verifyTicket(input: VerifyInput): ScanVerdict {
  const { ticket, ticketEntrance, stationEntranceId } = input;
  if (!ticket) return "invalid";
  if (input.eventDisabled) return "event_disabled";
  if (ticket.voided) return "voided";
  if (ticket.entranceId && stationEntranceId && ticket.entranceId !== stationEntranceId) {
    return "wrong_entrance";
  }
  if (ticketEntrance?.disabled) return "entrance_disabled";
  if (ticket.redeemedAt) return "already_used";
  return "accepted";
}
