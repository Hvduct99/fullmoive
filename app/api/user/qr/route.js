import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'assets', 'images', 'QR', 'QR.jpg');
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ message: 'QR image not found' }, { status: 404 });
    }

    const imageBuffer = fs.readFileSync(filePath);
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (error) {
    console.error('QR image error:', error);
    return NextResponse.json({ message: 'Lỗi khi đọc QR image' }, { status: 500 });
  }
}
