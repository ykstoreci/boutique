/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  devIndicators: false,
  compress: true,
  poweredByHeader: false,
  experimental: {
    staleTimes: {
      dynamic: 120,
      static: 600,
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  redirects: async () => [
    {
      source: "/admin",
      destination: "/boutick",
      permanent: false,
    },
    {
      source: "/admin/:slug+",
      destination: "/boutick/:slug+",
      permanent: false,
    },
  ],
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        {
          key: "X-DNS-Prefetch-Control",
          value: "on",
        },
      ],
    },
    {
      source: "/_next/static/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
    {
      source: "/icons/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
  ],
  serverExternalPackages: [
    "@electric-sql/pglite",
    "pg",
    "sharp",
    "bcryptjs",
    "web-push",
  ],
  outputFileTracingIncludes: {
    "/**": ["./drizzle/**/*"],
  },
};

export default nextConfig;

