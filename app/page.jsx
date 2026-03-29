import Section from '../components/Section';
import HeroSlider from '../components/HeroSlider';
import MovieMarquee from '../components/MovieMarquee';
import AuthBanner, { AuthBottomCTA } from '../components/AuthBanner';
import { getMoviesBySection, getVipMoviePool, mixMoviesWithVip } from '../lib/services';

export const revalidate = 1800;

export default async function Home() {
  const sliderData = await getMoviesBySection('featured');
  const featuredData = await getMoviesBySection('netflix');
  const theatricalData = await getMoviesBySection('theatrical');
  const latestData = await getMoviesBySection('latest');
  const actionHorrorData = await getMoviesBySection('section1');
  const animeRomanceData = await getMoviesBySection('section2');
  const marqueeMovies = await getMoviesBySection('marquee');

  // Fetch VIP pool for mixing into non-VIP sections
  const vipPool = await getVipMoviePool();

  // Shuffle VIP pool into different slices for each section
  const shuffled = [...vipPool].sort(() => 0.5 - Math.random());
  const vipSlice1 = shuffled.slice(0, 4);
  const vipSlice2 = shuffled.slice(4, 8);
  const vipSlice3 = shuffled.slice(8, 12);

  // Mix VIP movies into each section (7 free : 2 VIP ratio)
  const theatricalMixed = mixMoviesWithVip(theatricalData.slice(0, 12), vipSlice1, 12);
  const latestMixed = mixMoviesWithVip(latestData.slice(0, 12), vipSlice2, 12);
  const animeMixed = mixMoviesWithVip(animeRomanceData.slice(0, 12), vipSlice3, 12);

  // Netflix & Action/Horror sections are already VIP-heavy
  const featuredMixed = featuredData.slice(0, 12);
  const actionMixed = actionHorrorData.slice(0, 12);

  return (
    <div className="min-h-screen bg-background">
      <HeroSlider movies={sliderData} />
      <AuthBanner />
      <MovieMarquee movies={marqueeMovies} title="Kinh Dị & Khoa Học Viễn Tưởng Hot" />

      <div className="container mx-auto px-2 md:px-4 space-y-8 md:space-y-12">
        <Section title="Phim Đề Cử (Netflix)" movies={featuredMixed} link="/danh-sach/netflix" />
        <Section title="Phim Chiếu Rạp" movies={theatricalMixed} link="/danh-sach/phim-chieu-rap" />
        <Section title="Phim Mới Cập Nhật" movies={latestMixed} link="/danh-sach/phim-moi" />
        <Section title="Hành Động & Kinh Dị" movies={actionMixed} link="/the-loai/hanh-dong" />
        <Section title="Hoạt Hình & Tình Cảm" movies={animeMixed} link="/the-loai/hoat-hinh" />
      </div>

      <AuthBottomCTA />
    </div>
  );
}
