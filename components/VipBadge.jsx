'use client';
import { Crown } from 'lucide-react';

export default function VipBadge({ size = 'sm' }) {
  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-0.5',
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-3 py-1 gap-1.5',
  };

  const iconSize = { xs: 10, sm: 12, md: 14 };

  return (
    <span className={`inline-flex items-center bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold rounded-full ${sizeClasses[size]}`}>
      <Crown size={iconSize[size]} />
      VIP
    </span>
  );
}
