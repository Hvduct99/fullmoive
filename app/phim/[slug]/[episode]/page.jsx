import { getMovieDetail } from '../../../../lib/services';
import { getSession } from '@/lib/session';
import { isVipMovie, isUserVip } from '@/lib/vip';
import pool from '@/lib/db';
import MoviePlayerUI from '../../../../components/MoviePlayerUI';
import VipGateServer from '../../../../components/VipGateServer';
import Link from 'next/link';

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
    return { title: 'Xem phim' };
  }
}

export default async function WatchPage({ params }) {
  const { slug, episode } = params;

  // Fetch movie data server-side (cached 1 hour by getMovieDetail)
  const movie = await getMovieDetail(slug);

  if (!movie) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-white">
        <h1 className="text-2xl font-bold mb-4">Phim không tìm thấy</h1>
        <p className="text-gray-400 mb-6">Có thể phim này đang bị lỗi hoặc đã bị xóa.</p>
        <Link href="/" className="px-6 py-2 bg-primary text-black font-bold rounded hover:bg-red-700 transition">
          Về Trang chủ
        </Link>
      </div>
    );
  }

  // Find episode & server
  let currentEpisode = null;
  let currentServer = null;
  if (movie.episodes) {
    for (const server of movie.episodes) {
      const ep = server.server_data.find(ep => `tap-${ep.slug}` === episode);
      if (ep) {
        currentEpisode = ep;
        currentServer = server;
        break;
      }
    }
  }

  if (!currentEpisode) {
    return (
      <div className="container mx-auto px-4 py-12 text-center text-white">
        <h1 className="text-2xl font-bold mb-4">Không tìm thấy tập phim</h1>
        <Link href={`/phim/${slug}`} className="text-primary hover:underline">
          Quay lại trang thông tin phim
        </Link>
      </div>
    );
  }

  // Check VIP server-side
  const movieIsVip = isVipMovie(movie);
  if (movieIsVip) {
    const session = await getSession();
    let canWatch = false;

    if (session?.userId) {
      try {
        const [users] = await pool.query('SELECT role, vip_expire_at FROM users WHERE id = ?', [session.userId]);
        if (users.length > 0) {
          canWatch = isUserVip(users[0]);
        }
      } catch (e) {
        console.error('VIP check error:', e.message);
      }
    }

    if (!canWatch) {
      return (
        <div className="container mx-auto px-4 py-12">
          <VipGateServer />
        </div>
      );
    }
  }

  return (
    <div className="container mx-auto px-0 md:px-4 py-4">
      <MoviePlayerUI
        movie={movie}
        currentEpisode={currentEpisode}
        episodeList={currentServer?.server_data || []}
        currentServer={currentServer}
      />
    </div>
  );
}
