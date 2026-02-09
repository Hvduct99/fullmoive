# Movie Project (Next.js + Node.js + MariaDB)

## Setup Guide

### 1. Database Setup
1. Make sure you have MariaDB installed and running.
2. Create a database named `movie_db`.
3. Import the schema from `database/schema.sql`.
   ```bash
   mariadb -u root -p movie_db < database/schema.sql
   ```

### 2. Backend Setup
1. Navigate to the `backend` folder.
   ```bash
   cd backend
   ```
2. Install dependencies.
   ```bash
   npm install
   ```
3. Configure `.env` file with your database credentials.
4. Start the server.
   ```bash
   npm start
   ```
   Server runs on `http://localhost:5000`.

### 3. Frontend Setup
1. Navigate to the `frontend` folder.
   ```bash
   cd frontend
   ```
2. Install dependencies.
   ```bash
   npm install
   ```
3. Run the development server.
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

## Features
- **Frontend**: Next.js 14 App Router, Tailwind CSS 3.4.10.
- **Backend**: Express.js API proxying data from `phimapi.com` (mimicking `home_data.php` logic).
- **Database**: MariaDB structure ready for local data storage.
- **SEO**: Dynamic metadata and clean slugs for `/phim/[slug]`.
