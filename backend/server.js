const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
app.use(cors({
    origin: ALLOWED_ORIGIN
}));
app.use(express.json());

const API_BASE = process.env.API_BASE_URL || 'https://phimapi.com';

const formatMovie = (movie) => {
    if (!movie) return null;
    
    const poster = movie.poster_url || '';
    const thumb = movie.thumb_url || '';

    const posterUrl = poster.startsWith('http') 
        ? poster 
        : `https://img.phimapi.com/${poster}`;
        
    const thumbUrl = thumb.startsWith('http') 
        ? thumb 
        : `https://img.phimapi.com/${thumb}`;

    return {
        ...movie,
        poster_url: posterUrl,
        thumb_url: thumbUrl,
        slug: movie.slug || movie._id
    };
};

// Route: Get Home Data (Sections)
app.get('/api/home', async (req, res) => {
    try {
        const section = req.query.section || 'latest';
        let data = [];

        if (section === 'netflix') {
            const response = await axios.get(`${API_BASE}/v1/api/tim-kiem?keyword=Netflix&limit=18`);
            if (response.data?.data?.items) {
                data = response.data.data.items.map(formatMovie);
            }
        } 
        else if (section === 'theatrical') {
            const response = await axios.get(`${API_BASE}/v1/api/danh-sach/phim-chieu-rap?limit=18`);
            if (response.data?.data?.items) {
                data = response.data.data.items.map(formatMovie);
            }
        }
        else if (section === 'section1') { 
             const action = await axios.get(`${API_BASE}/v1/api/the-loai/hanh-dong?limit=10`);
             const horror = await axios.get(`${API_BASE}/v1/api/the-loai/kinh-di?limit=10`);
             
             let movies = [];
             if (action.data?.data?.items) movies = [...movies, ...action.data.data.items];
             if (horror.data?.data?.items) movies = [...movies, ...horror.data.data.items];
             
             data = movies.sort(() => 0.5 - Math.random()).slice(0, 18).map(formatMovie);
        }
        else if (section === 'section2') {
             const anime = await axios.get(`${API_BASE}/v1/api/the-loai/hoat-hinh?limit=10`);
             const romance = await axios.get(`${API_BASE}/v1/api/the-loai/tinh-cam?limit=10`);
             
             let movies = [];
             if (anime.data?.data?.items) movies = [...movies, ...anime.data.data.items];
             if (romance.data?.data?.items) movies = [...movies, ...romance.data.data.items];
             
             data = movies.sort(() => 0.5 - Math.random()).slice(0, 18).map(formatMovie);
        }
        else {
            const response = await axios.get(`${API_BASE}/danh-sach/phim-moi-cap-nhat?page=1`);
            if (response.data?.items) {
                data = response.data.items.map(formatMovie);
            }
        }
        
        data = data.filter(m => m !== null);

        res.json({ status: 'success', data });

    } catch (error) {
        console.error(`Error fetching ${req.query.section}:`, error.message);
        res.json({ status: 'error', data: [] });
    }
});

// Route: Get Movie Details
app.get('/api/movie/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const response = await axios.get(`${API_BASE}/phim/${slug}`);
        if (response.data?.movie) {
            const movieData = {
                ...response.data.movie,
                episodes: response.data.episodes || []
            };
            res.json({ status: 'success', movie: movieData });
        } else {
            res.status(404).json({ status: 'error', message: 'Movie not found' });
        }
    } catch (error) {
        console.error('Error fetching movie details:', error.message);
        res.status(500).json({ status: 'error', message: 'Failed to fetch movie details' });
    }
});

// Route: Search
app.get('/api/search', async (req, res) => {
    try {
        const { keyword } = req.query;
        if (!keyword) return res.json({ status: 'success', data: [] });
        
        const response = await axios.get(`${API_BASE}/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&limit=20`);
        if (response.data?.data?.items) {
            const data = response.data.data.items.map(formatMovie);
            res.json({ status: 'success', data });
        } else {
            res.json({ status: 'success', data: [] });
        }
    } catch (error) {
        res.json({ status: 'success', data: [] });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Backend Server running on port ${PORT}`);
});
