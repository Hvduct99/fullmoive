'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, BellRing, Check, Wallet } from 'lucide-react';

const POLL_MS = 15000;

function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [0, 0.18].forEach((t, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = i ? 1320 : 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.16);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.17);
    });
    setTimeout(() => ctx.close(), 600);
  } catch { /* trình duyệt chặn âm thanh khi chưa tương tác */ }
}

const ago = (ms) => {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return 'vừa xong';
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  return new Date(ms).toLocaleDateString('vi-VN');
};

/**
 * Chuông thông báo cho admin / mod: đơn nạp mới, người dùng báo đã chuyển khoản, tiền về tự động.
 * Có âm báo + thông báo hệ điều hành (nếu cho phép) khi có thông báo mới.
 */
export default function AdminNotifyBell({ className = '' }) {
  const [data, setData] = useState(null);
  const [allowed, setAllowed] = useState(true);
  const [open, setOpen] = useState(false);
  const [perm, setPerm] = useState('default');
  const maxIdRef = useRef(null);
  const boxRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notifications', { cache: 'no-store' });
      if (res.status === 401) { setAllowed(false); return; }
      if (!res.ok) return;
      const d = await res.json();
      const top = d.items[0]?.id || 0;
      if (maxIdRef.current !== null && top > maxIdRef.current) {
        const fresh = d.items.filter((n) => n.id > maxIdRef.current && !n.is_read);
        if (fresh.length) {
          beep();
          // Báo cho trang đang mở (VD: bảng duyệt giao dịch) tải lại ngay
          window.dispatchEvent(new CustomEvent('admin-notify', { detail: fresh }));
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            const n = fresh[0];
            try { new Notification(n.title, { body: n.body || '', tag: `admin-${n.id}` }); } catch { /* bỏ qua */ }
          }
        }
      }
      maxIdRef.current = Math.max(maxIdRef.current || 0, top);
      setData(d);
    } catch { /* thử lại lượt sau */ }
  }, []);

  useEffect(() => {
    if (typeof Notification !== 'undefined') setPerm(Notification.permission);
    load();
    const t = setInterval(() => { if (document.visibilityState === 'visible') load(); }, POLL_MS);
    const onVis = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const markAll = async () => {
    await fetch('/api/admin/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => {});
    load();
  };
  const markOne = (id) => {
    fetch('/api/admin/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => {});
  };
  const askPermission = async () => {
    try { setPerm(await Notification.requestPermission()); } catch { /* bỏ qua */ }
  };

  if (!allowed) return null;
  const unread = data?.unread || 0;
  const Icon = unread ? BellRing : Bell;

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <button onClick={() => setOpen((o) => !o)} aria-label="Thông báo admin"
        className={`relative p-2 rounded-full hover:bg-white/10 transition ${unread ? 'text-yellow-400' : 'text-gray-300'}`}>
        <Icon size={20} className={unread ? 'animate-pulse' : ''} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[340px] max-w-[calc(100vw-24px)] bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl z-[300] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#333]">
            <p className="text-white font-bold text-sm">Thông báo admin</p>
            {unread > 0 && <button onClick={markAll} className="text-[11px] text-yellow-400 hover:underline flex items-center gap-1"><Check size={12} /> Đọc tất cả</button>}
          </div>
          {data?.pendingDeposits > 0 && (
            <Link href="/admin/billing" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500/10 text-yellow-300 text-xs font-semibold hover:bg-yellow-500/20">
              <Wallet size={14} /> {data.pendingDeposits} đơn nạp đang chờ duyệt →
            </Link>
          )}
          <div className="max-h-[360px] overflow-y-auto">
            {!data ? (
              <p className="text-xs text-gray-500 text-center py-6">Đang tải…</p>
            ) : data.items.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">Chưa có thông báo.</p>
            ) : data.items.map((n) => (
              <Link key={n.id} href={n.link || '/admin/billing'} onClick={() => { if (!n.is_read) markOne(n.id); setOpen(false); }}
                className={`block px-4 py-3 border-b border-[#262626] hover:bg-white/5 ${n.is_read ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-2">
                  <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.is_read ? 'bg-transparent' : n.type === 'deposit_confirmed' ? 'bg-orange-400' : 'bg-yellow-400'}`} />
                  <div className="min-w-0">
                    <p className="text-sm text-white font-semibold leading-snug">{n.title}</p>
                    {n.body && <p className="text-[11px] text-gray-400 whitespace-pre-line mt-0.5 line-clamp-4">{n.body}</p>}
                    <p className="text-[10px] text-gray-600 mt-1">{ago(n.created_at_ms)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {perm === 'default' && typeof Notification !== 'undefined' && (
            <button onClick={askPermission} className="w-full px-4 py-2.5 text-[11px] text-gray-300 bg-[#222] hover:bg-[#2a2a2a]">
              🔔 Bật thông báo trên máy tính (kể cả khi đang ở tab khác)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
