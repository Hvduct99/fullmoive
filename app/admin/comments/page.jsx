'use client';

import { useEffect, useState } from 'react';
import { Trash2, EyeOff, Eye, RefreshCcw, Search, X, Pencil, Save, Star, MessageSquare, Filter } from 'lucide-react';

export default function AdminCommentsPage() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Filters & pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [movieFilter, setMovieFilter] = useState('');

  // Edit modal
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({ content: '', rating: '', status: '', movie_slug: '' });
  const [editLoading, setEditLoading] = useState(false);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // View expanded
  const [expandedId, setExpandedId] = useState(null);

  const fetchComments = () => {
    setLoading(true);
    let url = `/api/admin/comments?page=${page}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (statusFilter) url += `&status=${statusFilter}`;
    if (movieFilter) url += `&movie=${encodeURIComponent(movieFilter)}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setComments(data.comments || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(() => { showMsg('Lỗi tải bình luận', 'error'); setLoading(false); });
  };

  useEffect(() => {
    const timeout = setTimeout(fetchComments, 300);
    return () => clearTimeout(timeout);
  }, [page, search, statusFilter, movieFilter]);

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  // Toggle visibility
  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'visible' ? 'hidden' : 'visible';
    try {
      const res = await fetch('/api/admin/comments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });
      const data = await res.json();
      showMsg(data.message, res.ok ? 'success' : 'error');
      if (res.ok) fetchComments();
    } catch { showMsg('Lỗi cập nhật', 'error'); }
  };

  // Open edit modal
  const openEdit = (comment) => {
    setEditModal(comment);
    setEditForm({
      content: comment.content || '',
      rating: comment.rating ?? '',
      status: comment.status || 'visible',
      movie_slug: comment.movie_slug || '',
    });
  };

  // Save edit
  const handleEditSave = async () => {
    if (!editForm.content.trim()) { showMsg('Nội dung không được trống', 'error'); return; }
    setEditLoading(true);
    try {
      const res = await fetch('/api/admin/comments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editModal.id,
          content: editForm.content,
          rating: editForm.rating === '' ? null : Number(editForm.rating),
          status: editForm.status,
          movie_slug: editForm.movie_slug,
        })
      });
      const data = await res.json();
      showMsg(data.message, res.ok ? 'success' : 'error');
      if (res.ok) { setEditModal(null); fetchComments(); }
    } catch { showMsg('Lỗi cập nhật', 'error'); }
    finally { setEditLoading(false); }
  };

  // Delete comment
  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/admin/comments?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      showMsg(data.message, res.ok ? 'success' : 'error');
      if (res.ok) fetchComments();
    } catch { showMsg('Lỗi xóa', 'error'); }
    finally { setDeleteConfirm(null); }
  };

  const renderStars = (rating) => {
    if (!rating && rating !== 0) return <span className="text-gray-600">-</span>;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <Star key={i} size={12} className={i <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-600'} />
        ))}
        <span className="text-xs text-gray-400 ml-1">{rating}/5</span>
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare size={24} className="text-yellow-500" /> Quản lý Bình luận
          </h2>
          <p className="text-sm text-gray-500 mt-1">Tổng cộng: {total} bình luận</p>
        </div>
        <button onClick={fetchComments}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#2a2a2a] rounded-lg hover:bg-[#333] text-sm text-gray-300">
          <RefreshCcw size={14} /> Làm mới
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input type="text" placeholder="Tìm theo username hoặc nội dung..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="bg-[#2a2a2a] text-white pl-9 pr-4 py-2 rounded-lg border border-[#333] text-sm w-[280px]" />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input type="text" placeholder="Lọc theo slug phim..." value={movieFilter}
            onChange={(e) => { setMovieFilter(e.target.value); setPage(1); }}
            className="bg-[#2a2a2a] text-white pl-9 pr-4 py-2 rounded-lg border border-[#333] text-sm w-[200px]" />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-[#2a2a2a] text-white px-3 py-2 rounded-lg border border-[#333] text-sm">
          <option value="">Tất cả trạng thái</option>
          <option value="visible">Hiển thị</option>
          <option value="hidden">Đã ẩn</option>
        </select>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`mb-4 p-3 rounded-lg text-sm flex items-center justify-between ${message.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage({ text: '', type: '' })}><X size={14} /></button>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#1a1a1a] rounded-lg border border-[#333] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-gray-300">
            <thead className="bg-[#252525] uppercase text-xs">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Phim</th>
                <th className="px-4 py-3">Nội dung</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Ngày tạo</th>
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
                  <td className="px-4 py-3 text-gray-500">{c.id}</td>
                  <td className="px-4 py-3">
                    <span className="text-white font-medium">{c.username}</span>
                  </td>
                  <td className="px-4 py-3">
                    {c.movie_slug ? (
                      <a href={`/phim/${c.movie_slug}`} target="_blank" className="text-yellow-500 hover:underline text-xs">{c.movie_slug}</a>
                    ) : <span className="text-gray-600">-</span>}
                  </td>
                  <td className="px-4 py-3 max-w-[300px]">
                    <div className={expandedId === c.id ? '' : 'line-clamp-2'}>
                      <p className="text-gray-200 text-sm whitespace-pre-wrap">{c.content}</p>
                    </div>
                    {c.content && c.content.length > 100 && (
                      <button onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                        className="text-xs text-yellow-500 hover:underline mt-1">
                        {expandedId === c.id ? 'Thu gọn' : 'Xem thêm'}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">{renderStars(c.rating)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${c.status === 'visible' ? 'bg-green-900 text-green-200' : 'bg-gray-700 text-gray-300'}`}>
                      {c.status === 'visible' ? 'Hiện' : 'Ẩn'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(c.created_at).toLocaleString('vi-VN')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(c)}
                        className="p-1.5 rounded bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30" title="Chỉnh sửa">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => toggleStatus(c.id, c.status)}
                        className={`p-1.5 rounded ${c.status === 'visible' ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30' : 'bg-green-500/20 text-green-500 hover:bg-green-500/30'}`}
                        title={c.status === 'visible' ? 'Ẩn bình luận' : 'Hiện bình luận'}>
                        {c.status === 'visible' ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button onClick={() => setDeleteConfirm(c)} className="p-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30" title="Xóa">
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

      {/* Pagination */}
      <div className="mt-4 flex justify-between items-center">
        <span className="text-sm text-gray-500">Hiển thị {comments.length} / {total} bình luận</span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 bg-[#2a2a2a] text-white rounded text-sm disabled:opacity-50">Previous</button>
          <span className="px-3 py-1.5 text-gray-400 text-sm">Trang {page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 bg-[#2a2a2a] text-white rounded text-sm disabled:opacity-50">Next</button>
        </div>
      </div>

      {/* ===== EDIT MODAL ===== */}
      {editModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setEditModal(null)}>
          <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Chỉnh sửa Bình luận #{editModal.id}</h3>
              <button onClick={() => setEditModal(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              {/* Info */}
              <div className="flex items-center gap-3 pb-3 border-b border-[#333]">
                <div className="w-8 h-8 rounded-full bg-[#333] text-white flex items-center justify-center font-bold text-sm">
                  {(editModal.username || '?')[0].toUpperCase()}
                </div>
                <div>
                  <span className="text-white font-medium text-sm">{editModal.username}</span>
                  <span className="text-gray-500 text-xs ml-2">{new Date(editModal.created_at).toLocaleString('vi-VN')}</span>
                </div>
              </div>

              {/* Movie slug */}
              <div>
                <label className="block text-gray-400 text-xs mb-1.5">Slug phim</label>
                <input type="text" value={editForm.movie_slug} onChange={e => setEditForm({ ...editForm, movie_slug: e.target.value })}
                  placeholder="VD: avengers-endgame"
                  className="w-full bg-[#252525] border border-[#444] rounded-lg p-2.5 text-white text-sm focus:border-yellow-500 focus:outline-none" />
              </div>

              {/* Content */}
              <div>
                <label className="block text-gray-400 text-xs mb-1.5">Nội dung bình luận</label>
                <textarea value={editForm.content} onChange={e => setEditForm({ ...editForm, content: e.target.value })}
                  rows={5}
                  className="w-full bg-[#252525] border border-[#444] rounded-lg p-2.5 text-white text-sm focus:border-yellow-500 focus:outline-none resize-y" />
              </div>

              {/* Rating & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-xs mb-1.5">Rating (1-5, để trống nếu không có)</label>
                  <div className="flex items-center gap-2">
                    <input type="number" min="1" max="5" value={editForm.rating}
                      onChange={e => setEditForm({ ...editForm, rating: e.target.value })}
                      placeholder="-"
                      className="w-20 bg-[#252525] border border-[#444] rounded-lg p-2.5 text-white text-sm focus:border-yellow-500 focus:outline-none" />
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(i => (
                        <button key={i} type="button" onClick={() => setEditForm({ ...editForm, rating: i })}
                          className="p-0.5 hover:scale-125 transition-transform">
                          <Star size={16} className={i <= (editForm.rating || 0) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-600'} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1.5">Trạng thái</label>
                  <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full bg-[#252525] border border-[#444] rounded-lg p-2.5 text-white text-sm focus:border-yellow-500 focus:outline-none">
                    <option value="visible">Hiển thị</option>
                    <option value="hidden">Ẩn</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-[#333] flex gap-3">
                <button onClick={handleEditSave} disabled={editLoading}
                  className="flex-1 flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2.5 rounded-lg text-sm disabled:opacity-50">
                  {editLoading ? 'Đang lưu...' : <><Save size={14} /> Lưu thay đổi</>}
                </button>
                <button onClick={() => setEditModal(null)}
                  className="px-6 py-2.5 bg-[#333] text-gray-300 rounded-lg hover:bg-[#444] text-sm">Hủy</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== DELETE CONFIRM MODAL ===== */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-[#1a1a1a] border border-red-500/30 rounded-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-red-400 mb-3 flex items-center gap-2">
              <Trash2 size={20} /> Xác nhận xóa Bình luận
            </h3>
            <div className="bg-[#252525] rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-500 mb-1">Bình luận của <strong className="text-white">{deleteConfirm.username}</strong>:</p>
              <p className="text-sm text-gray-300 line-clamp-3">{deleteConfirm.content}</p>
            </div>
            <p className="text-red-400 text-xs mb-6">Hành động này không thể hoàn tác.</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteConfirm.id)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-lg text-sm">
                Xóa bình luận
              </button>
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-[#333] text-gray-300 rounded-lg hover:bg-[#444] text-sm">Hủy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
