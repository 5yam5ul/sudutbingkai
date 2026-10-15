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

export default function EventLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
