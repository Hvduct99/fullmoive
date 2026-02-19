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

export const dynamic = 'force-dynamic'; // Force dynamic rendering to fetch fresh data

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section') || 'latest';
    let data = [];

    try {
        if (section === 'netflix') {
            const response = await axios.get(`${API_BASE}/v1/api/tim-kiem?keyword=Netflix&limit=18`);
            if (response.data?.data?.items) data = response.data.data.items.map(formatMovie);
        } else if (section === 'featured') {
            // Logic cho Slider (Hero Section)
            let sliderMovies = [];
            try {
                // 1. Lấy phim mới cập nhật
                const newMoviesFn = await axios.get(`${API_BASE}/danh-sach/phim-moi-cap-nhat?page=1`);
                if (newMoviesFn.data?.items) {
                    sliderMovies = newMoviesFn.data.items.slice(0, 5);
                }
                
                // 2. Nếu rỗng, lấy phim hành động
                if (sliderMovies.length === 0) {
                     const actionFn = await axios.get(`${API_BASE}/v1/api/the-loai/hanh-dong?limit=5`);
                     if (actionFn.data?.data?.items) sliderMovies = actionFn.data.data.items;
                }

                // Lấy chi tiết từng phim để có ảnh đẹp/chất lượng cao hơn nếu cần
                // Note: API phimapi.com ds phim update trả về thumb/poster.
                // Nếu cần detail đầy đủ (ví dụ banner to), ta fetch detail. 
                // Ở đây ta map qua fetch detail.
                const detailPromises = sliderMovies.map(m => axios.get(`${API_BASE}/phim/${m.slug}`));
                const details = await Promise.allSettled(detailPromises);
                
                data = details.map((p, index) => {
                    if (p.status === 'fulfilled' && p.value.data?.movie) {
                        return formatMovie(p.value.data.movie);
                    }
                    return formatMovie(sliderMovies[index]);
                });

            } catch (err) {
                console.error("Error fetching featured movies:", err);
            }

            // Fallback nếu api chết
            if (data.length === 0) {
                 data = [{
                    slug: '#',
                    name: 'Welcome to WebPhim',
                    origin_name: 'Khám phá thế giới phim',
                    content: 'Hệ thống đang cập nhật phim mới. Vui lòng quay lại sau.',
                    poster_url: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=2670&auto=format&fit=crop',
                    thumb_url: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=2670&auto=format&fit=crop',
                    year: new Date().getFullYear(),
                    quality: 'HD'
                 }];
            }

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
