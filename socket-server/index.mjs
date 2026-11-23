/**
 * Chạy Watch Party Socket.IO server RIÊNG (VPS, Render, Railway...).
 * Trên Hostinger Node.js app thì KHÔNG cần file này: server.js ở thư mục gốc đã gắn sẵn
 * Socket.IO vào chính web (cùng tên miền, cùng cổng).
 *
 * Chạy:  node socket-server/index.mjs
 * Env:   SOCKET_PORT (3001) · SOCKET_SECRET (hoặc SESSION_SECRET, phải giống web) · SOCKET_CORS_ORIGIN
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { attachWatchParty } from './core.mjs';

// Nạp .env của project (không ghi đè biến đã có)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
for (const file of [path.join(__dirname, '.env'), path.join(__dirname, '..', '.env')]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

const PORT = Number(process.env.SOCKET_PORT || process.env.PORT || 3001);
let party = null;
const httpServer = createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ ok: true, ...(party ? party.stats() : {}), uptime: Math.round(process.uptime()) }));
    return;
  }
  res.writeHead(404).end();
});
party = attachWatchParty(httpServer);

httpServer.listen(PORT, () => console.log(`[watch-party] Socket.IO standalone on :${PORT}`));

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    party.io.close();
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  });
}
