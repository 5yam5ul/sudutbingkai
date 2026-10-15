import type { Metadata, Viewport } from 'next';
import { Outfit, Playfair_Display, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import JsonLd from '@/components/seo/JsonLd';

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sudutbingkai.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'SudutBingkai • Kamera Sekali Pakai untuk Pernikahan & Acara',
    template: '%s • SudutBingkai',
  },
  description: 'Abadikan momen candid terbaik dari sudut pandang para tamu. Tamu memotret langsung lewat scan QR di meja tanpa install aplikasi dengan nuansa kamera analog sekali pakai.',
  keywords: [
    'kamera sekali pakai pernikahan',
    'disposable camera digital',
    'qr code foto pernikahan',
    'kamera tamu pernikahan scan qr',
    'aplikasi disposable camera online',
    'alternatif photobooth pernikahan murah',
    'souvenir foto polaroid pernikahan',
    'vendor dokumentasi candid tamu',
    'wedding disposable camera indonesia',
    'foto tamu nikahan tanpa aplikasi',
    'sudut bingkai',
    'satualbum'
  ],
  alternates: {
    canonical: '/',
  },
  category: 'photography',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.ico',
    apple: '/favicon.png',
  },
  openGraph: {
    title: 'SudutBingkai • Kamera Sekali Pakai untuk Pernikahan & Acara',
    description: 'Abadikan momen candid terbaik dari sudut pandang para tamu. Tamu memotret langsung lewat scan QR di meja tanpa install aplikasi.',
    url: baseUrl,
    siteName: 'SudutBingkai',
    locale: 'id_ID',
    type: 'website',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'SudutBingkai • Kamera Sekali Pakai untuk Pernikahan & Acara',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SudutBingkai • Kamera Sekali Pakai untuk Pernikahan & Acara',
    description: 'Abadikan momen candid terbaik dari sudut pandang para tamu. Tamu memotret langsung lewat scan QR di meja tanpa install aplikasi.',
    images: ['/twitter-image'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
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
        <JsonLd baseUrl={baseUrl} />
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
