'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { History, Play } from 'lucide-react';

export default function UserDashboard() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [watchHistory, setWatchHistory] = useState([]);
  const [depositAmount, setDepositAmount] = useState(10000);
  const [transferNote, setTransferNote] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositMsg, setDepositMsg] = useState('');

  const fetchProfile = () => fetch('/api/user/profile').then(r => r.ok ? r.json() : null);
  const fetchTx = () => fetch('/api/user/transactions').then(r => r.ok ? r.json() : { transactions: [] });
  const fetchHistory = () => fetch('/api/user/watch-history?limit=6').then(r => r.ok ? r.json() : { history: [] });

  useEffect(() => {
    Promise.all([fetchProfile(), fetchTx(), fetchHistory()])
      .then(([p, t, h]) => {
        setProfile(p);
        setTransactions(t?.transactions || []);
        setWatchHistory(h?.history || []);
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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Xin chào, {user.username}</h2>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#1a1a1a] p-5 rounded-xl border border-[#333]">
          <p className="text-gray-400 text-sm mb-1">Gói hiện tại</p>
          <h3 className="text-xl font-bold text-white">Thành viên</h3>
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

      {/* Watch History */}
      {watchHistory.length > 0 && (
        <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <History size={20} className="text-purple-400" /> Xem gần đây
            </h3>
            <Link href="/user/watch-history" className="text-xs text-yellow-500 hover:underline">
              Xem tất cả &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {watchHistory.map(item => (
              <Link
                key={item.id}
                href={item.episode_slug ? `/phim/${item.movie_slug}/tap-${item.episode_slug}` : `/phim/${item.movie_slug}`}
                className="group relative bg-[#222] rounded-lg overflow-hidden border border-[#333] hover:border-yellow-500/50 transition-all"
              >
                <div className="relative aspect-[2/3]">
                  {item.movie_thumb ? (
                    <img src={item.movie_thumb} alt={item.movie_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <Play size={24} className="text-gray-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play size={28} className="text-white" />
                  </div>
                  {item.episode_name && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-2 py-1.5">
                      <span className="text-[10px] text-yellow-400 font-semibold">Tập {item.episode_name}</span>
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs text-white font-medium line-clamp-2 leading-tight">{item.movie_name}</p>
                  {item.movie_year && <p className="text-[10px] text-gray-500 mt-0.5">{item.movie_year}</p>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Deposit */}
      <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6 space-y-4">
        <h3 className="text-xl font-bold text-white">Nạp tiền</h3>
        <p className="text-sm text-gray-400">Nạp tiền vào tài khoản để sử dụng dịch vụ.</p>

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
          </div>
        </div>
      </div>

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
                    <span className="text-xs px-2 py-0.5 rounded bg-green-900 text-green-200">
                      {tx.type === 'deposit' ? 'Nạp tiền' : tx.type}
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
