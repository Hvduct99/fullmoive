import './globals.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AdOverlay from '../components/AdOverlay';
import MobileUserBar from '../components/MobileUserBar';
import { LanguageProvider } from '../components/LanguageContext';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata = {
  title: 'GenzMovie - Xem Phim Online',
  description: 'GenzMovie - Website xem phim online chất lượng cao, cập nhật nhanh nhất.',
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
          <AdOverlay />
          <Header />
          <main className="min-h-screen">
            {children}
          </main>
          <Footer />
          <MobileUserBar />
        </LanguageProvider>
      </body>
    </html>
  );
}
