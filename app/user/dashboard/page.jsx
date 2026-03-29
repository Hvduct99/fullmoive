'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Play, Crown, Shield, Clock, Sparkles, Check } from 'lucide-react';

export default function UserDashboard() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [depositAmount, setDepositAmount] = useState(12000);
  const [transferNote, setTransferNote] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositMessage, setDepositMessage] = useState('');
  const [claimVipLoading, setClaimVipLoading] = useState(false);
  const [claimVipMessage, setClaimVipMessage] = useState('');

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/user/transactions');
      const data = await res.json();
      if (res.ok) setTransactions(data.transactions || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetch('/api/user/profile')
      .then(res => {
        if (!res.ok) throw new Error('Failed');
        return res.json();
      })
      .then(async data => {
        setProfile(data);
        await fetchTransactions();
        setLoading(false);
      })
      .catch(() => {
        setProfile(null);
        setLoading(false);
      });
  }, []);

  const handleDeposit = async () => {
    setDepositMessage('');
    if (!depositAmount || Number(depositAmount) <= 0) {
      setDepositMessage('Số tiền phải lớn hơn 0');
      return;
    }
    if (!transferNote.trim()) {
      setDepositMessage('Vui lòng nhập nội dung chuyển khoản (tên đăng nhập)');
      return;
    }

    setDepositLoading(true);
    try {
      const res = await fetch('/api/user/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: depositAmount, note: transferNote.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi nạp tiền');
      setDepositMessage(data.message);
      fetchTransactions();
    } catch (error) {
      setDepositMessage(error.message || 'Lỗi nạp tiền');
    } finally {
      setDepositLoading(false);
    }
  };

  const handleClaimVip = async () => {
    setClaimVipMessage('');
    setClaimVipLoading(true);
    try {
      const res = await fetch('/api/user/claim-vip', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi đăng ký VIP');
      setClaimVipMessage(data.message);
      const profileRes = await fetch('/api/user/profile');
      if (profileRes.ok) {
        const updatedProfile = await profileRes.json();
        setProfile(updatedProfile);
      }
      fetchTransactions();
    } catch (error) {
      setClaimVipMessage(error.message || 'Lỗi đăng ký VIP');
    } finally {
      setClaimVipLoading(false);
    }
  };

  if (loading) return <div className="text-white p-8">Đang tải...</div>;

  if (!profile || !profile.user) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">Không thể tải thông tin tài khoản.</p>
        <a href="/login" className="text-yellow-500 hover:underline">Đăng nhập lại</a>
      </div>
    );
  }

  const { user, stats } = profile;
  const isVip = Boolean(user.isVip);
  const vipExpired = Boolean(user.vipExpired);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Xin chào, {user.username || user.full_name}</h2>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-5 rounded-xl border ${isVip && !vipExpired ? 'bg-gradient-to-br from-yellow-500/10 to-[#1a1a1a] border-yellow-500/30' : 'bg-[#1a1a1a] border-[#333]'}`}>
          <p className="text-gray-400 text-sm mb-1">Gói hiện tại</p>
          <h3 className={`text-xl font-bold ${isVip && !vipExpired ? 'text-yellow-500' : 'text-white'}`}>
            {isVip && !vipExpired ? (
              <span className="flex items-center gap-2"><Crown size={20} /> VIP Premium</span>
            ) : vipExpired ? 'VIP đã hết hạn' : 'Miễn phí'}
          </h3>
          {isVip && !vipExpired && user.vipExpireAt && (
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <Clock size={12} /> Hết hạn: {new Date(user.vipExpireAt).toLocaleDateString('vi-VN')}
            </p>
          )}
        </div>

        <div className="bg-[#1a1a1a] p-5 rounded-xl border border-[#333]">
          <p className="text-gray-400 text-sm mb-1">Phim đã xem</p>
          <h3 className="text-xl font-bold text-white">{stats.watchedMovies}</h3>
        </div>

        <div className="bg-[#1a1a1a] p-5 rounded-xl border border-[#333]">
          <p className="text-gray-400 text-sm mb-1">Tài khoản</p>
          <h3 className="text-xl font-bold text-white">{user.email}</h3>
          <Link href="/user/profile" className="text-xs text-yellow-500 mt-2 block hover:underline">
            Chỉnh sửa hồ sơ &rarr;
          </Link>
        </div>
      </div>

      {/* Balance + Deposit */}
      <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6 space-y-4">
        <h3 className="text-xl font-bold text-white">Số dư ví: <span className="text-yellow-300">{user.balance?.toLocaleString() || 0} đ</span></h3>
        <p className="text-sm text-gray-400">Nạp tối thiểu 12.000 đ để đăng ký VIP.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#121212] p-4 rounded-lg border border-[#222]">
            <p className="text-sm text-gray-200 mb-2">Hướng dẫn chuyển khoản</p>
            <p className="text-xs text-gray-400 mb-1">- Quét mã QR Phương thức chuyển khoản</p>
            <p className="text-xs text-gray-400 mb-1">- Nội dung chuyển khoản phải là tên đăng nhập của bạn: <span className="font-semibold text-white">{user.username}</span></p>
            <p className="text-xs text-gray-400 mb-4">- Sau thao tác, hệ thống ghi nhận giao dịch tạm thời (pending). Admin duyệt rồi cộng số dư.</p>
            <img src="/api/user/qr" alt="QR chuyển khoản" className="w-full rounded-md border border-gray-800" />
          </div>

          <div className="bg-[#121212] p-4 rounded-lg border border-[#222]">
            <label className="text-xs text-gray-400 mb-1 block">Số tiền (VND)</label>
            <input type="number" value={depositAmount} min={1000} onChange={e => setDepositAmount(Number(e.target.value))} className="w-full bg-[#1a1a1a] border border-gray-700 rounded px-3 py-2 text-white mb-2" />
            <label className="text-xs text-gray-400 mb-1 block">Nội dung chuyển khoản</label>
            <input value={transferNote} onChange={e => setTransferNote(e.target.value)} placeholder="Tên đăng nhập" className="w-full bg-[#1a1a1a] border border-gray-700 rounded px-3 py-2 text-white mb-3" />
            <button onClick={handleDeposit} disabled={depositLoading} className="w-full bg-yellow-500 text-black py-2 rounded hover:bg-yellow-400">
              {depositLoading ? 'Đang gửi...' : 'Gửi yêu cầu nạp tiền'}
            </button>
            {depositMessage && <p className="text-xs text-green-300 mt-2">{depositMessage}</p>}
            <button onClick={handleClaimVip} disabled={claimVipLoading || user.balance < 12000 || (isVip && !vipExpired)} className="mt-2 w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-400 disabled:opacity-50">
              {claimVipLoading ? 'Đang xử lý VIP...' : 'Đăng ký VIP (12000 đ)'}
            </button>
            <p className="text-xs mt-1 text-gray-400">{claimVipMessage}</p>
          </div>
        </div>
      </div>

      {/* VIP Upgrade */}
      {(!isVip || vipExpired) && (
        <div className="bg-gradient-to-r from-yellow-500/10 via-[#1a1a1a] to-yellow-500/5 p-6 rounded-xl border border-yellow-500/30">
          <h3 className="text-xl font-bold text-yellow-500 flex items-center gap-2 mb-2">
            <Crown size={24} /> Nâng cấp VIP
          </h3>
          <p className="text-gray-400 text-sm mb-4">Mở khóa toàn bộ phim VIP!</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Check size={16} className="text-yellow-500 shrink-0" /> Phim Hành Động, Kinh Dị
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Check size={16} className="text-yellow-500 shrink-0" /> Toàn bộ phim Netflix
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Check size={16} className="text-yellow-500 shrink-0" /> Full HD / 4K
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">Liên hệ Admin để nâng cấp</p>
        </div>
      )}

      {/* VIP Content */}
      {isVip && !vipExpired && (
        <div className="bg-[#1a1a1a] p-6 rounded-xl border border-yellow-500/20">
          <h3 className="text-lg font-bold text-yellow-500 mb-4 flex items-center gap-2">
            <Sparkles size={20} /> Nội dung VIP
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link href="/the-loai/hanh-dong" className="flex items-center gap-3 bg-[#252525] p-4 rounded-lg hover:bg-[#333] transition-colors">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <Shield size={20} className="text-red-500" />
              </div>
              <div>
                <p className="text-white font-medium">Hành Động</p>
                <p className="text-xs text-gray-500">VIP Content</p>
              </div>
            </Link>
            <Link href="/the-loai/kinh-di" className="flex items-center gap-3 bg-[#252525] p-4 rounded-lg hover:bg-[#333] transition-colors">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Shield size={20} className="text-purple-500" />
              </div>
              <div>
                <p className="text-white font-medium">Kinh Dị</p>
                <p className="text-xs text-gray-500">VIP Content</p>
              </div>
            </Link>
            <Link href="/danh-sach/netflix" className="flex items-center gap-3 bg-[#252525] p-4 rounded-lg hover:bg-[#333] transition-colors">
              <div className="w-10 h-10 bg-red-600/20 rounded-lg flex items-center justify-center">
                <Play size={20} className="text-red-500" />
              </div>
              <div>
                <p className="text-white font-medium">Netflix</p>
                <p className="text-xs text-gray-500">VIP Content</p>
              </div>
            </Link>
          </div>
        </div>
      )}

      <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-3">Lịch sử giao dịch gần nhất</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-[#252525] uppercase text-xs">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Loại</th>
                <th className="px-3 py-2">Số tiền</th>
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2">Nội dung</th>
                <th className="px-3 py-2">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr><td colSpan="6" className="px-3 py-4 text-center text-gray-400">Chưa có giao dịch</td></tr>
              ) : (
                transactions.map(tx => (
                  <tr key={tx.id} className="border-t border-[#333] hover:bg-[#1f1f1f]">
                    <td className="px-3 py-2">{tx.id}</td>
                    <td className="px-3 py-2">{tx.type}</td>
                    <td className="px-3 py-2">{Number(tx.amount).toLocaleString()} đ</td>
                    <td className="px-3 py-2">{tx.status}</td>
                    <td className="px-3 py-2">{tx.note || '-'}</td>
                    <td className="px-3 py-2">{new Date(tx.created_at).toLocaleString('vi-VN')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
