import Link from 'next/link';
import { MessageCircle } from 'lucide-react';

export default function ZaloFloatingButton() {
  return (
    <Link
      href="/zalo"
      aria-label="Tham gia nhóm Zalo GenzMovie"
      className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[110] flex items-center gap-2 bg-[#0068FF] hover:bg-[#0052cc] text-white rounded-full shadow-lg shadow-black/40 px-4 py-3 transition-colors"
    >
      <MessageCircle size={22} fill="white" />
      <span className="text-sm font-semibold">Nhóm Zalo</span>
    </Link>
  );
}
