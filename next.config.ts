import type { NextConfig } from "next";

// Configuración limpia sin ignores de compilación/lint.
const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Configuración de fallback para módulos Node.js usados por canvas-record
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    return config;
  },
};

export default nextConfig;
