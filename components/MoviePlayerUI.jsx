'use client';
import { useLanguage } from './LanguageContext';
import Link from 'next/link';
import Image from 'next/image';

export default function MoviePlayerUI({ movie, currentEpisode, episodeList, currentServer }) {
  const { lang, t } = useLanguage();

  if (!movie || !currentEpisode) return <div className="text-center text-white p-10">{t.not_found}</div>;

  const displayName = lang === 'en' ? (movie.origin_name || movie.name) : movie.name;
  const subName = lang === 'en' ? movie.name : (movie.origin_name || '');

  return (
    <div className="bg-[#111] p-4 rounded-xl">
        {/* Breadcrumb / Title */}
        <div className="mb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-primary">
                {t.watch_now}: {displayName}
            </h1>
            <h2 className="text-gray-400 text-lg">
                {subName} - {t.episodes} {currentEpisode.name}
            </h2>
        </div>

        {/* Player Container */}
        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-lg border border-gray-800 mb-6 group">
            <iframe 
                src={currentEpisode.link_embed} 
                frameBorder="0" 
                allowFullScreen 
                className="absolute top-0 left-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            ></iframe>
        </div>

        {/* Episode Server List */}
        <div className="bg-[#1a1a1a] p-4 rounded-lg">
             <div className="flex items-center justify-between mb-4 border-b border-gray-700 pb-2">
                <h3 className="text-xl font-bold text-white uppercase">{t.server}: {currentServer.server_name}</h3>
                <span className="text-xs text-gray-500">{t.quality}: {movie.quality}</span>
             </div>
             
             <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-2 max-h-60 overflow-y-auto custom-scrollbar">
                {currentServer.server_data.map((ep, idx) => {
                    const isActive = `tap-${ep.slug}` === `tap-${currentEpisode.slug}`; // Simplified check
                    // Ensure we match the URL structure logic
                    const epUrl = `/phim/${movie.slug}/tap-${ep.slug}`;
                    
                    return (
                        <Link 
                            key={idx} 
                            href={epUrl}
                            className={`
                                text-center py-2 px-1 rounded text-sm font-medium transition-all
                                ${isActive 
                                    ? 'bg-primary text-black font-bold shadow-[0_0_10px_rgba(229,9,20,0.5)]' 
                                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                                }
                            `}
                        >
                            {ep.name}
                        </Link>
                    )
                })}
             </div>
        </div>

        {/* Movie Info (Simplified) */}
        <div className="mt-8 pt-8 border-t border-gray-800">
             <h3 className="text-lg font-bold text-white mb-2">{t.content}</h3>
             <div 
                className="text-gray-400 leading-relaxed text-sm"
                dangerouslySetInnerHTML={{ __html: movie.content }} 
             />
        </div>
    </div>
  );
}
