import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	typedRoutes: true,
	reactCompiler: true,
	experimental: {
    serverActions: {
      allowedOrigins: ["1z13h9pq-3001.inc1.devtunnels.ms", "localhost:3001"]
    }
  }
};

export default nextConfig;
allowedOrigins: ["*.devtunnels.ms"]