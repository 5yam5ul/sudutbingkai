import type { Metadata } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sudutbingkai.vercel.app';

export const metadata: Metadata = {
  title: 'Masuk ke Akun • Host & Mitra Vendor',
  description:
    'Masuk ke dashboard host pengantin atau portal vendor wedding organizer untuk mengelola album foto, cetak QR code, dan unduh kenangan resolusi asli.',
  alternates: {
    canonical: `${baseUrl}/login`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
