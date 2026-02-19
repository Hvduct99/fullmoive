import './globals.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { LanguageProvider } from '../components/LanguageContext';
import { getSession } from '@/lib/session';

export const metadata = {
  title: 'PhimXomClone - Xem Phim Online',
  description: 'Website xem phim online chất lượng cao, cập nhật nhanh nhất.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default async function RootLayout({ children }) {
  const session = await getSession();

  return (
    <html lang="vi">
      <body className="bg-black text-white font-sans antialiased overflow-x-hidden">
        <LanguageProvider>
          <Header session={session} />
          <main className="min-h-screen">
            {children}
          </main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
