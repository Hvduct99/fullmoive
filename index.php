<?php
require_once "config.php";
$is_homepage = true;
require_once "includes/header.php";
require_once "includes/functions.php";

function renderSkeleton($count = 6) {
    for($i = 0; $i < $count; $i++) {
        echo '
        <div class="movie-card skeleton-card">
            <div class="card-thumb skeleton"></div>
            <div class="movie-info">
                <div class="movie-title skeleton"></div>
                <div class="movie-meta skeleton"></div>
            </div>
        </div>
        ';
    }
}

function renderHeroSkeleton() {
    echo '<div class="hero-section skeleton" style="height: 85vh; width: 100%; border-radius: 0;"></div>';
}
?>

<style>
    .loading-spinner {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 200px;
        color: var(--primary-color);
        font-size: 1.5rem;
    }
    .loading-spinner i {
        margin-right: 10px;
    }
</style>

<!-- Hero Section -->
<div id="hero-section">
    <?php renderHeroSkeleton(); ?>
</div>

<!-- Section Netflix -->
<div class="section-header fade-in-up">
    <h2 class="section-title">Phim Netflix</h2>
    <a href="#" class="view-all"><?php echo $lang['view_all']; ?> <i class="fas fa-chevron-right"></i></a>
</div>

<div class="movie-grid" id="netflix-grid">
    <?php renderSkeleton(6); ?>
</div>

<!-- Section Theatrical -->
<div class="section-header fade-in-up" style="margin-top: 40px;">
    <h2 class="section-title">Phim Chiếu Rạp</h2>
    <a href="#" class="view-all"><?php echo $lang['view_all']; ?> <i class="fas fa-chevron-right"></i></a>
</div>

<div class="movie-grid" id="theatrical-grid">
    <?php renderSkeleton(6); ?>
</div>

<!-- Section 1: Action & Horror 2025 -->
<div class="section-header fade-in-up">
    <h2 class="section-title"><?php echo $lang['section_1_title']; ?></h2>
    <a href="#" class="view-all"><?php echo $lang['view_all']; ?> <i class="fas fa-chevron-right"></i></a>
</div>

<div class="movie-grid" id="section1-grid">
    <?php renderSkeleton(6); ?>
</div>

<!-- Section 2: Anime & Romance -->
<div class="section-header fade-in-up" style="margin-top: 40px;">
    <h2 class="section-title"><?php echo $lang['section_2_title']; ?></h2>
    <a href="#" class="view-all"><?php echo $lang['view_all']; ?> <i class="fas fa-chevron-right"></i></a>
</div>

<div class="movie-grid" id="section2-grid">
    <?php renderSkeleton(6); ?>
</div>

<!-- Section 3: Latest Updates -->
<div class="section-header fade-in-up" style="margin-top: 40px;">
    <h2 class="section-title"><?php echo $lang['latest_movies']; ?></h2>
    <a href="#" class="view-all"><?php echo $lang['view_all']; ?> <i class="fas fa-chevron-right"></i></a>
</div>

<div class="movie-grid" id="latest-grid">
    <?php renderSkeleton(6); ?>
</div>

<?php
require_once "includes/footer.php";
?>

<!-- Swiper JS/CSS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css" />
<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>

<script>
document.addEventListener('DOMContentLoaded', function() {
    
    function renderMovieCard(movie) {
        return `
            <div class="movie-card fade-in-up">
                <a href="movie.php?slug=${movie.slug}">
                    <div class="card-thumb">
                        <img src="${movie.poster_url}" alt="${movie.name}" loading="lazy">
                        <div class="play-btn-overlay"><i class="far fa-play-circle"></i></div>
                    </div>
                    <div class="movie-info">
                        <h3 class="movie-title">${movie.name}</h3>
                        <div class="movie-meta">
                            <span>${movie.year}</span>
                            <span>${movie.origin_name}</span>
                        </div>
                    </div>
                </a>
            </div>
        `;
    }

    function renderHeroSlider(movies) {
        if (!movies || movies.length === 0) return '';
        
        let slidesHtml = movies.map(movie => {
            // Safe access to category
            let genres = '';
            if (movie.category && Array.isArray(movie.category)) {
                genres = movie.category.map(c => c.name).slice(0, 3).join(', ');
            }
            
            return `
            <div class="swiper-slide">
                <div class="hero-slide-item" onclick="window.location.href='movie.php?slug=${movie.slug}'" style="cursor: pointer;">
                    <img src="${movie.poster_url}" alt="${movie.name}" class="hero-bg" loading="lazy" onerror="this.src='https://placehold.co/1200x600/333/FFF?text=No+Image'">
                    <div class="hero-overlay"></div>
                    <div class="hero-content">
                        <div class="hero-info-box">
                            <h1 class="hero-title">${movie.name}</h1>
                            <h2 class="hero-subtitle">${movie.origin_name || ''}</h2>
                            
                            <div class="hero-meta">
                                <span class="meta-badge quality">${movie.quality}</span>
                                <span class="meta-badge">${movie.lang}</span>
                                <span class="meta-badge">${movie.year}</span>
                                ${movie.time ? `<span class="meta-badge"><i class="far fa-clock"></i> ${movie.time}</span>` : ''}
                                ${genres ? `<span class="meta-badge" style="background:transparent; border:none; padding-left:0;">${genres}</span>` : ''}
                            </div>
                            
                            <p class="hero-desc">
                                ${movie.content ? movie.content.replace(/<[^>]*>?/gm, '').substring(0, 250) + '...' : ''}
                            </p>
                            
                            <div class="hero-actions">
                                <a href="movie.php?slug=${movie.slug}" class="btn-watch">
                                    <i class="fas fa-play"></i> Xem ngay
                                </a>
                                <a href="movie.php?slug=${movie.slug}" class="btn-detail">
                                    <i class="fas fa-info-circle"></i> Chi tiết
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `}).join('');

        return `
        <div class="hero-section swiper mySwiper">
            <div class="swiper-wrapper">
                ${slidesHtml}
            </div>
            <div class="swiper-button-next"></div>
            <div class="swiper-button-prev"></div>
            <div class="swiper-pagination"></div>
        </div>
        `;
    }

    function initSwiper() {
        if (document.querySelector('.mySwiper')) {
            new Swiper(".mySwiper", {
                spaceBetween: 0,
                effect: "fade", // Hiệu ứng mờ dần
                lazy: true,
                loop: true,
                autoplay: {
                    delay: 5000,
                    disableOnInteraction: false,
                },
                navigation: {
                    nextEl: ".swiper-button-next",
                    prevEl: ".swiper-button-prev",
                },
                pagination: {
                    el: ".swiper-pagination",
                    clickable: true,
                },
            });
        }
    }

    function loadSection(section, containerId, isHero = false) {
        fetch(`api/home_data.php?section=${section}`)
            .then(response => response.json())
            .then(data => {
                const container = document.getElementById(containerId);
                if (data.status === 'success' && data.data) {
                    if (isHero) {
                        // Expect array for slider now
                        if (Array.isArray(data.data) && data.data.length > 0) {
                            container.outerHTML = renderHeroSlider(data.data);
                            initSwiper(); // Init swiper after rendering html
                        } else {
                            // Fallback if single object or empty
                            console.warn('Hero data is not array or empty', data.data);
                            container.style.display = 'none';
                        }
                    } else {
                        // Check if data is array
                        if (Array.isArray(data.data) && data.data.length > 0) {
                            container.innerHTML = data.data.map(renderMovieCard).join('');
                             const newElements = container.querySelectorAll('.fade-in-up');
                             const observer = new IntersectionObserver((entries, observer) => {
                                 entries.forEach(entry => {
                                     if (entry.isIntersecting) {
                                         entry.target.classList.add('visible');
                                         observer.unobserve(entry.target);
                                     }
                                 });
                             }, { threshold: 0.1 });
                             newElements.forEach(el => observer.observe(el));
                        } else {
                            container.innerHTML = '<p>Không có dữ liệu.</p>';
                        }
                    }
                } else {
                    container.innerHTML = '<p>Không thể tải dữ liệu.</p>';
                }
            })
            .catch(err => {
                console.error(`Error loading ${section}:`, err);
                document.getElementById(containerId).innerHTML = '<p>Lỗi tải dữ liệu.</p>';
            });
    }

    // Load all sections asynchronously
    loadSection('featured', 'hero-section', true);
    loadSection('netflix', 'netflix-grid');
    setTimeout(() => loadSection('theatrical', 'theatrical-grid'), 200);
    setTimeout(() => loadSection('section1', 'section1-grid'), 400);
    setTimeout(() => loadSection('section2', 'section2-grid'), 600);
    setTimeout(() => loadSection('latest', 'latest-grid'), 800);
});
</script>
