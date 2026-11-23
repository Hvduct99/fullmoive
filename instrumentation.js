/**
 * Chạy 1 lần khi server Next.js khởi động.
 *
 * Hostinger Node.js app (preset Next.js) khởi động bằng `next start`, không qua server.js,
 * nên ở đây tự gắn Socket.IO (Phòng Xem Chung) vào HTTP server của Next
 * → realtime chạy ở cả 2 cách khởi động, cùng tên miền, đường dẫn /socket.io.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { attachWatchPartyToNext } = await import('./lib/watchPartyAttach');
    attachWatchPartyToNext();
  }
}
