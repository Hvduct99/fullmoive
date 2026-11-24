'use client';

/**
 * CDN của Hostinger đôi khi chặn request ngầm (fetch API / chuyển trang) bằng trang
 * "Checking your browser…" (HTTP 403, HTML). Request ngầm không tự vượt qua được bước kiểm tra
 * đó → trang đứng im, vòng xoay mãi (hay gặp trên điện thoại dùng mạng 4G chung IP).
 *
 * Bộ này phát hiện tình huống đó và tải lại trang 1 lần: trình duyệt tự vượt kiểm tra ở cấp trang,
 * nhận cookie hợp lệ, rồi mọi request sau chạy bình thường. Giới hạn 1 lần / 2 phút để không lặp vô hạn.
 *
 * Gắn vào window.fetch NGAY khi file được tải (không đợi useEffect) để bắt được cả các request
 * mà Header / component khác gửi ngay lúc khởi động.
 */
const KEY = 'gz_cdn_reload_at';
const COOLDOWN_MS = 2 * 60 * 1000;

function looksLikeChallenge(res) {
  if (!res || res.status !== 403) return false;
  const type = res.headers.get('content-type') || '';
  return type.includes('text/html');
}

function reloadOnce() {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < COOLDOWN_MS) return;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    return; // không lưu được dấu thời gian → không reload để tránh lặp
  }
  window.location.reload();
}

if (typeof window !== 'undefined' && !window.__gzFetchPatched) {
  window.__gzFetchPatched = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const res = await original(input, init);
    try {
      const url = new URL(typeof input === 'string' ? input : input?.url || String(input), window.location.href);
      if (url.origin === window.location.origin && looksLikeChallenge(res)) {
        console.warn('[cdn] Request bị CDN chặn kiểm tra, tải lại trang để xác minh:', url.pathname);
        reloadOnce();
      }
    } catch { /* bỏ qua */ }
    return res;
  };
}

export default function CdnChallengeGuard() {
  return null;
}
