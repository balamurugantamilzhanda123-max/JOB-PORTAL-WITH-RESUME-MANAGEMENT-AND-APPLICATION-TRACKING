import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // On Vercel, top-level vercel.json Services routing sends /api/v1/* directly to Express.
    // Outside Vercel (local dev without NEXT_PUBLIC_API_URL), proxy /api/v1/* to local backend.
    if (process.env.VERCEL || process.env.NEXT_PUBLIC_API_URL) {
      return [];
    }

    const localBackendUrl = (
      process.env.LOCAL_BACKEND_URL || 'http://127.0.0.1:4000'
    ).replace(/\/+$/, '');

    return [
      {
        source: '/api/v1/:path*',
        destination: `${localBackendUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;

