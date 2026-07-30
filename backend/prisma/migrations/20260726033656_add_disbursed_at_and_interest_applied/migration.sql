-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "disbursedAt" TIMESTAMP(3),
ADD COLUMN     "interestApplied" BOOLEAN NOT NULL DEFAULT false;
