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
      title: 'Kamera Tamu • SudutBingkai',
      description: 'Kamera sekali pakai digital interaktif untuk para tamu acara dan pernikahan.',
    };
  }

  const hostTitle = event.coupleOrHost || event.title;
  const title = `Kamera Tamu: ${hostTitle}`;
  const description = `Abadikan momen spesial dari sudut pandangmu untuk ${hostTitle}. Langsung memotret dengan filter analog estetik tanpa perlu instal aplikasi!`;
  const canonicalUrl = `${baseUrl}/cam/${event.slug || event.id}`;
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
          alt: title,
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

export default function CamLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
