import { NextResponse } from 'next/server';
import axios from 'axios';

const API_BASE = process.env.API_BASE_URL || 'https://phimapi.com';
const PRIORITY_YEAR = Number(process.env.PRIORITY_YEAR) || 2026;

const formatMovie = (movie) => {
    if (!movie) return null;
    const poster = movie.poster_url || '';
    const thumb = movie.thumb_url || '';
    const posterUrl = poster.startsWith('http') ? poster : `https://phimimg.com/${poster}`;
    const thumbUrl = thumb.startsWith('http') ? thumb : `https://phimimg.com/${thumb}`;
    return {
        ...movie,
        poster_url: posterUrl,
        thumb_url: thumbUrl,
        slug: movie.slug || movie._id
    };
};

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');
    
    if (!keyword) return NextResponse.json({ status: 'success', data: [] });

    try {
        const response = await axios.get(`${API_BASE}/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&limit=20`);
        if (response.data?.data?.items) {
            // Phim 2026 lên đầu, giữ thứ tự liên quan cho phần còn lại
            const items = response.data.data.items;
            const data = [
                ...items.filter(m => Number(m?.year) === PRIORITY_YEAR),
                ...items.filter(m => Number(m?.year) !== PRIORITY_YEAR),
            ].map(formatMovie);
            return NextResponse.json({ status: 'success', data });
        } else {
            return NextResponse.json({ status: 'success', data: [] });
        }
    } catch (error) {
        return NextResponse.json({ status: 'success', data: [] });
    }
}
