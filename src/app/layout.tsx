import type { Metadata, Viewport } from 'next';
import { Outfit, Playfair_Display, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair',
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
  weight: ['400', '500', '700'],
});

export const metadata: Metadata = {
  title: 'SudutBingkai • Kamera Sekali Pakai untuk Pernikahan & Acara',
  description: 'Abadikan momen candid terbaik dari sudut pandang para tamu. Tamu memotret langsung lewat scan QR di meja tanpa install aplikasi.',
  keywords: 'kamera sekali pakai pernikahan, disposable camera digital, qr code foto pernikahan, sudut bingkai, foto tamu, satualbum',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.ico',
    apple: '/favicon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#12110F',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${outfit.variable} ${playfair.variable} ${jetbrainsMono.variable}`}>
      <body className={outfit.className}>
        {children}
        <Toaster 
          position="top-center" 
          toastOptions={{
            style: {
              background: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              color: '#1D1D1F',
              fontFamily: 'var(--font-sans)',
              borderRadius: '16px',
              boxShadow: '0 16px 36px -8px rgba(0, 0, 0, 0.12)'
            }
          }}
        />
      </body>
    </html>
  );
}
