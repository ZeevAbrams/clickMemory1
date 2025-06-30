import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Production optimizations
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js']
  },
  
  // Optimize for Vercel
  output: 'standalone',
  
  // Reduce bundle size
  swcMinify: true,
  
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          // This is a critical security header. In production, it should be restricted to your app's domain.
          // The value is set from an environment variable to allow for different domains in development and production.
          // Ensure NEXT_PUBLIC_APP_URL is set in your Vercel environment variables.
          { key: 'Access-Control-Allow-Origin', value: process.env.NEXT_PUBLIC_APP_URL || '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-CSRF-Token' },
          { key: 'Access-Control-Max-Age', value: '86400' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.posthog.com https://us-assets.i.posthog.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; media-src 'self' https://ssl.gstatic.com https://*.gstatic.com; connect-src 'self' https://*.supabase.co https://*.posthog.com https://us.i.posthog.com https://us-assets.i.posthog.com ws: wss:; object-src 'none'; base-uri 'self'; form-action 'self';",
          },
        ],
      },
    ]
  },
};

export default nextConfig;
