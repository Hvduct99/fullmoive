import Section from '../components/Section';
import HeroSlider from '../components/HeroSlider';
import MovieMarquee from '../components/MovieMarquee';
import AuthBanner, { AuthBottomCTA } from '../components/AuthBanner';
import { getMoviesBySection } from '../lib/services';

export const revalidate = 1800;

export default async function Home() {
  const sliderData = await getMoviesBySection('featured');
  const featuredData = await getMoviesBySection('netflix');
  const theatricalData = await getMoviesBySection('theatrical');
  const latestData = await getMoviesBySection('latest');
  const actionHorrorData = await getMoviesBySection('section1');
  const animeRomanceData = await getMoviesBySection('section2');
  const marqueeMovies = await getMoviesBySection('marquee');

  return (
    <div className="min-h-screen bg-background">
      <HeroSlider movies={sliderData} />
      <AuthBanner />
      <MovieMarquee movies={marqueeMovies} title="Kinh Dị & Khoa Học Viễn Tưởng Hot" />

      <div className="container mx-auto px-2 md:px-4 space-y-8 md:space-y-12">
        <Section title="Phim Đề Cử (Netflix)" movies={featuredData.slice(0, 12)} link="/danh-sach/netflix" />
        <Section title="Phim Chiếu Rạp" movies={theatricalData.slice(0, 12)} link="/danh-sach/phim-chieu-rap" />
        <Section title="Phim Mới Cập Nhật" movies={latestData.slice(0, 12)} link="/danh-sach/phim-moi" />
        <Section title="Hành Động & Kinh Dị" movies={actionHorrorData.slice(0, 12)} link="/the-loai/hanh-dong" />
        <Section title="Hoạt Hình & Tình Cảm" movies={animeRomanceData.slice(0, 12)} link="/the-loai/hoat-hinh" />
      </div>

      <AuthBottomCTA />
    </div>
  );
}
