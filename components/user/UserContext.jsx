'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getFaction } from '@/lib/membership';
import TopupModal from './TopupModal';

const UserCtx = createContext(null);

/**
 * Nguồn dữ liệu đăng nhập DUY NHẤT cho toàn bộ khu /user.
 * User được server layout đọc từ cookie + DB rồi truyền xuống → không còn cảnh
 * sidebar/dashboard tự fetch riêng và lệch nhau (lúc có lúc không).
 */
export function UserProvider({ initialUser, serverTime, children }) {
  const [user, setUser] = useState(initialUser);
  const [topup, setTopup] = useState({ open: false, tab: 'pass', planId: null });
  // Bù lệch đồng hồ giữa máy người dùng và server → đếm ngày hết hạn chính xác
  const offsetRef = useRef(serverTime ? new Date(serverTime).getTime() - Date.now() : 0);
  const [tick, setTick] = useState(0);

  const now = useCallback(() => Date.now() + offsetRef.current, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/user/profile', { cache: 'no-store' });
      if (res.status === 401) {
        window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname);
        return null;
      }
      if (!res.ok) return null;
      const data = await res.json();
      if (data.serverTime) offsetRef.current = new Date(data.serverTime).getTime() - Date.now();
      if (data.user) setUser(data.user);
      return data.user;
    } catch {
      return null;
    }
  }, []);

  // Đồng bộ lại khi quay lại tab + cập nhật đồng hồ mỗi phút
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    const t = setInterval(() => setTick((x) => x + 1), 60 * 1000);
    return () => { document.removeEventListener('visibilitychange', onVisible); clearInterval(t); };
  }, [refresh]);

  const openTopup = useCallback((tab = 'pass', planId = null) => setTopup({ open: true, tab, planId }), []);
  const closeTopup = useCallback(() => setTopup((s) => ({ ...s, open: false })), []);

  const faction = getFaction(user?.faction);

  const value = useMemo(
    () => ({ user, setUser, refresh, now, faction, openTopup, closeTopup, tick }),
    [user, refresh, now, faction, openTopup, closeTopup, tick]
  );

  const themeStyle = {
    '--fx': faction.accent,
    '--fx-rgb': faction.accentRgb,
    '--fx2': faction.accent2,
    '--fx2-rgb': faction.accent2Rgb,
  };

  return (
    <UserCtx.Provider value={value}>
      <div className="gz-scope" style={themeStyle} data-faction={faction.id}>
        {children}
        {topup.open && <TopupModal initialTab={topup.tab} initialPlanId={topup.planId} onClose={closeTopup} />}
      </div>
    </UserCtx.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserCtx);
  if (!ctx) throw new Error('useUser must be used inside <UserProvider>');
  return ctx;
}
