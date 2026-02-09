import './globals.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { LanguageProvider } from '../components/LanguageContext';

export const metadata = {
  title: 'PhimXomClone - Xem Phim Online',
  description: 'Website xem phim online chất lượng cao, cập nhật nhanh nhất.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body className="bg-black text-white font-sans antialiased">
        <LanguageProvider>
          <Header />
          <main className="min-h-screen">
            {children}
          </main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
