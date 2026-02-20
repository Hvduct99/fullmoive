import Section from '../components/Section';
import HeroSlider from '../components/HeroSlider';
import MovieMarquee from '../components/MovieMarquee';
import AuthBanner from '../components/AuthBanner';
import { getMoviesBySection } from '../lib/services';
import { getSession } from '@/lib/session';

export const revalidate = 1800; // ISR cache - refresh every 30 minutes for fresher content

export default async function Home() {
  const session = await getSession();

  // Fetch data sequentially to avoid OOM or timeout issues during build/runtime
  // Group 1: Hero Slider & Featured
  const sliderData = await getMoviesBySection('featured');
  const featuredData = await getMoviesBySection('netflix');

  // Group 2: Theatrical & Latest
  const theatricalData = await getMoviesBySection('theatrical');
  const latestData = await getMoviesBySection('latest');

  // Group 3: Categories
  const actionHorrorData = await getMoviesBySection('section1');
  const animeRomanceData = await getMoviesBySection('section2');

  // Marquee: pick 7 sci-fi/horror movies from slider data (already fetched)
  const marqueeMovies = sliderData ? sliderData.slice(0, 7) : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Slider - Full Width */}
      <HeroSlider movies={sliderData} />

      {/* Auth Banner - shows below hero for guests, always visible */}
      <AuthBanner session={session} />

      {/* Marquee - Sci-Fi & Horror scrolling */}
      <MovieMarquee movies={marqueeMovies} title="Kinh Dị & Khoa Học Viễn Tưởng Hot" />

      <div className="container mx-auto px-2 md:px-4 space-y-8 md:space-y-12">
        {/* Featured Section */}
        <Section title="Phim Đề Cử (Netflix)" movies={featuredData.slice(0, 12)} link="/danh-sach/netflix" />

        <Section title="Phim Chiếu Rạp" movies={theatricalData} link="/danh-sach/phim-chieu-rap" />
        
        <Section title="Phim Mới Cập Nhật" movies={latestData.slice(0, 12)} link="/danh-sach/phim-moi" />
        
        <Section title="Hành Động & Kinh Dị" movies={actionHorrorData} link="/the-loai/hanh-dong" />
        
        <Section title="Hoạt Hình & Tình Cảm" movies={animeRomanceData} link="/the-loai/hoat-hinh" />
      </div>
    </div>
  );
}
