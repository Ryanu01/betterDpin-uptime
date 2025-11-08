/*
  Warnings:

  - You are about to drop the column `status` on the `Validator` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Validator" DROP COLUMN "status";

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "validatorId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "TxnStatus" NOT NULL,
    "signature" TEXT NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_validatorId_fkey" FOREIGN KEY ("validatorId") REFERENCES "Validator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
