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
    <div style={{ minHeight: '100vh', backgroundColor: '#FBFBFA', color: '#1D1D1F', paddingBottom: '80px' }}>
      
      {/* 1. TOP NAV BRAND HEADER */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(251, 251, 250, 0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
        padding: '12px 24px'
      }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px', fontWeight: 800, color: '#1D1D1F', letterSpacing: '-0.02em' }}>
              Sudut<span style={{ color: '#C27803' }}>Bingkai</span>
            </span>
            <span style={{ fontSize: '11px', color: '#86868B', background: 'rgba(0,0,0,0.04)', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
              Official Partner
            </span>
          </Link>

          <button
            type="button"
            onClick={handleCopyLink}
            className="glass-pill"
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#FFFFFF',
              border: '1px solid rgba(0,0,0,0.1)'
            }}
          >
            {copied ? <Check size={13} color="#10B981" /> : <Share2 size={13} />}
            <span>{copied ? 'Link Tersalin' : 'Bagikan Portofolio'}</span>
          </button>
        </div>
      </header>

      {/* 2. HERO COVER BANNER */}
      <div style={{ maxWidth: '1120px', margin: '20px auto 0', padding: '0 16px' }}>
        <div style={{
          position: 'relative',
          width: '100%',
          height: '280px',
          borderRadius: '24px',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #1D1D1F 0%, #2A2A2E 100%)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.06)'
        }}>
          {vendor.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={vendor.coverUrl}
              alt={`Cover ${vendor.companyName || vendor.name}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255, 255, 255, 0.3)',
              gap: '8px'
            }}>
              <Layers size={40} />
              <span style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                Official Photography Portfolio
              </span>
            </div>
          )}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 60%)'
          }} />
        </div>
      </div>

      {/* 3. PROFILE HEADER DETAILS */}
      <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '24px',
          paddingBottom: '28px',
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)'
        }}>
          
          {/* Avatar & Text Details */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap', flex: 1, minWidth: '280px' }}>
            <div style={{
              width: '112px',
              height: '112px',
              borderRadius: '24px',
              backgroundColor: '#FFFFFF',
              border: '4px solid #FFFFFF',
              boxShadow: '0 12px 28px rgba(0, 0, 0, 0.12)',
              overflow: 'hidden',
              flexShrink: 0,
              marginTop: '-56px',
              position: 'relative',
              zIndex: 10
            }}>
              {vendor.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={vendor.logoUrl}
                  alt={vendor.companyName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(135deg, #D48806 0%, #C27803 100%)',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {(vendor.companyName || vendor.name).charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: '240px', paddingTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1D1D1F', letterSpacing: '-0.025em', margin: 0, lineHeight: 1.2 }}>
                  {vendor.companyName || vendor.name}
                </h1>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  backgroundColor: 'rgba(194, 120, 3, 0.12)',
                  color: '#8C5400',
                  border: '1px solid rgba(194, 120, 3, 0.25)'
                }}>
                  <ShieldCheck size={13} color="#C27803" />
                  <span>Verified Partner</span>
                </span>
              </div>

              {vendor.bio ? (
                <p style={{ fontSize: '14px', color: '#515154', maxWidth: '640px', margin: '0 0 12px 0', lineHeight: 1.5 }}>
                  {vendor.bio}
                </p>
              ) : (
                <p style={{ fontSize: '13px', color: '#86868B', margin: '0 0 10px 0', fontStyle: 'italic' }}>
                  Dokumentasi visual momen istimewa & karya fotografi profesional.
                </p>
              )}

              {/* Meta tags */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '12.5px', color: '#6E6E73' }}>
                {vendor.city && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <MapPin size={13} color="#C27803" />
                    <span>{vendor.city}</span>
                  </div>
                )}
                {vendor.instagram && (
                  <a
                    href={`https://instagram.com/${vendor.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none', color: '#6E6E73', fontWeight: 500 }}
                  >
                    <InstagramIcon size={14} className="text-pink-500" />
                    <span>{vendor.instagram.startsWith('@') ? vendor.instagram : `@${vendor.instagram}`}</span>
                  </a>
                )}
                {vendor.website && (
                  <a
                    href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none', color: '#6E6E73' }}
                  >
                    <Globe size={13} color="#0284C7" />
                    <span>{vendor.website.replace(/^https?:\/\//, '')}</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Primary Action Button (WhatsApp Booking CTA) */}
          {whatsappUrl && (
            <div style={{ paddingTop: '12px' }}>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  boxShadow: '0 6px 20px rgba(16, 185, 129, 0.25)',
                  cursor: 'pointer'
                }}
              >
                <MessageCircle size={17} />
                <span>Konsultasi & Reservasi</span>
              </a>
            </div>
          )}
        </div>

        {/* 4. PORTFOLIO ALBUM CATEGORIES SECTION */}
        <div style={{ marginTop: '36px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#C27803', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
                <Sparkles size={13} />
                <span>KOLEKSI KARYA FOTOGRAFI</span>
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1D1D1F', letterSpacing: '-0.02em', margin: 0 }}>
                Galeri Album & Portofolio
              </h2>
            </div>

            <span style={{ fontSize: '12px', color: '#86868B', fontWeight: 500 }}>
              {vendor.albums.length} Kategori Album
            </span>
          </div>

          {/* Albums Grid */}
          {vendor.albums && vendor.albums.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '24px'
            }}>
              {vendor.albums.map((album) => (
                <div
                  key={album.id}
                  onClick={() => setSelectedAlbum(album)}
                  className="glass-card"
                  style={{
                    borderRadius: '20px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  {/* Thumbnail Card Aspect Ratio 4:3 */}
                  <div style={{
                    position: 'relative',
                    width: '100%',
                    height: '220px',
                    backgroundColor: '#1D1D1F',
                    overflow: 'hidden'
                  }}>
                    {album.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={album.coverImageUrl}
                        alt={album.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        loading="lazy"
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#86868B', gap: '8px' }}>
                        <BookOpen size={36} />
                        <span style={{ fontSize: '12px' }}>Klik untuk membuka album</span>
                      </div>
                    )}

                    {/* Gradient Overlay for Readable Text */}
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)'
                    }} />

                    {/* Badge */}
                    <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(0, 0, 0, 0.65)',
                        backdropFilter: 'blur(8px)',
                        color: '#FFFFFF',
                        fontSize: '11px',
                        fontWeight: 600
                      }}>
                        <BookOpen size={11} color="#C27803" />
                        <span>Buka Photobook</span>
                      </span>
                    </div>

                    {/* Bottom Title on Image */}
                    <div style={{ position: 'absolute', bottom: '14px', left: '14px', right: '14px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                        {album.title}
                      </h3>
                      {album.description && (
                        <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.75)', margin: '3px 0 0 0', lineHeight: 1.3 }}>
                          {album.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div style={{
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    color: '#86868B',
                    backgroundColor: '#FFFFFF'
                  }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>Google Drive Album</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#C27803', fontWeight: 600 }}>
                      <span>Jelajahi Foto</span>
                      <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card" style={{
              padding: '48px 24px',
              textAlign: 'center',
              borderRadius: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'rgba(194, 120, 3, 0.1)', color: '#C27803', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Layers size={26} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1D1D1F', margin: 0 }}>
                Album Belum Ditambahkan
              </h3>
              <p style={{ fontSize: '13px', color: '#86868B', maxWidth: '420px', margin: 0, lineHeight: 1.5 }}>
                Vendor ini sedang menyiapkan katalog portofolio terbaik mereka. Hubungi langsung via WhatsApp untuk melihat sampel dokumentasi terbaru.
              </p>
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-pill"
                  style={{
                    marginTop: '6px',
                    padding: '10px 20px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#FFFFFF',
                    border: '1px solid rgba(0,0,0,0.12)',
                    color: '#1D1D1F'
                  }}
                >
                  <MessageCircle size={14} color="#10B981" />
                  <span>Tanya Sampel via WhatsApp</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* 5. FOOTER */}
        <div style={{
          marginTop: '60px',
          paddingTop: '24px',
          borderTop: '1px solid rgba(0, 0, 0, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '12px',
          color: '#86868B'
        }}>
          <p style={{ margin: 0 }}>© {new Date().getFullYear()} {vendor.companyName || vendor.name}. Portofolio Resmi.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Didukung oleh</span>
            <Link href="/" style={{ fontWeight: 700, color: '#C27803', textDecoration: 'none' }}>
              SudutBingkai
            </Link>
          </div>
        </div>
      </div>

      {/* 6. INTERACTIVE SLIDESHOW MODAL */}
      <PortfolioViewerModal
        isOpen={Boolean(selectedAlbum)}
        onClose={() => setSelectedAlbum(null)}
        album={selectedAlbum}
        vendorName={vendor.companyName || vendor.name}
      />
    </div>
  );
}
