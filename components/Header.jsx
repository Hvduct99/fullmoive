'use client';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { useLanguage } from './LanguageContext';

const Header = () => {
  const { lang, toggleLang, t } = useLanguage();

  return (
    <header className="bg-surface sticky top-0 z-50 shadow-md border-b border-gray-800">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-2xl font-bold text-primary">
          PhimXom<span className="text-white">Clone</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex space-x-6">
          <Link href="/" className="hover:text-primary transition">{t.home}</Link>
          <Link href="/danh-sach/phim-le" className="hover:text-primary transition">{lang === 'vi' ? 'Phim Lẻ' : 'Movies'}</Link>
          <Link href="/danh-sach/phim-bo" className="hover:text-primary transition">{lang === 'vi' ? 'Phim Bộ' : 'Series'}</Link>
          <Link href="/the-loai/hoat-hinh" className="hover:text-primary transition">{lang === 'vi' ? 'Hoạt Hình' : 'Anime'}</Link>
          <Link href="/danh-sach/phim-chieu-rap" className="hover:text-primary transition">{t.theatrical}</Link>
        </nav>

        <div className="flex items-center gap-4">
             {/* Search */}
            <div className="flex items-center bg-black rounded-lg px-3 py-1">
            <input 
                type="text" 
                placeholder={t.search} 
                className="bg-transparent border-none focus:outline-none text-sm text-gray-300 w-24 md:w-48 placeholder-gray-500"
            />
            <Search size={18} className="text-gray-400" />
            </div>

            {/* Language Toggle */}
            <button 
                onClick={toggleLang}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-xs font-bold ring-1 ring-gray-600"
            >
                {lang === 'en' ? 'EN' : 'VI'}
            </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
