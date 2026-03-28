// VIP membership helper functions
// Defines which content is VIP-only and checks user VIP status

// Thể loại chỉ dành cho VIP
export const VIP_CATEGORIES = [
  'kinh-di',    // Horror
  'hanh-dong',  // Action  
];

// Slug danh sách VIP
export const VIP_LIST_SLUGS = ['netflix'];

// Keyword trong tên phim → VIP
export const VIP_KEYWORDS = ['netflix'];

function getExpireDate(user) {
  return user?.vip_expire_at || user?.vipExpireAt || null;
}

/**
 * Kiểm tra phim có phải nội dung VIP không
 * Dựa vào thể loại (category) của phim
 */
export function isVipMovie(movie) {
  if (!movie) return false;

  // Check categories
  if (movie.category) {
    const cats = Array.isArray(movie.category) ? movie.category : [];
    for (const cat of cats) {
      const slug = cat.slug || '';
      if (VIP_CATEGORIES.includes(slug)) return true;
    }
  }

  // Check by name keywords (Netflix)
  const name = (movie.name || '').toLowerCase();
  const originName = (movie.origin_name || '').toLowerCase();
  for (const kw of VIP_KEYWORDS) {
    if (name.includes(kw) || originName.includes(kw)) return true;
  }

  return false;
}

/**
 * Kiểm tra user có phải VIP active không
 */
export function isUserVip(user) {
  if (!user) return false;
  
  // Admin luôn có quyền VIP
  if (user.role === 'admin' || user.role === 'moderator') return true;
  
  // Check role VIP + chưa hết hạn
  if (user.role === 'vip') {
    const expireAt = getExpireDate(user);
    if (!expireAt) return true; // VIP vĩnh viễn
    return new Date(expireAt) > new Date();
  }
  
  return false;
}

export function getUserVipState(user) {
  const expireAt = getExpireDate(user);
  const isPrivileged = user?.role === 'admin' || user?.role === 'moderator';
  const isVipRole = user?.role === 'vip';
  const vipExpired = Boolean(isVipRole && expireAt && new Date(expireAt) <= new Date());
  const isVip = isPrivileged || (isVipRole && !vipExpired);

  return {
    isVip,
    isPrivileged,
    vipExpired,
    vipExpireAt: expireAt,
    membershipLabel: isPrivileged ? 'Quản trị viên' : isVip ? 'VIP Premium' : vipExpired ? 'VIP đã hết hạn' : 'Thành viên thường',
  };
}

export function withVipMeta(movie) {
  if (!movie) return movie;

  return {
    ...movie,
    isVip: isVipMovie(movie),
  };
}

/**
 * Lấy label VIP cho thể loại
 */
export function getVipCategoryLabel(slug) {
  const labels = {
    'kinh-di': 'Kinh Dị',
    'hanh-dong': 'Hành Động',
  };
  return labels[slug] || slug;
}
