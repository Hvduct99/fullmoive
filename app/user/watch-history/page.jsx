import { redirect } from 'next/navigation';

// Lịch sử xem đã gộp vào Tủ Phim Cá Nhân
export default function WatchHistoryRedirect() {
  redirect('/user/library?tab=history');
}
