"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeTrackingNumber } from "@/lib/tracking/number";
import { cn } from "@/lib/utils";

export function TrackForm({ className, defaultValue = "" }: { className?: string; defaultValue?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  return (
    <form
      role="search"
      className={cn("flex w-full max-w-md gap-2", className)}
      onSubmit={(e) => {
        e.preventDefault();
        const n = normalizeTrackingNumber(value);
        if (n) router.push(`/track/${encodeURIComponent(n)}`);
      }}
    >
      <Input
        aria-label="Tracking number"
        placeholder="876-12345675"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-11 font-mono"
        required
      />
      <Button type="submit" size="lg" className="h-11">
        <Search /> Track
      </Button>
    </form>
  );
}
