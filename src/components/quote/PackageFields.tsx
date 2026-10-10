"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { PackageInput } from "@/lib/pricing/types";
import { emptyPackage } from "./draft";

const FIELDS: { key: keyof PackageInput; label: string; step: string }[] = [
  { key: "weightKg", label: "Weight (kg)", step: "0.1" },
  { key: "lengthCm", label: "Length (cm)", step: "1" },
  { key: "widthCm", label: "Width (cm)", step: "1" },
  { key: "heightCm", label: "Height (cm)", step: "1" },
  { key: "qty", label: "Qty", step: "1" },
];

export function PackageFields({ value, onChange }: { value: PackageInput[]; onChange: (p: PackageInput[]) => void }) {
  const update = (i: number, key: keyof PackageInput, raw: string) =>
    onChange(value.map((p, j) => (j === i ? { ...p, [key]: raw === "" ? 0 : Number(raw) } : p)));

  return (
    <div className="space-y-4">
      {value.map((pkg, i) => (
        <div key={i} className="grid grid-cols-2 items-end gap-3 rounded-lg border p-3 sm:grid-cols-[repeat(5,1fr)_auto]">
          {FIELDS.map((f) => (
            <Field key={f.key}>
              <FieldLabel htmlFor={`pkg-${i}-${f.key}`} className="text-xs">
                {f.label}
              </FieldLabel>
              <Input
                id={`pkg-${i}-${f.key}`}
                type="number"
                inputMode="decimal"
                min={f.key === "qty" ? 1 : 0}
                step={f.step}
                value={pkg[f.key] || ""}
                onChange={(e) => update(i, f.key, e.target.value)}
                required
              />
            </Field>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remove package ${i + 1}`}
            disabled={value.length === 1}
            onClick={() => onChange(value.filter((_, j) => j !== i))}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      {value.length < 20 && (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, emptyPackage()])}>
          <Plus /> Add package
        </Button>
      )}
    </div>
  );
}
