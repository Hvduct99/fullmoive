'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { PlayCircle, ChevronLeft, ChevronRight, Heart, Bookmark, Users, Crown, Receipt } from 'lucide-react';
import { useUser } from '@/components/user/UserContext';
import { HeroCard, SmartAlert, ContinueCard, SectionTitle, Panel, TxRow } from '@/components/user/ui';
import { getEnergy } from '@/lib/membership';

const json = (url) => fetch(url, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);

export default function UserDashboard() {
  const { user, faction, now, openTopup, tick } = useUser();
  const [continueList, setContinueList] = useState(null);
  const [library, setLibrary] = useState([]);
  const [parties, setParties] = useState([]);
  const [txs, setTxs] = useState([]);
  const rowRef = useRef(null);

  useEffect(() => {
    json('/api/user/watch-history?continue=1&limit=20').then((d) => setContinueList(d?.history || []));
    json('/api/user/library').then((d) => setLibrary(d?.items || []));
    json('/api/watch-party').then((d) => setParties(d?.parties || []));
  }, []);

  // Tải + cập nhật giao dịch khi số dư thay đổi (vừa nạp / mua pass)
  useEffect(() => {
    json('/api/user/transactions').then((d) => d && setTxs(d.transactions || []));
  }, [user.balance, user.pass_expires_at]);

  const removeContinue = async (item) => {
    const res = await fetch(`/api/user/watch-history?id=${item.id}`, { method: 'DELETE' });
    if (res.ok) setContinueList((l) => l.filter((x) => x.id !== item.id));
  };

  const scroll = (dir) => rowRef.current?.scrollBy({ left: dir * rowRef.current.clientWidth * 0.8, behavior: 'smooth' });
  const energy = getEnergy(user, now());
  void tick;

  const favCount = library.filter((i) => i.list === 'favorite').length;
  const savedCount = library.filter((i) => i.list === 'saved').length;
  const openParties = parties.filter((p) => p.status === 'open');

  return (
    <div className="space-y-5">
      <HeroCard />
      <SmartAlert />

      {/* Tiếp tục cày phim */}
      <Panel>
        <SectionTitle icon={<PlayCircle size={18} />} title="Tiếp tục cày phim"
          action={
            <div className="flex items-center gap-1">
              <button onClick={() => scroll(-1)} className="hidden md:flex w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 items-center justify-center text-gray-300" aria-label="Trước"><ChevronLeft size={16} /></button>
              <button onClick={() => scroll(1)} className="hidden md:flex w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 items-center justify-center text-gray-300" aria-label="Sau"><ChevronRight size={16} /></button>
              <Link href="/user/library?tab=history" className="text-xs text-[var(--fx)] hover:underline ml-2">Tất cả</Link>
            </div>
          } />
        {continueList === null ? (
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="shrink-0 w-[150px] md:w-[170px] aspect-[2/3] rounded-xl bg-white/5 animate-pulse" />)}
          </div>
        ) : continueList.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">Chưa có phim nào xem dở. <Link href="/" className="text-[var(--fx)] hover:underline">Kiếm phim cày thôi →</Link></p>
        ) : (
          <div ref={rowRef} className="gz-scroll-x flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-1 px-1 pb-1">
            {continueList.map((item) => <ContinueCard key={item.id} item={item} onRemove={removeContinue} />)}
          </div>
        )}
      </Panel>

      {/* Lối tắt */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button onClick={() => openTopup('pass')} className="text-left rounded-2xl border border-[rgb(var(--fx-rgb)/0.3)] bg-[rgb(var(--fx-rgb)/0.07)] p-4 hover:bg-[rgb(var(--fx-rgb)/0.12)] transition">
          <Crown size={20} className="text-[var(--fx)]" />
          <p className="text-white font-bold mt-2 text-sm">{faction.pass}</p>
          <p className="text-xs text-gray-400 mt-0.5">{energy.active ? `Còn ${energy.label} · ${faction.renewCta}` : faction.cta}</p>
        </button>
        <Link href="/user/library?tab=favorite" className="rounded-2xl border border-white/[0.07] bg-[#121217] p-4 hover:border-white/20 transition">
          <Heart size={20} className="text-pink-400" />
          <p className="text-white font-bold mt-2 text-sm">{favCount} phim yêu thích</p>
          <p className="text-xs text-gray-400 mt-0.5">Tủ phim cá nhân</p>
        </Link>
        <Link href="/user/library?tab=saved" className="rounded-2xl border border-white/[0.07] bg-[#121217] p-4 hover:border-white/20 transition">
          <Bookmark size={20} className="text-amber-400" />
          <p className="text-white font-bold mt-2 text-sm">{savedCount} phim đã lưu</p>
          <p className="text-xs text-gray-400 mt-0.5">Để dành xem sau</p>
        </Link>
        <Link href="/user/watch-party" className="rounded-2xl border border-white/[0.07] bg-[#121217] p-4 hover:border-white/20 transition">
          <Users size={20} className="text-emerald-400" />
          <p className="text-white font-bold mt-2 text-sm">{openParties.length} phòng đang mở</p>
          <p className="text-xs text-gray-400 mt-0.5">Rủ hội bạn xem chung</p>
        </Link>
      </div>

      {/* Giao dịch gần đây */}
      <Panel>
        <SectionTitle icon={<Receipt size={18} />} title="Biến động ví gần đây"
          action={<Link href="/user/wallet" className="text-xs text-[var(--fx)] hover:underline">Xem ví</Link>} />
        {txs.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Chưa có giao dịch nào.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {txs.slice(0, 5).map((tx) => <TxRow key={tx.id} tx={tx} />)}
          </ul>
        )}
      </Panel>
    </div>
  );
}
