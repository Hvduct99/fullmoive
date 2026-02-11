'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useLanguage } from './LanguageContext';
import { useRouter } from 'next/navigation';

const Header = () => {
  const { lang, toggleLang, t } = useLanguage();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  const router = useRouter();

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

  return (
    <header className="bg-surface sticky top-0 z-50 shadow-md border-b border-gray-800">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-2xl font-bold text-primary">
          Genz<span className="text-white">Movie</span>
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
            <div className="relative group" ref={searchRef}>
              <div className="flex items-center bg-black rounded-lg px-3 py-1 border border-transparent focus-within:border-primary transition-all">
                <input 
                    type="text" 
                    placeholder={t.search} 
                    className="bg-transparent border-none focus:outline-none text-sm text-gray-300 w-32 md:w-64 placeholder-gray-500 py-1"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setShowResults(true);
                    }}
                    onFocus={() => setShowResults(true)}
                />
                {loading ? (
                  <Loader2 size={18} className="text-primary animate-spin" />
                ) : (
                  <Search size={18} className="text-gray-400 group-hover:text-white transition" />
                )}
              </div>

              {/* Search Results Dropdown */}
              {showResults && query.trim() && (
                <div className="absolute top-full text-left left-0 w-full md:w-[350px] right-0 md:left-auto md:right-0 mt-2 bg-gray-900 rounded-lg shadow-2xl border border-gray-700 overflow-hidden max-h-[400px] overflow-y-auto z-50">
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
