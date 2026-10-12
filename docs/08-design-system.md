# 8. Design system

Every UI component is **shadcn/ui** (style `radix-nova`, in `src/components/ui`). Feature components in `src/components/app` only compose those primitives and style them with theme tokens. There are no custom component libraries.

Primitives used: Button, Card, Badge, Dialog, AlertDialog, DropdownMenu, Select, Switch, Tabs, Table, Input, InputGroup, InputOTP, Textarea, Field, Command, Avatar, Sidebar, Skeleton, Empty, Tooltip, Separator and Sonner.

## Direction: "Stamp ink" (light) and "Powder" (dark)

**Light mode** borrows from the door: paper tickets and the indigo-violet ink staff stamp hands with. Ink `#2b2d78` is the primary colour (buttons, the event date tabs, progress bars, charts). Content sits on a cool paper sheet (`#f2f3f7`) with paper cards (`#fdfdfb`), and text is ink-tinted (`#1b1c33`) rather than flat black.

The sidebar is the bold element: a deep night-ink frame (`#1f2150`) that the content sheet is laid on. The active nav item is a paper stub (`--sidebar-active`), and the brand mark turns into a paper stub with an ink tear line. Inside the sidebar, `[data-sidebar="sidebar"]` remaps the shared tokens (`--primary`, `--muted-foreground`, `--border`…) to the sidebar ones, so components placed there read correctly on the ink.

**Dark mode** keeps the graphite "Powder" finish: chalk on near-black (`#1d1d1c`), with a darker ash sidebar (`#131312`).

Both modes share a fine grain overlay (`body::after`, strength set by `--grain-opacity`). Light mode is the default, and dark mode follows the toggle or the system.

The scan verdicts keep their powdery sage, ochre and brick in both modes, because door staff rely on them. Elsewhere the UI stays quiet, with borders instead of shadows and sentence-case labels.

## Tokens (`src/app/globals.css`)

- Colours are hex values defined for both `:root` (light) and `.dark`.
- `--primary` is stamp ink in light mode and chalk in dark mode. It fills buttons, the brand mark and the event date tabs.
- `--success`, `--warning` and `--destructive` each have a `-foreground` pair, so a verdict can fill a surface with readable text on top.

## Typography

| Use | Font |
|---|---|
| Everything (`font-sans`, `font-heading`) | Schibsted Grotesk, with headings in bold or extrabold and tight tracking |
| Ticket codes only (`.ticket-code`) | Geist Mono, wide set |

## Shared pieces

| Piece | Where |
|---|---|
| `PageHeader`, `PageBody` and `StatStrip` (a ruled row of headline figures) | `components/app/page-header.tsx` |
| Event rows with a date tab | `components/app/events/events-view.tsx` |
| `.perforation` (dashed tear line) | Used only on the printed-ticket illustration |

## Scanner verdicts

Each verdict maps to a tone in `src/lib/verdicts.ts`. The tone sets the badge colour and the solid fill of the result panel: success for admitted, warning for a wrong or closed entrance, and destructive for invalid, used or voided tickets.
