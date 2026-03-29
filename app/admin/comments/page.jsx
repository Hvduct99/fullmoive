'use client';

import { useEffect, useState } from 'react';
import { Trash2, Edit, EyeOff, Check } from 'lucide-react';

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
    } catch (error) {
      setMessage('Lỗi tải bình luận');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchComments(); }, []);

  const updateComment = async (id, status) => {
    try {
      const res = await fetch('/api/admin/comments', {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ id, status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi');
      setMessage(data.message);
      fetchComments();
    } catch (error) {
      setMessage(error.message || 'Lỗi');
    }
  };

  const deleteComment = async (id) => {
    try {
      const res = await fetch(`/api/admin/comments?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi');
      setMessage(data.message);
      fetchComments();
    } catch (error) {
      setMessage(error.message || 'Lỗi');
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white">Bình luận / Đánh giá</h2>
      {message && <div className="p-2 rounded bg-blue-800 text-blue-200">{message}</div>}
      <div className="overflow-x-auto bg-[#1a1a1a] border border-[#333] rounded-lg">
        <table className="w-full text-gray-300 text-sm">
          <thead className="bg-[#252525] uppercase text-xs">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">Phim</th>
              <th className="px-4 py-2">Nội dung</th>
              <th className="px-4 py-2">Rating</th>
              <th className="px-4 py-2">Trạng thái</th>
              <th className="px-4 py-2">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="text-center p-4">Đang tải...</td></tr>
            ) : comments.length === 0 ? (
              <tr><td colSpan="7" className="text-center p-4">Chưa có bình luận.</td></tr>
            ) : comments.map(comment => (
              <tr key={comment.id} className="border-t border-[#333] hover:bg-[#1e1e1e]">
                <td className="px-4 py-2">{comment.id}</td>
                <td className="px-4 py-2">{comment.username}</td>
                <td className="px-4 py-2">{comment.movie_slug}</td>
                <td className="px-4 py-2 max-w-[300px] truncate">{comment.content}</td>
                <td className="px-4 py-2">{comment.rating ?? '-'} </td>
                <td className="px-4 py-2">{comment.status}</td>
                <td className="px-4 py-2 flex gap-1 items-center">
                  {comment.status === 'visible' ? 
                    <button onClick={() => updateComment(comment.id, 'hidden')} className="p-1 rounded bg-yellow-500 text-black" title="Ẩn"><EyeOff size={14} /></button>
                    : <button onClick={() => updateComment(comment.id, 'visible')} className="p-1 rounded bg-green-500 text-black" title="Hiện"><Check size={14} /></button>
                  }
                  <button onClick={() => deleteComment(comment.id)} className="p-1 rounded bg-red-600" title="Xóa"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
