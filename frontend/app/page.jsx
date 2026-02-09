import Section from '../components/Section';
import { fetchMovies } from '../lib/api';

export default async function Home() {
  const [
    featuredData, 
    theatricalData,
    actionHorrorData,
    animeRomanceData,
    latestData
  ] = await Promise.all([
    fetchMovies('netflix'),
    fetchMovies('theatrical'),
    fetchMovies('section1'),
    fetchMovies('section2'),
    fetchMovies('latest')
  ]);

  return (
    <div className="space-y-10">
      {/* Featured Section */}
      <Section title="Phim Đề Cử (Netflix)" movies={featuredData.slice(0, 12)} link="/danh-sach/netflix" />

      <Section title="Phim Chiếu Rạp" movies={theatricalData} link="/danh-sach/phim-chieu-rap" />
      
      <Section title="Phim Mới Cập Nhật" movies={latestData.slice(0, 12)} link="/danh-sach/phim-moi" />
      
      <Section title="Hành Động & Kinh Dị" movies={actionHorrorData} link="/the-loai/hanh-dong" />
      
      <Section title="Hoạt Hình & Tình Cảm" movies={animeRomanceData} link="/the-loai/hoat-hinh" />
    </div>
  );
}
