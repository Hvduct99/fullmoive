'use client';

import { useEffect, useState } from 'react';
import { Wallet, Crown, Receipt, Plus, Sparkles, Zap } from 'lucide-react';
import { useUser } from '@/components/user/UserContext';
import { Panel, SectionTitle, EnergyBar, TxRow, FactionBadge } from '@/components/user/ui';
import { PLANS, TOPUP_AMOUNTS, getEnergy, getTier, formatVnd, formatK } from '@/lib/membership';

export default function WalletPage() {
  const { user, faction, now, openTopup } = useUser();
  const [txs, setTxs] = useState(null);
  const t = now();
  const energy = getEnergy(user, t);
  const tier = getTier(user, t);

  useEffect(() => {
    fetch('/api/user/transactions', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setTxs(d?.transactions || []))
      .catch(() => setTxs([]));
  }, [user.balance, user.pass_expires_at]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-white flex items-center gap-2"><Wallet className="text-[var(--fx)]" /> Nạp Đạn / Ví Hội Viên</h1>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="gz-hero rounded-2xl p-5">
          <p className="text-xs uppercase tracking-wider text-gray-400">Số dư ví</p>
          <p className="text-4xl font-black text-white mt-1 tabular-nums">{formatVnd(user.balance)}</p>
          <div className="grid grid-cols-4 gap-2 mt-4">
            {TOPUP_AMOUNTS.map((a) => (
              <button key={a} onClick={() => openTopup('wallet')} className="py-2 rounded-lg border border-white/10 bg-black/30 text-white text-sm font-bold hover:border-[var(--fx)] hover:text-[var(--fx)] transition">+{formatK(a)}</button>
            ))}
          </div>
          <button onClick={() => openTopup('wallet')}
            className="mt-3 w-full py-3.5 rounded-xl font-black text-lg text-black bg-gradient-to-r from-[var(--fx2)] to-[var(--fx)] shadow-[0_0_28px_-4px_rgb(var(--fx-rgb)/0.75)] hover:brightness-110 flex items-center justify-center gap-2">
            <Plus size={22} strokeWidth={3} /> Bơm Thêm
          </button>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-[#121217] p-5 flex flex-col">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-gray-400">Trạng thái Pass</p>
            <FactionBadge faction={faction} />
          </div>
          <p className="text-2xl font-black text-white mt-1">{energy.active ? faction.pass : 'Chưa kích hoạt'}</p>
          <p className="text-xs text-gray-400 mt-1">Cấp hội viên: <b className="text-[var(--fx)]">{tier.name}</b> · Tổng đã nạp {user.pass_total_days} ngày</p>
          <div className="mt-4"><EnergyBar energy={energy} /></div>
          {energy.expiresAt && energy.active && <p className="text-[11px] text-gray-500 mt-2">Hết hạn lúc {energy.expiresAt.toLocaleString('vi-VN')}</p>}
          <button onClick={() => openTopup('pass')} className="mt-auto pt-4">
            <span className="block w-full py-3 rounded-xl font-bold border border-[var(--fx)] text-[var(--fx)] hover:bg-[rgb(var(--fx-rgb)/0.1)] transition">
              <Zap size={16} className="inline -mt-0.5 mr-1" />{energy.active ? faction.renewCta : faction.cta}
            </span>
          </button>
        </div>
      </div>

      <Panel>
        <SectionTitle icon={<Crown size={18} />} title={`Chọn ${faction.pass}`} />
        <div className="grid sm:grid-cols-3 gap-3">
          {PLANS.map((p) => (
            <button key={p.id} onClick={() => openTopup('pass', p.id)}
              className="relative text-left rounded-xl p-4 border border-white/10 bg-white/[0.03] hover:border-[var(--fx)] hover:bg-[rgb(var(--fx-rgb)/0.06)] transition">
              {p.tag && <span className={`absolute -top-2.5 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full ${p.id === '1y' ? 'bg-yellow-400 text-black' : 'bg-[var(--fx)] text-black'}`}>{p.tag}</span>}
              <p className="text-white font-bold text-lg">{p.label}</p>
              <p className="text-2xl font-black text-[var(--fx)]">{formatVnd(p.price)}</p>
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1"><Sparkles size={12} className="text-[var(--fx)]" />{p.perk} · {p.days} ngày</p>
            </button>
          ))}
        </div>
      </Panel>

      <Panel>
        <SectionTitle icon={<Receipt size={18} />} title="Lịch sử giao dịch" />
        {txs === null ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 rounded-lg bg-white/5 animate-pulse" />)}</div>
        ) : txs.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">Chưa có giao dịch nào.</p>
        ) : (
          <ul className="divide-y divide-white/5">{txs.map((tx) => <TxRow key={tx.id} tx={tx} />)}</ul>
        )}
      </Panel>
    </div>
  );
}
