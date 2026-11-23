// Creates/updates the database tables during the build (`npm run build`).
// Works on Windows, macOS, Linux and Vercel.
import { spawnSync } from "node:child_process";
import { resolveDatabaseEnv } from "../src/lib/env-db.mjs";

const env = { ...process.env };
if (!resolveDatabaseEnv(env)) {
  const names = Object.keys(env).filter((k) => env[k] && /DATABASE|POSTGRES|^PG|NEON/i.test(k));
  console.error("\n✖ No database URL found (looked for DATABASE_URL, POSTGRES_PRISMA_URL, POSTGRES_URL).");
  console.error(`  Database-like variables that ARE set: ${names.length ? names.join(", ") : "none"}`);
  console.error("  On Vercel: Storage → your Neon database → Connect Project → pick this project");
  console.error("  for all environments, then redeploy.\n");
  process.exit(1);
}

const result = spawnSync("npx", ["prisma", "db", "push", "--skip-generate"], {
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
