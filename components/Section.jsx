import MovieCard from './MovieCard';
import Link from 'next/link';

const Section = ({ title, movies, link }) => {
  if (!movies || movies.length === 0) return null;

  return (
    <section className="my-8">
      <div className="flex justify-between items-end mb-4 border-b border-gray-700 pb-2">
        <h2 className="text-xl md:text-2xl font-bold border-l-4 border-primary pl-3 text-white uppercase">
          {title}
        </h2>
        {link && (
          <Link href={link} className="text-xs md:text-sm text-gray-400 hover:text-primary">
            Xem tất cả &rarr;
          </Link>
        )}
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {movies.map((movie) => (
          <MovieCard key={movie._id || movie.slug} movie={movie} />
        ))}
      </div>
    </section>
  );
};

export default Section;
