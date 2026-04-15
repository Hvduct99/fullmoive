'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

const AD_IMAGE = '/images/background-ad1.jpg';
const AD_LINK = 'https://meiduc.com';

export default function AdOverlay() {
  const [show, setShow] = useState(true);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4"
      onClick={() => window.open(AD_LINK, '_blank')}
    >
      <div className="relative max-w-[520px] w-full cursor-pointer" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setShow(false)}
          className="absolute -top-3 -right-3 z-10 w-8 h-8 bg-black hover:bg-red-600 rounded-full flex items-center justify-center border border-gray-600 transition-colors"
        >
          <X size={16} className="text-white" />
        </button>
        <a href={AD_LINK} target="_blank" rel="noopener noreferrer">
          <img src={AD_IMAGE} alt="" className="w-full rounded-xl shadow-2xl" />
        </a>
      </div>
    </div>
  );
}
