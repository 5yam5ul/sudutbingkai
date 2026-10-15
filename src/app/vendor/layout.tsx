import type { Metadata } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sudutbingkai.vercel.app';

export const metadata: Metadata = {
  title: 'Program Kemitraan Wedding Organizer & Vendor • Komisi s/d 20%',
  description:
    'Daftar sebagai mitra WO resmi SudutBingkai. Dapatkan bagi hasil berkelanjutan hingga 20% per klien, co-branding eksklusif, dan dashboard analytics real-time.',
  alternates: {
    canonical: `${baseUrl}/vendor`,
  },
  openGraph: {
    title: 'Program Kemitraan Wedding Organizer & Vendor • SudutBingkai',
    description:
      'Daftar sebagai mitra WO resmi SudutBingkai. Dapatkan bagi hasil berkelanjutan hingga 20% per klien, co-branding eksklusif, dan dashboard analytics real-time.',
    url: `${baseUrl}/vendor`,
    siteName: 'SudutBingkai',
    type: 'website',
    images: [
      {
        url: `${baseUrl}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: 'Program Kemitraan WO SudutBingkai',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Program Kemitraan Wedding Organizer & Vendor • SudutBingkai',
    description:
      'Tingkatkan nilai paket pernikahan Anda dengan kamera sekali pakai digital interaktif SudutBingkai. Komisi hingga 20% per acara.',
    images: [`${baseUrl}/opengraph-image`],
  },
};

export default function VendorLayout({ children }: { children: React.ReactNode }) {
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
        name: 'Program Kemitraan Wedding Organizer',
        item: `${baseUrl}/vendor`,
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
