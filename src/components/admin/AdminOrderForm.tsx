"use client";

import { Loader2, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { AddressFields } from "@/components/quote/AddressFields";
import { emptyAddress, emptyPackage } from "@/components/quote/draft";
import { PackageFields } from "@/components/quote/PackageFields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { COUNTRY_OPTIONS } from "@/lib/geo/countries";
import { dollarsToCents } from "@/lib/money";
import type { Address, PackageInput } from "@/lib/pricing/types";
import { shipmentWeights } from "@/lib/pricing/weight";
import { createAdminOrder, suggestAdminOrderPrice } from "@/server/actions/admin-orders";

const select = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm dark:bg-input/30";

export function AdminOrderForm({ homeCountry }: { homeCountry: string }) {
  const router = useRouter();
  const [customerEmail, setCustomerEmail] = useState("");
  const [sender, setSender] = useState<Address>(emptyAddress(homeCountry));
  const [recipient, setRecipient] = useState<Address>(emptyAddress(homeCountry));
  const [serviceType, setServiceType] = useState<"PARCEL" | "COURIER" | "FREIGHT">("PARCEL");
  const [transportMode, setTransportMode] = useState<"" | "AIR" | "SEA" | "ROAD">("AIR");
  const [departurePort, setDeparturePort] = useState("");
  const [arrivalPort, setArrivalPort] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [estimatedArrival, setEstimatedArrival] = useState("");
  const [estimatedDelivery, setEstimatedDelivery] = useState("");
  const [packages, setPackages] = useState<PackageInput[]>([emptyPackage()]);
  const [contents, setContents] = useState("");
  const [declaredValue, setDeclaredValue] = useState("");
  const [goodsOriginCountry, setGoodsOriginCountry] = useState(homeCountry);
  const [hsCode, setHsCode] = useState("");
  const [price, setPrice] = useState("");
  const [billTo, setBillTo] = useState<"SENDER" | "RECIPIENT" | "THIRD_PARTY">("SENDER");
  const [payment, setPayment] = useState<"COUNTER" | "BALANCE">("COUNTER");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const weights = shipmentWeights(packages.filter((p) => p.weightKg > 0 && p.qty > 0));

  function suggest() {
    start(async () => {
      const res = await suggestAdminOrderPrice({ serviceType, sender, recipient, packages });
      if (!res.ok) return void toast.error(res.error);
      setPrice((res.data.priceCents / 100).toFixed(2));
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const priceCents = dollarsToCents(price);
    const declaredValueCents = declaredValue.trim() === "" ? 0 : dollarsToCents(declaredValue);
    if (!priceCents) return setError("Enter the price, e.g. 125.00");
    if (declaredValueCents === null) return setError("Enter the declared value, e.g. 1500.00");
    start(async () => {
      setError(null);
      const res = await createAdminOrder({
        customerEmail,
        sender,
        recipient,
        serviceType,
        transportMode: transportMode || undefined,
        departurePort,
        arrivalPort,
        departureDate,
        estimatedArrival,
        estimatedDelivery,
        packages,
        contents,
        declaredValueCents,
        goodsOriginCountry,
        hsCode,
        priceCents,
        billTo,
        payment,
      });
      if (!res.ok) return setError(res.error);
      toast.success(`Order ${res.data.trackingNumber} created`);
      router.push(`/admin/shipments/${res.data.shipmentId}`);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer</CardTitle>
        </CardHeader>
        <CardContent>
          <Field>
            <FieldLabel htmlFor="customerEmail">Customer email</FieldLabel>
            <Input
              id="customerEmail"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              required
            />
            <FieldDescription>
              The tracking link is emailed here. If they have (or later create) an account with this email, the order
              appears in their dashboard.
            </FieldDescription>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-8 lg:grid-cols-2">
          <AddressFields id="sender" legend="Sender" value={sender} onChange={setSender} withContact />
          <AddressFields id="recipient" legend="Recipient" value={recipient} onChange={setRecipient} withContact />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Service & schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="serviceType">Service</FieldLabel>
              <select
                id="serviceType"
                className={select}
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value as typeof serviceType)}
              >
                <option value="PARCEL">Parcel</option>
                <option value="COURIER">Local courier</option>
                <option value="FREIGHT">Freight</option>
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="transportMode">Mode</FieldLabel>
              <select
                id="transportMode"
                className={select}
                value={transportMode}
                onChange={(e) => setTransportMode(e.target.value as typeof transportMode)}
              >
                <option value="AIR">Air</option>
                <option value="SEA">Sea</option>
                <option value="ROAD">Road</option>
                <option value="">—</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="departurePort">From (code)</FieldLabel>
                <Input
                  id="departurePort"
                  placeholder="JFK"
                  maxLength={3}
                  value={departurePort}
                  onChange={(e) => setDeparturePort(e.target.value.toUpperCase())}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="arrivalPort">To (code)</FieldLabel>
                <Input
                  id="arrivalPort"
                  placeholder="CDG"
                  maxLength={3}
                  value={arrivalPort}
                  onChange={(e) => setArrivalPort(e.target.value.toUpperCase())}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="departureDate">Departure date</FieldLabel>
              <Input
                id="departureDate"
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="estimatedArrival">Estimated arrival</FieldLabel>
              <Input
                id="estimatedArrival"
                type="date"
                min={departureDate || undefined}
                value={estimatedArrival}
                onChange={(e) => setEstimatedArrival(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="estimatedDelivery">Estimated delivery date</FieldLabel>
              <Input id="estimatedDelivery" type="date" min={estimatedArrival || departureDate || undefined}
                value={estimatedDelivery} onChange={(e) => setEstimatedDelivery(e.target.value)} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pieces</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PackageFields value={packages} onChange={setPackages} />
          <p className="text-sm text-muted-foreground" data-testid="weights">
            Actual weight <span className="font-medium text-foreground tabular-nums">{weights.actualKg} kg</span> ·
            Chargeable weight{" "}
            <span className="font-medium text-foreground tabular-nums">{weights.chargeableKg} kg</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contents</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="contents">Description of goods</FieldLabel>
              <Input id="contents" value={contents} onChange={(e) => setContents(e.target.value)} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="declaredValue">Declared value (USD)</FieldLabel>
              <Input
                id="declaredValue"
                inputMode="decimal"
                placeholder="0.00"
                value={declaredValue}
                onChange={(e) => setDeclaredValue(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="goodsOriginCountry">Country of origin</FieldLabel>
              <select
                id="goodsOriginCountry"
                className={select}
                value={goodsOriginCountry}
                onChange={(e) => setGoodsOriginCountry(e.target.value)}
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="hsCode">HS code (optional)</FieldLabel>
              <Input id="hsCode" placeholder="8487.90" value={hsCode} onChange={(e) => setHsCode(e.target.value)} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Charges</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="price">Price (USD)</FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="price"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
                {serviceType !== "FREIGHT" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Use rate table"
                    title="Use rate table"
                    disabled={pending}
                    onClick={suggest}
                  >
                    <Wand2 />
                  </Button>
                )}
              </div>
            </Field>
            <Field>
              <FieldLabel htmlFor="billTo">Bill to</FieldLabel>
              <select
                id="billTo"
                className={select}
                value={billTo}
                onChange={(e) => setBillTo(e.target.value as typeof billTo)}
              >
                <option value="SENDER">Sender</option>
                <option value="RECIPIENT">Recipient</option>
                <option value="THIRD_PARTY">Third party</option>
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="payment">Payment</FieldLabel>
              <select
                id="payment"
                className={select}
                value={payment}
                onChange={(e) => setPayment(e.target.value as typeof payment)}
              >
                <option value="COUNTER">Paid at counter</option>
                <option value="BALANCE">Charge customer&apos;s balance</option>
              </select>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        Create order
      </Button>
    </form>
  );
}
