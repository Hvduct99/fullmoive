import axios from 'axios';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';

const API_BASE = 'https://phimapi.com';
const TIMEOUT = 15000; // Increased timeout

// Initial configuration for axios
const axiosInstance = axios.create({
    timeout: TIMEOUT,
    headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    }
});

const formatMovie = (movie) => {
    if (!movie) return null;
    const poster = movie.poster_url || '';
    const thumb = movie.thumb_url || '';
    // Use phimimg.com as default CDN if not absolute URL
    const posterUrl = poster.startsWith('http') ? poster : `https://phimimg.com/${poster}`;
    const thumbUrl = thumb.startsWith('http') ? thumb : `https://phimimg.com/${thumb}`;
    return {
        ...movie,
        poster_url: posterUrl,
        thumb_url: thumbUrl,
        slug: movie.slug || movie._id
    };
};

// Use React cache to deduplicate requests for the same slug in a render pass
export const getMovieDetail = cache(async (slug) => {
    if (!slug) return null;
    try {
        const response = await axiosInstance.get(`${API_BASE}/phim/${slug}`);
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
});

// Wrap the fetching logic with unstable_cache for ISR (1 hour cache)
export const getMoviesBySection = unstable_cache(
    async (section) => {
        let data = [];
        const currentYear = new Date().getFullYear();
        const nextYear = currentYear + 1;

        try {
            if (section === 'netflix') {
                // Optimized: Reduced limits to save RAM on shared hosting
                const [netflixSearch, action, horror, romance, series, single] = await Promise.all([
                    axiosInstance.get(`${API_BASE}/v1/api/tim-kiem?keyword=Netflix&limit=10`).catch(() => ({ data: { data: { items: [] } } })),
                    axiosInstance.get(`${API_BASE}/v1/api/the-loai/hanh-dong?limit=18`).catch(() => ({ data: { data: { items: [] } } })),
                    axiosInstance.get(`${API_BASE}/v1/api/the-loai/kinh-di?limit=18`).catch(() => ({ data: { data: { items: [] } } })),
                    axiosInstance.get(`${API_BASE}/v1/api/the-loai/tinh-cam?limit=18`).catch(() => ({ data: { data: { items: [] } } })),
                    axiosInstance.get(`${API_BASE}/v1/api/danh-sach/phim-bo?limit=18`).catch(() => ({ data: { data: { items: [] } } })),
                    axiosInstance.get(`${API_BASE}/v1/api/danh-sach/phim-le?limit=18`).catch(() => ({ data: { data: { items: [] } } }))
                ]);

                const filterYear = (items) => items.filter(m => m.year == currentYear || m.year == nextYear);

                let combined = [
                    ...(netflixSearch.data?.data?.items || []),
                    ...filterYear(action.data?.data?.items || []),
                    ...filterYear(horror.data?.data?.items || []),
                    ...filterYear(romance.data?.data?.items || []),
                    ...filterYear(series.data?.data?.items || []),
                    ...filterYear(single.data?.data?.items || [])
                ];
                
                // Remove duplicates
                const seen = new Set();
                data = combined.filter(m => {
                    const duplicate = seen.has(m.slug);
                    seen.add(m.slug);
                    return !duplicate;
                }).sort(() => 0.5 - Math.random()).slice(0, 18).map(formatMovie); // Reduced to 18 to save RAM

            } else if (section === 'featured') {
                // HeroBanner: Only Sci-Fi (Viễn Tưởng) & Horror (Kinh Dị)
                let sliderMovies = [];
                try {
                    const [sciFi, horror] = await Promise.all([
                        axiosInstance.get(`${API_BASE}/v1/api/the-loai/vien-tuong?limit=12`).catch(() => ({ data: { data: { items: [] } } })),
                        axiosInstance.get(`${API_BASE}/v1/api/the-loai/kinh-di?limit=12`).catch(() => ({ data: { data: { items: [] } } }))
                    ]);

                    const sciFiItems = sciFi.data?.data?.items || [];
                    const horrorItems = horror.data?.data?.items || [];

                    // Combine, deduplicate, prioritize newer movies, pick top 8
                    const combined = [...sciFiItems, ...horrorItems];
                    const seen = new Set();
                    sliderMovies = combined.filter(m => {
                        if (seen.has(m.slug)) return false;
                        seen.add(m.slug);
                        return true;
                    }).sort((a, b) => (b.year || 0) - (a.year || 0)).slice(0, 5);
                } catch (e) {
                    console.error('Error fetching sci-fi/horror for hero:', e.message);
                }

                // Fetch details for better images
                if (sliderMovies.length > 0) {
                     const detailPromises = sliderMovies.map(m => axiosInstance.get(`${API_BASE}/phim/${m.slug}`).catch(() => null));
                     const details = await Promise.allSettled(detailPromises);
                     data = details.map((p, index) => {
                         if (p.status === 'fulfilled' && p.value?.data?.movie) return formatMovie(p.value.data.movie);
                         return formatMovie(sliderMovies[index]);
                     });
                }

                // Fallback
                if (data.length === 0) {
                     data = [{
                        slug: '#',
                        name: 'Welcome to GenzMovie',
                        origin_name: 'Khám phá thế giới phim Khoa Học Viễn Tưởng & Kinh Dị',
                        content: 'Hệ thống đang cập nhật phim mới. Vui lòng quay lại sau.',
                        poster_url: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=2670&auto=format&fit=crop',
                        thumb_url: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=2670&auto=format&fit=crop',
                        year: currentYear,
                        quality: 'HD',
                        lang: 'Vietsub'
                     }];
                }

        } else if (section === 'marquee') {
            // Marquee: More sci-fi + horror movies for horizontal scroll
            const [sciFi, horror] = await Promise.all([
                axiosInstance.get(`${API_BASE}/v1/api/the-loai/vien-tuong?limit=18`).catch(() => ({ data: { data: { items: [] } } })),
                axiosInstance.get(`${API_BASE}/v1/api/the-loai/kinh-di?limit=18`).catch(() => ({ data: { data: { items: [] } } }))
            ]);
            const combined = [
                ...(sciFi.data?.data?.items || []),
                ...(horror.data?.data?.items || [])
            ];
            const seen = new Set();
            data = combined.filter(m => {
                if (seen.has(m.slug)) return false;
                seen.add(m.slug);
                return true;
            }).sort(() => 0.5 - Math.random()).slice(0, 20).map(formatMovie);

        } else if (section === 'theatrical') {
            const response = await axiosInstance.get(`${API_BASE}/v1/api/danh-sach/phim-chieu-rap?limit=12`);
            if (response.data?.data?.items) data = response.data.data.items.map(formatMovie);

        } else if (section === 'section1') {
            // Action & Horror (Current/Next Year)
            const [action, horror] = await Promise.all([
                 axiosInstance.get(`${API_BASE}/v1/api/the-loai/hanh-dong?limit=12`),
                 axiosInstance.get(`${API_BASE}/v1/api/the-loai/kinh-di?limit=12`)
            ]);
            
            const filterYear = (items) => items.filter(m => m.year == currentYear || m.year == nextYear);
            
            let movies = [
                ...filterYear(action.data?.data?.items || []),
                ...filterYear(horror.data?.data?.items || [])
            ];
            
            // Deduplicate and Randomize
                 const seen = new Set();
                 data = movies.filter(m => {
                     const duplicate = seen.has(m.slug);
                     seen.add(m.slug);
                     return !duplicate;
                 }).sort(() => 0.5 - Math.random()).slice(0, 12).map(formatMovie);

        } else if (section === 'section2') {
             const anime = await axiosInstance.get(`${API_BASE}/v1/api/danh-sach/hoat-hinh?limit=12`);
             const romance = await axiosInstance.get(`${API_BASE}/v1/api/the-loai/tinh-cam?limit=12`);
             let movies = [];
             if (anime.data?.data?.items) movies = [...movies, ...anime.data.data.items];
             if (romance.data?.data?.items) movies = [...movies, ...romance.data.data.items];
             data = movies.sort(() => 0.5 - Math.random()).slice(0, 12).map(formatMovie);

        } else if (section === 'latest') {
             // 1. Phim moi cap nhat
             const dataNew = await axiosInstance.get(`${API_BASE}/danh-sach/phim-moi-cap-nhat?page=1`).catch(()=>({data:{items:[]}}));
             // 2. Phim le (older pages to get variety)
             const dataSingle = await axiosInstance.get(`${API_BASE}/v1/api/danh-sach/phim-le?page=2`).catch(()=>({data:{data:{items:[]}}}));
             // 3. Phim bo
             const dataSeries = await axiosInstance.get(`${API_BASE}/v1/api/danh-sach/phim-bo?page=2`).catch(()=>({data:{data:{items:[]}}}));

             let combined = [
                ...(dataNew.data?.items || []),
                ...(dataSingle.data?.data?.items || []),
                ...(dataSeries.data?.data?.items || [])
             ];

             const seen = new Set();
             data = combined.filter(m => {
                 const duplicate = seen.has(m.slug);
                 seen.add(m.slug);
                 return !duplicate;
             }).slice(0, 12).map(formatMovie);
        } else {
            const response = await axiosInstance.get(`${API_BASE}/danh-sach/phim-moi-cap-nhat?page=1`);
            if (response.data?.items) data = response.data.items.map(formatMovie);
        }
        
        return data.filter(m => m); // Filter nulls
    } catch (e) {
        console.error(`Error fetching section ${section}:`, e.message);
        return [];
    }
},
['movies-by-section'], // Cache key
{ revalidate: 1800, tags: ['movies'] } // Update every 30 minutes
);

export async function getMoviesByGenre(slug, page = 1) {
    try {
        const response = await axiosInstance.get(`${API_BASE}/v1/api/the-loai/${slug}?page=${page}&limit=24`);
        if (response.data?.status === true || response.data?.status === 'success') {
            if (response.data?.data) {
                return {
                    title: response.data.data.titlePage || slug,
                    movies: (response.data.data.items || []).map(formatMovie),
                    pagination: response.data.data.params?.pagination
                };
            }
        }
        return { title: slug, movies: [], pagination: null };
    } catch (e) {
        console.error(`Error fetching genre ${slug}:`, e.message);
        return { title: slug, movies: [], pagination: null };
    }
}

export async function getMoviesByList(slug, page = 1) {
    try {
        const response = await axiosInstance.get(`${API_BASE}/v1/api/danh-sach/${slug}?page=${page}&limit=24`);
         if (response.data?.status === true || response.data?.status === 'success') {
            if (response.data?.data) {
                return {
                    title: response.data.data.titlePage || slug,
                    movies: (response.data.data.items || []).map(formatMovie),
                    pagination: response.data.data.params?.pagination
                };
            }
        } else if (slug === 'netflix') {
             // Fallback customized logic if Netflix list API endpoint doesn't exist directly like generic lists
             const netflixMovies = await getMoviesBySection('netflix');
             return { title: 'Netflix', movies: netflixMovies, pagination: null };
        }
        return { title: slug, movies: [], pagination: null };
    } catch (e) {
        console.error(`Error fetching list ${slug}:`, e.message);
        return { title: slug, movies: [], pagination: null };
    }
}

