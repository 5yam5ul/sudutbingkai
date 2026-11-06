import { Metadata } from 'next';
import VendorPortalPage from '../page';

interface PageProps {
  params: Promise<{ tab: string }>;
}

const TAB_TITLES: Record<string, string> = {
  dompet: 'Dompet Komisi & Kode Promo',
  wallet: 'Dompet Komisi & Kode Promo',
  komisi: 'Dompet Komisi & Kode Promo',
  klien: 'Daftar Klien Acara',
  clients: 'Daftar Klien Acara',
  acara: 'Daftar Klien Acara',
  proofing: 'Portal Proofing Klien',
  portofolio: 'Portofolio & Landing Page',
  portfolio: 'Portofolio & Landing Page',
  branding: 'Upload Logo & Co-Branding',
  logo: 'Upload Logo & Co-Branding',
  testimoni: 'Bonus Video Testimoni (+50k)',
  testimonials: 'Bonus Video Testimoni (+50k)',
  video: 'Bonus Video Testimoni (+50k)',
  marketing: 'Marketing Kit & Panduan MC',
  kit: 'Marketing Kit & Panduan MC'
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tab } = await params;
  const cleanTab = tab?.toLowerCase() || '';
  const title = TAB_TITLES[cleanTab] || 'Dashboard Kemitraan Vendor';

  return {
    title: `${title} • Vendor SudutBingkai`,
    description: 'Kelola komisi, klien, proofing foto, portofolio eksklusif, dan branding kemitraan vendor Anda di SudutBingkai.'
  };
}

export default async function VendorTabRoute({ params }: PageProps) {
  const { tab } = await params;
  return <VendorPortalPage initialTab={tab} />;
}
