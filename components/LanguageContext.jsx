'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const translations = {
  vi: {
    home: "Trang chủ",
    search: "Tìm kiếm...",
    watch_now: "XEM NGAY",
    featured: "Phim Đề Cử",
    theatrical: "Phim Chiếu Rạp",
    latest: "Phim Mới Cập Nhật",
    action_horror: "Hành Động & Kinh Dị",
    anime_romance: "Hoạt Hình & Tình Cảm",
    view_all: "Xem tất cả",
    status: "Trạng thái",
    duration: "Thời lượng",
    quality: "Chất lượng",
    language: "Ngôn ngữ",
    content: "Nội dung phim",
    episodes: "Danh sách tập",
    server: "Server",
    not_found: "Không tìm thấy phim",
    movie_not_found: "Phim không tồn tại",
    back_home: "Quay lại trang chủ"
  },
  en: {
    home: "Home",
    search: "Search...",
    watch_now: "WATCH NOW",
    featured: "Featured Movies",
    theatrical: "In Theaters",
    latest: "Latest Updates",
    action_horror: "Action & Horror",
    anime_romance: "Anime & Romance",
    view_all: "View all",
    status: "Status",
    duration: "Duration",
    quality: "Quality",
    language: "Language",
    content: "Synopsis",
    episodes: "Episodes",
    server: "Server",
    not_found: "Movie not found",
    movie_not_found: "Movie does not exist",
    back_home: "Back to Home"
  }
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('en');

  const toggleLang = () => {
    setLang(prev => prev === 'vi' ? 'en' : 'vi');
  };

  const t = translations[lang];

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
