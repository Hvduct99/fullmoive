'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Zap, Wallet, QrCode, Check, Copy, Loader2, ArrowLeft, Sparkles, Crown, ShieldCheck } from 'lucide-react';
import { useUser } from './UserContext';
import { PLANS, TOPUP_AMOUNTS, MIN_TOPUP, MAX_TOPUP, getPlan, formatVnd, formatK, getEnergy } from '@/lib/membership';

const POLL_MS = 5000;

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard bị chặn */ }
  };
  return (
    <div className="flex items-center justify-between gap-3 bg-white/5 rounded-lg px-3 py-2">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-gray-500">{label}</p>
        <p className="text-sm text-white font-semibold truncate">{value}</p>
      </div>
      <button type="button" onClick={copy} className="shrink-0 text-xs flex items-center gap-1 text-[var(--fx)] hover:opacity-80">
        {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Đã chép' : 'Chép'}
      </button>
    </div>
  );
}

export default function TopupModal({ initialTab = 'pass', initialPlanId = null, onClose }) {
  const { user, setUser, refresh, faction, now } = useUser();
  const [tab, setTab] = useState(initialTab === 'wallet' ? 'wallet' : 'pass');
  const [planId, setPlanId] = useState(getPlan(initialPlanId) ? initialPlanId : '3m');
  const [amount, setAmount] = useState(100000);
  const [custom, setCustom] = useState('');
  const method = 'vietqr'; // chuyển khoản ngân hàng bằng ảnh QR của tài khoản nhận
  const [step, setStep] = useState('choose'); // choose | pay | done
  const [deposit, setDeposit] = useState(null);
  const [pendingPlan, setPendingPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [needPhone, setNeedPhone] = useState(!user?.phone);
  const [confirming, setConfirming] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState('');
  const [doneMsg, setDoneMsg] = useState('');
  const [countdown, setCountdown] = useState(POLL_MS / 1000);
  const finishingRef = useRef(false);

  const balance = Number(user?.balance || 0);
  const plan = getPlan(planId);
  const energy = getEnergy(user, now());
  const shortfall = plan ? Math.max(0, plan.price - balance) : 0;
  const customAmount = Math.round(Number(String(custom).replace(/\D/g, '')));
  const walletAmount = custom ? customAmount : amount;

  // ESC để đóng + khóa cuộn trang nền
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const buyPass = async (id) => {
    const res = await fetch('/api/user/pass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Kích hoạt thất bại');
    setUser(data.user);
    return data.user;
  };

  const startDeposit = async (value, planToBuy = null) => {
    setError('');
    if (!value || value < MIN_TOPUP || value > MAX_TOPUP) {
      setError(`Số tiền từ ${formatVnd(MIN_TOPUP)} đến ${formatVnd(MAX_TOPUP)}`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/user/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: value, method, phone: needPhone ? phoneInput : undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === 'PHONE_REQUIRED' || data.code === 'PHONE_TAKEN') setNeedPhone(true);
        throw new Error(data.message || 'Không tạo được lệnh nạp');
      }
      // SĐT vừa lưu làm nội dung chuyển khoản → cập nhật vào hồ sơ đang hiển thị
      if (data.deposit?.code && data.deposit.code !== user?.phone) setUser((u) => ({ ...u, phone: data.deposit.code }));
      setNeedPhone(false);
      setConfirmMsg('');
      setDeposit(data.deposit);
      setPendingPlan(planToBuy);
      setCountdown(POLL_MS / 1000);
      setStep('pay');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  // Người nạp báo đã chuyển khoản → admin nhận thông báo để duyệt ngay
  const confirmTransfer = async () => {
    if (!deposit?.id) return;
    setConfirming(true);
    try {
      const res = await fetch('/api/user/deposit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'confirm', id: deposit.id }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.message || 'Không gửi được');
      setConfirmMsg(d.status === 'completed' ? 'Đơn này đã được duyệt rồi!' : 'Đã báo admin! Tiền sẽ vào ví ngay khi admin xác nhận giao dịch.');
    } catch (e) {
      setError(e.message);
    } finally {
      setConfirming(false);
    }
  };

  const handlePassCta = async () => {
    if (!plan) return;
    setError('');
    if (shortfall > 0) {
      // Thiếu tiền → nạp đúng phần thiếu (làm tròn lên nghìn), xong tự kích hoạt
      const need = Math.max(MIN_TOPUP, Math.ceil(shortfall / 1000) * 1000);
      return startDeposit(need, plan.id);
    }
    setBusy(true);
    try {
      await buyPass(plan.id);
      setDoneMsg(`${faction.pass} ${plan.label} đã kích hoạt! Năng lượng +${plan.days} ngày ${faction.emoji}`);
      setStep('done');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  // Poll trạng thái lệnh nạp mỗi 5 giây
  useEffect(() => {
    if (step !== 'pay' || !deposit?.id) return;
    let stopped = false;
    finishingRef.current = false;

    const check = async () => {
      if (stopped || finishingRef.current) return;
      try {
        const res = await fetch(`/api/user/deposit?id=${deposit.id}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'completed' && !finishingRef.current) {
          finishingRef.current = true;
          await refresh();
          if (pendingPlan) {
            try {
              const p = getPlan(pendingPlan);
              await buyPass(pendingPlan);
              setDoneMsg(`Đã nhận ${formatVnd(data.amount)} và kích hoạt ${faction.pass} ${p?.label}! ${faction.emoji}`);
            } catch (e) {
              setDoneMsg(`Đã cộng ${formatVnd(data.amount)} vào ví. ${e.message}`);
            }
          } else {
            setDoneMsg(`Đã cộng ${formatVnd(data.amount)} vào ví! Số dư mới: ${formatVnd(data.balance)}`);
          }
          if (!stopped) setStep('done');
        } else if (data.status === 'rejected') {
          finishingRef.current = true;
          if (!stopped) { setError('Lệnh nạp bị từ chối. Liên hệ admin nếu bạn đã chuyển tiền.'); setStep('choose'); }
        }
      } catch { /* mạng chập chờn: thử lại ở lượt sau */ }
    };

    const poll = setInterval(check, POLL_MS);
    const tickT = setInterval(() => setCountdown((c) => (c <= 1 ? POLL_MS / 1000 : c - 1)), 1000);
    return () => { stopped = true; clearInterval(poll); clearInterval(tickT); };
  }, [step, deposit?.id, pendingPlan]); // eslint-disable-line react-hooks/exhaustive-deps


  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Nạp tiền và gia hạn"
        className="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-[#0e0e13] border border-[rgb(var(--fx-rgb)/0.35)] rounded-t-2xl sm:rounded-2xl shadow-[0_0_60px_-10px_rgb(var(--fx-rgb)/0.5)] animate-fade-in-up">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-white/5 bg-[#0e0e13]/95 backdrop-blur">
          <div className="flex items-center gap-2">
            {step === 'pay' && (
              <button onClick={() => { setStep('choose'); setDeposit(null); }} className="p-1 -ml-1 text-gray-400 hover:text-white" aria-label="Quay lại">
                <ArrowLeft size={18} />
              </button>
            )}
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              <Zap size={18} className="text-[var(--fx)]" /> Nạp Đạn & Năng Lượng
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 hidden sm:inline">Ví: <b className="text-[var(--fx)]">{formatVnd(balance)}</b></span>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5" aria-label="Đóng"><X size={18} /></button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {step === 'choose' && (
            <>
              {/* Tabs */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-white/5 rounded-xl">
                {[
                  { id: 'pass', label: 'Mua Gói Hội Viên', icon: <Crown size={15} /> },
                  { id: 'wallet', label: 'Nạp Tiền Lẻ Vào Ví', icon: <Wallet size={15} /> },
                ].map((t) => (
                  <button key={t.id} onClick={() => { setTab(t.id); setError(''); }}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition ${tab === t.id ? 'bg-[rgb(var(--fx-rgb)/0.15)] text-[var(--fx)] shadow-[inset_0_0_0_1px_rgb(var(--fx-rgb)/0.4)]' : 'text-gray-400 hover:text-white'}`}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              {tab === 'pass' ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PLANS.map((p) => {
                    const selected = p.id === planId;
                    const perMonth = Math.round(p.price / (p.days / 30));
                    return (
                      <button key={p.id} onClick={() => setPlanId(p.id)}
                        className={`relative text-left rounded-xl p-4 border transition ${selected ? 'border-[var(--fx)] bg-[rgb(var(--fx-rgb)/0.1)] shadow-[0_0_24px_-6px_rgb(var(--fx-rgb)/0.6)]' : 'border-white/10 bg-white/[0.03] hover:border-white/25'}`}>
                        {p.tag && (
                          <span className={`absolute -top-2.5 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full ${p.id === '1y' ? 'bg-yellow-400 text-black' : 'bg-[var(--fx)] text-black'}`}>
                            {p.tag}
                          </span>
                        )}
                        <p className="text-xs text-gray-400">{faction.pass}</p>
                        <p className="text-white font-bold text-lg">{p.label}</p>
                        <p className="text-2xl font-black text-[var(--fx)] mt-1">{formatVnd(p.price)}</p>
                        <p className="text-[11px] text-gray-500 mt-1">≈ {formatVnd(perMonth)}/tháng · {p.days} ngày</p>
                        <p className="text-xs text-gray-300 mt-2 flex items-center gap-1"><Sparkles size={12} className="text-[var(--fx)]" /> {p.perk}</p>
                        {selected && <Check size={16} className="absolute bottom-3 right-3 text-[var(--fx)]" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {TOPUP_AMOUNTS.map((a) => {
                      const selected = !custom && amount === a;
                      return (
                        <button key={a} onClick={() => { setAmount(a); setCustom(''); }}
                          className={`py-4 rounded-xl border font-black text-xl transition ${selected ? 'border-[var(--fx)] text-[var(--fx)] bg-[rgb(var(--fx-rgb)/0.1)]' : 'border-white/10 text-white bg-white/[0.03] hover:border-white/25'}`}>
                          {formatK(a)}
                        </button>
                      );
                    })}
                  </div>
                  <input inputMode="numeric" value={custom ? Number(customAmount || 0).toLocaleString('vi-VN') : ''}
                    onChange={(e) => setCustom(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    placeholder="Hoặc nhập số khác (VD: 150.000)"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[var(--fx)]" />
                </div>
              )}

              {/* Tóm tắt + CTA */}
              <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-400"><span>Số dư ví</span><span className="text-white font-semibold">{formatVnd(balance)}</span></div>
                {tab === 'pass' && plan && (
                  <>
                    <div className="flex justify-between text-gray-400"><span>{faction.pass} · {plan.label}</span><span className="text-white font-semibold">-{formatVnd(plan.price)}</span></div>
                    {shortfall > 0 ? (
                      <div className="flex justify-between text-orange-300"><span>Cần bơm thêm</span><span className="font-bold">{formatVnd(Math.max(MIN_TOPUP, Math.ceil(shortfall / 1000) * 1000))}</span></div>
                    ) : (
                      <div className="flex justify-between text-gray-400"><span>Số dư sau khi mua</span><span className="text-[var(--fx)] font-semibold">{formatVnd(balance - plan.price)}</span></div>
                    )}
                    <p className="text-[11px] text-gray-500 pt-1">
                      {energy.active ? `Cộng dồn: ${energy.label} hiện có + ${plan.days} ngày mới.` : `Năng lượng sẽ được nạp ${plan.days} ngày ngay lập tức.`}
                    </p>
                  </>
                )}
                {tab === 'wallet' && (
                  <div className="flex justify-between text-gray-400"><span>Số tiền nạp</span><span className="text-[var(--fx)] font-bold">{formatVnd(walletAmount || 0)}</span></div>
                )}
              </div>

              {needPhone && (tab === 'wallet' || shortfall > 0) && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Số điện thoại của bạn (dùng làm nội dung chuyển khoản)</p>
                  <input inputMode="tel" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value.replace(/[^\d+\s.]/g, '').slice(0, 15))}
                    placeholder="VD: 0968635701"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[var(--fx)]" />
                  <p className="text-[11px] text-gray-500 mt-1">Hệ thống nhận diện tiền của bạn qua SĐT này. Chỉ cần nhập một lần.</p>
                </div>
              )}

              {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>}

              <button disabled={busy} onClick={tab === 'pass' ? handlePassCta : () => startDeposit(walletAmount)}
                className="w-full py-4 rounded-xl font-black text-lg text-black bg-gradient-to-r from-[var(--fx2)] to-[var(--fx)] shadow-[0_0_30px_-4px_rgb(var(--fx-rgb)/0.7)] hover:brightness-110 active:scale-[0.99] transition disabled:opacity-60 flex items-center justify-center gap-2">
                {busy ? <Loader2 size={20} className="animate-spin" /> : <Zap size={20} />}
                {tab === 'pass'
                  ? (shortfall > 0 ? `Bơm & ${energy.active ? faction.renewCta : faction.cta}` : (energy.active ? faction.renewCta : faction.cta))
                  : 'Bơm ngay'}
              </button>
            </>
          )}

          {step === 'pay' && deposit && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-gray-300 text-sm">Quét mã QR bằng app ngân hàng / MoMo / ZaloPay để chuyển <b className="text-white">{formatVnd(deposit.amount)}</b></p>
                {pendingPlan && <p className="text-xs text-[var(--fx)] mt-1">Tiền vào là tự kích hoạt {faction.pass} {getPlan(pendingPlan)?.label}</p>}
              </div>

              <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
                <div className="shrink-0 bg-white rounded-2xl p-2 shadow-[0_0_40px_-8px_rgb(var(--fx-rgb)/0.8)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={deposit.qrUrl} alt={`QR chuyển khoản ${deposit.bank} ${deposit.accountNo}`} className="w-56 h-auto object-contain rounded-xl" />
                </div>
                <div className="flex-1 w-full space-y-2">
                  <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
                    <li>Quét mã QR bên cạnh.</li>
                    <li>Nhập đúng <b className="text-white">số tiền</b> và <b className="text-white">nội dung</b> bên dưới.</li>
                    <li>Chuyển xong bấm <b className="text-white">“Tôi đã chuyển khoản”</b>.</li>
                  </ol>
                  <CopyField label="Nội dung chuyển khoản (SĐT của bạn — bắt buộc)" value={deposit.code} />
                  <CopyField label="Số tiền" value={deposit.amount} />
                  <CopyField label={`Số tài khoản · ${deposit.bank}`} value={deposit.accountNo} />
                  {deposit.accountName && <CopyField label="Chủ tài khoản" value={deposit.accountName} />}
                </div>
              </div>

              {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>}

              {confirmMsg ? (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3">
                  <Check size={18} className="text-emerald-400 shrink-0" />
                  <p className="text-sm text-emerald-200">{confirmMsg}</p>
                </div>
              ) : (
                <button onClick={confirmTransfer} disabled={confirming}
                  className="w-full py-3.5 rounded-xl font-black text-black bg-gradient-to-r from-[var(--fx2)] to-[var(--fx)] hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2">
                  {confirming ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} Tôi đã chuyển khoản
                </button>
              )}

              <div className="flex items-center gap-3 rounded-xl border border-[rgb(var(--fx-rgb)/0.3)] bg-[rgb(var(--fx-rgb)/0.06)] px-4 py-3">
                <Loader2 size={18} className="animate-spin text-[var(--fx)] shrink-0" />
                <p className="text-sm text-gray-300">
                  {deposit.autoConfirm
                    ? <>Đang chờ tiền về… tự kiểm tra sau <b className="text-[var(--fx)]">{countdown}s</b> và cộng ngay khi nhận được.</>
                    : <>Đang chờ admin duyệt… tự kiểm tra lại sau <b className="text-[var(--fx)]">{countdown}s</b>. Tiền vào ví ngay khi admin xác nhận.</>}
                </p>
              </div>
              <p className="text-[11px] text-gray-500 text-center">Ghi <b>đúng nội dung (SĐT)</b> để admin nhận ra bạn. Có thể đóng bảng này — tiền vẫn được cộng khi duyệt.</p>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-[rgb(var(--fx-rgb)/0.15)] shadow-[0_0_40px_-4px_rgb(var(--fx-rgb)/0.8)]">
                <ShieldCheck size={40} className="text-[var(--fx)]" />
              </div>
              <p className="text-white font-bold text-lg">{doneMsg}</p>
              <p className="text-sm text-gray-400">Số dư hiện tại: <b className="text-[var(--fx)]">{formatVnd(user?.balance)}</b></p>
              <button onClick={onClose} className="px-8 py-3 rounded-xl font-bold text-black bg-[var(--fx)] hover:brightness-110">Quẩy tiếp thôi</button>
            </div>
          )}

          {step !== 'done' && (
            <p className="text-[11px] text-gray-600 flex items-center justify-center gap-1"><QrCode size={12} /> Giao dịch được mã hoá & ghi nhận trong lịch sử ví.</p>
          )}
        </div>
      </div>
    </div>
  );
}
