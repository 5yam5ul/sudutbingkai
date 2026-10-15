import { MetadataRoute } from 'next';
import { getAllEvents } from '@/lib/db';

export const revalidate = 3600; // Cache sitemap for 1 hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sudutbingkai.vercel.app';

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/create`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/vendor`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  try {
    const allEvents = await getAllEvents();
    const publicEventRoutes: MetadataRoute.Sitemap = allEvents
      .filter((ev) => ev && (ev.paymentStatus === 'paid' || ev.packageTier === 'starter'))
      .slice(0, 500)
      .map((ev) => ({
        url: `${baseUrl}/event/${ev.slug || ev.id}`,
        lastModified: ev.createdAt ? new Date(ev.createdAt) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      }));

    return [...staticRoutes, ...publicEventRoutes];
  } catch (error) {
    console.warn('Failed to fetch events for sitemap, falling back to static routes:', error);
    return staticRoutes;
  }
}
