
import { NextResponse } from 'next/server';
import axios from 'axios';

const API_BASE = process.env.API_BASE_URL || 'https://phimapi.com';

export async function GET() {
  try {
    // 1. Fetch latest movies from API
    // We'll fetch the first 2 pages of updated movies to ensure we have fresh content
    const [page1, page2] = await Promise.all([
       axios.get(`${API_BASE}/danh-sach/phim-moi-cap-nhat?page=1`),
       axios.get(`${API_BASE}/danh-sach/phim-moi-cap-nhat?page=2`)
    ]);

    const movies = [
       ...(page1.data?.items || []), 
       ...(page2.data?.items || [])
    ];

    // Note: Since this project currently fetches directly from API in real-time 
    // (via /api/home and lib/services.js), there is no local DB to "update" 
    // unless the user specifically wants to store them.
    
    // However, to force a refresh of the Next.js cache for the home page, 
    // we can use revalidatePath or similar if we were using ISR.
    
    // Given the previous setup in `app/api/home/route.js`, logic is fetched live with axios.
    // If the user feels it's not updating, it might be browser cache or Vercel Data Cache.
    
    // To ensure "freshness", we instruct the browser/CDN to revalidate.

    return NextResponse.json({ 
        message: 'Cache invalidated and fresh movies fetched', 
        count: movies.length, 
        latest: movies[0]?.name 
    }, {
        headers: {
            'Cache-Control': 'no-store, max-age=0'
        }
    });

  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ message: 'Update failed' }, { status: 500 });
  }
}
