'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';

export default function UserDashboard() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [depositAmount, setDepositAmount] = useState(10000);
  const [transferNote, setTransferNote] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositMsg, setDepositMsg] = useState({ text: '', ok: true });

  useEffect(() => {
    Promise.all([
      fetch('/api/user/profile').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/user/transactions').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([p, t]) => {
      setProfile(p);
      setTransactions(t?.transactions || []);
      if (p?.user) setTransferNote(p.user.username);
    }).finally(() => setLoading(false));
  }, []);

  const refreshData = async () => {
    const [p, t] = await Promise.all([
      fetch('/api/user/profile').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/user/transactions').then(r => r.ok ? r.json() : null).catch(() => null),
    ]);
    if (p) setProfile(p);
    setTransactions(t?.transactions || []);
  };

  const handleDeposit = async () => {
    setDepositMsg({ text: '', ok: true });
    if (!depositAmount || depositAmount < 1000) { setDepositMsg({ text: 'Tối thiểu 1.000đ', ok: false }); return; }
    if (!transferNote.trim()) { setDepositMsg({ text: 'Nhập nội dung CK', ok: false }); return; }

    setDepositLoading(true);
    try {
      const res = await fetch('/api/user/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: depositAmount, note: transferNote.trim() })
      });
      const data = await res.json();
      setDepositMsg({ text: data.message, ok: res.ok });
      if (res.ok) refreshData();
    } catch { setDepositMsg({ text: 'Lỗi kết nối', ok: false }); }
    finally { setDepositLoading(false); }
  };

  if (loading) return <div className="text-white p-8">Đang tải...</div>;
  if (!profile?.user) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">Không thể tải thông tin.</p>
        <a href="/login" className="text-yellow-500 hover:underline">Đăng nhập lại</a>
      </div>
    );
  }

  const { user } = profile;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Xin chào, {user.username}</h2>

      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#1a1a1a] p-5 rounded-xl border border-[#333]">
          <p className="text-gray-400 text-sm mb-1">Số dư ví</p>
          <h3 className="text-xl font-bold text-yellow-400">{Number(user.balance || 0).toLocaleString()} đ</h3>
        </div>
        <div className="bg-[#1a1a1a] p-5 rounded-xl border border-[#333]">
          <p className="text-gray-400 text-sm mb-1">Tài khoản</p>
          <h3 className="text-lg font-bold text-white truncate">{user.email}</h3>
        </div>
        <div className="bg-[#1a1a1a] p-5 rounded-xl border border-[#333]">
          <p className="text-gray-400 text-sm mb-1">Quản lý</p>
          <Link href="/user/profile" className="text-yellow-500 hover:underline text-sm">Chỉnh sửa hồ sơ &rarr;</Link>
        </div>
      </div>

      {/* Nạp tiền */}
      <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-3">Nạp tiền</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#121212] p-4 rounded-lg border border-[#222]">
            <p className="text-sm text-gray-200 mb-2 font-semibold">Hướng dẫn</p>
            <p className="text-xs text-gray-400 mb-1">1. Quét mã QR bên dưới</p>
            <p className="text-xs text-gray-400 mb-1">2. Nội dung CK <strong className="text-white">bắt buộc</strong> là: <span className="text-yellow-400 font-semibold">{user.username}</span></p>
            <p className="text-xs text-gray-400 mb-3">3. Gửi yêu cầu, chờ admin duyệt</p>
            <img src="/images/QR.jpg" alt="QR" className="w-full max-w-[220px] rounded-md border border-gray-800" />
          </div>
          <div className="bg-[#121212] p-4 rounded-lg border border-[#222] space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Số tiền (VNĐ)</label>
              <input type="number" value={depositAmount} min={1000} onChange={e => setDepositAmount(Number(e.target.value))}
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded px-3 py-2 text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Nội dung chuyển khoản</label>
              <input value={transferNote} onChange={e => setTransferNote(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded px-3 py-2 text-white" placeholder="Tên đăng nhập" />
            </div>
            <button onClick={handleDeposit} disabled={depositLoading}
              className="w-full bg-yellow-500 text-black font-bold py-2.5 rounded hover:bg-yellow-400 disabled:opacity-50">
              {depositLoading ? 'Đang gửi...' : 'Gửi yêu cầu nạp tiền'}
            </button>
            {depositMsg.text && (
              <p className={`text-xs ${depositMsg.ok ? 'text-green-400' : 'text-red-400'}`}>{depositMsg.text}</p>
            )}
          </div>
        </div>
      </div>

      {/* Ủng hộ Admin */}
      <div className="bg-gradient-to-r from-pink-500/10 via-[#1a1a1a] to-red-500/10 border border-pink-500/20 rounded-xl p-6">
        <div className="flex flex-col md:flex-row items-center gap-5">
          <div className="shrink-0">
            <img src="/images/QR.jpg" alt="QR Ủng hộ" className="w-[180px] rounded-lg border border-gray-700 shadow-lg" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-lg font-bold text-white flex items-center justify-center md:justify-start gap-2">
              <Heart size={20} className="text-pink-500" /> Ủng hộ Admin
            </h3>
            <p className="text-sm text-gray-400 mt-2">
              Nếu bạn thấy website hữu ích, hãy ủng hộ admin để có thêm động lực cập nhật phim mới hàng ngày!
            </p>
            <p className="text-xs text-gray-500 mt-2">Quét mã QR hoặc chuyển khoản theo thông tin bên trên. Mọi đóng góp đều rất ý nghĩa!</p>
            <p className="text-xs text-pink-400 mt-3 font-semibold">Cảm ơn bạn rất nhiều! ♥</p>
          </div>
        </div>
      </div>

      {/* Lịch sử giao dịch */}
      <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-3">Lịch sử giao dịch</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-[#252525] text-xs uppercase">
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
                <tr key={tx.id} className="border-t border-[#333]">
                  <td className="px-3 py-2"><span className="text-xs px-2 py-0.5 rounded bg-green-900 text-green-200">Nạp tiền</span></td>
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
