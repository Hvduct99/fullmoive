const express = require('express');
const next = require('next');
const cors = require('cors'); // Use cors if you need external access to API, otherwise internal is fine
const axios = require('axios');
require('dotenv').config();

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const port = process.env.PORT || 3000;

// Database Logic
const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'movie_db',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0
});

// API Logic helper
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

app.prepare().then(() => {
  const server = express();
  server.use(express.json());
  server.use(cors()); // Optional: limit to specific domains if needed

  // --- API Routes (from backend/server.js) ---

  server.get('/api/home', async (req, res) => {
    try {
        const section = req.query.section || 'latest';
        let data = [];
        
        // Example: logic fetching from external API, later you can switch to DB `pool.query(...)`
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
        res.json({ status: 'success', data: data.filter(m => m) });
    } catch (e) {
        console.error(e);
        res.json({ status: 'error', data: [] });
    }
  });

  server.get('/api/movie/:slug', async (req, res) => {
      try {
        const { slug } = req.params;
        const response = await axios.get(`${API_BASE}/phim/${slug}`);
        if (response.data?.movie) {
            const movieData = { ...response.data.movie, episodes: response.data.episodes || [] };
            res.json({ status: 'success', movie: movieData });
        } else {
            res.status(404).json({ status: 'error', message: 'Not found' });
        }
      } catch (e) {
         res.status(500).json({ error: 'Internal error' });
      }
  });

  // Default Next.js handler
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});
