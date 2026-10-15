import type { Metadata } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sudutbingkai.vercel.app';

export const metadata: Metadata = {
  title: 'Panduan & Inspirasi Pernikahan • Kamera Sekali Pakai Digital',
  description:
    'Kumpulan artikel edukasi, tips dokumentasi candid, ide souvenir pernikahan unik, dan tutorial barcode QR foto tamu di meja resepsi.',
  alternates: {
    canonical: `${baseUrl}/panduan`,
  },
  openGraph: {
    title: 'Panduan & Inspirasi Pernikahan • SudutBingkai',
    description:
      'Kumpulan artikel edukasi, tips dokumentasi candid, ide souvenir pernikahan unik, dan tutorial barcode QR foto tamu di meja resepsi.',
    url: `${baseUrl}/panduan`,
    siteName: 'SudutBingkai',
    type: 'website',
    images: [
      {
        url: `${baseUrl}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: 'Panduan & Inspirasi Pernikahan SudutBingkai',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Panduan & Inspirasi Pernikahan • SudutBingkai',
    description:
      'Kumpulan artikel edukasi, tips dokumentasi candid, ide souvenir pernikahan unik, dan tutorial barcode QR foto tamu di meja resepsi.',
    images: [`${baseUrl}/opengraph-image`],
  },
};

export default function PanduanLayout({ children }: { children: React.ReactNode }) {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Beranda',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Panduan & Inspirasi Pernikahan',
        item: `${baseUrl}/panduan`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
