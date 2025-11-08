/*
  Warnings:

  - Added the required column `status` to the `Validator` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TxnStatus" AS ENUM ('Processing', 'Sucess', 'Failed');

-- AlterTable
ALTER TABLE "Validator" ADD COLUMN     "status" "TxnStatus" NOT NULL;
