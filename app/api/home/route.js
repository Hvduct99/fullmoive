import { NextResponse } from 'next/server';
import axios from 'axios';

const API_BASE = process.env.API_BASE_URL || 'https://phimapi.com';

const formatMovie = (movie) => {
    if (!movie) return null;
    const poster = movie.poster_url || '';
    const thumb = movie.thumb_url || '';
    const posterUrl = poster.startsWith('http') ? poster : `https://img.phimapi.com/${poster}`;
    const thumbUrl = thumb.startsWith('http') ? thumb : `https://img.phimapi.com/${thumb}`;
    return {
        ...movie,
        poster_url: posterUrl,
        thumb_url: thumbUrl,
        slug: movie.slug || movie._id
    };
};

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section') || 'latest';
    let data = [];

    try {
        if (section === 'netflix') {
            const response = await axios.get(`${API_BASE}/v1/api/tim-kiem?keyword=Netflix&limit=18`);
            if (response.data?.data?.items) data = response.data.data.items.map(formatMovie);
        } else if (section === 'theatrical') {
            const response = await axios.get(`${API_BASE}/v1/api/danh-sach/phim-chieu-rap?limit=18`);
            if (response.data?.data?.items) data = response.data.data.items.map(formatMovie);
        } else if (section === 'section1') {
            const action = await axios.get(`${API_BASE}/v1/api/the-loai/hanh-dong?limit=10`);
            const horror = await axios.get(`${API_BASE}/v1/api/the-loai/kinh-di?limit=10`);
            let movies = [];
            if (action.data?.data?.items) movies = [...movies, ...action.data.data.items];
            if (horror.data?.data?.items) movies = [...movies, ...horror.data.data.items];
            data = movies.sort(() => 0.5 - Math.random()).slice(0, 18).map(formatMovie);
        } else if (section === 'section2') {
             const anime = await axios.get(`${API_BASE}/v1/api/the-loai/hoat-hinh?limit=10`);
             const romance = await axios.get(`${API_BASE}/v1/api/the-loai/tinh-cam?limit=10`);
             let movies = [];
             if (anime.data?.data?.items) movies = [...movies, ...anime.data.data.items];
             if (romance.data?.data?.items) movies = [...movies, ...romance.data.data.items];
             data = movies.sort(() => 0.5 - Math.random()).slice(0, 18).map(formatMovie);
        } else {
            const response = await axios.get(`${API_BASE}/danh-sach/phim-moi-cap-nhat?page=1`);
            if (response.data?.items) data = response.data.items.map(formatMovie);
        }
        return NextResponse.json({ status: 'success', data: data.filter(m => m) });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ status: 'error', data: [] });
    }
}
