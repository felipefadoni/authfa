import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["knex", "pg"],
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: "/realms/:realm/.well-known/openid-configuration",
        destination: "/realms/:realm/openid-configuration",
      },
    ];
  },
};

export default nextConfig;
