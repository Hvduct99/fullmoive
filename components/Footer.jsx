const Footer = () => {
    return (
      <footer className="bg-surface text-gray-400 py-8 mt-10">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold text-white mb-4">GenzMovie</h3>
            <p className="text-sm">Trang xem phim trực tuyến miễn phí chất lượng cao. Cập nhật phim mới liên tục.</p>
          </div>
          <div>
            <h3 className="text-white font-bold mb-4">Danh Mục</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-primary">Phim Mới</a></li>
              <li><a href="#" className="hover:text-primary">Phim Chiếu Rạp</a></li>
              <li><a href="#" className="hover:text-primary">Phim Thuyết Minh</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-bold mb-4">Liên Hệ</h3>
            <ul className="space-y-2.5 text-sm">
              <li>Email: 11december1999duc@gmail.com</li>
              <li>
                <a
                  href="https://www.facebook.com/hoang.duc.645226/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-[#1877f2] transition-colors"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="#1877f2" aria-hidden="true">
                    <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07" />
                  </svg>
                  Facebook: Hoàng Đức
                </a>
              </li>
              <li>
                <a
                  href="https://zalo.me/0968635701"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-[#0068ff] transition-colors"
                >
                  <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded bg-[#0068ff] text-white text-[9px] font-black leading-none">Z</span>
                  Zalo: 0968 635 701
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="text-center text-xs mt-8 border-t border-gray-700 pt-4">
          Genzmovive 2026. All rights reserved.
        </div>
      </footer>
    );
  };
  
  export default Footer;
