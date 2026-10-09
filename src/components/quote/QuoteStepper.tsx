"use client";

import { ArrowLeft, ArrowRight, Box, Loader2, Ship, Truck } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/money";
import { PRICE_FAIL_MESSAGES } from "@/lib/pricing/messages";
import { calculatePrice, createQuote } from "@/server/actions/quotes";
import { AddressFields } from "./AddressFields";
import { newDraft, saveDraft, takeDraft, toQuoteInput, type QuoteDraft, type ServiceType } from "./draft";
import { PackageFields } from "./PackageFields";
import { ServiceCard } from "./ServiceCard";

const STEPS = ["Service", "Addresses", "Details", "Price"];

export const SERVICES: { type: ServiceType; title: string; blurb: string; icon: React.ReactNode }[] = [
  {
    type: "PARCEL",
    title: "Parcel",
    blurb: "Boxes up to 30 kg, domestic and international. Instant price.",
    icon: <Box />,
  },
  {
    type: "COURIER",
    title: "Local courier",
    blurb: "Same-day, door to door within the city. Instant price.",
    icon: <Truck />,
  },
  {
    type: "FREIGHT",
    title: "Freight",
    blurb: "Pallets and containers by air, sea or road. Priced by our team.",
    icon: <Ship />,
  },
];

type PriceState =
  { status: "idle" | "loading" } | { status: "ok"; priceCents: number } | { status: "error"; message: string };

export function QuoteStepper({ homeCountry, loggedIn }: { homeCountry: string; loggedIn: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState<QuoteDraft>(() => newDraft(homeCountry));
  const [direction, setDirection] = useState(1);
  const [price, setPrice] = useState<PriceState>({ status: "idle" });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();

  useEffect(() => {
    const restored = takeDraft();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from sessionStorage after login
    if (restored) setDraft(restored);
  }, []);

  const patch = (p: Partial<QuoteDraft>) => setDraft((d) => ({ ...d, ...p }));
  const go = (step: number) => {
    setDirection(step > draft.step ? 1 : -1);
    setSubmitError(null);
    patch({ step });
  };

  const isFreight = draft.serviceType === "FREIGHT";

  useEffect(() => {
    if (draft.step !== 3 || isFreight) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- show a spinner while the price loads
    setPrice({ status: "loading" });
    calculatePrice(toQuoteInput(draft)).then((res) => {
      if (cancelled) return;
      if (!res.ok) setPrice({ status: "error", message: res.error });
      else if (!res.data.ok) setPrice({ status: "error", message: PRICE_FAIL_MESSAGES[res.data.reason] });
      else setPrice({ status: "ok", priceCents: res.data.priceCents });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-price only when arriving on the price step
  }, [draft.step, isFreight]);

  function submit() {
    if (!loggedIn) {
      saveDraft(draft);
      router.push("/login?next=/quote");
      return;
    }
    startSubmit(async () => {
      const res = await createQuote(toQuoteInput(draft));
      if (!res.ok) setSubmitError(res.error);
      else router.push(`/quotes/${res.data.id}`);
    });
  }

  function chooseService(serviceType: ServiceType) {
    const courier = serviceType === "COURIER";
    patch({
      serviceType,
      origin: courier ? { ...draft.origin, countryCode: homeCountry } : draft.origin,
      destination: courier ? { ...draft.destination, countryCode: homeCountry } : draft.destination,
    });
    go(1);
  }

  function onNext(e: React.FormEvent) {
    e.preventDefault();
    go(draft.step + 1);
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto w-full max-w-3xl">
        <ol className="mb-8 flex items-center gap-2 text-sm" aria-label="Progress">
          {STEPS.map((label, i) => (
            <li key={label} className="flex flex-1 items-center gap-2">
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-full border text-xs font-medium transition-colors ${
                  i <= draft.step ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
                aria-current={i === draft.step ? "step" : undefined}
              >
                {i + 1}
              </span>
              <span className={`hidden sm:inline ${i === draft.step ? "font-medium" : "text-muted-foreground"}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && <span className="h-px flex-1 bg-border" />}
            </li>
          ))}
        </ol>

        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={draft.step}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {draft.step === 0 && (
              <div className="grid gap-4 sm:grid-cols-3">
                {SERVICES.map((s) => (
                  <ServiceCard
                    key={s.type}
                    title={s.title}
                    blurb={s.blurb}
                    icon={s.icon}
                    selected={draft.serviceType === s.type}
                    onSelect={() => chooseService(s.type)}
                  />
                ))}
              </div>
            )}

            {draft.step === 1 && (
              <form onSubmit={onNext} className="space-y-8">
                <AddressFields
                  id="origin"
                  legend="Pick up from"
                  value={draft.origin}
                  onChange={(origin) => patch({ origin })}
                  lockCountry={draft.serviceType === "COURIER"}
                />
                <AddressFields
                  id="destination"
                  legend="Deliver to"
                  value={draft.destination}
                  onChange={(destination) => patch({ destination })}
                  lockCountry={draft.serviceType === "COURIER"}
                />
                <StepNav onBack={() => go(0)} />
              </form>
            )}

            {draft.step === 2 && (
              <form onSubmit={onNext} className="space-y-6">
                {draft.serviceType === "COURIER" ? (
                  <Field>
                    <FieldLabel htmlFor="distance">Distance (km)</FieldLabel>
                    <Input
                      id="distance"
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={draft.distanceKm || ""}
                      onChange={(e) => patch({ distanceKm: Number(e.target.value) })}
                      required
                    />
                  </Field>
                ) : (
                  <PackageFields value={draft.packages} onChange={(packages) => patch({ packages })} />
                )}
                {isFreight && (
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="mode">Transport mode</FieldLabel>
                      <select
                        id="mode"
                        value={draft.freightDetails.mode}
                        onChange={(e) =>
                          patch({
                            freightDetails: { ...draft.freightDetails, mode: e.target.value as "AIR" | "SEA" | "ROAD" },
                          })
                        }
                        className="h-9 rounded-md border border-input bg-transparent px-3 text-sm dark:bg-input/30"
                      >
                        <option value="SEA">Sea</option>
                        <option value="AIR">Air</option>
                        <option value="ROAD">Road</option>
                      </select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="cargoType">Cargo type</FieldLabel>
                      <Input
                        id="cargoType"
                        placeholder="e.g. Pallets, 20ft container"
                        value={draft.freightDetails.cargoType}
                        onChange={(e) =>
                          patch({ freightDetails: { ...draft.freightDetails, cargoType: e.target.value } })
                        }
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="description">What are you shipping?</FieldLabel>
                      <Textarea
                        id="description"
                        value={draft.freightDetails.description}
                        onChange={(e) =>
                          patch({ freightDetails: { ...draft.freightDetails, description: e.target.value } })
                        }
                        required
                      />
                    </Field>
                  </FieldGroup>
                )}
                <StepNav onBack={() => go(1)} />
              </form>
            )}

            {draft.step === 3 && (
              <div className="space-y-6">
                <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
                  {isFreight ? (
                    <>
                      <p className="text-lg font-medium">Our freight team will price this for you</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Submit your request and we&apos;ll email you a quote, usually within one business day.
                      </p>
                    </>
                  ) : price.status === "ok" ? (
                    <>
                      <p className="text-sm text-muted-foreground">Your price</p>
                      <motion.p
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="mt-1 text-5xl font-semibold tracking-tight"
                      >
                        {formatMoney(price.priceCents)}
                      </motion.p>
                      <p className="mt-2 text-sm text-muted-foreground">Valid for 7 days once saved.</p>
                    </>
                  ) : price.status === "error" ? (
                    <p role="alert" className="text-destructive">
                      {price.message}
                    </p>
                  ) : (
                    <Loader2 className="mx-auto animate-spin" aria-label="Calculating price" />
                  )}
                </div>
                {submitError && (
                  <p role="alert" className="text-sm text-destructive">
                    {submitError}
                  </p>
                )}
                <div className="flex justify-between gap-3">
                  <Button type="button" variant="ghost" onClick={() => go(2)}>
                    <ArrowLeft /> Back
                  </Button>
                  <Button type="button" onClick={submit} disabled={submitting || (!isFreight && price.status !== "ok")}>
                    {submitting ? <Loader2 className="animate-spin" /> : null}
                    {isFreight ? "Submit request" : "Save & book"}
                    {!loggedIn && " (log in)"}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

function StepNav({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex justify-between gap-3">
      <Button type="button" variant="ghost" onClick={onBack}>
        <ArrowLeft /> Back
      </Button>
      <Button type="submit">
        Next <ArrowRight />
      </Button>
    </div>
  );
}
