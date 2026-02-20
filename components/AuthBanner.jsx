'use client';
import Link from 'next/link';

const AuthBanner = ({ session }) => {
  // Don't show if user is logged in
  if (session) return null;

  return (
    <div className="relative z-20 bg-gradient-to-r from-[#1a1a1a] via-[#222] to-[#1a1a1a] border-y border-gray-800">
      <div className="container mx-auto px-4 py-3 md:py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <div>
            <p className="text-sm md:text-base font-semibold text-white">
              Chào mừng đến GenzMovie! 🎬
            </p>
            <p className="text-xs md:text-sm text-gray-400">
              Đăng nhập để lưu phim yêu thích và nhận đề xuất phim hay
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link 
            href="/login"
            className="text-xs md:text-sm font-medium text-gray-300 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/10 border border-gray-600 hover:border-white/30"
          >
            Đăng nhập
          </Link>
          <Link
            href="/register"
            className="text-xs md:text-sm font-bold bg-yellow-500 text-black px-5 py-2 rounded-full hover:bg-yellow-400 transition-all shadow-md hover:shadow-yellow-500/30 active:scale-95 transform"
          >
            Đăng ký miễn phí
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AuthBanner;
