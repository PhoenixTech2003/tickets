"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/server/actions/result";

/**
 * Runs a server action with pending state and toasts. Data arrives through
 * PowerSync replication, so callers rarely need the return value.
 */
export function useAction<I, T>(
  action: (input: I) => Promise<ActionResult<T>>,
  options: { success?: string | ((data: T) => string); onSuccess?: (data: T) => void } = {},
) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function execute(input: I) {
    return new Promise<boolean>((resolve) => {
      startTransition(async () => {
        const result = await action(input);
        if (!result.ok) {
          setError(result.error);
          toast.error(result.error);
          return resolve(false);
        }
        setError(null);
        const message = typeof options.success === "function" ? options.success(result.data) : options.success;
        if (message) toast.success(message);
        options.onSuccess?.(result.data);
        resolve(true);
      });
    });
  }

  return { execute, pending, error };
}
