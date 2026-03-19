import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
    unoptimized: true,
  },
  serverExternalPackages: ['better-sqlite3', '@ffmpeg-installer/ffmpeg'],
};

export default nextConfig;
