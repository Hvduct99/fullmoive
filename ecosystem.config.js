// Chỉ dùng khi tự chạy trên VPS bằng pm2. Hostinger Node.js app KHÔNG dùng file này.
// server.js đã gồm cả web (Next.js) lẫn Socket.IO (Phòng Xem Chung) trên cùng cổng.
module.exports = {
  apps: [
    {
      name: 'fullmovie',
      script: 'server.js',
      cwd: './',
      instances: 1, // trạng thái phòng xem chung nằm trong RAM → chỉ chạy 1 instance
      autorestart: true,
      watch: false,
      max_memory_restart: '600M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NODE_OPTIONS: '--max-old-space-size=512',
      },
    },
  ],
};
