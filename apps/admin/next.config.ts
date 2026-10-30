import path from "node:path";
import type { NextConfig } from "next";

// Security headers (nonce CSP etc.) are set per request in src/proxy.ts.
const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  poweredByHeader: false,
};

export default nextConfig;
