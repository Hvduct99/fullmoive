'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Play, Zap, Plus, BatteryLow, Loader2, Crown, Film } from 'lucide-react';
import { useUser } from './UserContext';
import { getEnergy, getTier, getPlan, formatVnd } from '@/lib/membership';

export function AvatarFrame({ user, size = 88, level = 0 }) {
  const initial = (user?.username || 'U')[0].toUpperCase();
  return (
    <div className="gz-frame shrink-0" data-level={level} style={{ width: size, height: size }}>
      <div className="gz-frame-inner flex items-center justify-center">
        {user?.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="font-black text-[var(--fx)]" style={{ fontSize: size * 0.4 }}>{initial}</span>
        )}
      </div>
      {level >= 3 && <Crown size={size * 0.26} className="absolute -top-2 left-1/2 -translate-x-1/2 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.9)]" />}
    </div>
  );
}

export function FactionBadge({ faction, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black tracking-widest border border-[rgb(var(--fx-rgb)/0.6)] bg-[rgb(var(--fx-rgb)/0.15)] text-[var(--fx)] shadow-[0_0_12px_-2px_rgb(var(--fx-rgb)/0.7)] ${className}`}>
      [{faction.emoji} {faction.badge}]
    </span>
  );
}

export function EnergyBar({ energy, compact = false }) {
  const label = energy.label;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className={`flex items-center gap-1.5 ${compact ? 'text-[11px]' : 'text-xs'} text-gray-300`}>
          {energy.low || !energy.active ? <BatteryLow size={14} className="text-red-400" /> : <Zap size={14} className="text-[var(--fx)]" />}
          Năng lượng còn lại: <b className={energy.low || !energy.active ? 'text-red-400' : 'text-white'}>{label}</b>
        </span>
        {energy.reserve > 1 && <span className="text-[10px] text-[var(--fx)] font-bold">x{energy.reserve} bình</span>}
      </div>
      <div className={`${compact ? 'h-2' : 'h-3'} rounded-full bg-white/10 overflow-hidden`}>
        <div className="gz-energy-fill h-full rounded-full" data-low={energy.low || !energy.active} style={{ width: `${energy.percent}%` }} />
      </div>
    </div>
  );
}

export function HeroCard() {
  const { user, faction, now, openTopup } = useUser();
  const t = now();
  const energy = getEnergy(user, t);
  const tier = getTier(user, t);

  return (
    <section className="gz-hero relative rounded-2xl overflow-hidden">
      <div className="gz-hero-grid absolute inset-0 pointer-events-none" />
      <div className="relative p-5 md:p-7 flex flex-col lg:flex-row gap-6 lg:items-center">
        <div className="flex items-center gap-4 md:gap-5 flex-1 min-w-0">
          <AvatarFrame user={user} size={88} level={tier.level} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl md:text-2xl font-black text-white truncate max-w-full">{user.full_name || user.username}</h2>
              <FactionBadge faction={faction} />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              @{user.username} · Cấp: <b className="text-[var(--fx)]">{tier.name}</b>
              {energy.active && energy.expiresAt && <> · Hạn {energy.expiresAt.toLocaleDateString('vi-VN')}</>}
            </p>
            <div className="mt-3 max-w-md"><EnergyBar energy={energy} /></div>
          </div>
        </div>

        <div className="lg:w-[260px] shrink-0 rounded-xl bg-black/40 border border-white/10 p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500">Số dư ví</p>
          <p className="text-3xl font-black text-white mt-0.5 tabular-nums">{formatVnd(user.balance)}</p>
          <button onClick={() => openTopup('wallet')}
            className="mt-3 w-full py-3.5 rounded-xl font-black text-lg text-black bg-gradient-to-r from-[var(--fx2)] to-[var(--fx)] shadow-[0_0_28px_-4px_rgb(var(--fx-rgb)/0.75)] hover:brightness-110 active:scale-[0.98] transition flex items-center justify-center gap-2">
            <Plus size={22} strokeWidth={3} /> Bơm Thêm
          </button>
        </div>
      </div>
    </section>
  );
}

export function SmartAlert() {
  const { user, setUser, faction, now, openTopup } = useUser();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const energy = getEnergy(user, now());
  const hadPass = Number(user.pass_total_days || 0) > 0;
  const plan = getPlan('1m');

  if (!energy.low && !(hadPass && !energy.active)) return msg ? <AlertResult msg={msg} /> : null;

  const enough = Number(user.balance || 0) >= plan.price;
  const quickRenew = async () => {
    if (!enough) return openTopup('pass', '1m');
    setBusy(true);
    try {
      const res = await fetch('/api/user/pass', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId: '1m' }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === 'INSUFFICIENT_BALANCE') return openTopup('pass', '1m');
        throw new Error(data.message || 'Gia hạn thất bại');
      }
      setUser(data.user);
      setMsg({ ok: true, text: `Gia hạn xong! +${plan.days} ngày năng lượng ${faction.emoji}` });
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-red-500/40 bg-gradient-to-r from-red-500/15 via-[rgb(var(--fx-rgb)/0.08)] to-transparent p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4">
      <div className="flex items-start gap-3 flex-1">
        <span className="shrink-0 w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse"><BatteryLow className="text-red-400" size={20} /></span>
        <div>
          <p className="text-white font-bold">{energy.active ? faction.lowEnergy : faction.expired}</p>
          <p className="text-xs text-gray-400 mt-1">
            {energy.active ? `Chỉ còn ${energy.label}.` : 'Pass đã hết hạn.'}{' '}
            Gia hạn {plan.label} · {formatVnd(plan.price)} {enough ? '— trừ thẳng vào ví.' : `— ví đang thiếu ${formatVnd(plan.price - Number(user.balance || 0))}.`}
          </p>
          {msg && !msg.ok && <p className="text-xs text-red-400 mt-1">{msg.text}</p>}
        </div>
      </div>
      <button onClick={quickRenew} disabled={busy}
        className="shrink-0 px-5 py-3 rounded-xl font-black text-black bg-gradient-to-r from-[var(--fx2)] to-[var(--fx)] shadow-[0_0_24px_-4px_rgb(var(--fx-rgb)/0.8)] hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2">
        {busy ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
        {enough ? 'Gia hạn nhanh 1 chạm' : 'Bơm & gia hạn'}
      </button>
    </section>
  );
}

function AlertResult({ msg }) {
  return (
    <div className={`rounded-xl px-4 py-3 text-sm font-semibold border ${msg.ok ? 'border-[rgb(var(--fx-rgb)/0.4)] bg-[rgb(var(--fx-rgb)/0.1)] text-[var(--fx)]' : 'border-red-500/40 bg-red-500/10 text-red-300'}`}>
      {msg.text}
    </div>
  );
}

export function historyHref(item) {
  return item.episode_slug ? `/phim/${item.movie_slug}/tap-${item.episode_slug}` : `/phim/${item.movie_slug}`;
}

export function historyProgress(item) {
  if (item.progress !== null && item.progress !== undefined) return Number(item.progress);
  if (item.episode_index !== null && item.episode_index !== undefined && item.episode_total) {
    return Math.round(((Number(item.episode_index) + 0.5) / Number(item.episode_total)) * 100);
  }
  return null;
}

export function ContinueCard({ item, onRemove, className = 'shrink-0 w-[150px] md:w-[170px] snap-start' }) {
  const pct = historyProgress(item);
  return (
    <div className={`group relative ${className}`}>
      <Link href={historyHref(item)} className="block rounded-xl overflow-hidden bg-[#16161c] border border-white/5 hover:border-[rgb(var(--fx-rgb)/0.6)] transition">
        <div className="relative aspect-[2/3] bg-gray-900">
          {item.movie_thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.movie_thumb} alt={item.movie_name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><Film className="text-gray-700" /></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
          <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
            <span className="w-12 h-12 rounded-full bg-[var(--fx)] text-black flex items-center justify-center shadow-[0_0_24px_rgb(var(--fx-rgb)/0.9)]"><Play size={22} fill="currentColor" /></span>
          </span>
          <div className="absolute bottom-0 inset-x-0 p-2">
            {item.episode_name && <p className="text-[10px] font-bold text-[var(--fx)]">Tập {item.episode_name}{item.episode_total ? ` / ${item.episode_total}` : ''}</p>}
            <div className="mt-1 h-1.5 rounded-full bg-white/15 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[var(--fx2)] to-[var(--fx)]" style={{ width: `${pct === null ? 6 : Math.max(4, Math.min(100, pct))}%` }} />
            </div>
          </div>
        </div>
        <div className="p-2">
          <p className="text-xs text-white font-semibold line-clamp-2 leading-snug">{item.movie_name}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">{pct === null ? 'Xem tiếp' : `Đã xem ${pct}%`}</p>
        </div>
      </Link>
      {onRemove && (
        <button onClick={() => onRemove(item)} aria-label="Xoá khỏi danh sách"
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-gray-300 text-xs opacity-0 group-hover:opacity-100 hover:text-red-400 transition">✕</button>
      )}
    </div>
  );
}

export function PosterCard({ item, href, badge, onRemove }) {
  return (
    <div className="group relative">
      <Link href={href || `/phim/${item.movie_slug}`} className="block rounded-xl overflow-hidden bg-[#16161c] border border-white/5 hover:border-[rgb(var(--fx-rgb)/0.6)] transition">
        <div className="relative aspect-[2/3] bg-gray-900">
          {item.movie_thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.movie_thumb} alt={item.movie_name} loading="lazy" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><Film className="text-gray-700" /></div>
          )}
          {badge && <span className="absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/70 text-[var(--fx)]">{badge}</span>}
        </div>
        <div className="p-2">
          <p className="text-xs text-white font-semibold line-clamp-2 leading-snug">{item.movie_name}</p>
          {item.movie_year && <p className="text-[10px] text-gray-500 mt-0.5">{item.movie_year}</p>}
        </div>
      </Link>
      {onRemove && (
        <button onClick={() => onRemove(item)} aria-label="Gỡ"
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-gray-300 text-xs md:opacity-0 group-hover:opacity-100 hover:text-red-400 transition">✕</button>
      )}
    </div>
  );
}

export function SectionTitle({ icon, title, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
        <span className="text-[var(--fx)]">{icon}</span> {title}
      </h3>
      {action}
    </div>
  );
}

export function Panel({ children, className = '' }) {
  return <div className={`rounded-2xl border border-white/[0.07] bg-[#121217] p-4 md:p-5 ${className}`}>{children}</div>;
}

export function TxRow({ tx }) {
  const amount = Number(tx.amount);
  const status = { pending: ['Đang chờ', 'text-amber-400'], completed: ['Thành công', 'text-emerald-400'], rejected: ['Từ chối', 'text-red-400'] }[tx.status] || [tx.status, 'text-gray-400'];
  const label = tx.type === 'pass' ? (tx.note || 'Mua Pass') : tx.type === 'deposit' ? 'Nạp tiền vào ví' : tx.type;
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm text-white truncate">{label}</p>
        <p className="text-[11px] text-gray-500">{new Date(tx.created_at).toLocaleString('vi-VN')}{tx.type === 'deposit' && tx.note ? ` · ${tx.note}` : ''}</p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-bold tabular-nums ${amount < 0 ? 'text-white' : 'text-emerald-400'}`}>{amount > 0 ? '+' : ''}{formatVnd(amount)}</p>
        <p className={`text-[11px] ${status[1]}`}>{status[0]}</p>
      </div>
    </li>
  );
}
