'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const AD_CONFIG = {
  image: '/images/background-ad1.jpg',
  link: 'https://meiduc.com',
  cooldownMs: 30 * 60 * 1000, // 30 phút mới hiện lại
};

export default function AdOverlay() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const lastClosed = localStorage.getItem('ad_closed_at');
    if (lastClosed && Date.now() - Number(lastClosed) < AD_CONFIG.cooldownMs) return;
    setShow(true);
  }, []);

  const close = (e) => {
    e.stopPropagation();
    localStorage.setItem('ad_closed_at', String(Date.now()));
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => window.open(AD_CONFIG.link, '_blank')}>
      <div className="relative max-w-[600px] w-[90vw] cursor-pointer">
        <button
          onClick={close}
          className="absolute -top-3 -right-3 z-10 w-8 h-8 bg-black/80 hover:bg-red-600 rounded-full flex items-center justify-center border border-gray-600 transition-colors"
          aria-label="Đóng"
        >
          <X size={16} className="text-white" />
        </button>
        <img
          src={AD_CONFIG.image}
          alt="Quảng cáo"
          className="w-full rounded-xl shadow-2xl border border-gray-700"
        />
      </div>
    </div>
  );
}
