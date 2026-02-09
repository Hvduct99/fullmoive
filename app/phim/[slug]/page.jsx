import Image from 'next/image';
import Link from 'next/link';
import { getMovieDetail } from '../../../lib/services';
import MovieDetailInfo from '../../../components/MovieDetailInfo';

export async function generateMetadata({ params }) {
  const movie = await getMovieDetail(params.slug);
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
  const movie = await getMovieDetail(params.slug);

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
    <MovieDetailInfo movie={movie} />
  );
}

