import Link from 'next/link';
import { Search } from 'lucide-react';

const Header = () => {
  return (
    <header className="bg-surface sticky top-0 z-50 shadow-md border-b border-gray-800">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-2xl font-bold text-primary">
          PhimXom<span className="text-white">Clone</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex space-x-6">
          <Link href="/" className="hover:text-primary transition">Trang Chủ</Link>
          <Link href="/danh-sach/phim-le" className="hover:text-primary transition">Phim Lẻ</Link>
          <Link href="/danh-sach/phim-bo" className="hover:text-primary transition">Phim Bộ</Link>
          <Link href="/the-loai/hoat-hinh" className="hover:text-primary transition">Hoạt Hình</Link>
          <Link href="/danh-sach/phim-chieu-rap" className="hover:text-primary transition">Chiếu Rạp</Link>
        </nav>

        {/* Search */}
        <div className="flex items-center bg-black rounded-lg px-3 py-1">
          <input 
            type="text" 
            placeholder="Tìm phim..." 
            className="bg-transparent border-none focus:outline-none text-sm text-gray-300 w-32 md:w-48 placeholder-gray-500"
          />
          <Search size={18} className="text-gray-400" />
        </div>
      </div>
    </header>
  );
};

export default Header;
