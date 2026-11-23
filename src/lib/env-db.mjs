// Vercel/Neon can expose the database under different names, depending on how it was connected.
// Normalise them to DATABASE_URL / DATABASE_URL_UNPOOLED (used by prisma/schema.prisma).
export function resolveDatabaseEnv(env) {
  const url = env.DATABASE_URL || env.POSTGRES_PRISMA_URL || env.POSTGRES_URL;
  if (!url) return false;
  env.DATABASE_URL = url;
  env.DATABASE_URL_UNPOOLED ||= env.POSTGRES_URL_NON_POOLING || env.DATABASE_URL;
  return true;
}
