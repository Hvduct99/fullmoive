import { NextResponse } from 'next/server';
import { getSession, createSession, deleteSession } from '@/lib/session';
import { getUserById } from '@/lib/wallet';

// Bắt buộc dynamic: route này phụ thuộc cookie của từng người dùng.
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0' };

export async function GET(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null }, { headers: NO_STORE });

  let user;
  try {
    user = await getUserById(session.userId);
  } catch (error) {
    // DB lỗi tạm thời: vẫn coi là đăng nhập dựa trên JWT hợp lệ
    console.error('Session route DB error:', error.message);
    return NextResponse.json({ user: { id: session.userId, role: session.role } }, { headers: NO_STORE });
  }

  if (!user || user.status === 'banned') {
    await deleteSession();
    return NextResponse.json({ user: null }, { headers: NO_STORE });
  }

  // Phiên cũ chưa có mã thiết bị → cấp lại để hiện trong "Quản lý thiết bị"
  if (!session.sid) {
    await createSession(user.id, user.role, request);
  }

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      faction: user.faction === 'girlz' ? 'girlz' : 'boiz',
    },
  }, { headers: NO_STORE });
}
