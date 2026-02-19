import MovieCard from '../../../components/MovieCard';
import Link from 'next/link';
import { getMoviesByList } from '../../../lib/services';
import { notFound } from 'next/navigation';

export const revalidate = 60; // Fetch fresh data every minute

export async function generateMetadata({ params }) {
  const { slug } = params;
  const title = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
  return {
    title: `Danh sách ${title} - Xem Phim tốt nhất`,
    description: `Danh sách phim ${title} cập nhật mới nhất.`,
  };
}

export default async function ListPage({ params, searchParams }) {
  const page = searchParams?.page ? parseInt(searchParams.page) : 1;
  const { movies, title, pagination } = await getMoviesByList(params.slug, page);

  if (!movies || movies.length === 0) {
     if(page === 1 && params.slug !== 'netflix') return notFound(); // Netflix logic handles empty differently sometimes
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8 border-b border-gray-800 pb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-primary capitalize">
            {title}
        </h1>
        <span className="text-gray-400 text-sm">Trang {page}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {movies.map((movie) => (
          <MovieCard key={movie._id || movie.slug} movie={movie} />
        ))}
         {movies.length === 0 && (
             <div className="col-span-full py-20 text-center text-gray-500">
                Đang cập nhật phim...
             </div>
        )}
      </div>

      {/* Pagination */}
      <div className="mt-12 flex justify-center gap-2">
        {page > 1 && (
            <Link 
                href={`/danh-sach/${params.slug}?page=${page - 1}`}
                className="px-4 py-2 bg-gray-800 hover:bg-primary hover:text-black rounded transition"
            >
                Preview
            </Link>
        )}
        
        <span className="px-4 py-2 bg-primary text-black font-bold rounded">
            {page}
        </span>

         {/* Logic next page */}
        {(movies.length === 24) && (
             <Link 
                href={`/danh-sach/${params.slug}?page=${page + 1}`}
                className="px-4 py-2 bg-gray-800 hover:bg-primary hover:text-black rounded transition"
            >
                Next
            </Link>
        )}
      </div>
    </div>
  );
}
