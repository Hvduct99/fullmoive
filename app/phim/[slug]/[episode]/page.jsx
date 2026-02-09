import { getMovieDetail } from '../../../../lib/services';
import MoviePlayerUI from '../../../../components/MoviePlayerUI';
import Link from 'next/link';


export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }) {
  try {
    const { slug, episode } = params;
    const movie = await getMovieDetail(slug);
    
    if (!movie) return { title: 'Phim không tồn tại' };

    return {
      title: `Xem phim ${movie.name} - ${episode} (${movie.year})`,
      description: `Xem phim ${movie.name} ${episode} Full HD Vietsub. ${movie.content ? movie.content.substring(0, 100) : ''}...`,
    };
  } catch (e) {
    return { title: 'Xem phim' };
  }
}

export default async function WatchPage({ params }) {
  const { slug, episode } = params;
  let movie = null;
  try {
     movie = await getMovieDetail(slug);
  } catch (e) {
     console.error("Error fetching movie/episode:", e);
  }

  if (!movie) {
    return <div className="text-white text-center mt-20">Phim không tồn tại. Vui lòng thử lại sau.</div>;
  }

  // Find the episode and server
  // episode param matches 'tap-${ep.slug}'
  // We search all servers to find the matching episode data
  let currentEpisode = null;
  let currentServer = null;

  // Prioritize first server or specific server logic?
  // Usually we iterate and find first match
  if (movie.episodes) {
      for (const server of movie.episodes) {
          const found = server.server_data.find(ep => `tap-${ep.slug}` === episode);
          if (found) {
              currentEpisode = found;
              currentServer = server;
              break;
          }
      }
      
      // Fallback: If not found exactly, maybe allow partial match? 
      // Or just not found.
  }

  if (!currentEpisode) {
       return (
            <div className="container mx-auto px-4 py-12 text-center text-white">
                <h1 className="text-2xl font-bold mb-4">Không tìm thấy tập phim này ({episode})</h1>
                <Link href={`/phim/${slug}`} className="text-primary hover:underline">
                    Quay lại trang thông tin phim
                </Link>
            </div>
       );
  }

  return (
    <div className="container mx-auto px-0 md:px-4 py-4">
      <MoviePlayerUI 
        movie={movie} 
        currentEpisode={currentEpisode} 
        episodeList={currentServer.server_data} // Pass valid list for this server
        currentServer={currentServer}
      />
    </div>
  );
}
