'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Loader2, Menu, X, ChevronDown, User, LogOut, Shield, LayoutDashboard, UserCircle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useLanguage } from './LanguageContext';
import { useRouter } from 'next/navigation';

const Header = () => {
  const { lang, toggleLang, t } = useLanguage();
  const [query, setQuery] = useState('');
  const [mobileQuery, setMobileQuery] = useState('');
  const [results, setResults] = useState([]);
  const [mobileResults, setMobileResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mobileLoading, setMobileLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showMobileResults, setShowMobileResults] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isGenreOpen, setIsGenreOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const searchRef = useRef(null);
  const userMenuRef = useRef(null);
  const router = useRouter();
  
  const [userSession, setUserSession] = useState(null);

  // Client-side session check
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data.user) {
          setUserSession({ userId: data.user.id, role: data.user.role });
        } else {
          setUserSession(null);
        }
      } catch (err) {
        // keep initial
      }
    };
    checkSession();
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMenuOpen]);

  const genres = [
    { slug: 'hanh-dong', name: { vi: 'Hành Động', en: 'Action' } },
    { slug: 'tinh-cam', name: { vi: 'Tình Cảm', en: 'Romance' } },
    { slug: 'hai-huoc', name: { vi: 'Hài Hước', en: 'Comedy' } },
    { slug: 'co-trang', name: { vi: 'Cổ Trang', en: 'Historical' } },
    { slug: 'tam-ly', name: { vi: 'Tâm Lý', en: 'Psychological' } },
    { slug: 'hinh-su', name: { vi: 'Hình Sự', en: 'Crime' } },
    { slug: 'chien-tranh', name: { vi: 'Chiến Tranh', en: 'War' } },
    { slug: 'the-thao', name: { vi: 'Thể Thao', en: 'Sports' } },
    { slug: 'vo-thuat', name: { vi: 'Võ Thuật', en: 'Martial Arts' } },
    { slug: 'vien-tuong', name: { vi: 'Viễn Tưởng', en: 'Sci-Fi' } },
    { slug: 'phieu-luu', name: { vi: 'Phiêu Lưu', en: 'Adventure' } },
    { slug: 'khoa-hoc', name: { vi: 'Khoa Học', en: 'Science' } },
    { slug: 'kinh-di', name: { vi: 'Kinh Dị', en: 'Horror' } },
    { slug: 'am-nhac', name: { vi: 'Âm Nhạc', en: 'Music' } },
    { slug: 'than-thoai', name: { vi: 'Thần Thoại', en: 'Mythology' } },
    { slug: 'tai-lieu', name: { vi: 'Tài Liệu', en: 'Documentary' } },
    { slug: 'gia-dinh', name: { vi: 'Gia Đình', en: 'Family' } },
    { slug: 'chinh-kich', name: { vi: 'Chính Kịch', en: 'Drama' } },
    { slug: 'bi-an', name: { vi: 'Bí Ẩn', en: 'Mystery' } },
    { slug: 'hoc-duong', name: { vi: 'Học Đường', en: 'School' } },
  ];

  // Desktop search
  useEffect(() => {
    const fetchMovies = async () => {
      if (!query.trim()) { setResults([]); return; }
      setLoading(true);
      try {
        const res = await fetch(`/api/search?keyword=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.status === 'success') setResults(data.data);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };
    const debounce = setTimeout(() => {
      if (query.trim()) fetchMovies();
      else setResults([]);
    }, 500);
    return () => clearTimeout(debounce);
  }, [query]);

  // Mobile search
  useEffect(() => {
    const fetchMovies = async () => {
      if (!mobileQuery.trim()) { setMobileResults([]); return; }
      setMobileLoading(true);
      try {
        const res = await fetch(`/api/search?keyword=${encodeURIComponent(mobileQuery)}`);
        const data = await res.json();
        if (data.status === 'success') setMobileResults(data.data);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setMobileLoading(false);
      }
    };
    const debounce = setTimeout(() => {
      if (mobileQuery.trim()) fetchMovies();
      else setMobileResults([]);
    }, 500);
    return () => clearTimeout(debounce);
  }, [mobileQuery]);

  const handleMovieClick = (slug) => {
    setShowResults(false);
    setShowMobileResults(false);
    setQuery('');
    setMobileQuery('');
    setIsMenuOpen(false);
    router.push(`/phim/${slug}`);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    setIsGenreOpen(false);
    setMobileQuery('');
    setMobileResults([]);
    setShowMobileResults(false);
  };

  const navLinks = [
    { href: '/', label: t.home, type: 'link' },
    { label: lang === 'vi' ? 'Thể Loại' : 'Genres', type: 'dropdown', items: genres },
    { href: '/danh-sach/phim-le', label: lang === 'vi' ? 'Phim Lẻ' : 'Movies', type: 'link' },
    { href: '/danh-sach/phim-bo', label: lang === 'vi' ? 'Phim Bộ' : 'Series', type: 'link' },
    { href: '/danh-sach/hoat-hinh', label: lang === 'vi' ? 'Hoạt Hình' : 'Anime', type: 'link' },
    { href: '/danh-sach/phim-chieu-rap', label: t.theatrical, type: 'link' },
  ];

  // Search results renderer (shared between desktop and mobile)
  const renderSearchResults = (searchResults, isLoading, searchQuery, isMobile = false) => (
    <div className={`${isMobile ? 'mt-2 rounded-lg' : 'absolute top-full right-0 mt-2 w-[350px] rounded-lg'} bg-gray-900 border border-gray-700 overflow-hidden max-h-[350px] overflow-y-auto z-50 shadow-2xl`}>
      {isLoading ? (
        <div className="p-4 text-center text-gray-400 text-sm flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin" /> Đang tìm...
        </div>
      ) : searchResults.length > 0 ? (
        <div className="divide-y divide-gray-800">
          {searchResults.map((movie) => (
            <div 
              key={movie._id || movie.slug}
              onClick={() => handleMovieClick(movie.slug)}
              className="flex items-start gap-3 p-3 hover:bg-gray-800 cursor-pointer transition active:bg-gray-700"
            >
              <div className="relative w-11 h-[60px] flex-shrink-0 bg-gray-800 rounded overflow-hidden">
                <Image src={movie.poster_url || movie.thumb_url} alt={movie.name} fill className="object-cover" unoptimized />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-gray-200 line-clamp-1">{movie.name}</h4>
                <p className="text-xs text-gray-400 line-clamp-1">{movie.origin_name}</p>
                <p className="text-xs text-primary mt-1">{movie.year}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 text-center text-gray-500 text-sm">Không tìm thấy &ldquo;{searchQuery}&rdquo;</div>
      )}
    </div>
  );

  return (
    <header className="bg-surface sticky top-0 z-[100] shadow-md border-b border-gray-800">
      <div className="container mx-auto px-3 md:px-4 py-2.5 md:py-3 flex items-center justify-between gap-2">
        
        {/* === LEFT: Logo + Auth (desktop) === */}
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <Link href="/" className="text-lg md:text-2xl font-bold text-primary shrink-0" onClick={() => isMenuOpen && closeMenu()}>
            Genz<span className="text-white">Movie</span>
          </Link>

          {/* Auth Buttons - Desktop only (hidden on mobile, shown in mobile menu) */}
          <div className="hidden md:flex items-center">
            {userSession ? (
              <div className="relative" ref={userMenuRef}>
                <button 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-1.5 hover:bg-[#1a1a1a] py-1 px-2 rounded-full transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-black font-bold text-sm">
                    {userSession.avatar ? (
                      <img src={userSession.avatar} alt="User" className="w-full h-full rounded-full object-cover" />
                    ) : 'U'}
                  </div>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-[#1a1a1a] border border-[#333] rounded-lg shadow-xl py-1 z-50">
                    <div className="px-4 py-2 border-b border-[#333]">
                      <p className="text-sm font-medium text-white">Tài khoản</p>
                      <p className="text-xs text-gray-400 truncate">Member</p>
                    </div>
                    {(userSession.role === 'admin' || userSession.role === 'moderator') && (
                      <Link href="/admin" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-[#333] hover:text-white" onClick={() => setIsUserMenuOpen(false)}>
                        <Shield size={14} /> Trang Admin
                      </Link>
                    )}
                    <Link href="/user/dashboard" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-[#333] hover:text-white" onClick={() => setIsUserMenuOpen(false)}>
                      <LayoutDashboard size={14} /> Dashboard
                    </Link>
                    <Link href="/user/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-[#333] hover:text-white" onClick={() => setIsUserMenuOpen(false)}>
                      <UserCircle size={14} /> Hồ sơ cá nhân
                    </Link>
                    <form action="/api/auth/logout" method="POST">
                      <button type="submit" className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[#333]">
                        <LogOut size={14} /> Đăng xuất
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="text-xs md:text-sm font-medium text-gray-300 hover:text-white transition-colors px-3 py-1.5 rounded hover:bg-white/10 border border-transparent hover:border-white/20">
                  Đăng nhập
                </Link>
                <Link href="/register" className="text-xs md:text-sm font-bold bg-yellow-500 text-black px-4 py-1.5 rounded-full hover:bg-yellow-400 transition-colors shadow-md hover:shadow-lg active:scale-95 transform">
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* === CENTER: Desktop Navigation === */}
        <nav className="hidden lg:flex space-x-4 xl:space-x-6 items-center">
          {navLinks.map((link, index) => {
            if (link.type === 'dropdown') {
              return (
                <div key={index} className="relative group">
                  <button className="flex items-center hover:text-primary transition py-2 text-sm xl:text-base">
                    {link.label}
                    <ChevronDown size={16} className="ml-1" />
                  </button>
                  <div className="absolute top-full left-0 w-[400px] bg-gray-900 border border-gray-700 shadow-2xl rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[110] p-4 grid grid-cols-2 gap-2">
                    {link.items.map((genre) => (
                      <Link key={genre.slug} href={`/the-loai/${genre.slug}`} className="block px-2 py-1 hover:text-primary hover:bg-gray-800 rounded transition text-sm text-gray-300">
                        {genre.name[lang]}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            }
            return (
              <Link key={link.href} href={link.href} className="hover:text-primary transition py-2 text-sm xl:text-base">
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* === RIGHT: Search + Lang + Hamburger === */}
        <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
          {/* Desktop Search */}
          <div className="hidden md:block relative" ref={searchRef}>
            <div className="flex items-center bg-black rounded-lg px-3 py-1 border border-transparent focus-within:border-primary transition-all">
              <input 
                type="text" 
                placeholder={t.search} 
                className="bg-transparent border-none focus:outline-none text-sm text-gray-300 w-40 lg:w-56 xl:w-64 placeholder-gray-500 py-1"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
                onFocus={() => setShowResults(true)}
              />
              {loading ? <Loader2 size={16} className="text-primary animate-spin" /> : <Search size={16} className="text-gray-400" />}
            </div>
            {showResults && query.trim() && renderSearchResults(results, loading, query)}
          </div>

          {/* Language Toggle */}
          <button onClick={toggleLang} className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-[10px] md:text-xs font-bold ring-1 ring-gray-600 shrink-0">
            {lang === 'en' ? 'EN' : 'VI'}
          </button>

          {/* Mobile Menu Toggle */}
          <button 
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
            onClick={() => { if (isMenuOpen) closeMenu(); else setIsMenuOpen(true); }}
            aria-label="Menu"
          >
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* ============== MOBILE MENU ============== */}
      {isMenuOpen && (
        <>
          {/* Backdrop overlay */}
          <div className="lg:hidden fixed inset-0 top-0 bg-black/60 z-[90]" onClick={closeMenu} />

          <div className="lg:hidden fixed top-[52px] left-0 right-0 bottom-0 bg-[#0d0d0d] z-[95] overflow-y-auto overscroll-contain">
            <div className="px-4 py-4 space-y-4">

              {/* Mobile Search */}
              <div className="relative">
                <div className="flex items-center bg-[#1a1a1a] rounded-xl px-3 py-2.5 border border-gray-700 focus-within:border-primary transition-all">
                  <Search size={18} className="text-gray-500 shrink-0 mr-2" />
                  <input 
                    type="text" 
                    placeholder={lang === 'vi' ? 'Tìm kiếm phim...' : 'Search movies...'}
                    className="bg-transparent border-none focus:outline-none text-sm text-gray-200 w-full placeholder-gray-500"
                    value={mobileQuery}
                    onChange={(e) => { setMobileQuery(e.target.value); setShowMobileResults(true); }}
                    autoFocus
                  />
                  {mobileLoading && <Loader2 size={16} className="text-primary animate-spin shrink-0" />}
                  {mobileQuery && !mobileLoading && (
                    <button onClick={() => { setMobileQuery(''); setMobileResults([]); setShowMobileResults(false); }} className="shrink-0">
                      <X size={16} className="text-gray-500" />
                    </button>
                  )}
                </div>
                {showMobileResults && mobileQuery.trim() && renderSearchResults(mobileResults, mobileLoading, mobileQuery, true)}
              </div>

              {/* Mobile Auth Section */}
              <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
                {userSession ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 pb-3 mb-2 border-b border-gray-800">
                      <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center text-black font-bold text-sm shrink-0">
                        {userSession.avatar ? (
                          <img src={userSession.avatar} alt="User" className="w-full h-full rounded-full object-cover" />
                        ) : 'U'}
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">Tài khoản</p>
                        <p className="text-xs text-gray-400">Member</p>
                      </div>
                    </div>
                    {(userSession.role === 'admin' || userSession.role === 'moderator') && (
                      <Link href="/admin" className="flex items-center gap-3 px-2 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition" onClick={closeMenu}>
                        <Shield size={16} className="text-yellow-500" /> Trang Admin
                      </Link>
                    )}
                    <Link href="/user/dashboard" className="flex items-center gap-3 px-2 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition" onClick={closeMenu}>
                      <LayoutDashboard size={16} className="text-blue-400" /> Dashboard
                    </Link>
                    <Link href="/user/profile" className="flex items-center gap-3 px-2 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition" onClick={closeMenu}>
                      <UserCircle size={16} className="text-green-400" /> Hồ sơ cá nhân
                    </Link>
                    <form action="/api/auth/logout" method="POST" className="mt-1">
                      <button type="submit" className="flex items-center gap-3 w-full px-2 py-2.5 text-sm text-red-400 hover:bg-gray-800 rounded-lg transition">
                        <LogOut size={16} /> Đăng xuất
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-400 text-center">Đăng nhập để trải nghiệm tốt hơn</p>
                    <div className="flex gap-2">
                      <Link href="/login" className="flex-1 text-center py-2.5 text-sm font-medium rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition border border-gray-700" onClick={closeMenu}>
                        Đăng nhập
                      </Link>
                      <Link href="/register" className="flex-1 text-center py-2.5 text-sm font-bold rounded-lg bg-yellow-500 text-black hover:bg-yellow-400 transition" onClick={closeMenu}>
                        Đăng ký
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Navigation Links */}
              <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 divide-y divide-gray-800">
                {navLinks.map((link, index) => {
                  if (link.type === 'dropdown') {
                    return (
                      <div key={index}>
                        <button 
                          className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-gray-200 hover:text-white transition"
                          onClick={() => setIsGenreOpen(!isGenreOpen)}
                        >
                          <span>{link.label}</span>
                          <ChevronDown size={16} className={`text-gray-500 transition-transform duration-200 ${isGenreOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isGenreOpen && (
                          <div className="grid grid-cols-2 gap-1 px-3 pb-3">
                            {link.items.map((genre) => (
                              <Link 
                                key={genre.slug}
                                href={`/the-loai/${genre.slug}`}
                                className="text-xs text-gray-400 hover:text-primary hover:bg-gray-800/50 px-2 py-2 rounded-md transition"
                                onClick={closeMenu}
                              >
                                {genre.name[lang]}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return (
                    <Link 
                      key={link.href}
                      href={link.href}
                      className="flex items-center px-4 py-3 text-sm font-medium text-gray-200 hover:text-white hover:bg-gray-800/50 transition"
                      onClick={closeMenu}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>

              {/* Mobile Language Toggle */}
              <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-400">{lang === 'vi' ? 'Ngôn ngữ' : 'Language'}</span>
                <button 
                  onClick={toggleLang}
                  className="px-4 py-1.5 rounded-full bg-gray-800 hover:bg-gray-700 text-xs font-bold ring-1 ring-gray-600 transition"
                >
                  {lang === 'en' ? '🇬🇧 English' : '🇻🇳 Tiếng Việt'}
                </button>
              </div>

            </div>
          </div>
        </>
      )}
    </header>
  );
};

export default Header;
