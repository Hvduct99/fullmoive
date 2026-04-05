import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import pool from '@/lib/db';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get('avatar');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ message: 'Vui lòng chọn ảnh' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ message: 'Chỉ hỗ trợ ảnh JPG, PNG, WebP, GIF' }, { status: 400 });
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ message: 'Ảnh tối đa 2MB' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `avatar_${session.userId}_${Date.now()}.${ext}`;
    const filepath = path.join(process.cwd(), 'public', 'avatars', filename);

    await writeFile(filepath, buffer);

    const avatarUrl = `/avatars/${filename}`;

    // Update user avatar in DB
    await pool.query('UPDATE users SET avatar = ? WHERE id = ?', [avatarUrl, session.userId]);

    return NextResponse.json({ message: 'Cập nhật ảnh đại diện thành công!', avatar: avatarUrl });
  } catch (error) {
    console.error('Upload avatar error:', error);
    return NextResponse.json({ message: 'Upload thất bại' }, { status: 500 });
  }
}
