'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';

const AuthBanner = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(true); // default true to avoid flash

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        setIsLoggedIn(!!data.user);
      } catch {
        setIsLoggedIn(false);
      }
    };
    check();
  }, []);

  if (isLoggedIn) return null;

  return (
    <>
      {/* Top Banner - below hero */}
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
    </>
  );
};

// Bottom CTA - large section at the end of the page
export const AuthBottomCTA = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        setIsLoggedIn(!!data.user);
      } catch {
        setIsLoggedIn(false);
      }
    };
    check();
  }, []);

  if (isLoggedIn) return null;

  return (
    <div className="relative z-10 mt-12 mb-8">
      <div className="mx-auto max-w-4xl px-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-500/10 via-[#1a1a2e] to-purple-500/10 border border-gray-700/50 p-8 md:p-12 text-center">
          {/* Background glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <div className="text-4xl md:text-5xl mb-4">🍿</div>
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-white mb-3">
              Tham gia GenzMovie ngay hôm nay!
            </h2>
            <p className="text-sm md:text-base text-gray-400 max-w-lg mx-auto mb-6 leading-relaxed">
              Tạo tài khoản miễn phí để lưu danh sách phim yêu thích, nhận đề xuất cá nhân hóa và trải nghiệm xem phim tốt nhất.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-8 py-3 rounded-full transition-all shadow-lg hover:shadow-yellow-500/30 active:scale-95 transform text-sm md:text-base"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                </svg>
                Đăng ký miễn phí
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-gray-300 hover:text-white font-medium px-6 py-3 rounded-full border border-gray-600 hover:border-white/40 hover:bg-white/5 transition-all text-sm md:text-base"
              >
                Đã có tài khoản? Đăng nhập
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthBanner;
