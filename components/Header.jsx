'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Loader2, Menu, X, ChevronDown } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useLanguage } from './LanguageContext';
import { useRouter } from 'next/navigation';

const Header = () => {
  const { lang, toggleLang, t } = useLanguage();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isGenreOpen, setIsGenreOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const searchRef = useRef(null);
  const userMenuRef = useRef(null);
  const router = useRouter();

  // User session state
  const [userSession, setUserSession] = useState(session);

  useEffect(() => {
    // Check session on mount if not provided or to update
    if (!session) {
      fetch('/api/auth/session')
        .then(res => res.json())
        .then(data => setUserSession(data.user))
        .catch(() => setUserSession(null));
    } else {
        setUserSession(session);
    }
      
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchMovies = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/search?keyword=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.status === 'success') {
          setResults(data.data);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(() => {
      if (query.trim()) {
        fetchMovies();
      } else {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(debounce);
  }, [query]);

  const handleMovieClick = (slug) => {
    setShowResults(false);
    setQuery('');
    router.push(`/phim/${slug}`);
  };

  const navLinks = [
    { href: '/', label: t.home, type: 'link' },
    { label: lang === 'vi' ? 'Thể Loại' : 'Genres', type: 'dropdown', items: genres },
    { href: '/danh-sach/phim-le', label: lang === 'vi' ? 'Phim Lẻ' : 'Movies', type: 'link' },
    { href: '/danh-sach/phim-bo', label: lang === 'vi' ? 'Phim Bộ' : 'Series', type: 'link' },
    { href: '/the-loai/hoat-hinh', label: lang === 'vi' ? 'Hoạt Hình' : 'Anime', type: 'link' },
    { href: '/danh-sach/phim-chieu-rap', label: t.theatrical, type: 'link' },
  ];

  return (
    <header className="bg-surface sticky top-0 z-[100] shadow-md border-b border-gray-800">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-xl md:text-2xl font-bold text-primary mr-2 md:mr-0 shrink-0">
          Genz<span className="text-white">Movie</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-4 lg:space-x-6 items-center">
          {navLinks.map((link, index) => {
            if (link.type === 'dropdown') {
              return (
                <div key={index} className="relative group">
                  <button className="flex items-center hover:text-primary transition py-2">
                    {link.label}
                    <ChevronDown size={16} className="ml-1" />
                  </button>
                  <div className="absolute top-full left-0 w-[400px] bg-gray-900 border border-gray-700 shadow-2xl rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[110] p-4 grid grid-cols-2 gap-2">
                    {link.items.map((genre) => (
                      <Link 
                        key={genre.slug} 
                        href={`/the-loai/${genre.slug}`}
                        className="block px-2 py-1 hover:text-primary hover:bg-gray-800 rounded transition text-sm text-gray-300"
                      >
                        {genre.name[lang]}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            }
            return (
              <Link key={link.href} href={link.href} className="hover:text-primary transition py-2 text-sm lg:text-base">
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 md:gap-4 shrink-0">
             {/* Search */}
            <div className="relative group" ref={searchRef}>
              <div className="flex items-center bg-black rounded-lg px-2 md:px-3 py-1 border border-transparent focus-within:border-primary transition-all">
                <input 
                    type="text" 
                    placeholder={t.search} 
                    className="bg-transparent border-none focus:outline-none text-sm text-gray-300 w-24 md:w-48 lg:w-64 placeholder-gray-500 py-1"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setShowResults(true);
                    }}
                    onFocus={() => setShowResults(true)}
                />
                {loading ? (
                  <Loader2 size={16} className="text-primary animate-spin" />
                ) : (
                  <Search size={16} className="text-gray-400 group-hover:text-white transition" />
                )}
              </div>

              {/* Search Results Dropdown */}
              {showResults && query.trim() && (
                <div className="absolute top-full text-left left-auto right-0 md:right-0 md:left-auto w-[85vw] md:w-[350px] mt-2 bg-gray-900 rounded-lg shadow-2xl border border-gray-700 overflow-hidden max-h-[400px] overflow-y-auto z-50">
                  {loading ? (
                    <div className="p-4 text-center text-gray-400 text-sm">Searching...</div>
                  ) : results.length > 0 ? (
                    <div className="divide-y divide-gray-800">
                      {results.map((movie) => (
                        <div 
                          key={movie._id || movie.slug}
                          onClick={() => handleMovieClick(movie.slug)}
                          className="flex items-start gap-3 p-3 hover:bg-gray-800 cursor-pointer transition"
                        >
                          <div className="relative w-12 h-16 flex-shrink-0 bg-gray-800 rounded overflow-hidden">
                             <Image 
                               src={movie.poster_url || movie.thumb_url} 
                               alt={movie.name} 
                               fill
                               className="object-cover"
                               unoptimized
                             />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-gray-200 line-clamp-1">{movie.name}</h4>
                            <p className="text-xs text-gray-400 line-clamp-1">{movie.origin_name}</p>
                            <p className="text-xs text-primary mt-1">{movie.year}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500 text-sm">No results found for "{query}"</div>
                  )}
                </div>
              )}
            </div>

            {/* Language Toggle */}
            <button 
                onClick={toggleLang}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-xs font-bold ring-1 ring-gray-600 shrink-0"
            >
                {lang === 'en' ? 'EN' : 'VI'}
            </button>

            {/* Auth Buttons / User Menu */}
            {userSession ? (
              <div className="relative" ref={userMenuRef}>
                <button 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 hover:bg-[#1a1a1a] py-1 px-2 rounded-full transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-black font-bold">
                    {userSession.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={userSession.avatar} alt="User" className="w-full h-full rounded-full object-cover" />
                    ) : 'U'}
                  </div>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-[#1a1a1a] border border-[#333] rounded-lg shadow-xl py-1 z-50">
                    <div className="px-4 py-2 border-b border-[#333]">
                      <p className="text-sm font-medium text-white">Tài khoản</p>
                      <p className="text-xs text-gray-400 truncate">Member</p>
                    </div>
                    
                    {(userSession.role === 'admin' || userSession.role === 'moderator') && (
                      <Link 
                        href="/admin" 
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-[#333] hover:text-white"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        Trang quản trị (Admin)
                      </Link>
                    )}
                    
                    <Link 
                      href="/user/dashboard" 
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-[#333] hover:text-white"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    
                    <Link 
                      href="/user/profile" 
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-[#333] hover:text-white"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      Hồ sơ cá nhân
                    </Link>

                    <form action="/api/auth/logout" method="POST">
                      <button 
                        type="submit"
                        className="w-full text-left block px-4 py-2 text-sm text-red-400 hover:bg-[#333]"
                      >
                        Đăng xuất
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-3">
                <Link 
                  href="/login"
                  className="text-sm font-medium text-gray-300 hover:text-white transition-colors whitespace-nowrap"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-medium bg-yellow-500 text-black px-4 py-1.5 rounded-full hover:bg-yellow-400 transition-colors whitespace-nowrap"
                >
                  Đăng ký
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button 
              className="md:hidden flex items-center justify-center p-1 text-gray-300 hover:text-white"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-surface border-b border-gray-800 py-4 px-4 shadow-xl h-[90vh] overflow-y-auto">
          <nav className="flex flex-col space-y-2">
            {navLinks.map((link, index) => {
              if (link.type === 'dropdown') {
                return (
                  <div key={index} className="border-b border-gray-800 pb-2">
                    <button 
                      className="flex items-center justify-between w-full text-gray-300 hover:text-primary py-2 font-medium"
                      onClick={() => setIsGenreOpen(!isGenreOpen)}
                    >
                      {link.label}
                      <ChevronDown size={16} className={`transition-transform ${isGenreOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isGenreOpen && (
                      <div className="grid grid-cols-2 gap-2 pl-4 mt-2">
                         {link.items.map((genre) => (
                            <Link 
                              key={genre.slug} 
                              href={`/the-loai/${genre.slug}`}
                              className="text-sm text-gray-400 hover:text-primary py-1"
                              onClick={() => setIsMenuOpen(false)}
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
                  className="text-gray-300 hover:text-primary transition font-medium border-b border-gray-800 pb-2 py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              )
            })}
            
            {/* Mobile Auth Links */}
            <div className="border-t border-gray-800 pt-4 mt-2">
              {userSession ? (
                <>
                  <div className="flex items-center gap-3 px-4 py-2">
                    <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-black font-bold">
                       {userSession.avatar ? (
                         // eslint-disable-next-line @next/next/no-img-element
                         <img src={userSession.avatar} alt="User" className="w-full h-full rounded-full object-cover" />
                       ) : 'U'}
                    </div>
                    <div>
                      <p className="text-white font-medium">Tài khoản</p>
                      <p className="text-xs text-gray-400">Member</p>
                    </div>
                  </div>
                  
                  <Link 
                    href="/user/dashboard"
                    className="block px-4 py-2 text-gray-300 hover:text-white"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Link>

                  {(userSession.role === 'admin' || userSession.role === 'moderator') && (
                      <Link 
                        href="/admin" 
                        className="block px-4 py-2 text-gray-300 hover:text-white"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Trang Admin
                      </Link>
                  )}

                  <form action="/api/auth/logout" method="POST">
                    <button className="block w-full text-left px-4 py-2 text-red-500 hover:text-red-400">
                      Đăng xuất
                    </button>
                  </form>
                </>
              ) : (
                <div className="px-4 py-2 flex flex-col gap-3">
                  <Link 
                    href="/login"
                    className="block w-full text-center py-2 rounded bg-[#333] text-white hover:bg-[#444]"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Đăng nhập
                  </Link>
                  <Link 
                    href="/register"
                    className="block w-full text-center py-2 rounded bg-yellow-500 text-black font-bold hover:bg-yellow-400"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Đăng ký
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
