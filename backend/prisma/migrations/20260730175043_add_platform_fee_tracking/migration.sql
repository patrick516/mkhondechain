-- AlterTable
ALTER TABLE "groups" ADD COLUMN     "platformFeePercent" DOUBLE PRECISION NOT NULL DEFAULT 2;

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "activeLoanInterestCollected" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "activeLoanInterestTotal" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "knownMobileMoneyBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPlatformFeesCollected" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedByUsername" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);
