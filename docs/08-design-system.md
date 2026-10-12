# 8. Design system

Every UI component is **shadcn/ui** (style `radix-nova`, in `src/components/ui`). Feature components in `src/components/app` only compose those primitives and style them with theme tokens. There are no custom component libraries.

Primitives used: Button, Card, Badge, Dialog, AlertDialog, DropdownMenu, Select, Switch, Tabs, Table, Input, InputGroup, InputOTP, Textarea, Field, Command, Avatar, Sidebar, Skeleton, Empty, Tooltip, Separator and Sonner.

## Direction: "Inverse" (light) and "Powder" (dark)

**Light mode** is a white sheet laid on a black frame. The sidebar is near-black (`#121211`) and the content area is white, with black type (`#1a1a19`) and black primary fills (`#161615`) for buttons, the event date tabs, progress bars and charts. Cards are white and separated by borders (`#e7e7e5`).

The sidebar is the bold element. The active nav item is a white stub (`--sidebar-active`), and the brand mark turns into a white stub with a black tear line. Inside the sidebar, `[data-sidebar="sidebar"]` remaps the shared tokens (`--primary`, `--muted-foreground`, `--border`…) to the sidebar ones, so components placed there read correctly on the black.

**Dark mode** keeps the graphite "Powder" finish: chalk on near-black (`#1d1d1c`), with a darker ash sidebar (`#131312`).

Both modes share a fine grain overlay (`body::after`, strength set by `--grain-opacity`). Light mode is the default, and dark mode follows the toggle or the system.

The scan verdicts keep their powdery sage, ochre and brick in both modes, because door staff rely on them. Elsewhere the UI stays quiet, with borders instead of shadows and sentence-case labels.

## Tokens (`src/app/globals.css`)

- Colours are hex values defined for both `:root` (light) and `.dark`.
- `--primary` is black in light mode and chalk in dark mode. It fills buttons, the brand mark and the event date tabs.
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
