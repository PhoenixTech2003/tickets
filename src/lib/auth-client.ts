"use client";

import { createAuthClient } from "@neondatabase/auth/next";

// Talks to Neon Auth through our /api/auth/[...path] proxy route.
export const authClient = createAuthClient();
