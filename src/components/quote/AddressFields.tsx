"use client";

import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { COUNTRY_OPTIONS } from "@/lib/geo/countries";
import type { Address } from "@/lib/pricing/types";

export function AddressFields({
  id,
  legend,
  value,
  onChange,
  lockCountry,
  withContact,
}: {
  id: string;
  legend: string;
  value: Address;
  onChange: (next: Address) => void;
  lockCountry?: boolean;
  /** Also collect phone and email (admin orders / receipts). */
  withContact?: boolean;
}) {
  const set = (key: keyof Address) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [key]: e.target.value });

  return (
    <FieldSet>
      <FieldLegend>{legend}</FieldLegend>
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor={`${id}-name`}>Contact name</FieldLabel>
          <Input id={`${id}-name`} value={value.name} onChange={set("name")} autoComplete="name" required />
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor={`${id}-line1`}>Street address</FieldLabel>
          <Input id={`${id}-line1`} value={value.line1} onChange={set("line1")} autoComplete="address-line1" required />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-city`}>City</FieldLabel>
          <Input id={`${id}-city`} value={value.city} onChange={set("city")} autoComplete="address-level2" required />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-postcode`}>Postcode</FieldLabel>
          <Input
            id={`${id}-postcode`}
            value={value.postcode}
            onChange={set("postcode")}
            autoComplete="postal-code"
            required
          />
        </Field>
        {withContact && (
          <>
            <Field>
              <FieldLabel htmlFor={`${id}-phone`}>Phone</FieldLabel>
              <Input
                id={`${id}-phone`}
                type="tel"
                value={value.phone ?? ""}
                onChange={set("phone")}
                autoComplete="tel"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-email`}>Email</FieldLabel>
              <Input
                id={`${id}-email`}
                type="email"
                value={value.email ?? ""}
                onChange={set("email")}
                autoComplete="email"
              />
            </Field>
          </>
        )}
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor={`${id}-country`}>Country</FieldLabel>
          <select
            id={`${id}-country`}
            value={value.countryCode}
            onChange={set("countryCode")}
            disabled={lockCountry}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60 dark:bg-input/30"
          >
            {COUNTRY_OPTIONS.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      </FieldGroup>
    </FieldSet>
  );
}
