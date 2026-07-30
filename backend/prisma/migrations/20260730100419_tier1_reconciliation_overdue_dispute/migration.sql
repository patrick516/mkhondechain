-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "overdueReminderSent" BOOLEAN NOT NULL DEFAULT false;
