/*
  Warnings:

  - Added the required column `business_id` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `business_id` to the `Table` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "orders"."OrderStatus" ADD VALUE 'CANCELED';

-- AlterTable
ALTER TABLE "orders"."Order" ADD COLUMN     "business_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "orders"."Table" ADD COLUMN     "business_id" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Order_business_id_idx" ON "orders"."Order"("business_id");

-- CreateIndex
CREATE INDEX "Table_business_id_idx" ON "orders"."Table"("business_id");
