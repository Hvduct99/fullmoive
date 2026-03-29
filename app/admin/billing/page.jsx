'use client';

import { useEffect, useState } from 'react';
import { Check, X, RefreshCcw } from 'lucide-react';

export default function AdminBillingPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/billing');
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error(error);
      setMessage('Không thể tải giao dịch');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransactions(); }, []);

  const handleAction = async (id, action) => {
    setActionLoading(id);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/billing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: id, action })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi');
      setMessage(data.message);
      await fetchTransactions();
    } catch (error) {
      setMessage(error.message || 'Lỗi');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white">Giao dịch & VIP</h2>
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
              <th className="px-4 py-3">Thời điểm</th>
              <th className="px-4 py-3">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" className="px-4 py-6 text-center">Đang tải...</td></tr>
            ) : transactions.length === 0 ? (
              <tr><td colSpan="8" className="px-4 py-6 text-center">Chưa có giao dịch</td></tr>
            ) : transactions.map(tx => (
              <tr key={tx.id} className="border-t border-[#333] hover:bg-[#1e1e1e]">
                <td className="px-4 py-3 text-gray-200">{tx.id}</td>
                <td className="px-4 py-3">{tx.username}</td>
                <td className="px-4 py-3 capitalize">{tx.type}</td>
                <td className="px-4 py-3">{tx.amount.toLocaleString()} đ</td>
                <td className="px-4 py-3">{tx.status}</td>
                <td className="px-4 py-3">{tx.note || '-'}</td>
                <td className="px-4 py-3">{new Date(tx.created_at).toLocaleString('vi-VN')}</td>
                <td className="px-4 py-3 space-x-1">
                  {tx.status === 'pending' && (
                    <>
                      <button onClick={() => handleAction(tx.id, 'approve')} disabled={actionLoading === tx.id} className="px-2 py-1 bg-green-600 rounded hover:bg-green-500 text-xs flex items-center gap-1"><Check size={12} /> Duyệt</button>
                      <button onClick={() => handleAction(tx.id, 'reject')} disabled={actionLoading === tx.id} className="px-2 py-1 bg-red-600 rounded hover:bg-red-500 text-xs flex items-center gap-1"><X size={12} /> Từ chối</button>
                    </>
                  )}
                  {tx.status !== 'pending' && <span className="text-xs text-gray-500 uppercase">Đã xử lý</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={fetchTransactions} className="inline-flex items-center gap-2 px-4 py-2 bg-[#2a2a2a] rounded hover:bg-[#333] text-sm"><RefreshCcw size={14} /> Làm mới</button>
    </div>
  );
}
