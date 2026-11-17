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
  // Dữ liệu theo từng người dùng: cấm mọi tầng cache (trình duyệt, CDN Hostinger, proxy)
  // lưu lại → tránh lỗi trang hiển thị sai trạng thái đăng nhập / dữ liệu của người khác.
  async headers() {
    const noStore = [{ key: 'Cache-Control', value: 'private, no-store, no-cache, max-age=0, must-revalidate' }];
    return [
      { source: '/api/auth/:path*', headers: noStore },
      { source: '/api/user/:path*', headers: noStore },
      { source: '/api/admin/:path*', headers: noStore },
      { source: '/api/watch-party/:path*', headers: noStore },
      { source: '/api/watch-party', headers: noStore },
      { source: '/user/:path*', headers: noStore },
      { source: '/admin/:path*', headers: noStore },
      { source: '/admin', headers: noStore },
    ];
  },
}

module.exports = nextConfig
