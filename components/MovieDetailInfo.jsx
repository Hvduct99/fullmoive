'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from './LanguageContext';

export default function MovieDetailInfo({ movie }) {
  const { lang, t } = useLanguage();
  
  const displayName = lang === 'en' ? (movie.origin_name || movie.name) : movie.name;
  const subName = lang === 'en' ? movie.name : (movie.origin_name || '');

  return (
    <div className="bg-[#111] p-4 md:p-8 rounded-xl shadow-2xl">
      {/* Top Section */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* Poster */}
        <div className="w-full md:w-1/3 lg:w-1/4 shrink-0">
          <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.1)]">
            <Image 
               src={movie.poster_url || movie.thumb_url} 
               alt={movie.name}
               fill
               className="object-cover"
               unoptimized
               priority
            />
          </div>
          {movie.episodes && movie.episodes.length > 0 && movie.episodes[0].server_data && movie.episodes[0].server_data.length > 0 ? (
            <Link 
              href={`/phim/${movie.slug}/tap-${movie.episodes[0].server_data[0].slug}`} 
              className="block w-full text-center bg-secondary hover:bg-red-700 text-white font-bold py-3 mt-4 rounded transition"
            >
              {t.watch_now}
            </Link>
          ) : (
            <button disabled className="w-full bg-gray-600 text-gray-400 font-bold py-3 mt-4 rounded cursor-not-allowed">
              Coming Soon
            </button>
          )}
        </div>

        {/* Info */}
        <div className="flex-1">
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2">{displayName}</h1>
          <h2 className="text-xl text-gray-400 mb-6">{subName} ({movie.year})</h2>
          
          <div className="space-y-4 text-sm md:text-base text-gray-300">
            <div className="flex border-b border-gray-800 pb-2">
              <span className="w-32 font-bold text-gray-500">{t.status}:</span>
              <span className="text-white bg-gray-800 px-2 py-0.5 rounded text-xs leading-5">{movie.episode_current || 'Full'}</span>
            </div>
            
            <div className="flex border-b border-gray-800 pb-2">
              <span className="w-32 font-bold text-gray-500">{t.duration}:</span>
              <span>{movie.time}</span>
            </div>
            
            <div className="flex border-b border-gray-800 pb-2">
              <span className="w-32 font-bold text-gray-500">{t.quality}:</span>
              <span className="text-primary font-bold">{movie.quality}</span>
            </div>

             <div className="flex border-b border-gray-800 pb-2">
              <span className="w-32 font-bold text-gray-500">{t.language}:</span>
              <span>{movie.lang}</span>
            </div>

            <div className="py-4">
              <h3 className="text-lg font-bold text-white mb-2 border-l-4 border-primary pl-3">{t.content}</h3>
              <div 
                className="leading-relaxed text-gray-400" 
                dangerouslySetInnerHTML={{ __html: movie.content }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Episodes */}
      {movie.episodes && movie.episodes.length > 0 && (
        <div className="mt-10">
           <h3 className="text-2xl font-bold text-white mb-6 border-b border-gray-700 pb-2">{t.episodes}</h3>
           {movie.episodes.map((server, idx) => (
             <div key={idx} className="mb-6">
                <h4 className="font-bold text-primary mb-3">{t.server}: {server.server_name}</h4>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {server.server_data.map((ep, i) => (
                    <Link 
                      key={i} 
                      href={`/phim/${movie.slug}/tap-${ep.slug}`}
                      className="bg-gray-800 hover:bg-primary hover:text-black text-center py-2 rounded transition text-sm"
                    >
                      {ep.name}
                    </Link>
                  ))}
                </div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
}
