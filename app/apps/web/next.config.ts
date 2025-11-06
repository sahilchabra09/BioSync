import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	typedRoutes: true,
	reactCompiler: true,
	experimental: {
    serverActions: {
      allowedOrigins: ["*.devtunnels.ms", "localhost:3000"]
    }
  }
};

export default nextConfig;
