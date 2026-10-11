"use client";

import { useLayoutEffect, useRef, useState, type ComponentProps } from "react";
import { InputGroupInput } from "@/components/ui/input-group";

const SIGNIFICANT = /[\d.]/;

/** Keeps digits and one decimal point (max 2 decimals), and groups thousands with commas. */
export function formatAmount(raw: string) {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  const whole = (dot === -1 ? cleaned : cleaned.slice(0, dot)).replace(/^0+(?=\d)/, "");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (dot === -1) return grouped;
  return `${grouped || "0"}.${cleaned.slice(dot + 1).replace(/\./g, "").slice(0, 2)}`;
}

/** Strips the grouping commas so the value parses as a number. */
export const parseAmount = (formatted: string) => formatted.replace(/,/g, "");

/**
 * Money amount for an InputGroup: commas appear as you type and the caret
 * stays after the same digit. Submits the formatted text under `name`, so
 * read it with `parseAmount`.
 */
export function MoneyInput(props: Omit<ComponentProps<typeof InputGroupInput>, "value" | "onChange" | "type">) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  // Number of digits/dots before the caret, restored after reformatting.
  const caret = useRef<number | null>(null);

  useLayoutEffect(() => {
    const input = ref.current;
    if (!input || caret.current === null) return;
    let seen = 0;
    let pos = 0;
    while (pos < value.length && seen < caret.current) if (SIGNIFICANT.test(value[pos++])) seen++;
    input.setSelectionRange(pos, pos);
    caret.current = null;
  }, [value]);

  return (
    <InputGroupInput
      {...props}
      ref={ref}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={value}
      onChange={(e) => {
        const before = e.target.value.slice(0, e.target.selectionStart ?? e.target.value.length);
        caret.current = [...before].filter((ch) => SIGNIFICANT.test(ch)).length;
        setValue(formatAmount(e.target.value));
      }}
    />
  );
}
