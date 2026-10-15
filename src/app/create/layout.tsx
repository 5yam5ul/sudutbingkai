import type { Metadata } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sudutbingkai.vercel.app';

export const metadata: Metadata = {
  title: 'Buat Album Acara & Pilih Paket Kamera Tamu Digital',
  description:
    'Buat kamera sekali pakai digital untuk pernikahan atau acaramu dalam 2 menit. Dapatkan QR Code estetik, filter analog Portra/Classic B&W, dan live photo wall.',
  alternates: {
    canonical: `${baseUrl}/create`,
  },
  openGraph: {
    title: 'Buat Album Acara & Pilih Paket Kamera Tamu Digital • SudutBingkai',
    description:
      'Buat kamera sekali pakai digital untuk pernikahan atau acaramu dalam 2 menit. Dapatkan QR Code estetik, filter analog Portra/Classic B&W, dan live photo wall.',
    url: `${baseUrl}/create`,
    siteName: 'SudutBingkai',
    type: 'website',
    images: [
      {
        url: `${baseUrl}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: 'Buat Kamera Tamu Digital SudutBingkai',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Buat Album Acara & Pilih Paket Kamera Tamu Digital • SudutBingkai',
    description:
      'Kamera sekali pakai digital tanpa instal aplikasi untuk pernikahan, birthday, dan corporate event.',
    images: [`${baseUrl}/opengraph-image`],
  },
};

export default function CreateLayout({ children }: { children: React.ReactNode }) {
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
        name: 'Buat Album & Pilih Paket',
        item: `${baseUrl}/create`,
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
