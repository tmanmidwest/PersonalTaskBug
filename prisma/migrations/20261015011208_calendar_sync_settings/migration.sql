-- AlterTable
ALTER TABLE "User" ADD COLUMN     "calendarId" TEXT NOT NULL DEFAULT 'primary',
ADD COLUMN     "calendarSyncEnabled" BOOLEAN NOT NULL DEFAULT false;
