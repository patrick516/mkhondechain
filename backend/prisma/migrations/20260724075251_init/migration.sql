-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('admin', 'superadmin');

-- CreateEnum
CREATE TYPE "AdminStatus" AS ENUM ('active', 'suspended', 'inactive');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LoginSuccess', 'LoginFailed', 'LoginLocked', 'Logout', 'MemberCreated', 'MemberUpdated', 'MemberDeleted', 'MemberPinReset', 'TransactionCreated', 'TransactionApproved', 'TransactionRejected', 'TransactionReversed', 'LoanDisbursed', 'LoanRepaid', 'SettingsUpdated', 'BroadcastSent', 'AdminCreated', 'AdminUpdated', 'UnauthorizedAccess', 'SystemError');

-- CreateEnum
CREATE TYPE "AuditSeverity" AS ENUM ('info', 'warning', 'critical');

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('success', 'failed');

-- CreateEnum
CREATE TYPE "DisputeSource" AS ENUM ('USSD', 'Admin');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('open', 'investigating', 'resolved', 'rejected');

-- CreateEnum
CREATE TYPE "GroupStatus" AS ENUM ('active', 'inactive', 'suspended');

-- CreateEnum
CREATE TYPE "MemberGender" AS ENUM ('Male', 'Female', 'Other');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('active', 'suspended', 'left');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('save', 'borrow', 'repay', 'interest', 'fee', 'reversal');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('pending', 'success', 'failed', 'reversed');

-- CreateEnum
CREATE TYPE "TransactionMethod" AS ENUM ('USSD', 'Admin', 'MobileMoney', 'System');

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "username" VARCHAR(30) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" VARCHAR(100) NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'admin',
    "groupId" TEXT,
    "lastLogin" TIMESTAMP(3),
    "loginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockUntil" TIMESTAMP(3),
    "status" "AdminStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audits" (
    "id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "severity" "AuditSeverity" NOT NULL DEFAULT 'info',
    "performedById" TEXT,
    "performedByName" TEXT NOT NULL DEFAULT 'System',
    "targetMemberId" TEXT,
    "targetMemberPhone" TEXT,
    "groupId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "status" "AuditStatus" NOT NULL DEFAULT 'success',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "transactionId" TEXT,
    "source" "DisputeSource" NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'open',
    "loggedById" TEXT,
    "resolvedById" TEXT,
    "resolutionNote" VARCHAR(500),
    "resolvedAt" TIMESTAMP(3),
    "resolutionTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "location" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    "fundBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxLoanPercent" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "interestRate" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "maxRepayDays" INTEGER NOT NULL DEFAULT 30,
    "minSaveAmount" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "status" "GroupStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "firstName" VARCHAR(50) NOT NULL,
    "surname" VARCHAR(50) NOT NULL,
    "gender" "MemberGender" NOT NULL,
    "phone" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "loanBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSaved" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalBorrowed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRepaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "savingsCount" INTEGER NOT NULL DEFAULT 0,
    "borrowCount" INTEGER NOT NULL DEFAULT 0,
    "status" "MemberStatus" NOT NULL DEFAULT 'active',
    "lastActivity" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "repayDays" INTEGER NOT NULL DEFAULT 30,
    "interestRate" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "minSaveAmount" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "maxLoanPercent" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "savingWindowEnabled" BOOLEAN NOT NULL DEFAULT false,
    "savingWindowOpenTime" TEXT NOT NULL DEFAULT '08:00',
    "savingWindowCloseTime" TEXT NOT NULL DEFAULT '17:00',
    "lastBroadcastMessage" TEXT NOT NULL DEFAULT '',
    "lastBroadcastAt" TIMESTAMP(3),
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "beforeBalance" DOUBLE PRECISION NOT NULL,
    "afterBalance" DOUBLE PRECISION NOT NULL,
    "beforeLoanBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "afterLoanBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "TransactionStatus" NOT NULL DEFAULT 'pending',
    "method" "TransactionMethod" NOT NULL,
    "approvedById" TEXT,
    "mobileMoneyRef" TEXT,
    "note" VARCHAR(500) NOT NULL DEFAULT '',
    "reversed" BOOLEAN NOT NULL DEFAULT false,
    "reversalOfId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_username_key" ON "admins"("username");

-- CreateIndex
CREATE INDEX "admins_username_idx" ON "admins"("username");

-- CreateIndex
CREATE INDEX "audits_action_createdAt_idx" ON "audits"("action", "createdAt");

-- CreateIndex
CREATE INDEX "audits_performedById_createdAt_idx" ON "audits"("performedById", "createdAt");

-- CreateIndex
CREATE INDEX "audits_groupId_createdAt_idx" ON "audits"("groupId", "createdAt");

-- CreateIndex
CREATE INDEX "audits_severity_createdAt_idx" ON "audits"("severity", "createdAt");

-- CreateIndex
CREATE INDEX "audits_createdAt_idx" ON "audits"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "disputes_resolutionTransactionId_key" ON "disputes"("resolutionTransactionId");

-- CreateIndex
CREATE INDEX "disputes_groupId_createdAt_idx" ON "disputes"("groupId", "createdAt");

-- CreateIndex
CREATE INDEX "disputes_memberId_createdAt_idx" ON "disputes"("memberId", "createdAt");

-- CreateIndex
CREATE INDEX "disputes_status_createdAt_idx" ON "disputes"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "groups_name_key" ON "groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "groups_leaderId_key" ON "groups"("leaderId");

-- CreateIndex
CREATE INDEX "groups_name_idx" ON "groups"("name");

-- CreateIndex
CREATE INDEX "groups_status_idx" ON "groups"("status");

-- CreateIndex
CREATE UNIQUE INDEX "members_phone_key" ON "members"("phone");

-- CreateIndex
CREATE INDEX "members_groupId_idx" ON "members"("groupId");

-- CreateIndex
CREATE INDEX "members_status_idx" ON "members"("status");

-- CreateIndex
CREATE INDEX "members_phone_status_idx" ON "members"("phone", "status");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_groupId_key" ON "system_settings"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_reference_key" ON "transactions"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_reversalOfId_key" ON "transactions"("reversalOfId");

-- CreateIndex
CREATE INDEX "transactions_memberId_createdAt_idx" ON "transactions"("memberId", "createdAt");

-- CreateIndex
CREATE INDEX "transactions_groupId_createdAt_idx" ON "transactions"("groupId", "createdAt");

-- CreateIndex
CREATE INDEX "transactions_status_createdAt_idx" ON "transactions"("status", "createdAt");

-- CreateIndex
CREATE INDEX "transactions_mobileMoneyRef_idx" ON "transactions"("mobileMoneyRef");

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audits" ADD CONSTRAINT "audits_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audits" ADD CONSTRAINT "audits_targetMemberId_fkey" FOREIGN KEY ("targetMemberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audits" ADD CONSTRAINT "audits_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_resolutionTransactionId_fkey" FOREIGN KEY ("resolutionTransactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
