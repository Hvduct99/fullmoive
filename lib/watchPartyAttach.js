import http from 'http';
import path from 'path';
import { pathToFileURL } from 'url';

/**
 * Tìm HTTP server mà `next start` đã mở rồi gắn Socket.IO vào (chỉ chạy trên Node runtime).
 * Không bao giờ làm sập web vì realtime: mọi lỗi chỉ được ghi log.
 */
export function attachWatchPartyToNext() {
  // server.js tự gắn Socket.IO → không gắn lần nữa
  if (process.env.WATCH_PARTY_CUSTOM_SERVER === '1') return;
  if (process.env.WATCH_PARTY_DISABLED === '1') return;
  if (globalThis.__watchParty || globalThis.__watchPartyAttaching) return;
  globalThis.__watchPartyAttaching = true;

  const coreUrl = pathToFileURL(path.join(process.cwd(), 'socket-server', 'core.mjs')).href;
  let tries = 0;

  const tryAttach = async () => {
    if (globalThis.__watchParty) return;
    const handles = typeof process._getActiveHandles === 'function' ? process._getActiveHandles() : [];
    const server = handles.find((h) => h instanceof http.Server && h.listening);
    if (!server) {
      // Next mở cổng ngay sau bước khởi tạo → thử lại tối đa ~60 giây
      if (++tries < 120) {
        const t = setTimeout(tryAttach, 500);
        if (t.unref) t.unref();
      } else {
        console.warn('[watch-party] Không tìm thấy HTTP server để gắn Socket.IO');
      }
      return;
    }
    try {
      const { attachWatchParty } = await import(/* webpackIgnore: true */ coreUrl);
      if (globalThis.__watchParty) return;
      globalThis.__watchParty = attachWatchParty(server, { path: '/socket.io' });
      globalThis.__watchPartyMode = 'next-start';
      console.log('[watch-party] Socket.IO gắn vào server Next.js tại /socket.io');
    } catch (e) {
      console.error('[watch-party] Không gắn được Socket.IO:', e.message);
    }
  };

  tryAttach();
}
