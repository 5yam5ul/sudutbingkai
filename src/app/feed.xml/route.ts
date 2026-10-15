import { getAllGuides } from '@/lib/guides';

export const dynamic = 'force-static';
export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sudutbingkai.vercel.app';
  const guides = getAllGuides();

  const itemsXml = guides
    .map((guide) => {
      const pubDate = new Date(guide.publishedAt).toUTCString();
      const articleUrl = `${baseUrl}/panduan/${guide.slug}`;
      const escapedTitle = escapeXml(guide.title);
      const escapedExcerpt = escapeXml(guide.excerpt);
      const escapedCategory = escapeXml(guide.category);

      return `    <item>
      <title>${escapedTitle}</title>
      <link>${articleUrl}</link>
      <guid isPermaLink="true">${articleUrl}</guid>
      <description>${escapedExcerpt}</description>
      <pubDate>${pubDate}</pubDate>
      <category>${escapedCategory}</category>
    </item>`;
    })
    .join('\n');

  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>SudutBingkai • Panduan Dokumentasi &amp; Kamera Tamu Digital</title>
    <link>${baseUrl}</link>
    <description>Artikel edukasi, inspirasi pernikahan, dan tutorial kamera sekali pakai digital untuk tamu resepsi.</description>
    <language>id-ID</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;

  return new Response(rssXml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
