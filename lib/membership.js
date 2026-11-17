// Cấu hình hội viên dùng chung cho server + client (KHÔNG import module server ở đây).

export const DAY_MS = 24 * 60 * 60 * 1000;

export const PLANS = [
  { id: '1m', label: '1 Tháng', days: 30, price: 49000, tag: null, perk: 'Khởi động nhẹ nhàng' },
  { id: '3m', label: '3 Tháng', days: 90, price: 125000, tag: 'Tiết kiệm 15%', perk: 'Cày bền, giá mềm' },
  { id: '1y', label: '1 Năm', days: 365 + 60, price: 490000, tag: 'Trùm cuối', perk: 'Tặng kèm 2 tháng' },
];

export const TOPUP_AMOUNTS = [50000, 100000, 200000, 500000];
export const MIN_TOPUP = 10000;
export const MAX_TOPUP = 10000000;

export const LOW_ENERGY_DAYS = 3;

export const FACTIONS = {
  boiz: {
    id: 'boiz',
    name: 'GenBoiz',
    badge: 'GENBOIZ',
    emoji: '⚡',
    pass: 'GenBoiz Pass',
    accent: '#22d3ee',
    accentRgb: '34 211 238',
    accent2: '#3b82f6',
    accent2Rgb: '59 130 246',
    lowEnergy: 'Bro ơi, pin sắp cạn rồi! Sạc nhẹ để giữ phong độ chiến thần nào ⚡',
    expired: 'Bro ơi, năng lượng đã về 0. Kích hoạt lại để quay về đường đua!',
    cta: 'Kích hoạt ngay',
    renewCta: 'Giữ vững phong độ',
  },
  girlz: {
    id: 'girlz',
    name: 'GenGirlz',
    badge: 'GENGIRLZ',
    emoji: '💖',
    pass: 'GenGirlz Pass',
    accent: '#ff2d95',
    accentRgb: '255 45 149',
    accent2: '#c026d3',
    accent2Rgb: '192 38 211',
    lowEnergy: 'Bestie ơi, huy hiệu sắp bay màu, nạp nhẹ để giữ độ slay nào! 💅',
    expired: 'Bestie ơi, huy hiệu đã bay màu mất rồi. Nạp lại để slay tiếp nha!',
    cta: 'Slay ngay',
    renewCta: 'Giữ độ slay',
  },
};

export function getFaction(id) {
  return FACTIONS[id] || FACTIONS.boiz;
}

export function getPlan(id) {
  return PLANS.find((p) => p.id === id) || null;
}

export const TIERS = [
  { level: 0, name: 'Tân Binh', minDays: 0 },
  { level: 1, name: 'Hội Viên', minDays: 1 },
  { level: 2, name: 'Chiến Thần', minDays: 90 },
  { level: 3, name: 'Huyền Thoại', minDays: 365 },
];

/** Trạng thái năng lượng (thời hạn Pass) tính từ dữ liệu user. */
export function getEnergy(user, now = Date.now()) {
  const exp = user?.pass_expires_at ? new Date(user.pass_expires_at).getTime() : 0;
  const msLeft = Math.max(0, exp - now);
  const active = msLeft > 0;
  // Làm tròn XUỐNG để không bao giờ hiển thị nhiều hơn thời gian thực còn lại
  const daysLeft = active ? Math.floor(msLeft / DAY_MS) : 0;
  const remHours = active ? Math.floor((msLeft % DAY_MS) / (60 * 60 * 1000)) : 0;
  // 1 thanh đầy = 30 ngày; vượt quá thì hiển thị số "bình" dự trữ
  const percent = active ? Math.max(3, Math.min(100, (msLeft / (30 * DAY_MS)) * 100)) : 0;
  const reserve = active ? Math.floor(msLeft / (30 * DAY_MS)) : 0;
  return {
    active,
    daysLeft,
    hoursLeft: active ? Math.ceil(msLeft / (60 * 60 * 1000)) : 0,
    percent,
    reserve,
    low: active && msLeft < LOW_ENERGY_DAYS * DAY_MS,
    expiresAt: exp ? new Date(exp) : null,
    label: !active
      ? 'Hết năng lượng'
      : daysLeft === 0
        ? `${Math.max(1, Math.ceil(msLeft / (60 * 60 * 1000)))} giờ`
        : daysLeft < LOW_ENERGY_DAYS && remHours > 0
          ? `${daysLeft} ngày ${remHours} giờ`
          : `${daysLeft} ngày`,
  };
}

export function getTier(user, now = Date.now()) {
  const { active } = getEnergy(user, now);
  if (!active) return TIERS[0];
  const total = Number(user?.pass_total_days || 0);
  let tier = TIERS[1];
  for (const t of TIERS) if (t.level > 0 && total >= t.minDays) tier = t;
  return tier;
}

export function formatVnd(n) {
  return `${Number(n || 0).toLocaleString('vi-VN')}đ`;
}

export function formatK(n) {
  const v = Number(n || 0);
  return v >= 1000 ? `${v / 1000}k` : String(v);
}
