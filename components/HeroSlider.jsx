'use client';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import Link from 'next/link';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

export default function HeroSlider({ movies }) {
  if (!movies || movies.length === 0) return null;

  return (
    <div className="w-full h-[50vh] md:h-[70vh] group relative mb-8">
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        spaceBetween={0}
        slidesPerView={1}
        navigation
        pagination={{ clickable: true }}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        loop={true}
        className="w-full h-full"
      >
        {movies.map((movie) => (
          <SwiperSlide key={movie.slug || movie._id}>
            <div className="relative w-full h-full">
              {/* Background with blur effect if needed or just cover */}
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ 
                    backgroundImage: `url(${movie.poster_url})`,
                    filter: 'brightness(0.6)'
                }}
              >
              </div>
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#111] via-[#111]/50 to-transparent pointer-events-none" />

              <div className="relative z-10 h-full flex flex-col justify-center px-6 md:px-16 lg:px-24">
                 <div className="max-w-3xl space-y-4 animate-fade-in-up">
                    <h2 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white drop-shadow-lg leading-tight">
                      {movie.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 text-sm md:text-base font-medium">
                        <span className="text-yellow-400 text-lg">{movie.origin_name}</span>
                        <span className="text-gray-300">|</span>
                        <span className="text-gray-300">{movie.year}</span>
                        <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded uppercase">{movie.quality || 'HD'}</span>
                        <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded">{movie.lang || 'Vietsub'}</span>
                    </div>
                    
                    {movie.content && (
                        <p className="text-gray-300 line-clamp-3 md:line-clamp-4 text-sm md:text-base max-w-2xl leading-relaxed">
                            {movie.content.replace(/<[^>]*>/g, '')}
                        </p>
                    )}
                    
                    <div className="pt-4">
                        <Link 
                        href={`/phim/${movie.slug}`} 
                        className="inline-flex items-center gap-2 px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full transition-all transform hover:scale-105 shadow-lg hover:shadow-red-600/30"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                            </svg>
                            XEM NGAY
                        </Link>
                    </div>
                 </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
