-- Data mapping: CARD/INVOICE -> BALANCE, AWAITING_PAYMENT -> BOOKED (Stripe removed; bookings are paid from balance).
-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "LedgerKind" AS ENUM ('TOPUP', 'BOOKING', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "Coin" AS ENUM ('BTC', 'LTC');

-- CreateEnum
CREATE TYPE "TopUpMethod" AS ENUM ('MANUAL');

-- CreateEnum
CREATE TYPE "TopUpStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TransportMode" AS ENUM ('AIR', 'SEA', 'ROAD');

-- CreateEnum
CREATE TYPE "BillTo" AS ENUM ('SENDER', 'RECIPIENT', 'THIRD_PARTY');

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentMethod_new" AS ENUM ('BALANCE', 'COUNTER');
ALTER TABLE "Shipment" ALTER COLUMN "paymentMethod" TYPE "PaymentMethod_new" USING (CASE WHEN "paymentMethod"::text IN ('CARD', 'INVOICE') THEN 'BALANCE' ELSE "paymentMethod"::text END::"PaymentMethod_new");
ALTER TYPE "PaymentMethod" RENAME TO "PaymentMethod_old";
ALTER TYPE "PaymentMethod_new" RENAME TO "PaymentMethod";
DROP TYPE "public"."PaymentMethod_old";
COMMIT;

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'REFUNDED';

-- AlterEnum
BEGIN;
CREATE TYPE "ShipmentStatus_new" AS ENUM ('BOOKED', 'PICKED_UP', 'IN_TRANSIT', 'CUSTOMS', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION', 'CANCELLED');
ALTER TABLE "Shipment" ALTER COLUMN "status" TYPE "ShipmentStatus_new" USING (CASE WHEN "status"::text = 'AWAITING_PAYMENT' THEN 'BOOKED' ELSE "status"::text END::"ShipmentStatus_new");
ALTER TABLE "TrackingEvent" ALTER COLUMN "status" TYPE "ShipmentStatus_new" USING (CASE WHEN "status"::text = 'AWAITING_PAYMENT' THEN 'BOOKED' ELSE "status"::text END::"ShipmentStatus_new");
ALTER TYPE "ShipmentStatus" RENAME TO "ShipmentStatus_old";
ALTER TYPE "ShipmentStatus_new" RENAME TO "ShipmentStatus";
DROP TYPE "public"."ShipmentStatus_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Shipment" DROP CONSTRAINT "Shipment_quoteId_fkey";

-- DropForeignKey
ALTER TABLE "Shipment" DROP CONSTRAINT "Shipment_userId_fkey";

-- AlterTable
ALTER TABLE "Shipment" DROP COLUMN "stripeSessionId",
ADD COLUMN     "actualWeightKg" DOUBLE PRECISION,
ADD COLUMN     "arrivalPort" TEXT,
ADD COLUMN     "billTo" "BillTo",
ADD COLUMN     "chargeableWeightKg" DOUBLE PRECISION,
ADD COLUMN     "contents" TEXT,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "customerEmail" TEXT,
ADD COLUMN     "declaredValueCents" INTEGER,
ADD COLUMN     "departureDate" TIMESTAMP(3),
ADD COLUMN     "departurePort" TEXT,
ADD COLUMN     "estimatedArrival" TIMESTAMP(3),
ADD COLUMN     "goodsOriginCountry" TEXT,
ADD COLUMN     "hsCode" TEXT,
ADD COLUMN     "packages" JSONB,
ADD COLUMN     "transportMode" "TransportMode",
ALTER COLUMN "quoteId" DROP NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountStatus" "AccountStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "kind" "LedgerKind" NOT NULL,
    "topUpId" TEXT,
    "shipmentId" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopUp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "method" "TopUpMethod" NOT NULL DEFAULT 'MANUAL',
    "coin" "Coin" NOT NULL,
    "txHash" TEXT NOT NULL,
    "requestedCents" INTEGER NOT NULL,
    "creditedCents" INTEGER,
    "status" "TopUpStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "chainCheck" JSONB,
    "adminNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TopUp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_topUpId_key" ON "LedgerEntry"("topUpId");

-- CreateIndex
CREATE INDEX "LedgerEntry_userId_idx" ON "LedgerEntry"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_shipmentId_kind_key" ON "LedgerEntry"("shipmentId", "kind");

-- CreateIndex
CREATE INDEX "TopUp_status_idx" ON "TopUp"("status");

-- CreateIndex
CREATE INDEX "TopUp_userId_idx" ON "TopUp"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TopUp_coin_txHash_key" ON "TopUp"("coin", "txHash");

-- CreateIndex
CREATE INDEX "Shipment_customerEmail_idx" ON "Shipment"("customerEmail");

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_topUpId_fkey" FOREIGN KEY ("topUpId") REFERENCES "TopUp"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopUp" ADD CONSTRAINT "TopUp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Existing admins are approved accounts.
UPDATE "User" SET "accountStatus" = 'APPROVED', "approvedAt" = NOW() WHERE "role" = 'ADMIN';
