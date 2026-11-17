import { NextResponse } from 'next/server';

// Chỉ kiểm tra cookie có tồn tại để chuyển hướng sớm (giữ lại trang đích qua ?next=).
// Xác thực chữ ký + thiết bị vẫn do server layout (getSession) đảm nhiệm.
export function middleware(request) {
  if (!request.cookies.get('session')?.value) {
    const url = request.nextUrl.clone();
    const next = request.nextUrl.pathname + request.nextUrl.search;
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(next)}`;
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  res.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return res;
}

export const config = {
  matcher: ['/user/:path*'],
};
