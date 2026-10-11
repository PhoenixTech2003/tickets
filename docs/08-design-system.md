# 8. Design system

Every UI component is **shadcn/ui** (style `radix-nova`, in `src/components/ui`). Feature components in `src/components/app` only compose those primitives and style them with theme tokens. There are no custom component libraries.

Primitives used: Button, Card, Badge, Dialog, AlertDialog, DropdownMenu, Select, Switch, Tabs, Table, Input, InputGroup, InputOTP, Textarea, Field, Command, Avatar, Sidebar, Skeleton, Empty, Tooltip, Separator and Sonner.

## Direction: "Powder"

A black-and-white operational tool with a powdered, matte finish. It never uses pure black or pure white: chalk off-whites (`#f4f4f2` and `#fafaf9`) and graphite near-blacks (`#2b2b2a` and `#1d1d1c`) sit under a fine grain overlay (`body::after`, whose strength is set by `--grain-opacity`). Light mode is the default, and dark mode follows the toggle or the system.

The sidebar is a darker ash (`#dcdcd8` in light mode, `#131312` in dark), and the content area is a lighter chalk panel inset on it with a soft shadow (`SidebarInset` in `app/dashboard/layout.tsx`).

The only colour in the app is the scan verdicts, in powdery sage, ochre and brick, because door staff rely on it. The verdict panel is the one bold element. Everything else stays quiet, with borders instead of shadows and sentence-case labels.

## Tokens (`src/app/globals.css`)

- Colours are hex values defined for both `:root` (light) and `.dark`.
- `--primary` is graphite in light mode and chalk in dark mode. It fills buttons, the brand mark and the event date tabs.
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
