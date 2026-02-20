/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fix for intermittent caching/CSS issues on some hosting providers
  generateEtags: false, 
  output: 'standalone', // Smaller deployment footprint, saves RAM on Hostinger
  images: {
    unoptimized: true, // Safe for standard Node.js hosting
    remotePatterns: [
      { protocol: 'https', hostname: 'img.phimapi.com' },
      { protocol: 'https', hostname: 'phimimg.com' },
      { protocol: 'http', hostname: 'img.phimapi.com' },
    ],
  },
  // Reduce memory usage during build/runtime
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
