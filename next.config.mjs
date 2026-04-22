/** @type {import('next').NextConfig} */
const nextConfig = {
  ignoreBuildErrors: true,
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
};

export default nextConfig;
