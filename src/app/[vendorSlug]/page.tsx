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

  const name = vendor.companyName || vendor.name;
  const description = vendor.bio || `Koleksi portofolio dokumentasi fotografi resmi dari ${name}. Jelajahi album dan hubungi kami untuk reservasi acara Anda.`;

  return {
    title: `${name} - Portofolio Fotografi | SudutBingkai`,
    description,
    openGraph: {
      title: `${name} - Portofolio Fotografi`,
      description,
      images: vendor.coverUrl ? [{ url: vendor.coverUrl }] : (vendor.logoUrl ? [{ url: vendor.logoUrl }] : [])
    }
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
