'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, MapPin, Globe, MessageCircle, 
  Sparkles, Layers, BookOpen, ArrowRight, Share2, Check
} from 'lucide-react';
import { VendorPortfolioAlbum } from '@/lib/types';
import { PortfolioViewerModal } from './PortfolioViewerModal';
import { toast } from 'sonner';

function InstagramIcon({ size = 15, className = '' }: { size?: number; className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  );
}

interface PortfolioClientViewProps {
  vendor: {
    id: string;
    name: string;
    companyName: string;
    slug: string;
    bio?: string;
    coverUrl?: string;
    logoUrl?: string;
    city?: string;
    instagram?: string;
    whatsapp?: string;
    website?: string;
    tier?: string;
    partnerTier?: string;
    albums: VendorPortfolioAlbum[];
  };
}

export function PortfolioClientView({ vendor }: PortfolioClientViewProps) {
  const [selectedAlbum, setSelectedAlbum] = useState<VendorPortfolioAlbum | null>(null);
  const [copied, setCopied] = useState(false);

  // Format WhatsApp Link
  const rawPhone = vendor.whatsapp || '';
  const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
  const formattedPhone = cleanPhone.startsWith('0') 
    ? '62' + cleanPhone.substring(1) 
    : (cleanPhone.startsWith('62') ? cleanPhone : '62' + cleanPhone);

  const greeting = encodeURIComponent(
    `Halo ${vendor.companyName || vendor.name}, saya melihat portofolio Anda di SudutBingkai dan ingin bertanya mengenai paket dokumentasi & ketersediaan tanggal.`
  );
  const whatsappUrl = formattedPhone ? `https://wa.me/${formattedPhone}?text=${greeting}` : null;

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success('Link portofolio berhasil disalin!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#0E0E10] text-[#F5F5F7] antialiased selection:bg-amber-500/30 selection:text-amber-200">
      {/* 1. HERO COVER BANNER */}
      <div className="relative w-full h-56 sm:h-80 md:h-96 bg-stone-900 overflow-hidden">
        {vendor.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vendor.coverUrl}
            alt={`Cover ${vendor.companyName}`}
            className="w-full h-full object-cover object-center transform transition-transform duration-700 hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-stone-950 via-stone-900 to-[#1c1815] flex items-center justify-center relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent opacity-60" />
            <div className="text-white/20 flex flex-col items-center gap-2">
              <Layers size={48} strokeWidth={1} />
              <span className="text-xs uppercase tracking-widest font-mono">Official Visual Portfolio</span>
            </div>
          </div>
        )}
        
        {/* Soft bottom gradient fade into body */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0E0E10] via-[#0E0E10]/40 to-transparent" />

        {/* Share Button on Banner Top Right */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-8 z-10">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-xs text-white/90 hover:text-white transition shadow-lg active:scale-95"
            title="Bagikan link portofolio"
          >
            {copied ? <Check size={14} className="text-green-400" /> : <Share2 size={14} />}
            <span>{copied ? 'Tersalin' : 'Bagikan'}</span>
          </button>
        </div>
      </div>

      {/* 2. PROFILE DETAILS SECTION */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-20 sm:-mt-24 relative z-10 pb-16">
        <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6 pb-8 border-b border-white/10">
          {/* Avatar / Logo & Name */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
            <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-2xl sm:rounded-3xl bg-stone-900 border-4 border-[#0E0E10] shadow-2xl overflow-hidden shrink-0 group">
              {vendor.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={vendor.logoUrl}
                  alt={vendor.companyName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-600 to-amber-900 text-white font-bold text-3xl sm:text-4xl">
                  {(vendor.companyName || vendor.name).charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white">
                  {vendor.companyName || vendor.name}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <ShieldCheck size={13} />
                  <span>Verified Partner</span>
                </span>
              </div>

              {vendor.bio ? (
                <p className="text-sm sm:text-base text-stone-300 max-w-xl font-normal leading-relaxed">
                  {vendor.bio}
                </p>
              ) : (
                <p className="text-sm text-stone-400 italic">
                  Dokumentasi visual momen istimewa & karya fotografi profesional.
                </p>
              )}

              {/* Meta tags (City, Instagram, Website) */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1 text-xs text-stone-400">
                {vendor.city && (
                  <div className="flex items-center gap-1.5">
                    <MapPin size={13} className="text-amber-400" />
                    <span>{vendor.city}</span>
                  </div>
                )}
                {vendor.instagram && (
                  <a
                    href={`https://instagram.com/${vendor.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-white transition"
                  >
                    <InstagramIcon size={13} className="text-pink-400" />
                    <span>{vendor.instagram.startsWith('@') ? vendor.instagram : `@${vendor.instagram}`}</span>
                  </a>
                )}
                {vendor.website && (
                  <a
                    href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-white transition"
                  >
                    <Globe size={13} className="text-sky-400" />
                    <span className="truncate max-w-[160px]">{vendor.website.replace(/^https?:\/\//, '')}</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Primary Action Button (WhatsApp Booking CTA) */}
          {whatsappUrl && (
            <div className="w-full sm:w-auto shrink-0">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-sm tracking-wide shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
              >
                <MessageCircle size={18} />
                <span>Konsultasi & Reservasi</span>
              </a>
            </div>
          )}
        </div>

        {/* 3. PORTFOLIO ALBUM CATEGORIES SECTION */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold tracking-wider uppercase mb-1">
                <Sparkles size={14} />
                <span>Koleksi Karya</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Galeri Album & Portofolio
              </h2>
            </div>

            <span className="text-xs text-stone-400 hidden sm:inline-block">
              {vendor.albums.length} Kategori Album
            </span>
          </div>

          {/* Albums Grid */}
          {vendor.albums && vendor.albums.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {vendor.albums.map((album) => (
                <div
                  key={album.id}
                  onClick={() => setSelectedAlbum(album)}
                  className="group relative rounded-2xl overflow-hidden bg-stone-900 border border-white/10 hover:border-amber-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10 cursor-pointer flex flex-col"
                >
                  {/* Thumbnail Card Aspect Ratio 4:3 or 16:10 */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-950">
                    {album.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={album.coverImageUrl}
                        alt={album.title}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-stone-800 text-stone-500 gap-2">
                        <BookOpen size={32} />
                        <span className="text-xs">Klik untuk membuka album</span>
                      </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

                    {/* Quick Badge */}
                    <div className="absolute top-3 left-3 z-10">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-black/60 backdrop-blur-md border border-white/15 text-white/90">
                        <BookOpen size={11} className="text-amber-400" />
                        <span>Buka Album</span>
                      </span>
                    </div>

                    {/* Bottom Title on Image */}
                    <div className="absolute bottom-3 left-3 right-3 z-10">
                      <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                        {album.title}
                      </h3>
                      {album.description && (
                        <p className="text-xs text-stone-300 line-clamp-2 mt-0.5 font-normal">
                          {album.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="p-3 bg-stone-900/90 flex items-center justify-between text-xs text-stone-400 border-t border-white/5">
                    <span className="text-[11px] text-stone-500 font-mono">Google Drive Album</span>
                    <span className="inline-flex items-center gap-1 font-medium text-amber-400 group-hover:translate-x-0.5 transition-transform">
                      <span>Lihat Foto</span>
                      <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 px-6 text-center rounded-3xl bg-stone-900/40 border border-white/5 flex flex-col items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Layers size={28} />
              </div>
              <h3 className="text-lg font-semibold text-white">Album Belum Ditambahkan</h3>
              <p className="text-sm text-stone-400 max-w-md">
                Vendor ini sedang menyiapkan katalog portofolio terbaik mereka. Hubungi langsung untuk melihat sampel dokumentasi terbaru.
              </p>
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition"
                >
                  <MessageCircle size={15} />
                  <span>Tanya Sampel via WhatsApp</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* 4. FOOTER BRANDING */}
        <div className="mt-20 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <p>© {new Date().getFullYear()} {vendor.companyName || vendor.name}. Portofolio Resmi.</p>
          <div className="flex items-center gap-2">
            <span>Didukung oleh</span>
            <Link href="/" className="font-semibold text-amber-400 hover:text-amber-300 transition">
              SudutBingkai
            </Link>
          </div>
        </div>
      </div>

      {/* 5. INTERACTIVE SLIDESHOW MODAL */}
      <PortfolioViewerModal
        isOpen={Boolean(selectedAlbum)}
        onClose={() => setSelectedAlbum(null)}
        album={selectedAlbum}
        vendorName={vendor.companyName || vendor.name}
      />
    </div>
  );
}
