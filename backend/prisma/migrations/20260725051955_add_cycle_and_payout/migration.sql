-- AlterTable
ALTER TABLE "groups" ADD COLUMN     "cycleActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cycleEndDate" TIMESTAMP(3),
ADD COLUMN     "cycleStartDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "dueDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "payouts" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "cycleStartDate" TIMESTAMP(3) NOT NULL,
    "cycleEndDate" TIMESTAMP(3) NOT NULL,
    "entitledShare" DOUBLE PRECISION NOT NULL,
    "loanOffset" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashPayout" DOUBLE PRECISION NOT NULL,
    "remainingLoanBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "note" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payouts_groupId_cycleEndDate_idx" ON "payouts"("groupId", "cycleEndDate");

-- CreateIndex
CREATE INDEX "payouts_memberId_idx" ON "payouts"("memberId");

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
