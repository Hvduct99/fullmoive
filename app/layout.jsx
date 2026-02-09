import './globals.css';
import Header from '../components/Header';
import Footer from '../components/Footer';

export const metadata = {
  title: 'PhimXomClone - Xem Phim Online',
  description: 'Website xem phim online chất lượng cao, cập nhật nhanh nhất.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body className="bg-black text-white font-sans antialiased">
        <Header />
        <main className="min-h-screen container mx-auto px-4 py-6">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
