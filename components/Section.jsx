import MovieCard from './MovieCard';
import Link from 'next/link';
import { Crown } from 'lucide-react';

const Section = ({ title, movies, link, isVip = false }) => {
  if (!movies || movies.length === 0) return null;

  return (
    <section className="my-8">
      <div className="flex justify-between items-end mb-4 border-b border-gray-700 pb-2">
        <h2 className="text-xl md:text-2xl font-bold border-l-4 border-primary pl-3 text-white uppercase flex items-center gap-2">
          {title}
          {isVip && (
            <span className="inline-flex items-center bg-gradient-to-r from-yellow-500 to-yellow-600 text-black text-[10px] font-bold px-2 py-1 rounded-full gap-1">
              <Crown size={10} /> VIP
            </span>
          )}
        </h2>
        {link && (
          <Link href={link} className="text-xs md:text-sm text-gray-400 hover:text-primary">
            Xem tất cả &rarr;
          </Link>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {movies.map((movie) => (
          <MovieCard key={movie._id || movie.slug} movie={movie} isVip={isVip} />
        ))}
      </div>
    </section>
  );
};

export default Section;
