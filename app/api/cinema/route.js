import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { walletErrorResponse } from '@/lib/wallet';
import { broadcastCinema, viewerCount } from '@/lib/cinemaChat';
import { getNowPlaying, getQueue, getRequesterName, requestMovie, boostRequest, cancelRequest, getCinemaDiag, reportDuration, getFreeStatus, MIN_BID, MAX_BID, MAX_QUEUED_PER_USER } from '@/lib/cinema';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0' };

// Trạng thái Rạp Chung: đang chiếu + hàng chờ (ai cũng xem được)
export async function GET() {
  try {
    const session = await getSession();
    // Tuần tự: lịch chiếu có thể vừa chuyển phim → đọc hàng chờ SAU đó để không hiện phim đang chiếu trong hàng chờ
    const now = await getNowPlaying();
    const queue = await getQueue(session?.userId);
    const free = session ? await getFreeStatus(session.userId) : null;
    const requester = now?.queue_id ? await getRequesterName(now.queue_id) : null;
    return NextResponse.json(
      {
        now: now
          ? {
              movie_slug: now.movie_slug,
              movie_name: now.movie_name,
              movie_thumb: now.movie_thumb,
              episode_slug: now.episode_slug,
              episode_name: now.episode_name,
              m3u8: now.m3u8,
              duration_ms: Number(now.duration_ms),
              started_at_ms: Number(now.started_at_ms),
              duration_confirmed: Number(now.duration_confirmed ?? 1) === 1,
              auto: !now.queue_id,
              requested_by: requester?.username || null,
              total_bid: requester?.total_bid || 0,
            }
          : null,
        queue,
        rules: { minBid: MIN_BID, maxBid: MAX_BID, maxQueuedPerUser: MAX_QUEUED_PER_USER },
        loggedIn: !!session,
        // Lượt đề xuất miễn phí hôm nay (giờ Việt Nam)
        free,
        viewers: viewerCount(),
        // Chỉ khi chưa chiếu được phim: lý do lỗi để chẩn đoán (không chứa dữ liệu nhạy cảm)
        ...(now ? {} : { diag: getCinemaDiag() }),
        serverTime: Date.now(),
      },
      { headers: NO_STORE }
    );
  } catch (e) {
    return walletErrorResponse(NextResponse, e, 'Lỗi tải Rạp Chung');
  }
}

// action: request { movie_slug, episode_slug?, bid } | boost { queue_id, amount } | cancel { queue_id }
export async function POST(request) {
  // Trình duyệt báo thời lượng thật (không cần đăng nhập; server tự kiểm tra hợp lệ)
  let peek = null;
  try { peek = await request.clone().json(); } catch { /* bỏ qua */ }
  if (peek?.action === 'duration') {
    try {
      const r = await reportDuration(peek);
      if (r.accepted) broadcastCinema('cinema:refresh', { reason: 'duration' });
      return NextResponse.json(r);
    } catch (e) {
      return walletErrorResponse(NextResponse, e, 'Lỗi cập nhật thời lượng');
    }
  }

  const session = await getSession();
  if (!session) return NextResponse.json({ message: 'Đăng nhập để đề xuất phim' }, { status: 401 });

  try {
    const body = await request.json();
    if (body.action === 'request') {
      const r = await requestMovie(session.userId, body);
      broadcastCinema('cinema:refresh', { reason: 'request' });
      return NextResponse.json({ ...r, message: r.merged ? 'Phim này đã có trong hàng chờ — đã góp thêm vào đề xuất đó!' : 'Đã thêm vào hàng chờ!' });
    }
    if (body.action === 'boost') {
      await boostRequest(session.userId, Number(body.queue_id), body.amount);
      broadcastCinema('cinema:refresh', { reason: 'boost' });
      return NextResponse.json({ message: 'Đã góp thêm, phim được đẩy lên!' });
    }
    if (body.action === 'cancel') {
      await cancelRequest(session.userId, Number(body.queue_id));
      broadcastCinema('cinema:refresh', { reason: 'cancel' });
      return NextResponse.json({ message: 'Đã huỷ và hoàn tiền cho mọi người đã góp' });
    }
    return NextResponse.json({ message: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (e) {
    return walletErrorResponse(NextResponse, e, 'Lỗi xử lý Rạp Chung');
  }
}
