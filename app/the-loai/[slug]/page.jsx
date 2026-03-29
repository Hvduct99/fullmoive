
import MovieCard from '../../../components/MovieCard';
import Pagination from '../../../components/Pagination';
import { getMoviesByGenre } from '../../../lib/services';
import { notFound } from 'next/navigation';
import { VIP_CATEGORIES } from '@/lib/vip';
import { Crown, Lock } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 60; // Fetch fresh data every minute

export async function generateMetadata({ params }) {
  const { slug } = params;
  // Simple capitalization for title
  const title = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
  return {
    title: `Phim ${title} - Xem Phim ${title} mới nhất`,
    description: `Danh sách phim ${title} hay nhất, cập nhật liên tục.`,
  };
}

export default async function GenrePage({ params, searchParams }) {
  const page = searchParams?.page ? parseInt(searchParams.page) : 1;
  const { movies, title, pagination } = await getMoviesByGenre(params.slug, page);
  const isVipGenre = VIP_CATEGORIES.includes(params.slug);

  if (!movies || movies.length === 0) {
      if(page === 1) return notFound(); // Only 404 on first page empty
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-primary capitalize flex items-center gap-3">
            {title}
            {isVipGenre && (
              <span className="inline-flex items-center bg-gradient-to-r from-yellow-500 to-yellow-600 text-black text-xs font-bold px-3 py-1 rounded-full gap-1">
                <Crown size={14} /> VIP
              </span>
            )}
        </h1>
        <span className="text-gray-400 text-sm">Trang {page}</span>
      </div>

      {isVipGenre && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-3">
          <Lock size={20} className="text-yellow-500 shrink-0" />
          <div>
            <p className="text-sm text-yellow-200 font-medium">Nội dung VIP</p>
            <p className="text-xs text-gray-400">Thể loại này thuộc nội dung VIP. <Link href="/user/dashboard" className="text-yellow-500 hover:underline">Nâng cấp VIP</Link> để xem không giới hạn.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {movies.map((movie) => (
          <MovieCard key={movie._id || movie.slug} movie={movie} />
        ))}
        {movies.length === 0 && (
             <div className="col-span-full py-20 text-center text-gray-500">
                Hiện tại chưa có phim nào trong mục này.
             </div>
        )}
      </div>

      {/* Pagination */}
      <Pagination 
        currentPage={page} 
        basePath={`/the-loai/${params.slug}`} 
        totalItems={movies.length} 
      />
    </div>
  );
}
