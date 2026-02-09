import Image from 'next/image';
import Link from 'next/link';
import { fetchMovieDetail } from '../../lib/api';

export async function generateMetadata({ params }) {
  const movie = await fetchMovieDetail(params.slug);
  if (!movie) return { title: 'Phim không tồn tại' };
  
  return {
    title: `Xem phim ${movie.name} (${movie.year}) - Full HD Vietsub`,
    description: `Xem phim ${movie.name} - ${movie.origin_name} mới nhất. ${movie.content ? movie.content.substring(0, 150) : ''}...`,
    openGraph: {
        images: [movie.poster_url || movie.thumb_url],
    }
  };
}

export default async function MovieDetail({ params }) {
  const movie = await fetchMovieDetail(params.slug);

  if (!movie) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-white">
        <h1 className="text-2xl font-bold mb-4">Phim không tìm thấy</h1>
        <Link href="/" className="text-primary hover:underline">
          Quay lại trang chủ
        </Link>
      </div>
    );
  }

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
          <button className="w-full bg-secondary hover:bg-red-700 text-white font-bold py-3 mt-4 rounded transition">
            Xem Phim
          </button>
        </div>

        {/* Info */}
        <div className="flex-1">
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2">{movie.name}</h1>
          <h2 className="text-xl text-gray-400 mb-6">{movie.origin_name} ({movie.year})</h2>
          
          <div className="space-y-4 text-sm md:text-base text-gray-300">
            <div className="flex border-b border-gray-800 pb-2">
              <span className="w-32 font-bold text-gray-500">Trạng thái:</span>
              <span className="text-white bg-gray-800 px-2 py-0.5 rounded text-xs leading-5">{movie.episode_current || 'Full'}</span>
            </div>
            
            <div className="flex border-b border-gray-800 pb-2">
              <span className="w-32 font-bold text-gray-500">Thời lượng:</span>
              <span>{movie.time}</span>
            </div>
            
            <div className="flex border-b border-gray-800 pb-2">
              <span className="w-32 font-bold text-gray-500">Chất lượng:</span>
              <span className="text-primary font-bold">{movie.quality}</span>
            </div>

             <div className="flex border-b border-gray-800 pb-2">
              <span className="w-32 font-bold text-gray-500">Ngôn ngữ:</span>
              <span>{movie.lang}</span>
            </div>

            <div className="py-4">
              <h3 className="text-lg font-bold text-white mb-2 border-l-4 border-primary pl-3">Nội dung phim</h3>
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
           <h3 className="text-2xl font-bold text-white mb-6 border-b border-gray-700 pb-2">Danh sách tập</h3>
           {movie.episodes.map((server, idx) => (
             <div key={idx} className="mb-6">
                <h4 className="font-bold text-primary mb-3">Server: {server.server_name}</h4>
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
