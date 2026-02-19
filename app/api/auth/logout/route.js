
import { NextResponse } from 'next/server';
import { deleteSession } from '../../../../../lib/session';

export async function POST(request) {
  deleteSession();
  return NextResponse.redirect(new URL('/login', request.url));
}
