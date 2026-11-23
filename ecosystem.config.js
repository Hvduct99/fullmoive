module.exports = {
  apps: [
    {
      name: 'fullmovie',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NODE_OPTIONS: '--max-old-space-size=512',
      },
    },
    {
      // Socket.IO server cho Phòng Xem Chung realtime (đọc .env của project)
      name: 'fullmovie-socket',
      script: 'socket-server/index.mjs',
      cwd: './',
      instances: 1, // trạng thái phòng nằm trong RAM → chỉ chạy 1 instance
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
        SOCKET_PORT: 3001,
      },
    },
  ],
};
