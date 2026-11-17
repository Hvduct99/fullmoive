'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Settings, Camera, Loader2, Smartphone, Monitor, LogOut, Check, KeyRound } from 'lucide-react';
import { useUser } from '@/components/user/UserContext';
import { Panel, SectionTitle, AvatarFrame } from '@/components/user/ui';
import { FACTIONS, getTier } from '@/lib/membership';
import { logout } from '@/components/UserPageSidebar';

function describeDevice(ua = '') {
  const s = ua || '';
  const os = /iPhone|iPad/.test(s) ? 'iOS' : /Android/.test(s) ? 'Android' : /Windows/.test(s) ? 'Windows' : /Mac OS X/.test(s) ? 'macOS' : /Linux/.test(s) ? 'Linux' : 'Thiết bị lạ';
  const browser = /Edg\//.test(s) ? 'Edge' : /OPR\/|Opera/.test(s) ? 'Opera' : /CocCoc/.test(s) ? 'Cốc Cốc' : /Chrome\//.test(s) ? 'Chrome' : /Firefox\//.test(s) ? 'Firefox' : /Safari\//.test(s) ? 'Safari' : 'Trình duyệt';
  return { name: `${browser} · ${os}`, mobile: /Mobile|Android|iPhone|iPad/.test(s) };
}

export default function SettingsPage() {
  const { user, setUser, faction, now } = useUser();
  const [saving, setSaving] = useState(null);
  const [msg, setMsg] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [devices, setDevices] = useState(null);
  const fileRef = useRef(null);
  const tier = getTier(user, now());

  const loadDevices = () =>
    fetch('/api/user/devices', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((d) => setDevices(d?.devices || [])).catch(() => setDevices([]));
  useEffect(() => { loadDevices(); }, []);

  const flash = (ok, text) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 3000); };

  const changeFaction = async (id) => {
    if (id === user.faction || saving) return;
    setSaving(id);
    const prev = user;
    setUser({ ...user, faction: id }); // đổi màu ngay, lỗi thì hoàn lại
    try {
      const res = await fetch('/api/user/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ faction: id }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.message || 'Lỗi đổi hệ');
      setUser(d.user);
      flash(true, `Đã gia nhập ${FACTIONS[id].name} ${FACTIONS[id].emoji}`);
    } catch (e) {
      setUser(prev);
      flash(false, e.message);
    } finally {
      setSaving(null);
    }
  };

  const uploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return flash(false, 'Ảnh tối đa 2MB');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await fetch('/api/user/avatar', { method: 'POST', body: fd });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.message || 'Upload thất bại');
      setUser({ ...user, avatar: d.avatar });
      flash(true, 'Đã đổi ảnh đại diện!');
    } catch (err) {
      flash(false, err.message);
    } finally {
      setUploading(false);
    }
  };

  const revoke = async (query) => {
    const res = await fetch(`/api/user/devices?${query}`, { method: 'DELETE' });
    const d = await res.json().catch(() => ({}));
    flash(res.ok, d.message || (res.ok ? 'Xong' : 'Lỗi'));
    loadDevices();
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-white flex items-center gap-2"><Settings className="text-[var(--fx)]" /> Cài đặt hệ phái</h1>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-semibold border ${msg.ok ? 'border-[rgb(var(--fx-rgb)/0.4)] bg-[rgb(var(--fx-rgb)/0.1)] text-[var(--fx)]' : 'border-red-500/40 bg-red-500/10 text-red-300'}`}>{msg.text}</div>
      )}

      <Panel>
        <SectionTitle icon={<span>{faction.emoji}</span>} title="Chọn hệ của bạn" />
        <div className="grid sm:grid-cols-2 gap-3">
          {Object.values(FACTIONS).map((f) => {
            const active = user.faction === f.id;
            return (
              <button key={f.id} onClick={() => changeFaction(f.id)} disabled={!!saving}
                className="relative text-left rounded-2xl p-5 border-2 transition overflow-hidden"
                style={{
                  borderColor: active ? f.accent : 'rgba(255,255,255,0.08)',
                  background: `radial-gradient(120% 120% at 0% 0%, rgb(${f.accentRgb} / ${active ? 0.25 : 0.08}), transparent 60%), #111116`,
                  boxShadow: active ? `0 0 30px -6px rgb(${f.accentRgb} / 0.7)` : 'none',
                }}>
                <p className="text-3xl">{f.emoji}</p>
                <p className="text-xl font-black mt-2" style={{ color: f.accent }}>{f.name}</p>
                <p className="text-xs text-gray-400 mt-1">{f.id === 'boiz' ? 'Xanh Cyber · tốc độ, chiến thần' : 'Hồng Neon · slay, lấp lánh'}</p>
                {active && <span className="absolute top-4 right-4 flex items-center gap-1 text-xs font-bold" style={{ color: f.accent }}><Check size={14} /> Đang chọn</span>}
                {saving === f.id && <Loader2 size={16} className="absolute top-4 right-4 animate-spin text-white" />}
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel>
        <SectionTitle icon={<Camera size={18} />} title="Ảnh đại diện" />
        <div className="flex items-center gap-5">
          <AvatarFrame user={user} size={84} level={tier.level} />
          <div>
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="px-4 py-2.5 rounded-xl font-bold text-black bg-[var(--fx)] hover:brightness-110 disabled:opacity-60 flex items-center gap-2">
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />} Đổi avatar
            </button>
            <p className="text-[11px] text-gray-500 mt-2">JPG, PNG, WebP, GIF · tối đa 2MB. Khung động hiện tại: <b className="text-[var(--fx)]">{tier.name}</b></p>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={uploadAvatar} />
          </div>
        </div>
      </Panel>

      <Panel>
        <SectionTitle icon={<Smartphone size={18} />} title="Thiết bị đăng nhập"
          action={devices?.some((d) => !d.current) && (
            <button onClick={() => confirm('Đăng xuất tất cả thiết bị khác?') && revoke('others=true')} className="text-xs text-red-400 hover:underline">Đăng xuất thiết bị khác</button>
          )} />
        {devices === null ? (
          <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />)}</div>
        ) : devices.length === 0 ? (
          <p className="text-sm text-gray-500">Chưa có dữ liệu thiết bị.</p>
        ) : (
          <ul className="space-y-2">
            {devices.map((d) => {
              const info = describeDevice(d.user_agent);
              const Icon = info.mobile ? Smartphone : Monitor;
              return (
                <li key={d.id} className={`flex items-center gap-3 rounded-xl border p-3 ${d.current ? 'border-[rgb(var(--fx-rgb)/0.5)] bg-[rgb(var(--fx-rgb)/0.05)]' : 'border-white/10'}`}>
                  <Icon size={20} className={d.current ? 'text-[var(--fx)]' : 'text-gray-500'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-semibold truncate">{info.name} {d.current && <span className="text-[10px] text-[var(--fx)] ml-1">(Thiết bị này)</span>}</p>
                    <p className="text-[11px] text-gray-500 truncate">{d.ip || 'IP ẩn'} · Hoạt động {new Date(d.last_seen).toLocaleString('vi-VN')}</p>
                  </div>
                  {d.current ? (
                    <button onClick={logout} className="text-xs text-gray-400 hover:text-white flex items-center gap-1"><LogOut size={13} /> Thoát</button>
                  ) : (
                    <button onClick={() => revoke(`id=${encodeURIComponent(d.id)}`)} className="text-xs text-red-400 hover:underline">Đăng xuất</button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Link href="/user/profile" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white">
        <KeyRound size={16} /> Đổi thông tin cá nhân & mật khẩu →
      </Link>
    </div>
  );
}
