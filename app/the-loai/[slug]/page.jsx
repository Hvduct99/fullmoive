import MovieCard from '../../../components/MovieCard';
import Pagination from '../../../components/Pagination';
import { getMoviesByGenre } from '../../../lib/services';
import { notFound } from 'next/navigation';

export const revalidate = 60; // Fetch fresh data every minute
// ...existing code...
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
      <Pagination 
        currentPage={page} 
        basePath={`/the-loai/${params.slug}`} 
        totalItems={movies.length} 
      />
    </div>
  );
}
