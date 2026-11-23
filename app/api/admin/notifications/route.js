import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { listAdminNotifications, markAdminNotificationsRead } from '@/lib/adminNotify';

export const dynamic = 'force-dynamic';

const isStaff = (s) => s && (s.role === 'admin' || s.role === 'moderator');

// Danh sách thông báo cho admin + số đơn nạp đang chờ duyệt
export async function GET() {
  const session = await getSession();
  if (!isStaff(session)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json(await listAdminNotifications(20), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (e) {
    console.error('Admin notifications GET error:', e);
    return NextResponse.json({ message: 'Lỗi tải thông báo' }, { status: 500 });
  }
}

// { id } đánh dấu 1 thông báo đã đọc | {} đánh dấu tất cả
export async function POST(request) {
  const session = await getSession();
  if (!isStaff(session)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json().catch(() => ({}));
    await markAdminNotificationsRead(body.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Admin notifications POST error:', e);
    return NextResponse.json({ message: 'Lỗi cập nhật' }, { status: 500 });
  }
}
