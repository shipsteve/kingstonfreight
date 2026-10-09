"use client";

import type { Zone } from "@prisma/client";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteZone, upsertZone } from "@/server/actions/admin-pricing";

const splitList = (s: string) =>
  s
    .split(/[\s,]+/)
    .map((x) => x.trim())
    .filter(Boolean);

function ZoneRow({ zone }: { zone?: Zone }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState(zone?.name ?? "");
  const [kind, setKind] = useState<"DOMESTIC" | "INTERNATIONAL">(zone?.kind ?? "INTERNATIONAL");
  const [list, setList] = useState((kind === "DOMESTIC" ? zone?.postcodePrefixes : zone?.countryCodes)?.join(", ") ?? "");

  const save = () =>
    start(async () => {
      const items = splitList(list);
      const res = await upsertZone({
        id: zone?.id,
        name,
        kind,
        postcodePrefixes: kind === "DOMESTIC" ? items : [],
        countryCodes: kind === "INTERNATIONAL" ? items : [],
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(zone ? "Zone saved" : "Zone added");
      if (!zone) {
        setName("");
        setList("");
      }
      router.refresh();
    });

  return (
    <form
      className="grid items-center gap-2 sm:grid-cols-[minmax(120px,1fr)_150px_2fr_auto_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <Input aria-label="Zone name" placeholder="Zone name" value={name} onChange={(e) => setName(e.target.value)} required />
      <select
        aria-label="Zone kind"
        value={kind}
        onChange={(e) => setKind(e.target.value as typeof kind)}
        className="h-9 rounded-md border border-input bg-transparent px-3 text-sm dark:bg-input/30"
      >
        <option value="DOMESTIC">Domestic</option>
        <option value="INTERNATIONAL">International</option>
      </select>
      <Input
        aria-label={kind === "DOMESTIC" ? "Postcode prefixes" : "Country codes"}
        placeholder={kind === "DOMESTIC" ? "Postcode prefixes: 0, 1, 2" : "Country codes: GB, FR (empty = everything else)"}
        value={list}
        onChange={(e) => setList(e.target.value)}
      />
      <Button type="submit" variant={zone ? "outline" : "default"} disabled={pending}>
        {zone ? "Save" : "Add zone"}
      </Button>
      {zone ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Delete ${zone.name}`}
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await deleteZone(zone.id);
              if (!res.ok) {
                toast.error(res.error);
                return;
              }
              router.refresh();
            })
          }
        >
          <Trash2 />
        </Button>
      ) : (
        <span />
      )}
    </form>
  );
}

export function ZoneEditor({ zones }: { zones: Zone[] }) {
  return (
    <div className="space-y-2">
      {zones.map((z) => (
        <ZoneRow key={z.id} zone={z} />
      ))}
      <div className="border-t pt-4">
        <ZoneRow />
      </div>
    </div>
  );
}
