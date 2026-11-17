import axios from 'axios';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';

const API_BASE = 'https://phimapi.com';
const TIMEOUT = 15000;

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

// ===== Ưu tiên phim năm 2026 lên đầu =====
export const PRIORITY_YEAR = Number(process.env.PRIORITY_YEAR) || 2026;
const PER_PAGE = 24;

const isPriority = (m) => Number(m?.year) === PRIORITY_YEAR;

/** Đưa phim PRIORITY_YEAR lên đầu, giữ nguyên thứ tự tương đối (sort ổn định). */
export function prioritizeYear(movies) {
    const top = [];
    const rest = [];
    for (const m of movies || []) (isPriority(m) ? top : rest).push(m);
    return [...top, ...rest];
}

/** Xáo trộn (Fisher–Yates), ưu tiên năm, rồi lấy n phần tử. */
function pickPrioritized(movies, n) {
    const arr = [...movies];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return prioritizeYear(arr).slice(0, n);
}

const EMPTY = { data: { status: false, data: null } };

/**
 * Danh sách có phân trang với TOÀN BỘ phim PRIORITY_YEAR đứng trước:
 *  - Trang 1..P: lấy từ API lọc year=PRIORITY_YEAR (đủ, đúng thứ tự cập nhật).
 *  - Trang P+1..: lấy danh sách thường, loại phim PRIORITY_YEAR (đã hiện ở trên).
 * → Không trùng, không sót phim nào.
 */
const fetchPrioritizedList = unstable_cache(
    async (kind, slug, page) => {
        const base = `${API_BASE}/v1/api/${kind}/${encodeURIComponent(slug)}`;
        const [yearFirst, defaultFirst] = await Promise.all([
            axiosInstance.get(`${base}?page=1&limit=${PER_PAGE}&year=${PRIORITY_YEAR}`).catch(() => EMPTY),
            axiosInstance.get(`${base}?page=1&limit=${PER_PAGE}`).catch(() => EMPTY),
        ]);

        const ok = (r) => (r.data?.status === true || r.data?.status === 'success') && r.data?.data;
        const def = ok(defaultFirst) ? defaultFirst.data.data : null;
        const yr = ok(yearFirst) ? yearFirst.data.data : null;
        if (!def && !yr) return null;

        const title = def?.titlePage || yr?.titlePage || slug;
        const yearTotal = Number(yr?.params?.pagination?.totalItems || 0);
        const yearPages = Math.ceil(yearTotal / PER_PAGE);
        const defaultPages = Number(def?.params?.pagination?.totalPages || 0);
        const totalPages = yearPages + defaultPages;

        let items = [];
        if (page <= yearPages) {
            if (page === 1) {
                items = yr.items || [];
            } else {
                const r = await axiosInstance.get(`${base}?page=${page}&limit=${PER_PAGE}&year=${PRIORITY_YEAR}`).catch(() => EMPTY);
                items = ok(r) ? r.data.data.items || [] : [];
            }
        } else {
            const q = page - yearPages;
            let list = [];
            if (q === 1) {
                list = def?.items || [];
            } else if (q <= defaultPages) {
                const r = await axiosInstance.get(`${base}?page=${q}&limit=${PER_PAGE}`).catch(() => EMPTY);
                list = ok(r) ? r.data.data.items || [] : [];
            }
            // API lọc năm lỗi (yearPages = 0) → vẫn ưu tiên trong trang; ngược lại loại phim đã hiện
            items = yearPages > 0 ? list.filter((m) => !isPriority(m)) : prioritizeYear(list);
        }

        return { title, movies: items.map(formatMovie), totalPages };
    },
    ['prioritized-list-v1'],
    { revalidate: 300, tags: ['movies'] }
);

// Use React cache to deduplicate requests for the same slug in a render pass
// Wrap the fetching logic with unstable_cache for ISR (1 hour cache)
export const getMovieDetail = unstable_cache(
    cache(async (slug) => {
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
    }),
    ['movie-detail'],
    { revalidate: 3600 } // Cache for 1 hour
);

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
                });
                data = pickPrioritized(data, 18).map(formatMovie); // 2026 lên đầu

            } else if (section === 'featured') {
                // HeroBanner: Only Sci-Fi (Vien Tuong) & Horror (Kinh Di)
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
                    }).sort((a, b) => (isPriority(b) - isPriority(a)) || ((Number(b.year) || 0) - (Number(a.year) || 0))).slice(0, 5);
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
            });
            data = pickPrioritized(data, 20).map(formatMovie);

        } else if (section === 'theatrical') {
            const response = await axiosInstance.get(`${API_BASE}/v1/api/danh-sach/phim-chieu-rap?limit=12`);
            if (response.data?.data?.items) data = prioritizeYear(response.data.data.items).map(formatMovie);

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
                 });
                 data = pickPrioritized(data, 12).map(formatMovie);

        } else if (section === 'section2') {
             const anime = await axiosInstance.get(`${API_BASE}/v1/api/danh-sach/hoat-hinh?limit=12`);
             const romance = await axiosInstance.get(`${API_BASE}/v1/api/the-loai/tinh-cam?limit=12`);
             let movies = [];
             if (anime.data?.data?.items) movies = [...movies, ...anime.data.data.items];
             if (romance.data?.data?.items) movies = [...movies, ...romance.data.data.items];
             const seen2 = new Set();
             movies = movies.filter(m => !seen2.has(m.slug) && seen2.add(m.slug));
             data = pickPrioritized(movies, 12).map(formatMovie);

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
             });
             data = prioritizeYear(data).slice(0, 12).map(formatMovie);
        } else {
            const response = await axiosInstance.get(`${API_BASE}/danh-sach/phim-moi-cap-nhat?page=1`);
            if (response.data?.items) data = prioritizeYear(response.data.items).map(formatMovie);
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

const safePage = (p) => Math.max(1, Math.min(10000, parseInt(p, 10) || 1));

export async function getMoviesByGenre(slug, page = 1) {
    try {
        const res = await fetchPrioritizedList('the-loai', slug, safePage(page));
        if (res) return res;
        return { title: slug, movies: [], totalPages: 0 };
    } catch (e) {
        console.error(`Error fetching genre ${slug}:`, e.message);
        return { title: slug, movies: [], totalPages: 0 };
    }
}

export async function getMoviesByList(slug, page = 1) {
    try {
        if (slug !== 'netflix') {
            const res = await fetchPrioritizedList('danh-sach', slug, safePage(page));
            if (res) return res;
        }
        if (slug === 'netflix') {
            // Netflix không có endpoint danh sách riêng → dùng section (đã ưu tiên 2026)
            const netflixMovies = await getMoviesBySection('netflix');
            return { title: 'Netflix', movies: netflixMovies, totalPages: 1 };
        }
        return { title: slug, movies: [], totalPages: 0 };
    } catch (e) {
        console.error(`Error fetching list ${slug}:`, e.message);
        return { title: slug, movies: [], totalPages: 0 };
    }
}
