import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { walletErrorResponse } from '@/lib/wallet';
import { listMessages, postMessage, deleteMessage, viewerCount } from '@/lib/cinemaChat';

export const dynamic = 'force-dynamic';

// Lịch sử chat (ai cũng xem được). ?after=<id> để lấy tin mới khi không có realtime.
export async function GET(request) {
  try {
    const after = new URL(request.url).searchParams.get('after');
    const messages = await listMessages(after);
    return NextResponse.json({ messages, viewers: viewerCount() }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (e) {
    return walletErrorResponse(NextResponse, e, 'Lỗi tải chat');
  }
}

export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: 'Đăng nhập để chat' }, { status: 401 });
  try {
    const { content } = await request.json();
    const message = await postMessage(session.userId, content);
    return NextResponse.json({ message });
  } catch (e) {
    return walletErrorResponse(NextResponse, e, 'Lỗi gửi tin nhắn');
  }
}

// Admin / mod xoá tin nhắn: DELETE ?id=<id>
export async function DELETE(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    const id = new URL(request.url).searchParams.get('id');
    return NextResponse.json(await deleteMessage(session.role, id));
  } catch (e) {
    return walletErrorResponse(NextResponse, e, 'Lỗi xoá tin nhắn');
  }
}
