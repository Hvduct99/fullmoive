import './globals.css';
import Script from 'next/script';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { LanguageProvider } from '../components/LanguageContext';

export const metadata = {
  title: 'GenzMovie - Xem Phim Online',
  description: 'GenzMovie - Website xem phim online chất lượng cao, cập nhật nhanh nhất.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  other: {
    monetag: 'c9caea7a220c0f803bb1cab802b08f0f',
  },
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <head>
        <Script
          src="https://alwingulla.com/88/tag.min.js"
          data-zone="10654962"
          strategy="afterInteractive"
        />
        <Script
          src="https://quge5.com/88/tag.min.js"
          data-zone="214469"
          strategy="afterInteractive"
        />
        <Script
          src="https://5gvci.com/act/files/tag.min.js?z=10654994"
          strategy="afterInteractive"
        />
      </head>
      <body className="bg-black text-white font-sans antialiased overflow-x-hidden">
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
