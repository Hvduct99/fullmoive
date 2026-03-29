'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Play, Crown, Shield, Clock, Sparkles, Check } from 'lucide-react';

const VIP_PRICE = 12000;

export default function UserDashboard() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [depositAmount, setDepositAmount] = useState(VIP_PRICE);
  const [transferNote, setTransferNote] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositMsg, setDepositMsg] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimMsg, setClaimMsg] = useState('');

  const fetchProfile = () => fetch('/api/user/profile').then(r => r.ok ? r.json() : null);
  const fetchTx = () => fetch('/api/user/transactions').then(r => r.ok ? r.json() : { transactions: [] });

  useEffect(() => {
    Promise.all([fetchProfile(), fetchTx()])
      .then(([p, t]) => {
        setProfile(p);
        setTransactions(t?.transactions || []);
        if (p?.user) setTransferNote(p.user.username);
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);

  const refreshData = async () => {
    const [p, t] = await Promise.all([fetchProfile(), fetchTx()]);
    if (p) setProfile(p);
    setTransactions(t?.transactions || []);
  };

  const handleDeposit = async () => {
    setDepositMsg('');
    if (!depositAmount || depositAmount < 1000) { setDepositMsg('Số tiền tối thiểu 1.000 đ'); return; }
    if (!transferNote.trim()) { setDepositMsg('Vui lòng nhập nội dung chuyển khoản'); return; }

    setDepositLoading(true);
    try {
      const res = await fetch('/api/user/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: depositAmount, note: transferNote.trim() })
      });
      const data = await res.json();
      setDepositMsg(data.message);
      if (res.ok) refreshData();
    } catch { setDepositMsg('Lỗi kết nối'); }
    finally { setDepositLoading(false); }
  };

  const handleClaimVip = async () => {
    setClaimMsg('');
    setClaimLoading(true);
    try {
      const res = await fetch('/api/user/claim-vip', { method: 'POST' });
      const data = await res.json();
      setClaimMsg(data.message);
      if (res.ok) refreshData();
    } catch { setClaimMsg('Lỗi kết nối'); }
    finally { setClaimLoading(false); }
  };

  if (loading) return <div className="text-white p-8">Đang tải...</div>;
  if (!profile?.user) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">Không thể tải thông tin tài khoản.</p>
        <a href="/login" className="text-yellow-500 hover:underline">Đăng nhập lại</a>
      </div>
    );
  }

  const { user } = profile;
  const isVip = Boolean(user.isVip);
  const vipExpired = Boolean(user.vipExpired);
  const canClaimVip = user.balance >= VIP_PRICE && !isVip;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Xin chào, {user.username}</h2>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-5 rounded-xl border ${isVip && !vipExpired ? 'bg-gradient-to-br from-yellow-500/10 to-[#1a1a1a] border-yellow-500/30' : 'bg-[#1a1a1a] border-[#333]'}`}>
          <p className="text-gray-400 text-sm mb-1">Gói hiện tại</p>
          <h3 className={`text-xl font-bold ${isVip ? 'text-yellow-500' : 'text-white'}`}>
            {isVip && !vipExpired ? <span className="flex items-center gap-2"><Crown size={20} /> VIP Premium</span>
              : vipExpired ? 'VIP đã hết hạn' : 'Miễn phí'}
          </h3>
          {isVip && !vipExpired && user.vipExpireAt && (
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <Clock size={12} /> Hết hạn: {new Date(user.vipExpireAt).toLocaleDateString('vi-VN')}
            </p>
          )}
        </div>

        <div className="bg-[#1a1a1a] p-5 rounded-xl border border-[#333]">
          <p className="text-gray-400 text-sm mb-1">Số dư ví</p>
          <h3 className="text-xl font-bold text-yellow-300">{Number(user.balance || 0).toLocaleString()} đ</h3>
        </div>

        <div className="bg-[#1a1a1a] p-5 rounded-xl border border-[#333]">
          <p className="text-gray-400 text-sm mb-1">Tài khoản</p>
          <h3 className="text-xl font-bold text-white">{user.email}</h3>
          <Link href="/user/profile" className="text-xs text-yellow-500 mt-2 block hover:underline">Chỉnh sửa hồ sơ &rarr;</Link>
        </div>
      </div>

      {/* Deposit + VIP */}
      <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6 space-y-4">
        <h3 className="text-xl font-bold text-white">Nạp tiền & Đăng ký VIP</h3>
        <p className="text-sm text-gray-400">Nạp tối thiểu {VIP_PRICE.toLocaleString()} đ để đăng ký VIP 30 ngày.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* QR + Instructions */}
          <div className="bg-[#121212] p-4 rounded-lg border border-[#222]">
            <p className="text-sm text-gray-200 mb-2 font-semibold">Hướng dẫn chuyển khoản</p>
            <p className="text-xs text-gray-400 mb-1">1. Quét mã QR bên dưới</p>
            <p className="text-xs text-gray-400 mb-1">2. Nội dung chuyển khoản <strong className="text-white">bắt buộc</strong> là tên đăng nhập: <span className="text-yellow-400 font-semibold">{user.username}</span></p>
            <p className="text-xs text-gray-400 mb-3">3. Gửi yêu cầu nạp tiền, chờ admin duyệt</p>
            <img src="/images/QR.jpg" alt="QR chuyển khoản" className="w-full max-w-[250px] rounded-md border border-gray-800" />
          </div>

          {/* Deposit Form */}
          <div className="bg-[#121212] p-4 rounded-lg border border-[#222] space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Số tiền (VND)</label>
              <input type="number" value={depositAmount} min={1000} onChange={e => setDepositAmount(Number(e.target.value))}
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded px-3 py-2 text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Nội dung chuyển khoản</label>
              <input value={transferNote} onChange={e => setTransferNote(e.target.value)} placeholder="Tên đăng nhập"
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded px-3 py-2 text-white" />
            </div>
            <button onClick={handleDeposit} disabled={depositLoading}
              className="w-full bg-yellow-500 text-black font-bold py-2 rounded hover:bg-yellow-400 disabled:opacity-50">
              {depositLoading ? 'Đang gửi...' : 'Gửi yêu cầu nạp tiền'}
            </button>
            {depositMsg && <p className="text-xs text-green-300">{depositMsg}</p>}

            <button onClick={handleClaimVip} disabled={claimLoading || !canClaimVip}
              className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-500 disabled:opacity-50">
              {claimLoading ? 'Đang xử lý...' : `Đăng ký VIP (${VIP_PRICE.toLocaleString()} đ)`}
            </button>
            {!canClaimVip && !isVip && <p className="text-xs text-gray-500">Cần nạp đủ {VIP_PRICE.toLocaleString()} đ để đăng ký</p>}
            {isVip && !vipExpired && <p className="text-xs text-yellow-400">Bạn đã là VIP</p>}
            {claimMsg && <p className="text-xs text-blue-300">{claimMsg}</p>}
          </div>
        </div>
      </div>

      {/* VIP Upgrade Banner */}
      {(!isVip || vipExpired) && (
        <div className="bg-gradient-to-r from-yellow-500/10 via-[#1a1a1a] to-yellow-500/5 p-6 rounded-xl border border-yellow-500/30">
          <h3 className="text-xl font-bold text-yellow-500 flex items-center gap-2 mb-2"><Crown size={24} /> Nâng cấp VIP</h3>
          <p className="text-gray-400 text-sm mb-3">Mở khóa toàn bộ phim VIP!</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {['Phim Hành Động, Kinh Dị', 'Toàn bộ phim Netflix', 'Full HD / 4K'].map(t => (
              <div key={t} className="flex items-center gap-2 text-sm text-gray-300">
                <Check size={16} className="text-yellow-500 shrink-0" /> {t}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIP Content Links */}
      {isVip && !vipExpired && (
        <div className="bg-[#1a1a1a] p-6 rounded-xl border border-yellow-500/20">
          <h3 className="text-lg font-bold text-yellow-500 mb-4 flex items-center gap-2"><Sparkles size={20} /> Nội dung VIP</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { href: '/the-loai/hanh-dong', label: 'Hành Động', color: 'red', icon: <Shield size={20} className="text-red-500" /> },
              { href: '/the-loai/kinh-di', label: 'Kinh Dị', color: 'purple', icon: <Shield size={20} className="text-purple-500" /> },
              { href: '/danh-sach/netflix', label: 'Netflix', color: 'red', icon: <Play size={20} className="text-red-500" /> },
            ].map(item => (
              <Link key={item.href} href={item.href} className="flex items-center gap-3 bg-[#252525] p-4 rounded-lg hover:bg-[#333]">
                <div className={`w-10 h-10 bg-${item.color}-500/20 rounded-lg flex items-center justify-center`}>{item.icon}</div>
                <div><p className="text-white font-medium">{item.label}</p><p className="text-xs text-gray-500">VIP Content</p></div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-3">Lịch sử giao dịch</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-[#252525] uppercase text-xs">
              <tr>
                <th className="px-3 py-2">Loại</th>
                <th className="px-3 py-2">Số tiền</th>
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2">Nội dung</th>
                <th className="px-3 py-2">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr><td colSpan="5" className="px-3 py-4 text-center text-gray-500">Chưa có giao dịch</td></tr>
              ) : transactions.map(tx => (
                <tr key={tx.id} className="border-t border-[#333] hover:bg-[#1f1f1f]">
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${tx.type === 'deposit' ? 'bg-green-900 text-green-200' : 'bg-yellow-900 text-yellow-200'}`}>
                      {tx.type === 'deposit' ? 'Nạp tiền' : 'Mua VIP'}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-semibold">{Number(tx.amount).toLocaleString()} đ</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs ${tx.status === 'completed' ? 'text-green-400' : tx.status === 'pending' ? 'text-yellow-400' : 'text-red-400'}`}>
                      {tx.status === 'completed' ? 'Hoàn thành' : tx.status === 'pending' ? 'Chờ duyệt' : 'Từ chối'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-400">{tx.note || '-'}</td>
                  <td className="px-3 py-2 text-gray-500">{new Date(tx.created_at).toLocaleString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
