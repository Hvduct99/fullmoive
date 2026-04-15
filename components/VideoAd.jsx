'use client';

import { useState } from 'react';
import { X, Volume2, VolumeX } from 'lucide-react';

const AD_VIDEO = '/videos/videoads1-Pic.mp4';
const AD_LINK = 'https://meiduc.com';

export default function VideoAd() {
  const [visible, setVisible] = useState(true);
  const [muted, setMuted] = useState(true);

  if (!visible) return null;

  return (
    <div className="fixed left-2 bottom-20 md:bottom-4 z-50 w-[180px] md:w-[220px] group">
      <button
        onClick={() => setVisible(false)}
        className="absolute -top-2 -right-2 z-10 w-6 h-6 bg-black/80 hover:bg-red-600 rounded-full flex items-center justify-center border border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X size={12} className="text-white" />
      </button>
      <a href={AD_LINK} target="_blank" rel="noopener noreferrer" className="block">
        <video
          src={AD_VIDEO}
          autoPlay
          loop
          muted={muted}
          playsInline
          className="w-full rounded-lg shadow-xl border border-gray-700 cursor-pointer"
        />
      </a>
      <button
        onClick={() => setMuted(!muted)}
        className="absolute bottom-2 right-2 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {muted ? <VolumeX size={12} className="text-white" /> : <Volume2 size={12} className="text-white" />}
      </button>
    </div>
  );
}
