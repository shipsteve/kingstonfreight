import { CourierRateForm } from "@/components/admin/CourierRateForm";
import { RateMatrix } from "@/components/admin/RateMatrix";
import { ZoneEditor } from "@/components/admin/ZoneEditor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPricingData } from "@/server/queries/admin";

export const metadata = { title: "Pricing" };

export default async function PricingPage() {
  const { zones, rates, courier } = await getPricingData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pricing</h1>
        <p className="text-muted-foreground">Changes apply to new quotes immediately. Existing quotes keep their price.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Zones</CardTitle>
          <CardDescription>
            Domestic zones match home-country postcodes by prefix (longest wins). International zones match by country; an
            international zone with no countries catches everything else.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ZoneEditor zones={zones} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Parcel rates</CardTitle>
          <CardDescription>
            One table per origin zone. Rows are weight bands (up to N kg), columns are destination zones. Edit a cell and
            press Enter or leave it to save; clear it to remove that band.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RateMatrix zones={zones} rates={rates} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Local courier</CardTitle>
          <CardDescription>Price = base fee + per started km. Requests beyond max distance are refused.</CardDescription>
        </CardHeader>
        <CardContent>
          <CourierRateForm courier={courier} />
        </CardContent>
      </Card>
    </div>
  );
}
