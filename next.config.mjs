/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
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
          // Browsers already default to same-origin framing in modern
          // versions, but this makes the "no embedding this site in someone
          // else's iframe" (clickjacking) rule explicit and defense-in-depth.
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Stops browsers from "sniffing" a response into a different
          // content type than the server declared (e.g. treating an
          // uploaded file as HTML/script instead of the image it claims to be).
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Don't leak the full referring URL (which can contain booking
          // ids, search terms, etc.) to third-party destinations.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Force HTTPS on repeat visits for a year, including subdomains.
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // Deny access to sensitive browser APIs this app never uses.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
