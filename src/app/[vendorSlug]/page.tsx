import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getVendorBySlug } from '@/lib/db';
import { PortfolioClientView } from '@/components/vendor-portfolio/PortfolioClientView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ vendorSlug: string }>;
}

const RESERVED_SLUGS = new Set([
  'admin', 'vendor', 'login', 'create', 'api', 'proof', 
  'dashboard', 'panduan', 'cam', 'event', 'invoice', 
  'feed.xml', 'sitemap.xml', 'robots.txt', 'manifest.webmanifest'
]);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { vendorSlug } = await params;
  if (!vendorSlug || RESERVED_SLUGS.has(vendorSlug.toLowerCase())) {
    return { title: 'Portofolio Tidak Ditemukan' };
  }

  const vendor = await getVendorBySlug(vendorSlug);
  if (!vendor) {
    return { title: 'Portofolio Vendor | SudutBingkai' };
  }

  const name = (vendor.companyName || vendor.name || 'Vendor Fotografi').trim();
  
  // Format clean professional description, ignoring trivial 4-character test strings
  const cleanBio = vendor.bio && vendor.bio.trim().length > 6 && vendor.bio.trim().toLowerCase() !== 'test'
    ? `${vendor.bio.trim()} — Portofolio karya resmi ${name}.`
    : `Koleksi portofolio dokumentasi fotografi & visual resmi dari ${name}. Buka galeri album karya dan reservasi jadwal acara Anda.`;

  const canonicalUrl = `https://www.sudutbingkai.id/${vendorSlug}`;

  // Prioritize vendor official logo so WhatsApp displays vendor's logo thumbnail on the left
  const rawImage = vendor.logoUrl || vendor.coverUrl || '/logo-full.png';
  const resolvedImageUrl = rawImage.startsWith('http://') || rawImage.startsWith('https://')
    ? rawImage
    : `https://www.sudutbingkai.id${rawImage.startsWith('/') ? '' : '/'}${rawImage}`;

  const isSquareLogo = Boolean(vendor.logoUrl);

  return {
    title: {
      absolute: `${name} — Portofolio Fotografi Resmi`,
    },
    description: cleanBio,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      siteName: `${name} • Portofolio Resmi`,
      title: `${name} — Portofolio Fotografi`,
      description: cleanBio,
      url: canonicalUrl,
      type: 'profile',
      locale: 'id_ID',
      images: [
        {
          url: resolvedImageUrl,
          width: isSquareLogo ? 400 : 1200,
          height: isSquareLogo ? 400 : 630,
          alt: `Logo ${name}`,
          type: resolvedImageUrl.endsWith('.png') ? 'image/png' : 'image/jpeg',
        },
      ],
    },
    twitter: {
      card: isSquareLogo ? 'summary' : 'summary_large_image',
      title: `${name} — Portofolio Fotografi`,
      description: cleanBio,
      images: [resolvedImageUrl],
    },
  };
}

export default async function VendorPortfolioPage({ params }: PageProps) {
  const { vendorSlug } = await params;
  if (!vendorSlug || RESERVED_SLUGS.has(vendorSlug.toLowerCase())) {
    notFound();
  }

  const vendor = await getVendorBySlug(vendorSlug);
  if (!vendor) {
    notFound();
  }

  const publicProfile = {
    id: vendor.id,
    name: vendor.name,
    companyName: vendor.companyName || vendor.name,
    slug: vendor.slug || vendorSlug,
    bio: vendor.bio || '',
    coverUrl: vendor.coverUrl || vendor.cover_url || '',
    logoUrl: vendor.logoUrl || vendor.logo_url || '',
    city: vendor.city || '',
    instagram: vendor.instagram || '',
    whatsapp: vendor.whatsapp || vendor.phone || '',
    website: vendor.website || '',
    tier: vendor.tier || 'pro',
    partnerTier: vendor.partnerTier || 'regular',
    albums: Array.isArray(vendor.portfolioAlbums) ? vendor.portfolioAlbums : (Array.isArray(vendor.portfolio_albums) ? vendor.portfolio_albums : []),
    theme: vendor.portfolioTheme || vendor.portfolio_theme || {},
    views: Number(vendor.portfolioViews || vendor.portfolio_views || 0),
    whatsappClicks: Number(vendor.portfolioWhatsappClicks || vendor.portfolio_whatsapp_clicks || 0)
  };

  return <PortfolioClientView vendor={publicProfile} />;
}
