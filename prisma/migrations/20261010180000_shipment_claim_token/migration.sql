-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "claimTokenHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_claimTokenHash_key" ON "Shipment"("claimTokenHash");

