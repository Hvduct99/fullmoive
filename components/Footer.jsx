const Footer = () => {
    return (
      <footer className="bg-surface text-gray-400 py-8 mt-10">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold text-white mb-4">PhimXomClone</h3>
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
            <p className="text-sm">Email: contact@phimmxomclone.com</p>
          </div>
        </div>
        <div className="text-center text-xs mt-8 border-t border-gray-700 pt-4">
          © 2024 PhimXomClone. All rights reserved.
        </div>
      </footer>
    );
  };
  
  export default Footer;
