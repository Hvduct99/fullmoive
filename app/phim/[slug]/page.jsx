import Image from 'next/image';
import Link from 'next/link';
import { getMovieDetail } from '../../../lib/services';
import MovieDetailInfo from '../../../components/MovieDetailInfo';


export const revalidate = 3600;

export async function generateMetadata({ params }) {
  try {
    const movie = await getMovieDetail(params.slug);
    if (!movie) return { title: 'Phim không tồn tại' };
    
    return {
      title: `Xem phim ${movie.name} (${movie.year}) - Full HD Vietsub`,
      description: `Xem phim ${movie.name} - ${movie.origin_name} mới nhất. ${movie.content ? movie.content.substring(0, 150) : ''}...`,
      openGraph: {
          images: [movie.poster_url || movie.thumb_url],
      }
    };
  } catch (e) {
    console.error('Metadata generation failed:', e);
    return { title: 'Thông tin phim' };
  }
}

export default async function MovieDetail({ params }) {
  let movie = null;
  try {
    movie = await getMovieDetail(params.slug);
  } catch (error) {
    console.error("Error in MovieDetail page:", error);
  }

  if (!movie) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-white">
        <h1 className="text-2xl font-bold mb-4">Phim không tìm thấy</h1>
        <p className="text-gray-400 mb-6">Có thể phim này đang bị lỗi hoặc đã bị xóa.</p>
        <div className="flex gap-4">
             <Link href="/" className="px-6 py-2 bg-primary text-black font-bold rounded hover:bg-red-700 transition">
              Về Trang chủ
            </Link>
             <button onClick={() => window.location.reload()} className="px-6 py-2 bg-gray-700 text-white font-bold rounded hover:bg-gray-600 transition">
              Thử lại
            </button>
        </div>
      </div>
    );
  }

  return (
    <MovieDetailInfo movie={movie} />
  );
}

