'use client';

import { useEffect, useState } from 'react';
import { Trash2, EyeOff, Eye, RefreshCcw } from 'lucide-react';

export default function AdminCommentsPage() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/comments');
      const data = await res.json();
      setComments(data.comments || []);
    } catch { setMessage('Lỗi tải bình luận'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchComments(); }, []);

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'visible' ? 'hidden' : 'visible';
    try {
      const res = await fetch('/api/admin/comments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });
      const data = await res.json();
      setMessage(data.message);
      if (res.ok) fetchComments();
    } catch { setMessage('Lỗi cập nhật'); }
  };

  const deleteComment = async (id) => {
    if (!confirm('Xóa bình luận này?')) return;
    try {
      const res = await fetch(`/api/admin/comments?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      setMessage(data.message);
      if (res.ok) fetchComments();
    } catch { setMessage('Lỗi xóa'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Bình luận / Đánh giá</h2>
        <button onClick={fetchComments} className="flex items-center gap-2 px-3 py-1.5 bg-[#2a2a2a] rounded hover:bg-[#333] text-sm text-gray-300">
          <RefreshCcw size={14} /> Làm mới
        </button>
      </div>

      {message && <div className="p-2 rounded bg-blue-900/30 text-blue-200 text-sm">{message}</div>}

      <div className="overflow-x-auto bg-[#1a1a1a] border border-[#333] rounded-lg">
        <table className="w-full text-gray-300 text-sm">
          <thead className="bg-[#252525] uppercase text-xs">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Phim</th>
              <th className="px-4 py-3">Nội dung</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Ngày</th>
              <th className="px-4 py-3">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" className="text-center py-6">Đang tải...</td></tr>
            ) : comments.length === 0 ? (
              <tr><td colSpan="8" className="text-center py-6 text-gray-500">Chưa có bình luận</td></tr>
            ) : comments.map(c => (
              <tr key={c.id} className="border-t border-[#333] hover:bg-[#1e1e1e]">
                <td className="px-4 py-3">{c.id}</td>
                <td className="px-4 py-3 text-white font-medium">{c.username}</td>
                <td className="px-4 py-3 text-gray-400">{c.movie_slug || '-'}</td>
                <td className="px-4 py-3 max-w-[250px] truncate">{c.content}</td>
                <td className="px-4 py-3">{c.rating ?? '-'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${c.status === 'visible' ? 'bg-green-900 text-green-200' : 'bg-gray-700 text-gray-300'}`}>
                    {c.status === 'visible' ? 'Hiện' : 'Ẩn'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{new Date(c.created_at).toLocaleDateString('vi-VN')}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => toggleStatus(c.id, c.status)}
                      className={`p-1.5 rounded ${c.status === 'visible' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-500'}`}
                      title={c.status === 'visible' ? 'Ẩn' : 'Hiện'}>
                      {c.status === 'visible' ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button onClick={() => deleteComment(c.id)} className="p-1.5 rounded bg-red-500/20 text-red-400" title="Xóa">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
