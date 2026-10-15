import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SudutBingkai • Kamera Tamu Sekali Pakai Digital',
    short_name: 'SudutBingkai',
    description: 'Abadikan momen candid terbaik dari sudut pandang para tamu di pernikahan dan acara spesial.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0F0E0D',
    theme_color: '#12110F',
    orientation: 'portrait',
    icons: [
      {
        src: '/favicon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/logo-full.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
