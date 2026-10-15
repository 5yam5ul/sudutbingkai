import type { Metadata } from 'next';
import { getEventById } from '@/lib/db';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const event = await getEventById(id);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sudutbingkai.vercel.app';

  if (!event) {
    return {
      title: 'Galeri Acara • SudutBingkai',
      description: 'Galeri foto kenangan candid dari sudut pandang para tamu.',
    };
  }

  const hostTitle = event.coupleOrHost || event.title;
  const title = `Galeri Foto ${hostTitle}`;
  const description = `Buka album kenangan dan abadikan momen candid terbaik dari sudut pandang para tamu di acara ${hostTitle}.`;
  const canonicalUrl = `${baseUrl}/event/${event.slug || event.id}`;
  const ogImage = event.coverUrl || `${baseUrl}/opengraph-image`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${title} • SudutBingkai`,
      description,
      url: canonicalUrl,
      siteName: 'SudutBingkai',
      type: 'website',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `Galeri Foto ${hostTitle}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} • SudutBingkai`,
      description,
      images: [ogImage],
    },
  };
}

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEventById(id);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sudutbingkai.vercel.app';

  if (!event) {
    return <>{children}</>;
  }

  const hostTitle = event.coupleOrHost || event.title;
  const canonicalUrl = `${baseUrl}/event/${event.slug || event.id}`;
  const ogImage = event.coverUrl || `${baseUrl}/opengraph-image`;

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
        name: 'Galeri Foto Acara',
        item: canonicalUrl,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: hostTitle,
        item: canonicalUrl,
      },
    ],
  };

  const eventSchema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: `Galeri Foto & Kamera Tamu: ${hostTitle}`,
    description: `Album kenangan dan dokumentasi candid dari sudut pandang para tamu di acara ${hostTitle}.`,
    startDate: event.eventDate || new Date().toISOString().split('T')[0],
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: event.location || 'Indonesia',
      address: {
        '@type': 'PostalAddress',
        addressLocality: event.location || 'Indonesia',
        addressCountry: 'ID',
      },
    },
    image: [ogImage],
    organizer: {
      '@type': 'Organization',
      name: 'SudutBingkai',
      url: baseUrl,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }}
      />
      {children}
    </>
  );
}
