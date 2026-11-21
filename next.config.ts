import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Always treat this folder as the project root, even if a stray package-lock.json
  // exists in a parent folder (e.g. the Windows user folder).
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
