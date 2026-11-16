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
  redirects: async () => [
    {
      source: "/admin/:path*",
      destination: "/boutick/:path*",
      permanent: false,
    },
    {
      source: "/admin",
      destination: "/boutick",
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

