import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export', // 🔥 Isso ativa o modo Static Export (substitui o 'next export')

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    allowedDevOrigins: [
      'https://6000-firebase-studio-1748881505468.cluster-etsqrqvqyvd4erxx7qq32imrjk.cloudworkstations.dev',
    ],
    instrumentationHook: false, // 🔧 Desativa o OpenTelemetry se não usar
  },
};

export default nextConfig;
