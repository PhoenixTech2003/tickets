import "server-only";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";

/** `price` is already formatted (e.g. "MWK 15,000"); null prints no price. */
export type PrintableTicket = { code: string; serial: number; entranceName: string | null; price: string | null };
export type PrintableEvent = { name: string; venue: string; startsAt: Date; endsAt: Date | null };

// A4 in points, laid out as 2 columns × 5 rows = 10 tickets per page.
const PAGE = { w: 595.28, h: 841.89 };
const MARGIN = 28;
const GAP = { x: 14, y: 12 };
const COLS = 2;
const ROWS = 5;
const CARD = {
  w: (PAGE.w - MARGIN * 2 - GAP.x * (COLS - 1)) / COLS,
  h: (PAGE.h - MARGIN * 2 - GAP.y * (ROWS - 1)) / ROWS,
};
const STUB_W = 86;
const NOTCH_R = 7;

const INK = rgb(0.08, 0.08, 0.09);
const MUTED = rgb(0.42, 0.42, 0.45);
const ACCENT = rgb(0.85, 0.55, 0.12);
const RULE = rgb(0.78, 0.78, 0.8);

/** pdf-lib standard fonts are WinAnsi-only; replace anything they can't encode. */
const printable = (s: string) => s.replace(/[^\x20-\x7E\xA0-\xFF‘’“”–—…•€™]/g, "?");

function fit(text: string, font: PDFFont, size: number, maxWidth: number) {
  let t = printable(text);
  if (font.widthOfTextAtSize(t, size) <= maxWidth) return t;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, size) > maxWidth) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

/** Greedy word wrap into at most `maxLines`, ellipsising the last line. */
function wrap(text: string, font: PDFFont, size: number, maxWidth: number, maxLines: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of printable(text).split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth || !line) {
      line = next;
      continue;
    }
    lines.push(line);
    line = word;
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines) lines.push(line);
  else lines[maxLines - 1] = fit(`${lines[maxLines - 1]} ${line}`, font, size, maxWidth);
  return lines.map((l) => fit(l, font, size, maxWidth));
}

/** pdf-lib has no letter-spacing option, so tracked text is drawn glyph by glyph. */
function drawTracked(
  page: PDFPage,
  text: string,
  opts: { x: number; y: number; size: number; font: PDFFont; color: ReturnType<typeof rgb>; spacing: number },
) {
  let x = opts.x;
  for (const ch of text) {
    page.drawText(ch, { x, y: opts.y, size: opts.size, font: opts.font, color: opts.color });
    x += opts.font.widthOfTextAtSize(ch, opts.size) + opts.spacing;
  }
}

const trackedWidth = (text: string, font: PDFFont, size: number, spacing: number) =>
  font.widthOfTextAtSize(text, size) + spacing * (text.length - 1);

/** Outline with semicircle notches at the perforation, in SVG coords (y down). */
function outlinePath(w: number, h: number) {
  const x = w - STUB_W;
  const r = 10;
  return [
    `M ${r} 0`,
    `L ${x - NOTCH_R} 0`,
    `A ${NOTCH_R} ${NOTCH_R} 0 0 0 ${x + NOTCH_R} 0`,
    `L ${w - r} 0 Q ${w} 0 ${w} ${r}`,
    `L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h}`,
    `L ${x + NOTCH_R} ${h}`,
    `A ${NOTCH_R} ${NOTCH_R} 0 0 0 ${x - NOTCH_R} ${h}`,
    `L ${r} ${h} Q 0 ${h} 0 ${h - r}`,
    `L 0 ${r} Q 0 0 ${r} 0 Z`,
  ].join(" ");
}

type Fonts = { sans: PDFFont; bold: PDFFont; mono: PDFFont };

/*
 * Scissors icon (24-unit grid, y down) drawn as a vector path, because the
 * standard WinAnsi fonts have no ✂ glyph. One copy cuts rightwards (for
 * horizontal guides), the other downwards (for vertical guides).
 */
const SCISSORS_RIGHT = [
  "M9 6 a3 3 0 1 1 -6 0 a3 3 0 1 1 6 0",
  "M9 18 a3 3 0 1 1 -6 0 a3 3 0 1 1 6 0",
  "M8.12 8.12 L12 12",
  "M20 4 L8.12 15.88",
  "M14.8 14.8 L20 20",
].join(" ");
const SCISSORS_DOWN = [
  "M21 6 a3 3 0 1 1 -6 0 a3 3 0 1 1 6 0",
  "M9 6 a3 3 0 1 1 -6 0 a3 3 0 1 1 6 0",
  "M15.88 8.12 L12 12",
  "M20 20 L8.12 8.12",
  "M9.2 14.8 L4 20",
].join(" ");
const ICON = 0.5; // 24 units → 12pt

/**
 * Dashed cut guides through the gaps between tickets and around the outside
 * of the used rows, with scissors marks in the page margin.
 */
function drawCutGuides(page: PDFPage, rows: number) {
  const left = MARGIN - GAP.x / 2;
  const right = PAGE.w - MARGIN + GAP.x / 2;
  const top = PAGE.h - MARGIN + GAP.y / 2;
  const rowLine = (r: number) => PAGE.h - MARGIN - r * (CARD.h + GAP.y) + GAP.y / 2;
  const bottom = rowLine(rows);
  const guide = { thickness: 0.6, color: RULE, dashArray: [4, 3] };
  const icon = { scale: ICON, borderColor: MUTED, borderWidth: 1 / ICON };

  for (let r = 0; r <= rows; r++) {
    const y = rowLine(r);
    page.drawLine({ start: { x: left, y }, end: { x: right, y }, ...guide });
    page.drawSvgPath(SCISSORS_RIGHT, { x: left - 20 * ICON - 1, y: y + 12 * ICON, ...icon });
  }
  for (const x of [left, MARGIN + CARD.w + GAP.x / 2, right]) {
    page.drawLine({ start: { x, y: top }, end: { x, y: bottom }, ...guide });
  }
  // Only the middle guide gets a mark; the outer corners already have the horizontal ones.
  page.drawSvgPath(SCISSORS_DOWN, { x: MARGIN + CARD.w + GAP.x / 2 - 12 * ICON, y: top + 20 * ICON + 1, ...icon });
}

function drawTicket(
  page: PDFPage,
  fonts: Fonts,
  origin: { x: number; y: number },
  event: PrintableEvent,
  ticket: PrintableTicket,
  when: { date: string; time: string },
) {
  const { x, y } = origin; // bottom-left corner
  const top = y + CARD.h;
  const pad = 14;
  const mainW = CARD.w - STUB_W - pad * 2;

  page.drawSvgPath(outlinePath(CARD.w, CARD.h), {
    x,
    y: top,
    borderColor: INK,
    borderWidth: 0.9,
  });

  // Accent spine on the left edge.
  page.drawRectangle({ x: x + 0.45, y: y + 16, width: 3, height: CARD.h - 32, color: ACCENT });

  // Perforation.
  const perfX = x + CARD.w - STUB_W;
  page.drawLine({
    start: { x: perfX, y: y + NOTCH_R + 4 },
    end: { x: perfX, y: top - NOTCH_R - 4 },
    thickness: 0.8,
    color: RULE,
    dashArray: [2.5, 3],
  });

  let cursor = top - pad - 7;
  drawTracked(page, "ADMIT ONE", { x: x + pad, y: cursor, size: 7, font: fonts.bold, color: ACCENT, spacing: 1.6 });

  cursor -= 4;
  for (const line of wrap(event.name, fonts.bold, 12.5, mainW, 2)) {
    cursor -= 14;
    page.drawText(line, { x: x + pad, y: cursor, size: 12.5, font: fonts.bold, color: INK });
  }

  cursor -= 15;
  page.drawText(fit(`${when.date}  ·  ${when.time}`, fonts.sans, 8.5, mainW), {
    x: x + pad,
    y: cursor,
    size: 8.5,
    font: fonts.sans,
    color: INK,
  });
  cursor -= 12;
  page.drawText(fit(event.venue, fonts.sans, 8.5, mainW), { x: x + pad, y: cursor, size: 8.5, font: fonts.sans, color: MUTED });

  // Price, pinned bottom-right of the main area when the batch has one.
  let entranceW = mainW;
  if (ticket.price) {
    const price = fit(ticket.price, fonts.bold, 11, mainW / 2);
    const priceW = fonts.bold.widthOfTextAtSize(price, 11);
    const right = x + pad + mainW;
    const labelW = trackedWidth("PRICE", fonts.bold, 6.5, 1.2);
    drawTracked(page, "PRICE", { x: right - labelW, y: y + pad + 16, size: 6.5, font: fonts.bold, color: MUTED, spacing: 1.2 });
    page.drawText(price, { x: right - priceW, y: y + pad + 2, size: 11, font: fonts.bold, color: INK });
    entranceW = mainW - Math.max(priceW, labelW) - 12;
  }

  // Entrance block, pinned to the bottom.
  const entranceLabel = ticket.entranceName ? "ENTRANCE" : "ENTRY";
  const entranceValue = ticket.entranceName ?? "Any entrance";
  drawTracked(page, entranceLabel, { x: x + pad, y: y + pad + 16, size: 6.5, font: fonts.bold, color: MUTED, spacing: 1.2 });
  page.drawText(fit(entranceValue, fonts.bold, 11, entranceW), { x: x + pad, y: y + pad + 2, size: 11, font: fonts.bold, color: INK });

  // Stub: the code, big and unambiguous.
  const stubCenter = perfX + STUB_W / 2;
  const centered = (text: string, font: PDFFont, size: number, ty: number, color = INK, spacing = 0) => {
    const width = trackedWidth(text, font, size, spacing);
    drawTracked(page, text, { x: stubCenter - width / 2, y: ty, size, font, color, spacing });
  };
  centered("CODE", fonts.bold, 6.5, top - pad - 7, MUTED, 1.2);
  centered(ticket.code.slice(0, 3), fonts.mono, 19, y + CARD.h / 2 + 6, INK, 1);
  centered(ticket.code.slice(3), fonts.mono, 19, y + CARD.h / 2 - 16, INK, 1);
  centered(`No. ${String(ticket.serial).padStart(4, "0")}`, fonts.sans, 7, y + pad + 2, MUTED);
}

export async function renderTicketsPdf(
  event: PrintableEvent,
  tickets: PrintableTicket[],
  timeZone: string,
) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${printable(event.name)} — tickets`);
  pdf.setCreator("Tickets");
  const fonts: Fonts = {
    sans: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    mono: await pdf.embedFont(StandardFonts.CourierBold),
  };

  const when = {
    date: new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone }).format(event.startsAt),
    time: new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone }).format(event.startsAt),
  };

  const perPage = COLS * ROWS;
  for (let i = 0; i < tickets.length; i += perPage) {
    const page = pdf.addPage([PAGE.w, PAGE.h]);
    const onPage = tickets.slice(i, i + perPage);
    drawCutGuides(page, Math.ceil(onPage.length / COLS));
    onPage.forEach((ticket, n) => {
      const col = n % COLS;
      const row = Math.floor(n / COLS);
      drawTicket(
        page,
        fonts,
        {
          x: MARGIN + col * (CARD.w + GAP.x),
          y: PAGE.h - MARGIN - (row + 1) * CARD.h - row * GAP.y,
        },
        event,
        ticket,
        when,
      );
    });
  }
  return pdf.save();
}
