"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { DateTimePicker } from "@/components/app/date-time-picker";
import { useAction } from "@/components/app/use-action";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createEvent, updateEvent } from "@/server/actions/events";
import type { EventRow } from "@/lib/powersync/schema";
import { toDate } from "@/lib/format";
import { CURRENCIES, type Currency, DEFAULT_CURRENCY, isCurrency } from "@/lib/money";
import { useNow } from "@/hooks/use-now";
import { eventHref } from "@/lib/search-params";

const currencyName = new Intl.DisplayNames(undefined, { type: "currency" });

/** Full-page create (no `event`) or edit form. */
export function EventForm({ event }: { event?: EventRow }) {
  const router = useRouter();
  const backHref = event ? eventHref(event.id) : "/dashboard";
  const create = useAction(createEvent, {
    success: "Event created",
    onSuccess: ({ id }) => router.push(eventHref(id)),
  });
  const update = useAction(updateEvent, { success: "Event updated", onSuccess: () => router.push(backHref) });
  const pending = create.pending || update.pending;
  const [startsAt, setStartsAt] = useState<Date | undefined>(() => (event ? toDate(event.starts_at) : undefined));
  const [endsAt, setEndsAt] = useState<Date | undefined>(() => (event?.ends_at ? toDate(event.ends_at) : undefined));
  const [startsMissing, setStartsMissing] = useState(false);
  const [currency, setCurrency] = useState<Currency>(() => (isCurrency(event?.currency) ? event.currency : DEFAULT_CURRENCY));
  const now = useNow();

  async function onSubmit(form: FormData) {
    if (!startsAt) return setStartsMissing(true);
    const values = {
      name: String(form.get("name") ?? ""),
      venue: String(form.get("venue") ?? ""),
      description: String(form.get("description") ?? "") || null,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt?.toISOString() ?? null,
      currency,
    };
    if (event) await update.execute({ id: event.id, ...values });
    else await create.execute(values);
  }

  return (
    <form action={onSubmit} className="space-y-6">
      <section className="rounded-xl border bg-card p-5 sm:p-6">
        <FieldSet>
          <FieldLegend className="mb-4 text-base font-semibold">Details</FieldLegend>
          <FieldGroup className="grid gap-6 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input id="name" name="name" required autoFocus defaultValue={event?.name} placeholder="Lake of Stars 2026" />
            </Field>
            <Field>
              <FieldLabel htmlFor="venue">Venue</FieldLabel>
              <Input id="venue" name="venue" required defaultValue={event?.venue} placeholder="Sunbird Nkopola, Mangochi" />
            </Field>
            <Field>
              <FieldLabel htmlFor="currency">Ticket currency</FieldLabel>
              <Select value={currency} onValueChange={(v) => isCurrency(v) && setCurrency(v)}>
                <SelectTrigger id="currency" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code} · {currencyName.of(code)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>Used for ticket prices. Prices are optional.</FieldDescription>
            </Field>
            <Field className="md:col-span-2">
              <FieldLabel htmlFor="description">Notes (optional)</FieldLabel>
              <Textarea id="description" name="description" rows={4} defaultValue={event?.description ?? ""} />
            </Field>
          </FieldGroup>
        </FieldSet>
      </section>

      <section className="rounded-xl border bg-card p-5 sm:p-6">
        <FieldSet>
          <FieldLegend className="mb-4 text-base font-semibold">Schedule</FieldLegend>
          <FieldGroup className="grid gap-6 sm:grid-cols-2">
            <Field data-invalid={startsMissing || undefined}>
              <FieldLabel htmlFor="startsAt">Starts</FieldLabel>
              <DateTimePicker
                id="startsAt"
                title="When does it start?"
                value={startsAt}
                min={new Date(now)}
                onChange={(d) => {
                  setStartsAt(d);
                  setStartsMissing(false);
                  if (d && endsAt && endsAt <= d) setEndsAt(undefined);
                }}
              />
              {startsMissing && <FieldError>Pick the date the event starts.</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor="endsAt">Ends (optional)</FieldLabel>
              <DateTimePicker
                id="endsAt"
                title="When does it end?"
                value={endsAt}
                min={startsAt && startsAt.getTime() > now ? new Date(startsAt.getTime() + 5 * 60_000) : new Date(now)}
                onChange={setEndsAt}
                placeholder="No end time"
                clearable
              />
            </Field>
          </FieldGroup>
        </FieldSet>
      </section>

      <div className="flex justify-end gap-2">
        <Button asChild type="button" variant="ghost">
          <Link href={backHref}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2Icon className="animate-spin" />}
          {event ? "Save changes" : "Create event"}
        </Button>
      </div>
    </form>
  );
}
