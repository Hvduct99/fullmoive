import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { buyPassWithBalance, walletErrorResponse } from '@/lib/wallet';

export const dynamic = 'force-dynamic';

// Mua / gia hạn Pass, trừ thẳng vào số dư ví
export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    const { planId } = await request.json();
    const user = await buyPassWithBalance(session.userId, planId);
    return NextResponse.json({ message: 'Kích hoạt thành công! Năng lượng đã được nạp đầy ⚡', user });
  } catch (e) {
    return walletErrorResponse(NextResponse, e, 'Lỗi kích hoạt gói');
  }
}
