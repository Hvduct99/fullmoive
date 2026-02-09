import axios from 'axios';

const API_BASE = 'https://phimapi.com';

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

export async function getMoviesBySection(section) {
    let data = [];
    try {
        if (section === 'netflix') {
            const response = await axios.get(`${API_BASE}/v1/api/tim-kiem?keyword=Netflix&limit=18`);
            if (response.data?.data?.items) data = response.data.data.items.map(formatMovie);
        } else if (section === 'featured') {
            let sliderMovies = [];
            // 1. Fetch new movies
            try {
                const newMoviesFn = await axios.get(`${API_BASE}/danh-sach/phim-moi-cap-nhat?page=1`);
                if (newMoviesFn.data?.items) {
                    sliderMovies = newMoviesFn.data.items.slice(0, 5);
                }
            } catch (e) { console.error('Error fetching new movies for slider', e.message); }

            // 2. If empty, fetch action
            if (sliderMovies.length === 0) {
                 try {
                    const actionFn = await axios.get(`${API_BASE}/v1/api/the-loai/hanh-dong?limit=5`);
                    if (actionFn.data?.data?.items) sliderMovies = actionFn.data.data.items;
                 } catch (e) { console.error('Error fetching action movies for slider', e.message); }
            }

            // Fetch Details
            const detailPromises = sliderMovies.map(m => axios.get(`${API_BASE}/phim/${m.slug}`));
            const details = await Promise.allSettled(detailPromises);
            
            data = details.map((p, index) => {
                if (p.status === 'fulfilled' && p.value.data?.movie) {
                    return formatMovie(p.value.data.movie);
                }
                return formatMovie(sliderMovies[index]);
            });
            
             // Fallback
            if (data.length === 0) {
                 data = [{
                    slug: '#',
                    name: 'Welcome to WebPhim',
                    origin_name: 'Khám phá thế giới phim',
                    content: 'Hệ thống đang cập nhật phim mới. Vui lòng quay lại sau.',
                    poster_url: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=2670&auto=format&fit=crop',
                    thumb_url: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=2670&auto=format&fit=crop',
                    year: new Date().getFullYear(),
                    quality: 'HD',
                    lang: 'Vietsub'
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
        return data.filter(m => m); // Filter nulls
    } catch (e) {
        console.error(`Error fetching section ${section}:`, e.message);
        return [];
    }
}

export async function getMovieDetail(slug) {
    try {
        const response = await axios.get(`${API_BASE}/phim/${slug}`);
        if (response.data?.status && response.data?.movie) {
             const movieData = { 
                 ...response.data.movie, 
                 episodes: response.data.episodes || [] 
             };
             // Ensure URLs are absolute
             movieData.poster_url = formatMovie(movieData).poster_url;
             movieData.thumb_url = formatMovie(movieData).thumb_url;
             return movieData;
        }
        return null;
    } catch (e) {
        console.error(`Error fetching movie detail ${slug}:`, e.message);
        return null;
    }
}
