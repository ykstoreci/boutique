/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {
    staleTimes: {
      dynamic: 60,
      static: 300,
    },
  },
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

