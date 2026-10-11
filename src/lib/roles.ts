/** Platform roles, stored in the Better Auth admin plugin's `role` column. */
export const ROLES = ["user", "organizer", "ticket_scanner", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  user: "User",
  organizer: "Event organizer",
  ticket_scanner: "Ticket scanner",
  admin: "Admin",
};

export function parseRole(value: string | null | undefined): Role {
  // The admin plugin allows comma-separated multi-roles; take the strongest.
  const parts = (value ?? "user").split(",").map((r) => r.trim());
  for (const role of ["admin", "organizer", "ticket_scanner"] as const) {
    if (parts.includes(role)) return role;
  }
  return "user";
}
