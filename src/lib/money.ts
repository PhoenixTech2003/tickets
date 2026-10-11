/**
 * Ticket prices are stored as integers in the currency's minor unit (e.g.
 * tambala, cents) so no floating-point rounding creeps into totals.
 */

export const CURRENCIES = ["MWK", "ZAR", "ZMW", "TZS", "KES", "USD", "EUR", "GBP"] as const;
export type Currency = (typeof CURRENCIES)[number];
export const DEFAULT_CURRENCY: Currency = "MWK";

export const isCurrency = (value: unknown): value is Currency => CURRENCIES.includes(value as Currency);

const fractionDigits = (currency: string) =>
  new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;

export const toMinor = (amount: number, currency: string) => Math.round(amount * 10 ** fractionDigits(currency));

export function formatMoney(minor: number, currency: string, locale?: string) {
  const digits = fractionDigits(currency);
  // Whole amounts drop the decimals ("MWK 15,000", not "MWK 15,000.00").
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: minor % 10 ** digits === 0 ? 0 : digits,
  }).format(minor / 10 ** digits);
}
