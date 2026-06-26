-- CreateEnum
CREATE TYPE "ApiKeyTier" AS ENUM ('free', 'pro');

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "plaintextKey" TEXT,
    "label" TEXT NOT NULL,
    "tier" "ApiKeyTier" NOT NULL,
    "emailLimitPerMinute" INTEGER NOT NULL,
    "smsLimitPerMinute" INTEGER NOT NULL,
    "pushLimitPerMinute" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);
