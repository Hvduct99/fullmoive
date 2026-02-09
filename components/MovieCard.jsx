'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from './LanguageContext';

const MovieCard = ({ movie }) => {
  const { lang } = useLanguage();
  const displayName = lang === 'en' ? (movie.origin_name || movie.name) : movie.name;
  const subName = lang === 'en' ? movie.name : (movie.origin_name || '');

  return (
    <Link href={`/phim/${movie.slug}`} className="group block relative overflow-hidden rounded-lg bg-surface hover:shadow-xl transition-all duration-300">
      <div className="aspect-[2/3] relative">
        <Image 
          src={movie.poster_url || movie.thumb_url} 
          alt={movie.name} 
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-500"
          unoptimized // Needed if domain isn't fully pre-known or configured in Next.js config perfectly
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
        
        {/* Play Icon Overlay on Hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
           <svg className="w-12 h-12 text-primary drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
             <path d="M8 5v14l11-7z"/>
           </svg>
        </div>
        
        <div className="absolute top-2 left-2 bg-primary text-black text-xs font-bold px-2 py-1 rounded">
            {movie.year || '2024'}
        </div>
      </div>
      
      <div className="p-3">
        <h3 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{displayName}</h3>
        <p className="text-xs text-gray-500 truncate">{subName}</p>
      </div>
    </Link>
  );
};

export default MovieCard;
