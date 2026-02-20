'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from './LanguageContext';

const MovieMarquee = ({ movies, title }) => {
  const { lang } = useLanguage();
  
  if (!movies || movies.length === 0) return null;

  // Double the movies array for seamless infinite scroll
  const duplicated = [...movies, ...movies];

  return (
    <section className="py-6 md:py-8 overflow-hidden bg-gradient-to-r from-[#1a1a1a] via-[#111] to-[#1a1a1a]">
      {title && (
        <div className="container mx-auto px-4 mb-4">
          <h2 className="text-lg md:text-xl font-bold border-l-4 border-red-600 pl-3 text-white uppercase tracking-wide">
            🔥 {title}
          </h2>
        </div>
      )}
      
      <div className="relative">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-12 md:w-20 bg-gradient-to-r from-[#111] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-12 md:w-20 bg-gradient-to-l from-[#111] to-transparent z-10 pointer-events-none" />
        
        <div className="flex animate-marquee gap-4 md:gap-6 w-max hover:[animation-play-state:paused]">
          {duplicated.map((movie, index) => {
            const displayName = lang === 'en' ? (movie.origin_name || movie.name) : movie.name;
            return (
              <Link
                key={`${movie.slug}-${index}`}
                href={`/phim/${movie.slug}`}
                className="group flex-shrink-0 w-[160px] sm:w-[180px] md:w-[200px] relative rounded-xl overflow-hidden bg-surface hover:ring-2 hover:ring-red-500 transition-all duration-300 shadow-lg hover:shadow-red-500/20"
              >
                <div className="aspect-[2/3] relative">
                  <Image
                    src={movie.poster_url || movie.thumb_url}
                    alt={movie.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                  
                  {/* Play overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-red-600/90 flex items-center justify-center backdrop-blur-sm">
                      <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </div>

                  {/* Badge */}
                  <div className="absolute top-2 left-2 flex gap-1">
                    <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      {movie.quality || 'HD'}
                    </span>
                    <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      {movie.year}
                    </span>
                  </div>
                </div>
                
                <div className="p-2.5">
                  <h3 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-red-400 transition-colors">
                    {displayName}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-gray-500 truncate mt-0.5">
                    {lang === 'en' ? movie.name : (movie.origin_name || '')}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default MovieMarquee;
