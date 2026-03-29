import './globals.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import UserSidebar from '../components/UserSidebar';
import { LanguageProvider } from '../components/LanguageContext';

export const metadata = {
  title: 'GenzMovie - Xem Phim Online',
  description: 'GenzMovie - Website xem phim online chất lượng cao, cập nhật nhanh nhất.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body className="bg-black text-white font-sans antialiased overflow-x-hidden">
        <LanguageProvider>
          <Header />
          <div className="flex min-h-screen">
            <UserSidebar />
            <main className="flex-1 min-w-0">
              {children}
            </main>
          </div>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
