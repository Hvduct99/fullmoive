<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");

require_once '../config.php';
require_once '../includes/functions.php';

$section = isset($_GET['section']) ? $_GET['section'] : '';

$response = [
    'status' => 'success',
    'data' => []
];

switch ($section) {
    case 'netflix':
        // Section Netflix: Phim Netflix + Phim 2025
        $netflix_search = getMoviesByKeyword('Netflix');
        $action_2025 = getMoviesByGenre('hanh-dong', 2025, 20);
        $horror_2025 = getMoviesByGenre('kinh-di', 2025, 20);
        $romance_2025 = getMoviesByGenre('tinh-cam', 2025, 20);
        $series_2025 = getMoviesByList('phim-bo', 2025, 20);
        $single_2025 = getMoviesByList('phim-le', 2025, 20);

        $netflix_movies = array_merge($netflix_search, $series_2025, $single_2025, $action_2025, $horror_2025, $romance_2025);

        // Loại bỏ trùng lặp
        $temp_netflix = [];
        foreach ($netflix_movies as $m) {
            $temp_netflix[$m['slug']] = $m;
        }
        $netflix_movies = array_values($temp_netflix);
        shuffle($netflix_movies); // Trộn ngẫu nhiên
        $response['data'] = array_slice($netflix_movies, 0, 18);
        
        // Add poster full URL to data
        foreach ($response['data'] as &$movie) {
             $movie['poster_url'] = getPosterUrl($movie['poster_url']);
             $movie['thumb_url'] = getPosterUrl($movie['thumb_url']);
        }
        break;

    case 'theatrical':
        // Section Theatrical: Phim chiếu rạp
        $movies = getMoviesByList('phim-chieu-rap', null, 18);
        $response['data'] = $movies;
        
        foreach ($response['data'] as &$movie) {
             $movie['poster_url'] = getPosterUrl($movie['poster_url']);
             $movie['thumb_url'] = getPosterUrl($movie['thumb_url']);
        }
        break;

    case 'section1':
        // Section 1: Hành động & Kinh dị (Năm 2025)
        $action_movies = getMoviesByGenre('hanh-dong', 2025);
        $horror_movies = getMoviesByGenre('kinh-di', 2025);
        $movies = array_merge($action_movies, $horror_movies);

        $temp = [];
        foreach ($movies as $m) {
            $temp[$m['slug']] = $m;
        }
        $movies = array_values($temp);
        $response['data'] = array_slice($movies, 0, 18);
        
        foreach ($response['data'] as &$movie) {
             $movie['poster_url'] = getPosterUrl($movie['poster_url']);
             $movie['thumb_url'] = getPosterUrl($movie['thumb_url']);
        }
        break;

    case 'section2':
        // Section 2: Hoạt hình & Tình cảm
        $anime_movies = getMoviesByGenre('hoat-hinh');
        $romance_movies = getMoviesByGenre('tinh-cam');
        $movies = array_merge($anime_movies, $romance_movies);
        
        $temp = [];
        foreach ($movies as $m) {
            $temp[$m['slug']] = $m;
        }
        $movies = array_values($temp);
        
        $response['data'] = array_slice($movies, 0, 18);
        
        foreach ($response['data'] as &$movie) {
             $movie['poster_url'] = getPosterUrl($movie['poster_url']);
             $movie['thumb_url'] = getPosterUrl($movie['thumb_url']);
        }
        break;

    case 'latest':
        // Section 3: Phim tổng hợp (Mới cập nhật + Phim lẻ + Phim bộ các năm)
        $latest_movies = [];

        // 1. Phim mới cập nhật (Page 1)
        $data_new = callApi("https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=1", 1800);
        if ($data_new && isset($data_new['items'])) {
            $latest_movies = array_merge($latest_movies, $data_new['items']);
        }

        // 2. Phim lẻ (Lấy page 5 để có phim các năm trước)
        $data_single = callApi("https://phimapi.com/v1/api/danh-sach/phim-le?page=5", 1800);
        if ($data_single && isset($data_single['data']['items'])) {
            $latest_movies = array_merge($latest_movies, $data_single['data']['items']);
        }

        // 3. Phim bộ (Lấy page 5 để có phim các năm trước)
        $data_series = callApi("https://phimapi.com/v1/api/danh-sach/phim-bo?page=5", 1800);
        if ($data_series && isset($data_series['data']['items'])) {
            $latest_movies = array_merge($latest_movies, $data_series['data']['items']);
        }

        // Loại bỏ trùng lặp
        $temp = [];
        foreach ($latest_movies as $m) {
            $temp[$m['slug']] = $m;
        }
        $latest_movies = array_values($temp);

        // Lấy 24 phim cho danh sách dưới cùng
        $response['data'] = array_slice($latest_movies, 0, 24);
        
        foreach ($response['data'] as &$movie) {
             $movie['poster_url'] = getPosterUrl($movie['poster_url']);
             $movie['thumb_url'] = getPosterUrl($movie['thumb_url']);
        }
        break;

    case 'featured':
        // Lấy danh sách slider
        $slider_movies = [];
        
        // 1. Lấy phim mới cập nhật (An toàn nhất)
        $new_movies_data = callApi("https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=1", 1800);
        if ($new_movies_data && isset($new_movies_data['items'])) {
             $slider_movies = array_slice($new_movies_data['items'], 0, 5);
        }

        // 2. Nếu rỗng, thử lấy phim hành động
        if (empty($slider_movies)) {
            $action_movies = getMoviesByGenre('hanh-dong', 2024, 5); 
            if (!empty($action_movies)) {
                $slider_movies = $action_movies;
            }
        }

        // Lấy chi tiết cho từng phim
        $final_slider_data = [];
        foreach ($slider_movies as $movie) {
            $detail_url = "https://phimapi.com/phim/" . $movie['slug'];
            $detail_data = callApi($detail_url, 3600);
            
            if ($detail_data && isset($detail_data['movie'])) {
                $m = $detail_data['movie'];
                $m['poster_url'] = getPosterUrl($m['poster_url']);
                $m['thumb_url'] = getPosterUrl($m['thumb_url']);
                $final_slider_data[] = $m;
            } else {
                // Nếu lỗi lấy chi tiết, dùng thông tin cơ bản
                $movie['poster_url'] = getPosterUrl($movie['poster_url']);
                $movie['thumb_url'] = getPosterUrl($movie['thumb_url']);
                // Mock thiếu content/quality nếu cần
                if(!isset($movie['content'])) $movie['content'] = '';
                if(!isset($movie['quality'])) $movie['quality'] = 'HD';
                if(!isset($movie['time'])) $movie['time'] = 'N/A';
                if(!isset($movie['lang'])) $movie['lang'] = 'Vietsub';
                $final_slider_data[] = $movie;
            }
        }
        
        // Nếu vẫn rỗng (lỗi mạng toàn tập), tạo dummy data để không trống layout
        if (empty($final_slider_data)) {
            $final_slider_data[] = [
                'name' => 'WebPhim Demo',
                'slug' => '#',
                'origin_name' => 'Welcome',
                'content' => 'Hệ thống đang cập nhật phim mới. Vui lòng quay lại sau.',
                'year' => date('Y'),
                'quality' => 'HD',
                'time' => 'N/A',
                'poster_url' => 'assets/images/banner-default.jpg', // Cần đảm bảo ảnh này có hoặc dùng placeholder online
                'thumb_url' => 'assets/images/banner-default.jpg'
            ];
        }
        
        $response['data'] = $final_slider_data;
        break;

    default:
        $response['status'] = 'error';
        $response['message'] = 'Invalid section';
        break;
}

echo json_encode($response);
?>
