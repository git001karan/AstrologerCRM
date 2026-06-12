/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // We disable typescript builds error checking on next build if desired, but keeping strict is better.
  typescript: {
    // Keep build robust
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;
