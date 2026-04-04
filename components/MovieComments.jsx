'use client';
import { useState, useEffect } from 'react';
import { MessageSquare, Send, Star, Trash2, Edit3, X, Check } from 'lucide-react';

export default function MovieComments({ movieSlug, movieName }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [userSession, setUserSession] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editRating, setEditRating] = useState(0);

  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(data => setUserSession(data.user))
      .catch(() => {});
  }, []);

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/comments?movie_slug=${encodeURIComponent(movieSlug)}`);
      const data = await res.json();
      setComments(data.comments || []);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (movieSlug) fetchComments();
  }, [movieSlug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movie_slug: movieSlug, content: content.trim(), rating: rating || null }),
      });
      if (res.ok) {
        setContent('');
        setRating(0);
        fetchComments();
      }
    } catch {}
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Xóa bình luận này?')) return;
    try {
      const res = await fetch(`/api/comments?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchComments();
    } catch {}
  };

  const handleEdit = async (id) => {
    if (!editContent.trim()) return;
    try {
      const res = await fetch('/api/comments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, content: editContent.trim(), rating: editRating || null }),
      });
      if (res.ok) {
        setEditingId(null);
        fetchComments();
      }
    } catch {}
  };

  const startEdit = (comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
    setEditRating(comment.rating || 0);
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} ngày trước`;
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const StarRating = ({ value, onChange, onHover, size = 16, interactive = true }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
        <button
          key={i}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onChange(i === value ? 0 : i)}
          onMouseEnter={() => interactive && onHover?.(i)}
          onMouseLeave={() => interactive && onHover?.(0)}
          className={`transition-colors ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <Star
            size={size}
            className={`${
              i <= (onHover ? (hoverRating || value) : value)
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-600'
            }`}
          />
        </button>
      ))}
    </div>
  );

  return (
    <div className="mt-8 pt-8 border-t border-gray-800">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <MessageSquare size={22} className="text-yellow-500" />
        Bình luận {comments.length > 0 && <span className="text-sm font-normal text-gray-400">({comments.length})</span>}
      </h3>

      {/* Comment Form */}
      {userSession ? (
        <form onSubmit={handleSubmit} className="bg-[#1a1a1a] rounded-xl border border-[#333] p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center text-black font-bold text-sm shrink-0">
              {(userSession.username || 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`Viết bình luận về ${movieName || 'phim này'}...`}
                rows={3}
                className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:border-yellow-500 transition-colors placeholder-gray-500"
              />
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Đánh giá:</span>
                  <StarRating value={rating} onChange={setRating} onHover={setHoverRating} />
                  {rating > 0 && <span className="text-xs text-yellow-400 font-semibold">{rating}/10</span>}
                </div>
                <button
                  type="submit"
                  disabled={submitting || !content.trim()}
                  className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-sm py-2 px-4 rounded-lg transition-colors disabled:opacity-40"
                >
                  <Send size={14} /> {submitting ? 'Đang gửi...' : 'Gửi'}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-4 mb-6 text-center">
          <p className="text-gray-400 text-sm">
            <a href="/login" className="text-yellow-500 hover:underline font-medium">Đăng nhập</a> để bình luận
          </p>
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div className="text-center text-gray-500 py-8">Đang tải bình luận...</div>
      ) : comments.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <MessageSquare size={40} className="mx-auto mb-2 opacity-30" />
          <p>Chưa có bình luận nào. Hãy là người đầu tiên!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map(comment => (
            <div key={comment.id} className="bg-[#1a1a1a] rounded-xl border border-[#333] p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {(comment.username || 'U')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{comment.username}</span>
                    <span className="text-xs text-gray-500">{timeAgo(comment.created_at)}</span>
                    {comment.rating && (
                      <span className="flex items-center gap-0.5 text-xs text-yellow-400">
                        <Star size={11} className="fill-yellow-400" /> {comment.rating}/10
                      </span>
                    )}
                  </div>

                  {editingId === comment.id ? (
                    <div className="mt-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={2}
                        className="w-full bg-[#2a2a2a] border border-gray-600 rounded-lg p-2 text-white text-sm resize-none focus:outline-none focus:border-yellow-500"
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <button onClick={() => handleEdit(comment.id)} className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300">
                          <Check size={14} /> Lưu
                        </button>
                        <button onClick={() => setEditingId(null)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white">
                          <X size={14} /> Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-300 mt-1 whitespace-pre-wrap">{comment.content}</p>
                  )}

                  {/* Edit/Delete for own comments */}
                  {userSession && userSession.username === comment.username && editingId !== comment.id && (
                    <div className="flex items-center gap-3 mt-2">
                      <button onClick={() => startEdit(comment)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-400 transition">
                        <Edit3 size={12} /> Sửa
                      </button>
                      <button onClick={() => handleDelete(comment.id)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 transition">
                        <Trash2 size={12} /> Xóa
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
