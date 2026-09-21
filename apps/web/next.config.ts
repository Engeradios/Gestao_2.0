import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  poweredByHeader: false,

  async rewrites() {

    return [

    ];
  },
  typescript: {
    ignoreBuildErrors: false,
  },

};

export default nextConfig;
