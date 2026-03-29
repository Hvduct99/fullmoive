'use client';

import { useEffect, useState } from 'react';
import { Check, X, RefreshCcw } from 'lucide-react';

export default function AdminBillingPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState('');

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/billing');
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch { setMessage('Không thể tải giao dịch'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTransactions(); }, []);

  const handleAction = async (id, action) => {
    setActionLoading(id);
    setMessage('');
    try {
      const res = await fetch('/api/admin/billing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: id, action })
      });
      const data = await res.json();
      setMessage(data.message);
      if (res.ok) fetchTransactions();
    } catch { setMessage('Lỗi xử lý'); }
    finally { setActionLoading(null); }
  };

  const statusLabel = (s) => s === 'completed' ? 'Hoàn thành' : s === 'pending' ? 'Chờ duyệt' : 'Từ chối';
  const statusColor = (s) => s === 'completed' ? 'text-green-400' : s === 'pending' ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Giao dịch & VIP</h2>
        <button onClick={fetchTransactions} className="flex items-center gap-2 px-3 py-1.5 bg-[#2a2a2a] rounded hover:bg-[#333] text-sm text-gray-300">
          <RefreshCcw size={14} /> Làm mới
        </button>
      </div>

      {message && <div className="text-sm text-green-300 bg-green-900/20 border border-green-700 rounded p-2">{message}</div>}

      <div className="overflow-x-auto bg-[#1a1a1a] border border-[#333] rounded-lg">
        <table className="w-full text-sm text-left text-gray-300">
          <thead className="bg-[#252525] text-xs uppercase">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Loại</th>
              <th className="px-4 py-3">Số tiền</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Ghi chú</th>
              <th className="px-4 py-3">Thời gian</th>
              <th className="px-4 py-3">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" className="px-4 py-6 text-center">Đang tải...</td></tr>
            ) : transactions.length === 0 ? (
              <tr><td colSpan="8" className="px-4 py-6 text-center text-gray-500">Chưa có giao dịch</td></tr>
            ) : transactions.map(tx => (
              <tr key={tx.id} className="border-t border-[#333] hover:bg-[#1e1e1e]">
                <td className="px-4 py-3">{tx.id}</td>
                <td className="px-4 py-3 text-white font-medium">{tx.username}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${tx.type === 'deposit' ? 'bg-green-900 text-green-200' : 'bg-yellow-900 text-yellow-200'}`}>
                    {tx.type === 'deposit' ? 'Nạp tiền' : 'Mua VIP'}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold">{Number(tx.amount).toLocaleString()} đ</td>
                <td className={`px-4 py-3 ${statusColor(tx.status)}`}>{statusLabel(tx.status)}</td>
                <td className="px-4 py-3 text-gray-400 max-w-[150px] truncate">{tx.note || '-'}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(tx.created_at).toLocaleString('vi-VN')}</td>
                <td className="px-4 py-3">
                  {tx.status === 'pending' ? (
                    <div className="flex gap-1">
                      <button onClick={() => handleAction(tx.id, 'approve')} disabled={actionLoading === tx.id}
                        className="px-2 py-1 bg-green-600 rounded hover:bg-green-500 text-xs flex items-center gap-1 text-white">
                        <Check size={12} /> Duyệt
                      </button>
                      <button onClick={() => handleAction(tx.id, 'reject')} disabled={actionLoading === tx.id}
                        className="px-2 py-1 bg-red-600 rounded hover:bg-red-500 text-xs flex items-center gap-1 text-white">
                        <X size={12} /> Từ chối
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500">Đã xử lý</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
