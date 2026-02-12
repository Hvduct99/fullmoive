import MovieCard from '../../../components/MovieCard';
import Link from 'next/link';
import { getMoviesByGenre } from '../../../lib/services';
import { notFound } from 'next/navigation';

export const revalidate = 3600;

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

  if (!movies || movies.length === 0) {
      if(page === 1) return notFound(); // Only 404 on first page empty
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
                Hiện tại chưa có phim nào trong mục này.
             </div>
        )}
      </div>

      {/* Pagination */}
      <div className="mt-12 flex justify-center gap-2">
        {page > 1 && (
            <Link 
                href={`/the-loai/${params.slug}?page=${page - 1}`}
                className="px-4 py-2 bg-gray-800 hover:bg-primary hover:text-black rounded transition"
            >
                Preview
            </Link>
        )}
        
        <span className="px-4 py-2 bg-primary text-black font-bold rounded">
            {page}
        </span>

        {/* Simple Next button logic - if we have items, assume there might be more or use pagination data if reliable */}
        {(movies.length === 24) && (
             <Link 
                href={`/the-loai/${params.slug}?page=${page + 1}`}
                className="px-4 py-2 bg-gray-800 hover:bg-primary hover:text-black rounded transition"
            >
                Next
            </Link>
        )}
      </div>
    </div>
  );
}
