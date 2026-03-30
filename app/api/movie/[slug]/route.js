import { NextResponse } from 'next/server';
import axios from 'axios';

const API_BASE = process.env.API_BASE_URL || 'https://phimapi.com';

export async function GET(request, { params }) {
    const { slug } = params;
    try {
        const response = await axios.get(`${API_BASE}/phim/${slug}`);
        if (response.data?.movie) {
            const movieData = { ...response.data.movie, episodes: response.data.episodes || [] };
            return NextResponse.json({ status: 'success', movie: movieData });
        } else {
            return NextResponse.json({ status: 'error', message: 'Not found' }, { status: 404 });
        }
    } catch (e) {
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
