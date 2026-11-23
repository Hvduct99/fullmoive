import http from 'http';
// Đóng gói thẳng lõi Socket.IO vào bản build: Hostinger chỉ giữ thư mục .next + node_modules,
// không giữ thư mục mã nguồn socket-server/ → không được đọc file đó lúc chạy.
import { attachWatchParty } from '../socket-server/core.mjs';

/**
 * Tìm HTTP server mà Next.js đã mở (next start, bản standalone, hoặc server do hosting bọc ngoài)
 * rồi gắn Socket.IO vào. Chỉ chạy trên Node runtime. Không bao giờ làm sập web vì realtime.
 * Trạng thái được ghi vào globalThis.__watchPartyStatus để /api/health hiển thị khi chẩn đoán.
 */
const status = (globalThis.__watchPartyStatus = globalThis.__watchPartyStatus || {
  attached: false,
  tries: 0,
  coreFound: true,
  serverFound: false,
  standalone: null,
  error: null,
  startedAt: new Date().toISOString(),
});

function isHttpServer(h) {
  if (!h || typeof h.on !== 'function' || typeof h.listeners !== 'function') return false;
  if (h instanceof http.Server && h.listening) return true;
  // Nhận diện theo hành vi: server đang lắng nghe và có xử lý request (kể cả khi hosting bọc lại)
  return !!h.listening && h.listeners('request').length > 0;
}

export function attachWatchPartyToNext() {
  if (process.env.WATCH_PARTY_CUSTOM_SERVER === '1') return; // server.js tự gắn
  if (process.env.WATCH_PARTY_DISABLED === '1') { status.error = 'disabled by env'; return; }
  if (globalThis.__watchParty || globalThis.__watchPartyAttaching) return;
  globalThis.__watchPartyAttaching = true;
  status.standalone = /[\\/]\.next[\\/]standalone/.test(process.cwd()) || /[\\/]\.next[\\/]standalone/.test(process.argv[1] || '');

  const tryAttach = () => {
    if (globalThis.__watchParty) return;
    status.tries += 1;
    const handles = typeof process._getActiveHandles === 'function' ? process._getActiveHandles() : [];
    const server = handles.find(isHttpServer);
    if (!server) {
      if (status.tries < 240) {
        const t = setTimeout(tryAttach, 500);
        if (t.unref) t.unref();
      } else {
        status.error = 'Không tìm thấy HTTP server để gắn Socket.IO';
        console.warn('[watch-party]', status.error);
      }
      return;
    }
    status.serverFound = true;
    try {
      globalThis.__watchParty = attachWatchParty(server, { path: '/socket.io' });
      globalThis.__watchPartyMode = status.standalone ? 'standalone' : 'next-start';
      status.attached = true;
      status.error = null;
      console.log('[watch-party] Socket.IO gắn vào server Next.js tại /socket.io');
    } catch (e) {
      status.error = `Gắn Socket.IO lỗi: ${String(e && e.message).slice(0, 200)}`;
      console.error('[watch-party]', status.error);
    }
  };

  tryAttach();
}
