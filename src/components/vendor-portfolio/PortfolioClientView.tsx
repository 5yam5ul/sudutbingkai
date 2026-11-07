'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, MapPin, Globe, MessageCircle, 
  Sparkles, Layers, BookOpen, ArrowRight, Share2, Check,
  ChevronDown, ChevronUp,
  Star, Award, Camera, Video, HelpCircle, FileText, X, Send, User,
  ChevronLeft, ChevronRight, Eye
} from 'lucide-react';
import { VendorPortfolioAlbum, VendorPortfolioTheme, VendorPortfolioVideo } from '@/lib/types';
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
    theme?: VendorPortfolioTheme;
    views?: number;
    whatsappClicks?: number;
  };
}

function InstagramIcon({ size = 15, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  );
}

function TikTokIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.47 6.27 6.27 0 0 0 1.87-4.47V8.71a8.28 8.28 0 0 0 4.9 1.58V6.85a4.8 4.8 0 0 1-1-.16z"/>
    </svg>
  );
}

function getEmbedVideoUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  const url = rawUrl.trim();

  // 1. YouTube youtu.be/ID (Short links e.g. youtu.be/OxuY6P9pN4R2mZrj)
  const youtuBeMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (youtuBeMatch && youtuBeMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${youtuBeMatch[1]}?rel=0&modestbranding=1`;
  }

  // 2. YouTube shorts/ID
  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
  if (shortsMatch && shortsMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${shortsMatch[1]}?rel=0&modestbranding=1`;
  }

  // 3. YouTube standard watch?v=ID or /embed/ID
  const youtubeMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/) || url.match(/\/embed\/([a-zA-Z0-9_-]+)/);
  if (youtubeMatch && youtubeMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${youtubeMatch[1]}?rel=0&modestbranding=1`;
  }

  // 4. Google Drive video /file/d/ID/view -> preview
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }

  // 5. Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return url;
}

export function PortfolioClientView({ vendor }: PortfolioClientViewProps) {
  const theme = vendor.theme || {};
  const [selectedAlbum, setSelectedAlbum] = useState<VendorPortfolioAlbum | null>(null);
  const [copied, setCopied] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  
  // Lead capture form states
  const [leadName, setLeadName] = useState('');
  const [leadDate, setLeadDate] = useState('');
  const [leadEvent, setLeadEvent] = useState('Pernikahan / Wedding');
  const [leadLocation, setLeadLocation] = useState('');
  const [leadNote, setLeadNote] = useState('');

  const [stageIndex, setStageIndex] = useState(0);
  const [activeVideoIdx, setActiveVideoIdx] = useState(0);
  const videoSliderRef = useRef<HTMLDivElement | null>(null);

  // Normalize highlight videos list (supports multiple and legacy single)
  const highlightVideos: VendorPortfolioVideo[] = (theme.videoHighlights && theme.videoHighlights.length > 0)
    ? theme.videoHighlights.filter(v => v.url && v.url.trim().length > 0)
    : (theme.videoHighlightUrl
      ? [{ id: 'default', url: theme.videoHighlightUrl, title: theme.videoHighlightTitle || 'Wedding Film Showcase', category: 'Cinematic Teaser' }]
      : []);

  const handleScrollToVideo = (targetIdx: number) => {
    if (!videoSliderRef.current) return;
    const container = videoSliderRef.current;
    const cards = container.children;
    if (cards[targetIdx]) {
      (cards[targetIdx] as HTMLElement).scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
      setActiveVideoIdx(targetIdx);
    }
  };

  const handlePrevVideo = () => {
    const nextIdx = Math.max(0, activeVideoIdx - 1);
    handleScrollToVideo(nextIdx);
  };

  const handleNextVideo = () => {
    const nextIdx = Math.min(highlightVideos.length - 1, activeVideoIdx + 1);
    handleScrollToVideo(nextIdx);
  };

  const handleVideoScroll = () => {
    if (!videoSliderRef.current) return;
    const container = videoSliderRef.current;
    const scrollLeft = container.scrollLeft;
    const cardWidth = container.offsetWidth;
    if (cardWidth > 0) {
      const newIdx = Math.round(scrollLeft / cardWidth);
      if (newIdx >= 0 && newIdx < highlightVideos.length && newIdx !== activeVideoIdx) {
        setActiveVideoIdx(newIdx);
      }
    }
  };

  // Compute theme styles
  const accentColor = theme.accentColor || '#C27803';
  const isDark = theme.bgPreset === 'obsidian' || theme.bgPreset === 'midnight_navy' || (theme.backgroundMode === 'custom_color' && (theme.bgColor === '#121214' || theme.bgColor === '#000000' || theme.bgColor === '#0A0E1A'));
  const isObsidian = isDark;
  
  let defaultTextColor = '#1D1D1F';
  if (isDark) defaultTextColor = '#F5F5F7';
  else if (theme.bgPreset === 'terracotta') defaultTextColor = '#2D1E18';
  else if (theme.bgPreset === 'emerald_forest') defaultTextColor = '#132219';
  else if (theme.bgPreset === 'rose_quartz') defaultTextColor = '#2C1D21';
  else if (theme.bgPreset === 'espresso_bronze') defaultTextColor = '#261C16';
  else if (theme.bgPreset === 'frosted_pearl') defaultTextColor = '#1A212D';

  const textColor = defaultTextColor;
  const mutedTextColor = isDark 
    ? 'rgba(245, 245, 247, 0.65)' 
    : theme.bgPreset === 'terracotta' 
      ? '#7A5C50' 
      : theme.bgPreset === 'emerald_forest' 
        ? '#4A6352' 
        : theme.bgPreset === 'rose_quartz' 
          ? '#875C66' 
          : theme.bgPreset === 'espresso_bronze'
            ? '#705345'
            : theme.bgPreset === 'frosted_pearl'
              ? '#556377'
              : '#6E6E73';

  const cardBg = isDark ? (theme.bgPreset === 'midnight_navy' ? '#121726' : '#1C1C1E') : '#FFFFFF';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';

  // Compute Background CSS
  let pageBgStyle: React.CSSProperties = {
    backgroundColor: '#FBFBFA',
    color: textColor,
    minHeight: '100vh',
    position: 'relative'
  };

  if (theme.backgroundMode === 'preset') {
    if (theme.bgPreset === 'champagne') {
      pageBgStyle.background = 'linear-gradient(135deg, #FBF8F3 0%, #F5EFEB 100%)';
    } else if (theme.bgPreset === 'obsidian') {
      pageBgStyle.backgroundColor = '#121214';
    } else if (theme.bgPreset === 'slate') {
      pageBgStyle.backgroundColor = '#F1F3F5';
    } else if (theme.bgPreset === 'terracotta') {
      pageBgStyle.background = 'linear-gradient(135deg, #FAF5F0 0%, #F5ECE3 100%)';
    } else if (theme.bgPreset === 'midnight_navy') {
      pageBgStyle.backgroundColor = '#0A0E1A';
    } else if (theme.bgPreset === 'emerald_forest') {
      pageBgStyle.background = 'linear-gradient(135deg, #F4F6F4 0%, #E8EFE8 100%)';
    } else if (theme.bgPreset === 'rose_quartz') {
      pageBgStyle.background = 'linear-gradient(135deg, #FDF7F8 0%, #F8ECF0 100%)';
    } else if (theme.bgPreset === 'espresso_bronze') {
      pageBgStyle.background = 'linear-gradient(135deg, #F9F6F0 0%, #EFE8DE 100%)';
    } else if (theme.bgPreset === 'frosted_pearl') {
      pageBgStyle.background = 'linear-gradient(135deg, #F8F9FA 0%, #E9ECF0 100%)';
    } else {
      pageBgStyle.backgroundColor = '#FBFBFA';
    }
  } else if (theme.backgroundMode === 'custom_color' && theme.bgColor) {
    pageBgStyle.backgroundColor = theme.bgColor;
  } else if (theme.backgroundMode === 'custom_gradient' && theme.bgGradient) {
    pageBgStyle.background = `linear-gradient(${theme.bgGradient.angle || 135}deg, ${theme.bgGradient.from}, ${theme.bgGradient.to})`;
  }

  // Right-click protection
  useEffect(() => {
    if (theme.disableRightClick) {
      const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
      };
      window.addEventListener('contextmenu', handleContextMenu);
      return () => window.removeEventListener('contextmenu', handleContextMenu);
    }
  }, [theme.disableRightClick]);

  // Format WhatsApp Link
  const rawPhone = vendor.whatsapp || '';
  const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
  const formattedPhone = cleanPhone.startsWith('0') 
    ? '62' + cleanPhone.substring(1) 
    : (cleanPhone.startsWith('62') ? cleanPhone : '62' + cleanPhone);

  const defaultGreeting = encodeURIComponent(
    `Halo ${vendor.companyName || vendor.name}, saya melihat portofolio Anda di SudutBingkai dan ingin bertanya mengenai paket dokumentasi & ketersediaan tanggal.`
  );
  const whatsappUrl = formattedPhone ? `https://wa.me/${formattedPhone}?text=${defaultGreeting}` : null;

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success('Link portofolio berhasil disalin!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendLeadForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName.trim()) {
      toast.error('Mohon isi nama Anda');
      return;
    }
    const message = encodeURIComponent(
      `Halo ${vendor.companyName || vendor.name},\nSaya tertarik dengan paket dokumentasi Anda melalui SudutBingkai:\n\n• Nama: ${leadName}\n• Tanggal Rencana: ${leadDate || '-'}\n• Jenis Acara: ${leadEvent}\n• Lokasi / Venue: ${leadLocation || '-'}\n• Catatan: ${leadNote || '-'}\n\nMohon info ketersediaan tanggal & pricelist lengkap. Terima kasih!`
    );
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
    setLeadModalOpen(false);
  };

  // Font family resolution
  let fontFamily = 'inherit';
  if (theme.fontStyle === 'serif') {
    fontFamily = '"Cormorant Garamond", Georgia, serif';
  } else if (theme.fontStyle === 'mono') {
    fontFamily = 'var(--font-mono, "JetBrains Mono", monospace)';
  } else if (theme.fontStyle === 'playfair') {
    fontFamily = 'var(--font-playfair, "Playfair Display", Georgia, serif)';
  } else if (theme.fontStyle === 'cinzel') {
    fontFamily = '"Cinzel", "Times New Roman", serif';
  } else if (theme.fontStyle === 'syne') {
    fontFamily = '"Syne", sans-serif';
  } else if (theme.fontStyle === 'jakarta') {
    fontFamily = '"Plus Jakarta Sans", sans-serif';
  }

  return (
    <div style={{ ...pageBgStyle, fontFamily, paddingBottom: theme.enableStickyMobileBar ? '120px' : '80px' }}>
      {/* Dynamic Google Fonts Preconnect & Load */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Syne:wght@700;800&display=swap"
        rel="stylesheet"
      />
      
      {/* Background Texture Overlay */}
      {theme.backgroundMode === 'texture' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 1,
          opacity: 0.04,
          backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
          backgroundSize: '16px 16px'
        }} />
      )}

      {/* Custom Background Image Overlay with Blur & Dimmer */}
      {theme.backgroundMode === 'image' && theme.bgImageUrl && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={theme.bgImageUrl}
            alt="Backdrop"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: `blur(${theme.bgBlur || 0}px)`,
              transform: 'scale(1.05)'
            }}
          />
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: isObsidian ? '#000000' : '#FFFFFF',
            opacity: (theme.bgDimmer || 40) / 100
          }} />
        </div>
      )}

      {/* 1. TOP NAV BRAND HEADER */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: isObsidian ? 'rgba(18, 18, 20, 0.85)' : 'rgba(251, 251, 250, 0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${borderColor}`,
        padding: '10px 24px'
      }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/logo.png" 
              alt="Sudut Bingkai Logo" 
              style={{ 
                height: '46px', 
                width: '46px', 
                objectFit: 'contain', 
                borderRadius: '10px',
                display: 'block',
                flexShrink: 0 
              }} 
            />
            <span style={{ fontSize: '11px', color: mutedTextColor, background: isObsidian ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>
              Official Partner
            </span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {theme.enableLeadForm && formattedPhone && (
              <button
                type="button"
                onClick={() => setLeadModalOpen(true)}
                className="glass-pill"
                style={{
                  padding: '7px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: 'transparent',
                  border: `1px solid ${accentColor}`,
                  color: accentColor
                }}
              >
                Cek Jadwal
              </button>
            )}

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
                background: cardBg,
                border: `1px solid ${borderColor}`,
                color: textColor
              }}
            >
              {copied ? <Check size={13} color="#10B981" /> : <Share2 size={13} />}
              <span>{copied ? 'Link Tersalin' : 'Bagikan'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION (Dynamic: Social vs Fullscreen vs Split vs Minimalist) */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        {/* HERO STYLE A: Fullscreen Cinematic */}
        {theme.heroStyle === 'cinematic_fullscreen' && (
          <div style={{
            position: 'relative',
            width: '100%',
            minHeight: '80vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            overflow: 'hidden',
            marginBottom: '40px'
          }}>
            {vendor.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={vendor.coverUrl}
                alt="Hero Cover"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.7) 100%)'
            }} />
            
            <div style={{ position: 'relative', zIndex: 10, maxWidth: '800px', padding: '0 24px', color: '#FFFFFF' }}>
              {vendor.logoUrl && (
                <div style={{ width: '90px', height: '90px', borderRadius: '50%', margin: '0 auto 20px', overflow: 'hidden', border: '3px solid rgba(255,255,255,0.4)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={vendor.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <span className="font-mono-film" style={{ color: '#F59E0B', fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                OFFICIAL PHOTOGRAPHY SHOWCASE
              </span>
              <h1 style={{ fontSize: '38px', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 12px 0' }}>
                {vendor.companyName || vendor.name}
              </h1>
              <p style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.85)', maxWidth: '580px', margin: '0 auto 24px auto', lineHeight: 1.6 }}>
                {vendor.bio || theme.tagline || 'Mengabadikan setiap detil kehangatan cinta melalui karya fotografi autentik & abadi.'}
              </p>
              
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 28px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    color: '#FFFFFF',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: 700,
                    boxShadow: '0 10px 30px rgba(16, 185, 129, 0.35)'
                  }}
                >
                  <MessageCircle size={18} />
                  <span>Konsultasi & Reservasi</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* HERO STYLE B: Split Editorial */}
        {theme.heroStyle === 'split' && (
          <div style={{ maxWidth: '1120px', margin: '40px auto 40px', padding: '0 24px' }}>
            <div className="glass-card" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '36px',
              padding: '36px',
              borderRadius: '28px',
              background: cardBg,
              border: `1px solid ${borderColor}`,
              alignItems: 'center'
            }}>
              <div style={{ position: 'relative', width: '100%', height: '380px', borderRadius: '20px', overflow: 'hidden' }}>
                {vendor.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={vendor.coverUrl} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: '#1D1D1F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#86868B' }}>
                    <Camera size={48} />
                  </div>
                )}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  {vendor.logoUrl && (
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', overflow: 'hidden' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={vendor.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, color: textColor }}>
                      {vendor.companyName || vendor.name}
                    </h1>
                    <span style={{ fontSize: '11.5px', color: accentColor, fontWeight: 600 }}>Official Studio Portfolio</span>
                  </div>
                </div>

                <p style={{ fontSize: '14.5px', color: mutedTextColor, lineHeight: 1.65, margin: '0 0 20px 0' }}>
                  {vendor.bio || 'Dokumentasi visual momen istimewa & karya fotografi profesional.'}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 22px',
                        borderRadius: '14px',
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        color: '#FFFFFF',
                        textDecoration: 'none',
                        fontSize: '13.5px',
                        fontWeight: 700
                      }}
                    >
                      <MessageCircle size={16} />
                      <span>Konsultasi WhatsApp</span>
                    </a>
                  )}

                  {theme.pricelistPdfUrl && (
                    <a
                      href={theme.pricelistPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="glass-pill"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '11px 18px',
                        fontSize: '13px',
                        fontWeight: 600,
                        textDecoration: 'none',
                        color: textColor,
                        border: `1px solid ${borderColor}`,
                        background: cardBg
                      }}
                    >
                      <FileText size={15} color={accentColor} />
                      <span>{theme.pricelistButtonText || 'Unduh Pricelist PDF'}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HERO STYLE C: Minimalist Bio-Link */}
        {theme.heroStyle === 'minimalist' && (
          <div style={{ maxWidth: '640px', margin: '40px auto 32px', textAlign: 'center', padding: '0 20px' }}>
            {vendor.logoUrl && (
              <div style={{ width: '84px', height: '84px', borderRadius: '50%', margin: '0 auto 16px', overflow: 'hidden', border: `2px solid ${accentColor}`, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={vendor.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <h1 style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 6px 0', color: textColor }}>
              {vendor.companyName || vendor.name}
            </h1>
            <p style={{ fontSize: '13.5px', color: mutedTextColor, margin: '0 0 20px 0', lineHeight: 1.5 }}>
              {vendor.bio || 'Dokumentasi visual momen istimewa & karya fotografi profesional.'}
            </p>
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 24px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 700
                }}
              >
                <MessageCircle size={15} />
                <span>Konsultasi & Reservasi</span>
              </a>
            )}
          </div>
        )}

        {/* HERO STYLE E: Floating Glass Island */}
        {theme.heroStyle === 'floating_island' && (
          <div style={{ maxWidth: '1120px', margin: '20px auto 0', padding: '0 16px' }}>
            <div style={{
              position: 'relative',
              width: '100%',
              height: '340px',
              borderRadius: '28px',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, #1D1D1F 0%, #2A2A2E 100%)',
              boxShadow: '0 16px 40px rgba(0,0,0,0.08)'
            }}>
              {vendor.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={vendor.coverUrl} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: '#121214', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#86868B' }}>
                  <Layers size={40} />
                </div>
              )}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }} />
            </div>

            {/* Overlapping Floating Glass Island Card */}
            <div style={{ maxWidth: '860px', margin: '-90px auto 0', position: 'relative', zIndex: 20, padding: '0 16px' }}>
              <div className="glass-card" style={{
                padding: '32px 36px',
                borderRadius: '28px',
                background: isDark ? 'rgba(28, 28, 30, 0.92)' : 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(30px)',
                border: `1px solid ${borderColor}`,
                boxShadow: '0 24px 60px -12px rgba(0,0,0,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{
                    position: 'relative',
                    width: '84px',
                    height: '84px',
                    borderRadius: '22px',
                    overflow: 'hidden',
                    border: `3px solid ${accentColor}`,
                    boxShadow: '0 10px 24px rgba(0,0,0,0.12)',
                    flexShrink: 0
                  }}>
                    {vendor.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={vendor.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 800, fontSize: '28px' }}>
                        {(vendor.companyName || vendor.name).charAt(0)}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, color: textColor, letterSpacing: '-0.02em' }}>
                        {vendor.companyName || vendor.name}
                      </h1>
                      <span style={{ fontSize: '11px', color: '#D4AF37', background: 'rgba(212, 175, 55, 0.12)', border: '1px solid rgba(212, 175, 55, 0.3)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                        ★ Verified
                      </span>
                    </div>
                    <p style={{ fontSize: '13.5px', color: mutedTextColor, margin: '0 0 8px 0', maxWidth: '440px', lineHeight: 1.5 }}>
                      {vendor.bio || 'Dokumentasi visual momen istimewa & karya fotografi profesional.'}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', color: mutedTextColor }}>
                      {vendor.city && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={13} color={accentColor} />
                          <span>{vendor.city}</span>
                        </span>
                      )}
                      {vendor.instagram && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <InstagramIcon size={13} />
                          <span>{vendor.instagram}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {whatsappUrl && (
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
                        boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      <MessageCircle size={16} />
                      <span>Reservasi</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HERO STYLE F: Big Editorial Headline */}
        {theme.heroStyle === 'story_headline' && (
          <div style={{ maxWidth: '1000px', margin: '48px auto 32px', textAlign: 'center', padding: '0 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ height: '1px', width: '48px', background: borderColor }} />
              <span className="font-mono-film" style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: accentColor, fontWeight: 700 }}>
                CURATED VISUAL CHRONICLE • VOL. 2026
              </span>
              <div style={{ height: '1px', width: '48px', background: borderColor }} />
            </div>

            <h1 style={{
              fontSize: 'clamp(36px, 6vw, 64px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              margin: '0 0 16px 0',
              color: textColor,
              lineHeight: 1.08
            }}>
              {vendor.companyName || vendor.name}
            </h1>

            <p style={{
              fontSize: '16px',
              fontStyle: 'italic',
              color: mutedTextColor,
              maxWidth: '640px',
              margin: '0 auto 28px',
              lineHeight: 1.65
            }}>
              "{vendor.bio || 'Menghadirkan karya seni visual abadi yang merayakan keindahan setiap momen istimewa.'}"
            </p>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 26px',
                    borderRadius: '999px',
                    background: textColor,
                    color: cardBg,
                    textDecoration: 'none',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                  }}
                >
                  <MessageCircle size={16} />
                  <span>Mulai Reservasi Tanggal</span>
                </a>
              )}

              {theme.pricelistPdfUrl && (
                <a
                  href={theme.pricelistPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-pill"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '11px 22px',
                    fontSize: '13px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    color: textColor,
                    border: `1px solid ${borderColor}`,
                    background: cardBg
                  }}
                >
                  <FileText size={15} color={accentColor} />
                  <span>{theme.pricelistButtonText || 'Lihat Pricelist PDF'}</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* HERO STYLE G: Asymmetric Side Dock */}
        {theme.heroStyle === 'side_dock' && (
          <div style={{ maxWidth: '1120px', margin: '32px auto 0', padding: '0 24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px', alignItems: 'stretch' }}>
              {/* Left Dock Panel */}
              <div className="glass-card" style={{
                padding: '36px',
                borderRadius: '28px',
                background: cardBg,
                border: `1px solid ${borderColor}`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '24px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '18px', overflow: 'hidden', border: `2px solid ${accentColor}`, flexShrink: 0 }}>
                      {vendor.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={vendor.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: accentColor, color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                          {(vendor.companyName || vendor.name).charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="font-mono-film" style={{ fontSize: '10.5px', letterSpacing: '0.12em', color: accentColor, textTransform: 'uppercase', fontWeight: 700 }}>
                        OFFICIAL ATELIER
                      </span>
                      <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '2px 0 0', color: textColor }}>
                        {vendor.companyName || vendor.name}
                      </h1>
                    </div>
                  </div>

                  <p style={{ fontSize: '14px', color: mutedTextColor, lineHeight: 1.6, margin: '0 0 20px' }}>
                    {vendor.bio || 'Dokumentasi visual momen istimewa & karya fotografi profesional.'}
                  </p>

                  <div style={{ display: 'flex', gap: '16px', padding: '14px 18px', borderRadius: '16px', background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', border: `1px solid ${borderColor}`, marginBottom: '16px' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: mutedTextColor, display: 'block' }}>Kategori Album</span>
                      <strong style={{ fontSize: '16px', color: textColor }}>{vendor.albums.length} Galeri</strong>
                    </div>
                    <div style={{ width: '1px', background: borderColor }} />
                    <div>
                      <span style={{ fontSize: '11px', color: mutedTextColor, display: 'block' }}>Kemitraan</span>
                      <strong style={{ fontSize: '14px', color: '#10B981' }}>Verified Partner</strong>
                    </div>
                  </div>
                </div>

                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '13px 20px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      color: '#FFFFFF',
                      textDecoration: 'none',
                      fontSize: '13.5px',
                      fontWeight: 700
                    }}
                  >
                    <MessageCircle size={16} />
                    <span>Konsultasi & Reservasi</span>
                  </a>
                )}
              </div>

              {/* Right Side Cover Preview Frame */}
              <div style={{ position: 'relative', width: '100%', minHeight: '340px', borderRadius: '28px', overflow: 'hidden', boxShadow: '0 12px 36px rgba(0,0,0,0.08)' }}>
                {vendor.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={vendor.coverUrl} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: '#1D1D1F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#86868B' }}>
                    <Camera size={44} />
                  </div>
                )}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 60%)' }} />
              </div>
            </div>
          </div>
        )}

        {/* HERO STYLE H: Stacked Frames Showcase */}
        {theme.heroStyle === 'polaroid_stacked' && (
          <div style={{ maxWidth: '1120px', margin: '36px auto 0', padding: '0 24px' }}>
            <div className="glass-card" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '40px',
              padding: '36px',
              borderRadius: '28px',
              background: cardBg,
              border: `1px solid ${borderColor}`,
              alignItems: 'center'
            }}>
              <div>
                <div style={{ width: '72px', height: '72px', borderRadius: '18px', overflow: 'hidden', border: `2px solid ${accentColor}`, marginBottom: '16px' }}>
                  {vendor.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={vendor.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: accentColor, color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                      {(vendor.companyName || vendor.name).charAt(0)}
                    </div>
                  )}
                </div>

                <span className="font-mono-film" style={{ fontSize: '11px', letterSpacing: '0.12em', color: accentColor, textTransform: 'uppercase', fontWeight: 700 }}>
                  FINE ART ARCHIVE
                </span>
                <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '4px 0 12px', color: textColor, letterSpacing: '-0.02em' }}>
                  {vendor.companyName || vendor.name}
                </h1>
                <p style={{ fontSize: '14.5px', color: mutedTextColor, lineHeight: 1.6, margin: '0 0 24px' }}>
                  {vendor.bio || 'Dokumentasi visual momen istimewa & karya fotografi profesional.'}
                </p>

                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 26px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      color: '#FFFFFF',
                      textDecoration: 'none',
                      fontSize: '13.5px',
                      fontWeight: 700
                    }}
                  >
                    <MessageCircle size={16} />
                    <span>Konsultasi & Reservasi</span>
                  </a>
                )}
              </div>

              {/* Stacked 3 Polaroid/Art Frames Fan */}
              <div style={{ position: 'relative', height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {vendor.albums.slice(0, 3).map((alb, i) => {
                  const rotations = [-8, 2, 9];
                  const zIndexes = [1, 2, 3];
                  const leftOffsets = [-24, 0, 24];
                  return (
                    <div
                      key={alb.id}
                      onClick={() => setSelectedAlbum(alb)}
                      style={{
                        position: 'absolute',
                        width: '210px',
                        background: '#FFFFFF',
                        padding: '10px 10px 24px 10px',
                        borderRadius: '8px',
                        boxShadow: '0 16px 36px rgba(0,0,0,0.14)',
                        transform: `rotate(${rotations[i % 3]}deg) translateX(${leftOffsets[i % 3]}px)`,
                        zIndex: zIndexes[i % 3],
                        cursor: 'pointer',
                        transition: 'transform 0.3s ease'
                      }}
                    >
                      <div style={{ position: 'relative', width: '100%', height: '170px', overflow: 'hidden', borderRadius: '4px', background: '#1A1A1E' }}>
                        {alb.coverImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={alb.coverImageUrl} alt={alb.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#86868B' }}>
                            <Camera size={28} />
                          </div>
                        )}
                      </div>
                      <div style={{ marginTop: '10px', textAlign: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#1D1D1F', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {alb.title}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* HERO STYLE D: Social Banner (Default) */}
        {(!theme.heroStyle || theme.heroStyle === 'social') && (
          <>
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
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255, 255, 255, 0.3)', gap: '8px' }}>
                    <Layers size={40} />
                    <span style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                      Official Photography Portfolio
                    </span>
                  </div>
                )}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 60%)' }} />
              </div>
            </div>

            <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '0 24px' }}>
              <div style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '24px',
                paddingBottom: '28px',
                borderBottom: `1px solid ${borderColor}`
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginTop: '-44px', flexWrap: 'wrap' }}>
                  <div style={{
                    position: 'relative',
                    width: '92px',
                    height: '92px',
                    borderRadius: '22px',
                    overflow: 'hidden',
                    background: cardBg,
                    boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                    border: '3px solid #FFFFFF',
                    flexShrink: 0
                  }}>
                    {vendor.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={vendor.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #C27803 0%, #D97706 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 800, fontSize: '28px' }}>
                        {(vendor.companyName || vendor.name).charAt(0)}
                      </div>
                    )}
                  </div>

                  <div style={{ paddingTop: '50px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                      <h1 style={{ fontSize: '26px', fontWeight: 800, color: textColor, margin: 0, letterSpacing: '-0.02em' }}>
                        {vendor.companyName || vendor.name}
                      </h1>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 10px',
                        borderRadius: '999px',
                        backgroundColor: 'rgba(194, 120, 3, 0.1)',
                        color: accentColor,
                        fontSize: '11px',
                        fontWeight: 700,
                        border: '1px solid rgba(194, 120, 3, 0.3)'
                      }}>
                        <ShieldCheck size={13} />
                        <span>Verified Partner</span>
                      </span>
                    </div>

                    <p style={{ fontSize: '13.5px', color: mutedTextColor, margin: '0 0 12px 0', maxWidth: '580px', lineHeight: 1.5 }}>
                      {vendor.bio || 'Dokumentasi visual momen istimewa & karya fotografi profesional.'}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '12.5px', color: mutedTextColor }}>
                      {vendor.city && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <MapPin size={13} color={accentColor} />
                          <span>{vendor.city}</span>
                        </div>
                      )}
                      {vendor.instagram && (
                        <a href={`https://instagram.com/${vendor.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none', color: mutedTextColor, fontWeight: 500 }}>
                          <InstagramIcon size={14} />
                          <span>{vendor.instagram.startsWith('@') ? vendor.instagram : `@${vendor.instagram}`}</span>
                        </a>
                      )}
                      {theme.socialLinks?.tiktok && (
                        <a href={theme.socialLinks.tiktok.startsWith('http') ? theme.socialLinks.tiktok : `https://tiktok.com/@${theme.socialLinks.tiktok.replace('@', '')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none', color: mutedTextColor, fontWeight: 500 }}>
                          <TikTokIcon size={13} />
                          <span>TikTok</span>
                        </a>
                      )}
                      {vendor.website && (
                        <a href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none', color: mutedTextColor }}>
                          <Globe size={13} color="#0284C7" />
                          <span>{vendor.website.replace(/^https?:\/\//, '')}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {whatsappUrl && (
                  <div style={{ paddingTop: '50px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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

                    {theme.pricelistPdfUrl && (
                      <a
                        href={theme.pricelistPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="glass-pill"
                        style={{
                          padding: '11px 18px',
                          fontSize: '13px',
                          fontWeight: 600,
                          textDecoration: 'none',
                          color: textColor,
                          border: `1px solid ${borderColor}`,
                          background: cardBg,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <FileText size={15} color={accentColor} />
                        <span>Pricelist PDF</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 3. OPTIONAL MODULAR SECTION: VIDEO HIGHLIGHT (SWIPEABLE HORIZONTAL SLIDER) */}
      {theme.showVideoHighlight && highlightVideos.length > 0 && (
        <div style={{ maxWidth: '1120px', margin: '48px auto 0', padding: '0 24px' }}>
          <div style={{ 
            marginBottom: '16px', 
            display: 'flex', 
            alignItems: 'flex-end', 
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: accentColor, fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                <Video size={13} />
                <span>CINEMATIC HIGHLIGHT</span>
                {highlightVideos[activeVideoIdx]?.category && (
                  <span style={{ 
                    background: isObsidian ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', 
                    color: textColor,
                    padding: '2px 8px', 
                    borderRadius: '5px',
                    fontSize: '10px',
                    fontWeight: 600,
                    textTransform: 'none',
                    letterSpacing: 'normal'
                  }}>
                    {highlightVideos[activeVideoIdx]?.category}
                  </span>
                )}
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: textColor, margin: '6px 0 0 0' }}>
                {highlightVideos[activeVideoIdx]?.title || theme.videoHighlightTitle || 'Wedding Film Showcase'}
              </h2>
            </div>

            {/* Slider Controls (if > 1 video) */}
            {highlightVideos.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: mutedTextColor, marginRight: '4px' }}>
                  {activeVideoIdx + 1} / {highlightVideos.length}
                </span>
                <button
                  type="button"
                  onClick={handlePrevVideo}
                  disabled={activeVideoIdx === 0}
                  className="glass-card"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: activeVideoIdx === 0 ? 'not-allowed' : 'pointer',
                    opacity: activeVideoIdx === 0 ? 0.35 : 1,
                    border: `1px solid ${borderColor}`,
                    color: textColor,
                    background: isObsidian ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    transition: 'all 0.2s'
                  }}
                  aria-label="Video Sebelumnya"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleNextVideo}
                  disabled={activeVideoIdx === highlightVideos.length - 1}
                  className="glass-card"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: activeVideoIdx === highlightVideos.length - 1 ? 'not-allowed' : 'pointer',
                    opacity: activeVideoIdx === highlightVideos.length - 1 ? 0.35 : 1,
                    border: `1px solid ${borderColor}`,
                    color: textColor,
                    background: isObsidian ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    transition: 'all 0.2s'
                  }}
                  aria-label="Video Berikutnya"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Video Selector Tabs (if > 1 video) */}
          {highlightVideos.length > 1 && (
            <div style={{ 
              display: 'flex', 
              gap: '8px', 
              overflowX: 'auto', 
              paddingBottom: '10px', 
              marginBottom: '14px', 
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}>
              {highlightVideos.map((vid, idx) => {
                const isActive = activeVideoIdx === idx;
                return (
                  <button
                    key={vid.id || idx}
                    type="button"
                    onClick={() => handleScrollToVideo(idx)}
                    style={{
                      padding: '7px 16px',
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      border: isActive ? `1px solid ${accentColor}` : `1px solid ${borderColor}`,
                      background: isActive ? accentColor : (isObsidian ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                      color: isActive ? '#FFFFFF' : textColor,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>{vid.title || `Video #${idx + 1}`}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Swipeable Video Slider Track */}
          <div
            ref={videoSliderRef}
            onScroll={handleVideoScroll}
            style={{
              display: 'flex',
              gap: '24px',
              overflowX: 'auto',
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              borderRadius: '24px'
            }}
          >
            {highlightVideos.map((vid, idx) => (
              <div
                key={vid.id || idx}
                style={{
                  flex: '0 0 100%',
                  width: '100%',
                  scrollSnapAlign: 'center',
                  borderRadius: '24px',
                  overflow: 'hidden',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.14)',
                  background: isObsidian ? '#000000' : '#1C1C1E',
                  position: 'relative'
                }}
              >
                <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', height: 0 }}>
                  <iframe
                    src={getEmbedVideoUrl(vid.url)}
                    title={vid.title || `Highlight Video ${idx + 1}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Dots Indicator & Swipe Tip (if > 1 video) */}
          {highlightVideos.length > 1 && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginTop: '16px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <span style={{ fontSize: '11.5px', color: mutedTextColor, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={13} style={{ color: accentColor }} />
                <span>Geser ke samping untuk melihat video lainnya</span>
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {highlightVideos.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleScrollToVideo(i)}
                    style={{
                      width: activeVideoIdx === i ? '22px' : '7px',
                      height: '7px',
                      borderRadius: '999px',
                      background: activeVideoIdx === i ? accentColor : (isObsidian ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'),
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      transition: 'all 0.25s ease'
                    }}
                    aria-label={`Lihat video ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. OPTIONAL MODULAR SECTION: BADGES & PENGHARGAAN */}
      {theme.showBadges && theme.badges && theme.badges.length > 0 && (
        <div style={{ maxWidth: '1120px', margin: '32px auto 0', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {theme.badges.map((b, idx) => (
              <div
                key={idx}
                className="glass-pill"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: textColor,
                  background: cardBg,
                  border: `1px solid ${borderColor}`
                }}
              >
                <Award size={13} color={accentColor} />
                <span>{b}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. PORTFOLIO ALBUM CATEGORIES SECTION */}
      <div style={{ maxWidth: '1120px', margin: '40px auto 0', padding: '0 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: accentColor, fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
              <Sparkles size={13} />
              <span>KOLEKSI KARYA FOTOGRAFI</span>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: textColor, letterSpacing: '-0.02em', margin: 0 }}>
              Galeri Album & Portofolio
            </h2>
          </div>

          <span style={{ fontSize: '12px', color: mutedTextColor, fontWeight: 500 }}>
            {vendor.albums.length} Kategori Album
          </span>
        </div>

        {/* ALBUMS RENDERER (Dynamic Layout: Grid vs Masonry vs Filmstrip vs Fullwidth vs Bento vs Carousel vs Compact List vs Diagonal) */}
        {vendor.albums && vendor.albums.length > 0 ? (
          <>
            {/* SPECIAL LAYOUT A: Spotlight Carousel Stage */}
            {theme.gridLayout === 'carousel_stage' && (
              <div style={{ position: 'relative', width: '100%', padding: '16px 0 24px' }}>
                {(() => {
                  const safeIndex = stageIndex % vendor.albums.length;
                  const currentAlbum = vendor.albums[safeIndex];
                  return (
                    <div>
                      {/* Big Spotlight Stage Display */}
                      <div
                        onClick={() => setSelectedAlbum(currentAlbum)}
                        className="glass-card"
                        style={{
                          position: 'relative',
                          width: '100%',
                          height: '420px',
                          borderRadius: '28px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
                          background: '#1A1A1E'
                        }}
                      >
                        {currentAlbum.coverImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={currentAlbum.coverImageUrl} alt={currentAlbum.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#86868B' }}>
                            <Camera size={48} />
                          </div>
                        )}
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.5) 100%)' }} />

                        {/* Top Bar Pill */}
                        <div style={{ position: 'absolute', top: '20px', left: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ padding: '6px 14px', borderRadius: '999px', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)', color: '#FFFFFF', fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                            SPOTLIGHT #{safeIndex + 1} OF {vendor.albums.length}
                          </span>
                        </div>

                        {/* Bottom Info & Action */}
                        <div style={{ position: 'absolute', bottom: '24px', left: '24px', right: '24px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                          <div style={{ maxWidth: '600px' }}>
                            <span style={{ fontSize: '11px', color: '#F59E0B', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                              GOOGLE DRIVE COLLECTION
                            </span>
                            <h3 style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', margin: '4px 0 6px', letterSpacing: '-0.02em' }}>
                              {currentAlbum.title}
                            </h3>
                            {currentAlbum.description && (
                              <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.5 }}>
                                {currentAlbum.description}
                              </p>
                            )}
                          </div>

                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '14px', background: accentColor, color: '#FFFFFF', fontWeight: 700, fontSize: '13px' }}>
                            <BookOpen size={16} />
                            <span>Buka Slideshow Album</span>
                          </div>
                        </div>

                        {/* Stage Prev / Next Buttons */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStageIndex(prev => (prev - 1 + vendor.albums.length) % vendor.albums.length);
                          }}
                          style={{
                            position: 'absolute',
                            left: '16px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            background: 'rgba(0,0,0,0.5)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <ChevronLeft size={22} />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStageIndex(prev => (prev + 1) % vendor.albums.length);
                          }}
                          style={{
                            position: 'absolute',
                            right: '16px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            background: 'rgba(0,0,0,0.5)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <ChevronRight size={22} />
                        </button>
                      </div>

                      {/* Bottom Thumbnail Strip */}
                      <div className="horizontal-scroll-row" style={{ gap: '12px', marginTop: '16px', paddingBottom: '8px' }}>
                        {vendor.albums.map((alb, i) => (
                          <div
                            key={alb.id}
                            onClick={() => setStageIndex(i)}
                            style={{
                              position: 'relative',
                              width: '120px',
                              height: '75px',
                              borderRadius: '12px',
                              overflow: 'hidden',
                              cursor: 'pointer',
                              flexShrink: 0,
                              border: i === safeIndex ? `2px solid ${accentColor}` : `1px solid ${borderColor}`,
                              opacity: i === safeIndex ? 1 : 0.6,
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {alb.coverImageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={alb.coverImageUrl} alt={alb.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', background: '#1D1D1F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#86868B' }}>
                                <Camera size={16} />
                              </div>
                            )}
                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 70%)' }} />
                            <span style={{ position: 'absolute', bottom: '4px', left: '6px', right: '6px', color: '#FFFFFF', fontSize: '10px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {alb.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* SPECIAL LAYOUT B: Curated Archive Directory (Compact List) */}
            {theme.gridLayout === 'compact_list' && (
              <div className="glass-card" style={{ borderRadius: '24px', background: cardBg, border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
                {vendor.albums.map((album, idx) => (
                  <div
                    key={album.id}
                    onClick={() => setSelectedAlbum(album)}
                    style={{
                      padding: '20px 24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '16px',
                      borderBottom: idx < vendor.albums.length - 1 ? `1px solid ${borderColor}` : 'none',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <span className="font-mono-film" style={{ fontSize: '14px', fontWeight: 800, color: accentColor, width: '32px' }}>
                        #{String(idx + 1).padStart(2, '0')}
                      </span>

                      <div style={{ width: '84px', height: '64px', borderRadius: '10px', overflow: 'hidden', background: '#1D1D1F', flexShrink: 0 }}>
                        {album.coverImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={album.coverImageUrl} alt={album.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#86868B' }}>
                            <Camera size={18} />
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 style={{ fontSize: '16px', fontWeight: 700, color: textColor, margin: '0 0 4px' }}>
                          {album.title}
                        </h4>
                        <p style={{ fontSize: '12.5px', color: mutedTextColor, margin: 0, maxWidth: '480px', lineHeight: 1.4 }}>
                          {album.description || 'Google Drive Album Dokumentasi'}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '11px', color: mutedTextColor, fontFamily: 'var(--font-mono)' }}>
                        Folder Drive
                      </span>
                      <span className="glass-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, color: accentColor, border: `1px solid ${accentColor}` }}>
                        <span>Buka Album</span>
                        <ArrowRight size={13} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* STANDARD & CARD-BASED GRID LAYOUTS (grid, masonry, filmstrip, fullwidth_rows, bento_mosaic, diagonal_flow) */}
            {theme.gridLayout !== 'carousel_stage' && theme.gridLayout !== 'compact_list' && (
              <div style={
                theme.gridLayout === 'filmstrip'
                  ? { display: 'flex', gap: '24px', overflowX: 'auto', paddingBottom: '16px', scrollSnapType: 'x mandatory' }
                  : theme.gridLayout === 'fullwidth_rows'
                    ? { display: 'flex', flexDirection: 'column', gap: '28px' }
                    : theme.gridLayout === 'diagonal_flow'
                      ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '28px' }
                      : theme.gridLayout === 'bento_mosaic'
                        ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }
                        : { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }
              }>
                {vendor.albums.map((album, idx) => {
                  const cardStyle = theme.cardStyle || 'photobook';
                  const isBentoHero = theme.gridLayout === 'bento_mosaic' && idx === 0;
                  const isDiagonalOffset = theme.gridLayout === 'diagonal_flow' && idx % 2 === 1;

                  // Wrapper style helper for bento & diagonal
                  const wrapperExtraStyle: React.CSSProperties = {
                    ...(isBentoHero ? { gridColumn: 'span 2' } : {}),
                    ...(isDiagonalOffset ? { transform: 'translateY(36px)' } : {})
                  };

                  // STYLE 1: 3D Hardcover Photobook Card
                  if (cardStyle === 'photobook') {
                    return (
                      <div
                        key={album.id}
                        onClick={() => setSelectedAlbum(album)}
                        style={{
                          position: 'relative',
                          borderRadius: '16px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.12), -6px 0 16px rgba(0, 0, 0, 0.15) inset',
                          borderLeft: `8px solid ${accentColor}`,
                          background: '#1A1A1E',
                          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                          minWidth: theme.gridLayout === 'filmstrip' ? '320px' : 'auto',
                          ...wrapperExtraStyle
                        }}
                      >
                        <div style={{ position: 'relative', width: '100%', height: isBentoHero ? '320px' : '240px', overflow: 'hidden' }}>
                          {album.coverImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={album.coverImageUrl} alt={album.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#86868B' }}>
                              <BookOpen size={36} />
                            </div>
                          )}
                          <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '18px', background: 'linear-gradient(to right, rgba(0,0,0,0.5) 0%, rgba(255,255,255,0.15) 50%, rgba(0,0,0,0.3) 100%)', boxShadow: '1px 0 3px rgba(0,0,0,0.3)' }} />
                          <div style={{ position: 'absolute', top: 0, right: '24px', width: '14px', height: '24px', background: accentColor, boxShadow: '0 2px 6px rgba(0,0,0,0.3)', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)' }} />
                          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)' }} />
                          <div style={{ position: 'absolute', bottom: '16px', left: '26px', right: '16px' }}>
                            <span style={{ fontSize: '10.5px', color: '#F59E0B', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                              HARDCOVER PHOTOBOOK
                            </span>
                            <h3 style={{ fontSize: isBentoHero ? '22px' : '18px', fontWeight: 700, color: '#FFFFFF', margin: '4px 0 0 0' }}>
                              {album.title}
                            </h3>
                            {album.description && (
                              <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.75)', margin: '4px 0 0 0' }}>
                                {album.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div style={{ padding: '12px 18px 12px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: cardBg, fontSize: '11.5px', color: mutedTextColor }}>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>Buka Slideshow Buku</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: accentColor, fontWeight: 700 }}>
                            <span>Lihat Album</span>
                            <ArrowRight size={13} />
                          </span>
                        </div>
                      </div>
                    );
                  }

                  // STYLE 2: Polaroid / Vintage Film Stack
                  if (cardStyle === 'polaroid') {
                    return (
                      <div
                        key={album.id}
                        onClick={() => setSelectedAlbum(album)}
                        style={{
                          position: 'relative',
                          background: '#FFFFFF',
                          padding: '12px 12px 28px 12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          boxShadow: '0 12px 28px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)',
                          transition: 'all 0.25s ease',
                          transform: idx % 2 === 0 ? 'rotate(-1.5deg)' : 'rotate(1.5deg)',
                          minWidth: theme.gridLayout === 'filmstrip' ? '300px' : 'auto',
                          ...wrapperExtraStyle
                        }}
                      >
                        <div style={{ position: 'relative', width: '100%', height: isBentoHero ? '300px' : '220px', background: '#1D1D1F', overflow: 'hidden', borderRadius: '4px' }}>
                          {album.coverImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={album.coverImageUrl} alt={album.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#86868B' }}>
                              <Camera size={32} />
                            </div>
                          )}
                        </div>
                        <div style={{ marginTop: '16px', textAlign: 'center' }}>
                          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1D1D1F', margin: 0 }}>
                            {album.title}
                          </h3>
                          {album.description && (
                            <p style={{ fontSize: '11.5px', color: '#86868B', margin: '4px 0 0 0' }}>
                              {album.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // STYLE 3: Editorial Fine-Art Magazine
                  if (cardStyle === 'editorial') {
                    return (
                      <div
                        key={album.id}
                        onClick={() => setSelectedAlbum(album)}
                        style={{
                          position: 'relative',
                          cursor: 'pointer',
                          borderRadius: '16px',
                          overflow: 'hidden',
                          background: cardBg,
                          border: `1px solid ${borderColor}`,
                          boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
                          transition: 'all 0.3s ease',
                          minWidth: theme.gridLayout === 'filmstrip' ? '280px' : 'auto',
                          ...wrapperExtraStyle
                        }}
                      >
                        <div style={{ position: 'relative', width: '100%', height: isBentoHero ? '340px' : '300px', overflow: 'hidden' }}>
                          {album.coverImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={album.coverImageUrl} alt={album.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', background: '#1D1D1F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#86868B' }}>
                              <BookOpen size={36} />
                            </div>
                          )}
                          <div style={{ position: 'absolute', top: '14px', right: '14px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', padding: '3px 9px', borderRadius: '6px', color: '#FFFFFF', fontSize: '10.5px', fontFamily: 'var(--font-mono)' }}>
                            VOL. {String(idx + 1).padStart(2, '0')}
                          </div>
                        </div>
                        <div style={{ padding: '18px', textAlign: 'left' }}>
                          <h3 style={{ fontSize: '17px', fontWeight: 700, color: textColor, margin: 0 }}>
                            {album.title}
                          </h3>
                          {album.description && (
                            <p style={{ fontSize: '12px', color: mutedTextColor, margin: '4px 0 0 0' }}>
                              {album.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // STYLE 5 (NEW): 35mm Slide Transparency Frame
                  if (cardStyle === 'film_slide') {
                    return (
                      <div
                        key={album.id}
                        onClick={() => setSelectedAlbum(album)}
                        style={{
                          position: 'relative',
                          background: isDark ? '#1F222B' : '#F5F3EC',
                          padding: '14px 14px 20px 14px',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          boxShadow: '0 14px 32px rgba(0,0,0,0.1)',
                          border: `1px solid ${borderColor}`,
                          minWidth: theme.gridLayout === 'filmstrip' ? '300px' : 'auto',
                          ...wrapperExtraStyle
                        }}
                      >
                        {/* Film Slide Header with Sprocket Holes */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '0 6px' }}>
                          <span style={{ fontSize: '9.5px', fontFamily: 'var(--font-mono)', color: '#DC2626', fontWeight: 800, letterSpacing: '0.1em' }}>
                            SB COLOR • 400 ISO
                          </span>
                          <span style={{ fontSize: '9.5px', fontFamily: 'var(--font-mono)', color: mutedTextColor, fontWeight: 700 }}>
                            EXP #{String(idx + 1).padStart(2, '0')}
                          </span>
                        </div>

                        {/* Inset Photo Slide Area */}
                        <div style={{ position: 'relative', width: '100%', height: isBentoHero ? '300px' : '220px', borderRadius: '4px', overflow: 'hidden', background: '#000000', border: '2px solid rgba(0,0,0,0.6)' }}>
                          {album.coverImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={album.coverImageUrl} alt={album.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#86868B' }}>
                              <Camera size={32} />
                            </div>
                          )}
                        </div>

                        {/* Slide Label Footer */}
                        <div style={{ marginTop: '12px', textAlign: 'center' }}>
                          <h4 style={{ fontSize: '15px', fontWeight: 800, color: textColor, margin: 0, fontFamily: 'var(--font-mono)' }}>
                            {album.title}
                          </h4>
                          <span style={{ fontSize: '11px', color: mutedTextColor, display: 'block', marginTop: '2px' }}>
                            {album.description || 'Slide Frame Curated Film'}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  // STYLE 6 (NEW): Frameless Floating Canvas
                  if (cardStyle === 'floating_canvas') {
                    return (
                      <div
                        key={album.id}
                        onClick={() => setSelectedAlbum(album)}
                        style={{
                          position: 'relative',
                          borderRadius: '22px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          boxShadow: '0 24px 50px -10px rgba(0,0,0,0.22)',
                          minWidth: theme.gridLayout === 'filmstrip' ? '310px' : 'auto',
                          height: isBentoHero ? '380px' : '280px',
                          background: '#121214',
                          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                          ...wrapperExtraStyle
                        }}
                      >
                        {album.coverImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={album.coverImageUrl} alt={album.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#86868B' }}>
                            <Camera size={36} />
                          </div>
                        )}
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)' }} />

                        {/* Floating bottom chip */}
                        <div style={{ position: 'absolute', bottom: '18px', left: '18px', right: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <span style={{ fontSize: '10px', color: '#D4AF37', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                              CANVAS GALLERY
                            </span>
                            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: '2px 0 0' }}>
                              {album.title}
                            </h3>
                          </div>
                          <span style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
                            <ArrowRight size={16} />
                          </span>
                        </div>
                      </div>
                    );
                  }

                  // STYLE 7 (NEW): Museum Matted Passe-Partout Frame
                  if (cardStyle === 'gallery_frame') {
                    return (
                      <div
                        key={album.id}
                        onClick={() => setSelectedAlbum(album)}
                        style={{
                          position: 'relative',
                          background: isDark ? '#121316' : '#1A1817',
                          padding: '16px',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          boxShadow: '0 16px 40px rgba(0,0,0,0.18)',
                          border: '3px solid #2B2825',
                          minWidth: theme.gridLayout === 'filmstrip' ? '320px' : 'auto',
                          ...wrapperExtraStyle
                        }}
                      >
                        {/* White Passe-Partout Matboard Area */}
                        <div style={{
                          background: '#FFFFFF',
                          padding: '20px 20px 24px 20px',
                          borderRadius: '4px',
                          boxShadow: 'inset 0 0 8px rgba(0,0,0,0.15)'
                        }}>
                          <div style={{ position: 'relative', width: '100%', height: isBentoHero ? '280px' : '200px', overflow: 'hidden', background: '#000000', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                            {album.coverImageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={album.coverImageUrl} alt={album.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#86868B' }}>
                                <Camera size={28} />
                              </div>
                            )}
                          </div>

                          {/* Brass / Gold Plaque label */}
                          <div style={{
                            marginTop: '16px',
                            padding: '6px 12px',
                            background: 'linear-gradient(135deg, #F3E7C4 0%, #D8B978 100%)',
                            borderRadius: '4px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            textAlign: 'center'
                          }}>
                            <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#3A2E12', letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block' }}>
                              {album.title}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // STYLE 8 (NEW): Ultra-Curved Modern Capsule
                  if (cardStyle === 'modern_pill') {
                    return (
                      <div
                        key={album.id}
                        onClick={() => setSelectedAlbum(album)}
                        className="glass-card"
                        style={{
                          position: 'relative',
                          borderRadius: '32px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          background: cardBg,
                          border: `1px solid ${borderColor}`,
                          boxShadow: '0 16px 40px rgba(0,0,0,0.06)',
                          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                          minWidth: theme.gridLayout === 'filmstrip' ? '300px' : 'auto',
                          ...wrapperExtraStyle
                        }}
                      >
                        <div style={{ position: 'relative', width: '100%', height: isBentoHero ? '300px' : '220px', overflow: 'hidden', borderRadius: '28px 28px 0 0' }}>
                          {album.coverImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={album.coverImageUrl} alt={album.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', background: '#1D1D1F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#86868B' }}>
                              <Camera size={32} />
                            </div>
                          )}
                          <div style={{ position: 'absolute', top: '14px', left: '14px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '999px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', color: '#FFFFFF', fontSize: '11px', fontWeight: 700 }}>
                              <Camera size={12} color={accentColor} />
                              <span>Lihat Album</span>
                            </span>
                          </div>
                        </div>

                        <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <h4 style={{ fontSize: '16px', fontWeight: 800, color: textColor, margin: 0 }}>
                              {album.title}
                            </h4>
                            <span style={{ fontSize: '11.5px', color: mutedTextColor }}>
                              Google Drive Portfolio
                            </span>
                          </div>
                          <span style={{ width: '34px', height: '34px', borderRadius: '50%', background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: accentColor }}>
                            <ArrowRight size={14} />
                          </span>
                        </div>
                      </div>
                    );
                  }

                  // STYLE 4: Cinematic Glass (Default Fallback)
                  return (
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
                        border: `1px solid ${borderColor}`,
                        display: 'flex',
                        flexDirection: 'column',
                        background: cardBg,
                        minWidth: theme.gridLayout === 'filmstrip' ? '320px' : 'auto',
                        ...wrapperExtraStyle
                      }}
                    >
                      <div style={{ position: 'relative', width: '100%', height: isBentoHero ? '280px' : '220px', backgroundColor: '#1D1D1F', overflow: 'hidden' }}>
                        {album.coverImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={album.coverImageUrl} alt={album.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#86868B', gap: '8px' }}>
                            <BookOpen size={36} />
                            <span style={{ fontSize: '12px' }}>Klik untuk membuka album</span>
                          </div>
                        )}
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)' }} />
                        <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '8px', backgroundColor: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(8px)', color: '#FFFFFF', fontSize: '11px', fontWeight: 600 }}>
                            <BookOpen size={11} color={accentColor} />
                            <span>Buka Photobook</span>
                          </span>
                        </div>
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
                      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: mutedTextColor, backgroundColor: cardBg }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>Google Drive Album</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: accentColor, fontWeight: 600 }}>
                          <span>Jelajahi Foto</span>
                          <ArrowRight size={13} />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="glass-card" style={{ padding: '48px 24px', textAlign: 'center', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', background: cardBg, border: `1px solid ${borderColor}` }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'rgba(194, 120, 3, 0.1)', color: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={26} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: textColor, margin: 0 }}>
              Album Belum Ditambahkan
            </h3>
            <p style={{ fontSize: '13px', color: mutedTextColor, maxWidth: '420px', margin: 0, lineHeight: 1.5 }}>
              Vendor ini sedang menyiapkan katalog portofolio terbaik mereka. Hubungi langsung via WhatsApp untuk melihat sampel dokumentasi terbaru.
            </p>
            {whatsappUrl && (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="glass-pill" style={{ marginTop: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: 600, color: '#10B981', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <MessageCircle size={15} />
                <span>Tanya Sampel via WhatsApp</span>
              </a>
            )}
          </div>
        )}
      </div>

      {/* 6. OPTIONAL MODULAR SECTION: BEHIND THE LENS / GEAR SHOWCASE */}
      {theme.showBehindTheLens && theme.behindTheLens && (
        <div style={{ maxWidth: '1120px', margin: '56px auto 0', padding: '0 24px' }}>
          <div className="glass-card" style={{ padding: '36px', borderRadius: '28px', background: cardBg, border: `1px solid ${borderColor}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' }}>
              {theme.behindTheLens.avatarUrl && (
                <div style={{ width: '74px', height: '74px', borderRadius: '20px', overflow: 'hidden', flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={theme.behindTheLens.avatarUrl} alt="Photographer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <div style={{ flex: 1 }}>
                <span className="font-mono-film" style={{ fontSize: '11px', color: accentColor, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  BEHIND THE LENS
                </span>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: textColor, margin: '4px 0 8px 0' }}>
                  {theme.behindTheLens.leadPhotographerName || 'Tim Fotografer Utama'}
                </h3>
                <p style={{ fontSize: '13.5px', color: mutedTextColor, margin: '0 0 16px 0', lineHeight: 1.6 }}>
                  {theme.behindTheLens.bio || 'Mendedikasikan diri untuk menangkap setiap emosi murni dalam setiap momen tak tergantikan.'}
                </p>

                {theme.behindTheLens.gearList && theme.behindTheLens.gearList.length > 0 && (
                  <div>
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: textColor, display: 'block', marginBottom: '8px' }}>
                      Peralatan Utama (Gear List):
                    </span>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {theme.behindTheLens.gearList.map((gear, gIdx) => (
                        <span key={gIdx} style={{ fontSize: '11px', background: isObsidian ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: textColor, padding: '4px 10px', borderRadius: '8px', fontWeight: 500 }}>
                          {gear}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. OPTIONAL MODULAR SECTION: TESTIMONIALS */}
      {theme.showTestimonials && theme.testimonials && theme.testimonials.length > 0 && (
        <div style={{ maxWidth: '1120px', margin: '56px auto 0', padding: '0 24px' }}>
          <div style={{ marginBottom: '24px', textAlign: 'center' }}>
            <span className="font-mono-film" style={{ fontSize: '11px', color: accentColor, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              KATA MEREKA
            </span>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: textColor, margin: '4px 0 0 0' }}>
              Ulasan & Kepuasan Klien
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {theme.testimonials.map((testi) => (
              <div key={testi.id} className="glass-card" style={{ padding: '24px', borderRadius: '20px', background: cardBg, border: `1px solid ${borderColor}` }}>
                <div style={{ display: 'flex', gap: '3px', marginBottom: '10px' }}>
                  {Array.from({ length: testi.rating || 5 }).map((_, rIdx) => (
                    <Star key={rIdx} size={14} fill="#F59E0B" color="#F59E0B" />
                  ))}
                </div>
                <p style={{ fontSize: '13px', color: textColor, lineHeight: 1.6, fontStyle: 'italic', margin: '0 0 14px 0' }}>
                  "{testi.quote}"
                </p>
                <div>
                  <strong style={{ fontSize: '13px', color: textColor, display: 'block' }}>{testi.clientName}</strong>
                  {testi.eventDate && (
                    <span style={{ fontSize: '11px', color: mutedTextColor }}>{testi.eventDate}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. OPTIONAL MODULAR SECTION: FAQ ACCORDION */}
      {theme.showFaq && theme.faqs && theme.faqs.length > 0 && (
        <div style={{ maxWidth: '780px', margin: '56px auto 0', padding: '0 24px' }}>
          <div style={{ marginBottom: '24px', textAlign: 'center' }}>
            <span className="font-mono-film" style={{ fontSize: '11px', color: accentColor, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              FREQUENTLY ASKED QUESTIONS
            </span>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: textColor, margin: '4px 0 0 0' }}>
              Pertanyaan yang Sering Diajukan
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {theme.faqs.map((faq, fIdx) => {
              const isOpen = openFaqIndex === fIdx;
              return (
                <div key={fIdx} className="glass-card" style={{ borderRadius: '16px', background: cardBg, border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : fIdx)}
                    style={{
                      width: '100%',
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: textColor,
                      fontSize: '14px',
                      fontWeight: 700,
                      textAlign: 'left'
                    }}
                  >
                    <span>{faq.question}</span>
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {isOpen && (
                    <div style={{ padding: '0 20px 16px', fontSize: '13px', color: mutedTextColor, lineHeight: 1.6 }}>
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 9. BOTTOM FOOTER BRANDING */}
      <footer style={{
        maxWidth: '1120px',
        margin: '64px auto 0',
        padding: '24px',
        borderTop: `1px solid ${borderColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        fontSize: '12px',
        color: mutedTextColor
      }}>
        <div>
          © {new Date().getFullYear()} {vendor.companyName || vendor.name}. Portofolio Resmi.
        </div>
        <Link 
          href="/" 
          target="_blank"
          rel="noopener noreferrer"
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '10px', 
            textDecoration: 'none',
            color: mutedTextColor,
            fontSize: '12.5px'
          }}
        >
          <span>Didukung oleh</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="/logo.png" 
            alt="Sudut Bingkai" 
            style={{ 
              width: '42px', 
              height: '42px', 
              objectFit: 'contain', 
              borderRadius: '8px',
              display: 'block'
            }} 
          />
        </Link>
      </footer>

      {/* 10. MOBILE FLOATING STICKY BAR */}
      {theme.enableStickyMobileBar && formattedPhone && (
        <div className="mobile-only" style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '12px 16px',
          background: isObsidian ? 'rgba(18, 18, 20, 0.92)' : 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(20px)',
          borderTop: `1px solid ${borderColor}`,
          zIndex: 50,
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {theme.enableLeadForm && (
              <button
                type="button"
                onClick={() => setLeadModalOpen(true)}
                className="glass-pill"
                style={{
                  flex: 1,
                  padding: '12px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: cardBg,
                  border: `1px solid ${accentColor}`,
                  color: accentColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                Cek Tanggal
              </button>
            )}
            <a
              href={whatsappUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1.5,
                padding: '12px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 700,
                textAlign: 'center',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <MessageCircle size={15} />
              <span>Chat WhatsApp</span>
            </a>
          </div>
        </div>
      )}

      {/* 11. LEAD CAPTURE MODAL */}
      {leadModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '16px'
        }}>
          <div className="glass-card" style={{
            width: '100%',
            maxWidth: '460px',
            borderRadius: '24px',
            background: cardBg,
            padding: '28px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color={accentColor} />
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: textColor }}>
                  Cek Jadwal & Reservasi
                </h3>
              </div>
              <button type="button" onClick={() => setLeadModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: mutedTextColor }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSendLeadForm} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: textColor, display: 'block', marginBottom: '4px' }}>
                  Nama Lengkap / Pasangan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rian & Nisa"
                  value={leadName}
                  onChange={e => setLeadName(e.target.value)}
                  className="glass-input"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: textColor, display: 'block', marginBottom: '4px' }}>
                  Rencana Tanggal Acara
                </label>
                <input
                  type="date"
                  value={leadDate}
                  onChange={e => setLeadDate(e.target.value)}
                  className="glass-input"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: textColor, display: 'block', marginBottom: '4px' }}>
                  Kategori Acara
                </label>
                <select
                  value={leadEvent}
                  onChange={e => setLeadEvent(e.target.value)}
                  className="glass-input"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '13px' }}
                >
                  <option value="Pernikahan / Wedding">Pernikahan / Wedding</option>
                  <option value="Prewedding Outdoor/Studio">Prewedding Outdoor/Studio</option>
                  <option value="Lamaran / Engagement">Lamaran / Engagement</option>
                  <option value="Ulang Tahun / Party">Ulang Tahun / Party</option>
                  <option value="Dokumentasi Corporate">Dokumentasi Corporate</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: textColor, display: 'block', marginBottom: '4px' }}>
                  Kota / Venue Acara
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Tangerang Selatan / Hotel Santika"
                  value={leadLocation}
                  onChange={e => setLeadLocation(e.target.value)}
                  className="glass-input"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '13px' }}
                />
              </div>

              <button
                type="submit"
                style={{
                  marginTop: '8px',
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Send size={15} />
                <span>Kirim Pertanyaan ke WhatsApp</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 12. INTERACTIVE FULLSCREEN PHOTOBOOK SLIDESHOW VIEWER MODAL */}
      {selectedAlbum && (
        <PortfolioViewerModal
          album={selectedAlbum}
          vendorName={vendor.companyName || vendor.name}
          vendorLogo={vendor.logoUrl}
          whatsappUrl={whatsappUrl}
          watermarkEnabled={theme.watermarkEnabled}
          defaultTransition={theme.slideshowTransition || 'flipbook'}
          onClose={() => setSelectedAlbum(null)}
        />
      )}

    </div>
  );
}
