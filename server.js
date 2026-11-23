/**
 * Server chính của web: Next.js + Socket.IO (Phòng Xem Chung realtime) trên CÙNG 1 cổng.
 *
 * Hostinger Node.js app chỉ chạy được 1 tiến trình / 1 cổng, nên Socket.IO được gắn
 * thẳng vào server của web: trình duyệt kết nối về chính tên miền của web
 * (đường dẫn /socket.io), không cần cấu hình NEXT_PUBLIC_SOCKET_URL.
 *
 * Chạy: npm start  (= node server.js)  ·  sau khi đã npm run build
 */
const { createServer } = require('http');
const path = require('path');
const { pathToFileURL } = require('url');
const next = require('next');

// Báo cho instrumentation.js biết server này tự gắn Socket.IO (tránh gắn 2 lần)
process.env.WATCH_PARTY_CUSTOM_SERVER = '1';

const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV === 'development';
const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  let party = null;
  const server = createServer((req, res) => {
    // Kiểm tra nhanh realtime: https://<tên-miền>/socket-health
    if (req.url === '/socket-health') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ ok: !!party, ...(party ? party.stats() : {}), uptime: Math.round(process.uptime()) }));
      return;
    }
    handle(req, res);
  });

  try {
    const { attachWatchParty } = await import(pathToFileURL(path.join(__dirname, 'socket-server', 'core.mjs')).href);
    party = attachWatchParty(server, { path: '/socket.io' });
    globalThis.__watchParty = party;
    globalThis.__watchPartyMode = 'server.js';
    console.log('[watch-party] Socket.IO gắn vào web tại /socket.io');
  } catch (e) {
    // Lỗi realtime không được làm sập web: phòng xem chung tự chuyển sang chế độ không realtime
    console.error('[watch-party] Không khởi động được Socket.IO:', e.message);
  }

  server.listen(port, () => console.log(`> Web sẵn sàng tại cổng ${port} (${dev ? 'dev' : 'production'})`));

  const shutdown = () => {
    if (party) party.io.close();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}).catch((e) => {
  console.error('Không khởi động được Next.js:', e);
  process.exit(1);
});
