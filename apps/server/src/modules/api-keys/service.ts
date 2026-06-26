import { createHash } from "node:crypto";

import type { PrismaClient } from "../../../generated/prisma/client";

const seedApiKeyRecords = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    label: "Startup (Free)",
    tier: "free" as const,
    keyPrefix: "sk_free_startup",
    plaintextKey: "sk_free_startup_a1b2c3d4",
    emailLimitPerMinute: 10,
    smsLimitPerMinute: 5,
    pushLimitPerMinute: 50,
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    label: "Side Project (Free)",
    tier: "free" as const,
    keyPrefix: "sk_free_sideproj",
    plaintextKey: "sk_free_sideproj_e5f6g7h8",
    emailLimitPerMinute: 10,
    smsLimitPerMinute: 5,
    pushLimitPerMinute: 50,
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    label: "Acme (Pro)",
    tier: "pro" as const,
    keyPrefix: "sk_pro_acme",
    plaintextKey: "sk_pro_acme_i9j0k1l2",
    emailLimitPerMinute: 100,
    smsLimitPerMinute: 30,
    pushLimitPerMinute: 500,
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    label: "Load Test (Pro)",
    tier: "pro" as const,
    keyPrefix: "sk_pro_loadtest",
    plaintextKey: "sk_pro_loadtest_m3n4o5p6",
    emailLimitPerMinute: 1000,
    smsLimitPerMinute: 500,
    pushLimitPerMinute: 5000,
  },
];

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export async function listApiKeys(prisma: PrismaClient) {
  return prisma.apiKey.findMany({
    orderBy: { label: "asc" },
  });
}

export async function seedApiKeys(prisma: PrismaClient) {
  await prisma.apiKey.deleteMany();

  await prisma.apiKey.createMany({
    data: seedApiKeyRecords.map((key) => ({
      id: key.id,
      label: key.label,
      tier: key.tier,
      keyPrefix: key.keyPrefix,
      plaintextKey: key.plaintextKey,
      keyHash: hashKey(key.plaintextKey),
      emailLimitPerMinute: key.emailLimitPerMinute,
      smsLimitPerMinute: key.smsLimitPerMinute,
      pushLimitPerMinute: key.pushLimitPerMinute,
      isActive: true,
    })),
  });

  return listApiKeys(prisma);
}
