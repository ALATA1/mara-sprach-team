import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: process.cwd(),
  },
  outputFileTracingIncludes: {
    "/api/videos/*": ["./private/course-videos/**/*"],
  },
};
export default nextConfig;
