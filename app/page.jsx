import Section from '../components/Section';
import HeroSlider from '../components/HeroSlider';
import { fetchMovies } from '../lib/api';

export default async function Home() {
  const [
    featuredData, 
    sliderData,
    theatricalData,
    actionHorrorData,
    animeRomanceData,
    latestData
  ] = await Promise.all([
    fetchMovies('netflix'),
    fetchMovies('featured'),
    fetchMovies('theatrical'),
    fetchMovies('section1'),
    fetchMovies('section2'),
    fetchMovies('latest')
  ]);

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      {/* Hero Slider - Full Width */}
      <HeroSlider movies={sliderData} />

      <div className="container mx-auto px-4 space-y-12">
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
