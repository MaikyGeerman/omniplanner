// Creates/updates the database tables during the build (`npm run build`).
// Works on Windows, macOS, Linux and Vercel. Prisma needs a direct (unpooled) connection;
// fall back to the other names Neon/Vercel use, or to DATABASE_URL itself.
import { spawnSync } from "node:child_process";

const env = { ...process.env };
if (!env.DATABASE_URL) {
  console.error(
    "\n✖ DATABASE_URL is not set. On Vercel: Storage → connect a Neon database to this project, then redeploy.\n",
  );
  process.exit(1);
}
env.DATABASE_URL_UNPOOLED ||= env.POSTGRES_URL_NON_POOLING || env.DATABASE_URL;

const result = spawnSync("npx", ["prisma", "db", "push", "--skip-generate"], {
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
