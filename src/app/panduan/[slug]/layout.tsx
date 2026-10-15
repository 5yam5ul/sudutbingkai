import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getGuideBySlug } from '@/lib/guides';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sudutbingkai.vercel.app';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    return {
      title: 'Panduan Tidak Ditemukan • SudutBingkai',
    };
  }

  const title = guide.title;
  const description = guide.excerpt;
  const canonicalUrl = `${baseUrl}/panduan/${guide.slug}`;
  const ogImage = `${baseUrl}/opengraph-image`;

  return {
    title,
    description,
    keywords: guide.keywords,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${title} • SudutBingkai`,
      description,
      url: canonicalUrl,
      siteName: 'SudutBingkai',
      type: 'article',
      publishedTime: guide.publishedAt,
      modifiedTime: guide.updatedAt,
      authors: [guide.author.name],
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

export default async function GuideArticleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    notFound();
  }

  const canonicalUrl = `${baseUrl}/panduan/${guide.slug}`;
  const ogImage = `${baseUrl}/opengraph-image`;

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
        name: 'Panduan & Inspirasi',
        item: `${baseUrl}/panduan`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: guide.title,
        item: canonicalUrl,
      },
    ],
  };

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.excerpt,
    image: [ogImage],
    datePublished: guide.publishedAt,
    dateModified: guide.updatedAt,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
    author: {
      '@type': 'Organization',
      name: guide.author.name,
      url: baseUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'SudutBingkai',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo-full.png`,
      },
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      {children}
    </>
  );
}
