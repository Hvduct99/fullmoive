/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fix for intermittent caching/CSS issues on some hosting providers
  generateEtags: false, 
  // output: 'standalone', // Custom Server (server.js) doesn't use standalone output usually
  images: {
    unoptimized: true, // Safe for standard Node.js hosting
    remotePatterns: [
      { protocol: 'https', hostname: 'img.phimapi.com' },
      { protocol: 'https', hostname: 'phimimg.com' },
      { protocol: 'http', hostname: 'img.phimapi.com' },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
