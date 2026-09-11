/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'raw.githubusercontent.com' },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Baseline security headers on every response. Deliberately NOT shipping a
  // Content-Security-Policy here: this app loads Stripe.js/Elements iframes,
  // the Mapbox GL JS/tiles API, and Google Fonts, and a CSP wrong in even one
  // directive silently breaks checkout or the map rather than failing loudly.
  // Add one separately with careful allowlisting + real browser testing
  // against a deployed preview before relying on it.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
