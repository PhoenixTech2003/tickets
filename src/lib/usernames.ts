/**
 * Neon Auth has no Better Auth `username` plugin, so admin-created accounts
 * sign in with email + password using a synthetic address on a reserved,
 * non-deliverable domain. People only ever see and type the username.
 */
const USERNAME_DOMAIN = "users.tickets.local";

export const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;

export function usernameToEmail(username: string) {
  return `${username.trim().toLowerCase()}@${USERNAME_DOMAIN}`;
}

/** The sign-in form accepts a username or a real email address. */
export function loginEmail(input: string) {
  const value = input.trim().toLowerCase();
  return value.includes("@") ? value : usernameToEmail(value);
}

/** The username behind a synthetic email, or null for a real address. */
export function usernameOf(email: string) {
  const suffix = `@${USERNAME_DOMAIN}`;
  return email.endsWith(suffix) ? email.slice(0, -suffix.length) : null;
}

/** What to show for an account: its username, or its real email. */
export function loginLabel(email: string) {
  return usernameOf(email) ?? email;
}
