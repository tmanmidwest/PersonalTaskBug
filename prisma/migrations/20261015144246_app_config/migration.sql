-- CreateTable
CREATE TABLE "AppConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "googleClientId" TEXT,
    "googleClientSecret" TEXT,
    "allowedEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "maxUploadMb" INTEGER NOT NULL DEFAULT 25,
    "setupCompletedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("id")
);
