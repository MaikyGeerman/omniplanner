import { PrismaClient } from "@prisma/client";
import { resolveDatabaseEnv } from "@/lib/env-db.mjs";

resolveDatabaseEnv(process.env);

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
