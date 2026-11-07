'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  X, ChevronLeft, ChevronRight, Loader2, AlertCircle, 
  Maximize2, Minimize2, BookOpen, ChevronDown, Check,
  Hand
} from 'lucide-react';
import { PageFlip } from 'page-flip';
import { VendorPortfolioAlbum } from '@/lib/types';

export type SlideshowTransition = 
  | 'flipbook' 
  | 'fade' 
  | 'slide_horizontal' 
  | 'zoom_kenburns' 
  | 'cube_3d' 
  | 'curtain_wipe' 
  | 'film_reel';

interface TransitionOption {
  id: SlideshowTransition;
  name: string;
  shortName: string;
  badge?: string;
  icon: string;
  desc: string;
}

export const SLIDESHOW_TRANSITIONS: TransitionOption[] = [
  {
    id: 'flipbook',
    name: '3D Real Physical Photobook (StPageFlip Engine)',
    shortName: 'Flipbook 3D Asli',
    badge: 'DEFAULT UTAMA',
    icon: '📖',
    desc: 'Simulasi fisika kertas nyata: ujung kertas bisa ditarik/dilepas mouse atau jari. Ukuran dinamis mengikuti foto asli tanpa blok putih.'
  },
  {
    id: 'fade',
    name: 'Fine-Art Soft Crossfade',
    shortName: 'Crossfade Lembut',
    icon: '✨',
    desc: 'Peralihan larut lembut tanpa distraksi hentakan, ala pameran seni museum modern.'
  },
  {
    id: 'slide_horizontal',
    name: 'Editorial Horizontal Push',
    shortName: 'Slide Horizontal',
    icon: '↔️',
    desc: 'Geser horizontal presisi tinggi dengan akselerasi kurva kelembutan Apple.'
  },
  {
    id: 'zoom_kenburns',
    name: 'Cinematic Ken Burns Drift',
    shortName: 'Ken Burns Sinematik',
    icon: '🎥',
    desc: 'Skala zoom perlahan melayang sinematik dengan crossfade puitis ala film dokumenter.'
  },
  {
    id: 'cube_3d',
    name: '3D Rotating Dimensional Cube',
    shortName: 'Kubus 3D',
    icon: '🧊',
    desc: 'Rotasi perspektif kubus 3D geometris dengan kedalaman bayangan ruang nyata.'
  },
  {
    id: 'curtain_wipe',
    name: 'Camera Shutter Blade Wipe',
    shortName: 'Tirai Shutter',
    icon: '📷',
    desc: 'Efek bilah rana kamera mekanik yang membuka dan menyapu dari poros tengah.'
  },
  {
    id: 'film_reel',
    name: 'Vintage 35mm Analog Reel',
    shortName: 'Rol Film 35mm',
    icon: '🎞️',
    desc: 'Gulungan film klise analog vertikal dengan aksen lubang perforasi seluloid klasik.'
  }
];

interface DrivePhoto {
  id: string;
  name: string;
  url: string;
  fullUrl: string;
}

interface PortfolioViewerModalProps {
  isOpen?: boolean;
  onClose: () => void;
  album: VendorPortfolioAlbum | null;
  vendorName: string;
  vendorLogo?: string;
  whatsappUrl?: string | null;
  watermarkEnabled?: boolean;
  defaultTransition?: SlideshowTransition;
}

export function PortfolioViewerModal({
  isOpen = true,
  onClose,
  album,
  vendorName,
  vendorLogo,
  whatsappUrl,
  watermarkEnabled = false,
  defaultTransition = 'flipbook'
}: PortfolioViewerModalProps) {
  const [photos, setPhotos] = useState<DrivePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [transitionMode, setTransitionMode] = useState<SlideshowTransition>(defaultTransition);
  const [isTransitionMenuOpen, setIsTransitionMenuOpen] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const transitionMenuRef = useRef<HTMLDivElement>(null);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const bookContainerRef = useRef<HTMLDivElement>(null);
  const pageFlipRef = useRef<any>(null);

  // Sync default transition when prop changes
  useEffect(() => {
    if (defaultTransition) {
      setTransitionMode(defaultTransition);
    }
  }, [defaultTransition]);

  // Click outside to close transition dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (transitionMenuRef.current && !transitionMenuRef.current.contains(e.target as Node)) {
        setIsTransitionMenuOpen(false);
      }
    };
    if (isTransitionMenuOpen) {
      window.addEventListener('mousedown', handleOutsideClick);
    }
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [isTransitionMenuOpen]);

  // Fetch photos from Google Drive folder
  useEffect(() => {
    if (!isOpen || !album?.driveFolderUrl) {
      setPhotos([]);
      setCurrentIndex(0);
      setPrevIndex(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);
    setCurrentIndex(0);
    setPrevIndex(null);

    const fetchDrivePhotos = async () => {
      try {
        const res = await fetch(`/api/proofing/drive?folderId=${encodeURIComponent(album.driveFolderUrl)}`);
        const data = await res.json();

        if (!isMounted) return;

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Gagal memuat foto dari Google Drive. Pastikan izin folder disetel ke "Siapa saja yang memiliki link dapat melihat".');
        }

        const drivePhotos: DrivePhoto[] = data.photos || data.files || [];
        if (drivePhotos.length === 0) {
          setError('Folder Google Drive ini belum memiliki file foto atau belum dapat diakses.');
        } else {
          setPhotos(drivePhotos);
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Error fetching album photos:', err);
        setError(err.message || 'Terjadi kendala saat membaca Google Drive');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDrivePhotos();

    return () => {
      isMounted = false;
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, [isOpen, album?.driveFolderUrl]);

  // Real StPageFlip 3D Engine Initialization for 'flipbook' mode
  // WITH TRANSPARENT CANVAS PATCH (100% ELIMINATES THE WHITE BLOCKS ON LEFT/RIGHT)
  useEffect(() => {
    if (transitionMode !== 'flipbook' || !isOpen || loading || error || photos.length <= 1) {
      if (pageFlipRef.current) {
        try {
          pageFlipRef.current.destroy();
        } catch (e) {}
        pageFlipRef.current = null;
      }
      return;
    }

    if (!bookContainerRef.current) return;

    // Create fresh wrapper element to safely protect React DOM
    bookContainerRef.current.innerHTML = '<div class="st-pageflip-mount" style="margin: 0 auto; display: flex; justify-content: center; align-items: center; background: transparent;"></div>';
    const mountEl = bookContainerRef.current.querySelector('.st-pageflip-mount') as HTMLElement;
    if (!mountEl) return;

    let isDestroyed = false;

    // Load first image to dynamically detect the natural aspect ratio of the photos
    const sampleImg = new Image();
    const firstUrl = photos[0]?.fullUrl || photos[0]?.url;
    if (!firstUrl) return;

    sampleImg.src = firstUrl;

    const initBook = (naturalW: number, naturalH: number) => {
      if (isDestroyed || !bookContainerRef.current) return;

      const aspect = naturalW > 0 && naturalH > 0 ? (naturalW / naturalH) : (16 / 9);

      // Max available space in viewport
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      const maxAvailableW = Math.min(screenW * 0.90, 1260);
      const maxAvailableH = Math.min(screenH * 0.74, 760);

      let bookW = maxAvailableW;
      let bookH = bookW / aspect;

      if (bookH > maxAvailableH) {
        bookH = maxAvailableH;
        bookW = bookH * aspect;
      }

      bookW = Math.round(bookW);
      bookH = Math.round(bookH);

      // Mount element exactly sized to photo aspect ratio
      mountEl.style.width = `${bookW}px`;
      mountEl.style.height = `${bookH}px`;
      mountEl.style.maxWidth = '92vw';
      mountEl.style.maxHeight = '75vh';
      mountEl.style.position = 'relative';
      mountEl.style.background = 'transparent';

      try {
        const pf = new PageFlip(mountEl, {
          width: bookW,
          height: bookH,
          size: 'fixed',
          minWidth: 200,
          maxWidth: 2400,
          minHeight: 150,
          maxHeight: 1800,
          maxShadowOpacity: 0.8,
          showCover: false, // Single page mode: 1 foto per halaman
          mobileScrollSupport: false,
          usePortrait: true, // Mode 1 halaman kolase penuh
          showPageCorners: true,
          drawShadow: true,
          flippingTime: 750,
          useMouseEvents: true,
          startPage: Math.min(currentIndex, photos.length - 1)
        });

        pf.loadFromImages(photos.map(p => p.fullUrl || p.url));

        // CRITICAL PATCH: OVERRIDE CLEAR() TO NEVER PAINT WHITE BLOCKS!
        // StPageFlip's internal default paints the canvas with white (this.ctx.fillStyle = "white").
        // By overriding clear to clearRect, any area outside the photo remains 100% transparent!
        const render = pf.getRender();
        if (render) {
          render.clear = function() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
          };
          const renderProto = Object.getPrototypeOf(render);
          if (renderProto) {
            renderProto.clear = function() {
              this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            };
          }
        }

        // CRITICAL PATCH 2: Prevent loading placeholder from drawing white rect
        const pages = pf.getPageCollection();
        if (pages && pages.getPages().length > 0) {
          const pageProto = Object.getPrototypeOf(pages.getPage(0));
          if (pageProto && pageProto.drawLoader) {
            pageProto.drawLoader = function() {};
          }
        }

        pf.on('flip', (e: any) => {
          if (!isDestroyed && typeof e.data === 'number') {
            setCurrentIndex(e.data);
          }
        });

        pageFlipRef.current = pf;
      } catch (err) {
        console.error('Failed to initialize StPageFlip:', err);
      }
    };

    if (sampleImg.complete && sampleImg.naturalWidth > 0) {
      initBook(sampleImg.naturalWidth, sampleImg.naturalHeight);
    } else {
      sampleImg.onload = () => {
        initBook(sampleImg.naturalWidth, sampleImg.naturalHeight);
      };
      sampleImg.onerror = () => {
        initBook(1600, 900);
      };
    }

    return () => {
      isDestroyed = true;
      if (pageFlipRef.current) {
        try {
          pageFlipRef.current.destroy();
        } catch (e) {}
        pageFlipRef.current = null;
      }
    };
  }, [transitionMode, isOpen, loading, error, photos]);

  // Transition trigger for non-flipbook modes
  const triggerTransition = useCallback((targetIndex: number, dir: 'next' | 'prev') => {
    if (photos.length <= 1 || isTransitioning || targetIndex === currentIndex) return;

    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);

    setPrevIndex(currentIndex);
    setCurrentIndex(targetIndex);
    setDirection(dir);
    setIsTransitioning(true);

    const duration = transitionMode === 'cube_3d' ? 480 : 
                     transitionMode === 'film_reel' ? 450 : 400;

    transitionTimerRef.current = setTimeout(() => {
      setIsTransitioning(false);
      setPrevIndex(null);
    }, duration);
  }, [photos.length, isTransitioning, currentIndex, transitionMode]);

  const handleNext = useCallback(() => {
    if (transitionMode === 'flipbook' && pageFlipRef.current) {
      try {
        pageFlipRef.current.flipNext();
      } catch (e) {}
      return;
    }
    if (photos.length <= 1) return;
    const nextIdx = (currentIndex + 1) % photos.length;
    triggerTransition(nextIdx, 'next');
  }, [transitionMode, photos.length, currentIndex, triggerTransition]);

  const handlePrev = useCallback(() => {
    if (transitionMode === 'flipbook' && pageFlipRef.current) {
      try {
        pageFlipRef.current.flipPrev();
      } catch (e) {}
      return;
    }
    if (photos.length <= 1) return;
    const prevIdx = (currentIndex - 1 + photos.length) % photos.length;
    triggerTransition(prevIdx, 'prev');
  }, [transitionMode, photos.length, currentIndex, triggerTransition]);

  // Thumbnail click
  const handleSelectThumbnail = (targetIdx: number) => {
    if (targetIdx === currentIndex) return;
    if (transitionMode === 'flipbook' && pageFlipRef.current) {
      try {
        pageFlipRef.current.flip(targetIdx);
      } catch (e) {
        try {
          pageFlipRef.current.turnToPage(targetIdx);
        } catch (err) {}
      }
    } else {
      triggerTransition(targetIdx, targetIdx > currentIndex ? 'next' : 'prev');
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isTransitionMenuOpen) {
          setIsTransitionMenuOpen(false);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowRight' || e.key === ' ') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isTransitionMenuOpen, handleNext, handlePrev, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Touch Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (transitionMode === 'flipbook') return;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (transitionMode === 'flipbook') return;
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (transitionMode === 'flipbook') return;
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diffX = touchStartX.current - touchEndX.current;
    if (diffX > 45) {
      handleNext();
    } else if (diffX < -45) {
      handlePrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const toggleFullscreen = () => {
    if (!modalContainerRef.current) return;
    if (!document.fullscreenElement) {
      modalContainerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (!isOpen || !album) return null;

  const currentPhoto = photos[currentIndex];
  const outgoingPhoto = prevIndex !== null ? photos[prevIndex] : null;
  const currentTransitionConfig = SLIDESHOW_TRANSITIONS.find(t => t.id === transitionMode) || SLIDESHOW_TRANSITIONS[0];

  return (
    <div 
      ref={modalContainerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: '#070709',
        backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(28,28,34,0.9) 0%, #040406 100%)',
        display: 'flex',
        flexDirection: 'column',
        color: '#FFFFFF',
        userSelect: 'none'
      }}
    >
      {/* STPAGEFLIP CANVAS CSS + TRANSITION KEYFRAMES */}
      <style>{`
        /* StPageFlip Canvas Styles - Transparent background, zero white blocks */
        .stf__parent {
          position: relative;
          display: block;
          box-sizing: border-box;
          transform: translateZ(0);
          -ms-touch-action: pan-y;
          touch-action: pan-y;
          background: transparent !important;
        }
        .sft__wrapper {
          position: relative;
          width: 100%;
          box-sizing: border-box;
          background: transparent !important;
        }
        .stf__parent canvas {
          position: absolute;
          width: 100%;
          height: 100%;
          left: 0;
          top: 0;
          background: transparent !important;
          filter: drop-shadow(0 25px 50px rgba(0,0,0,0.85));
        }
        .stf__block {
          position: absolute;
          width: 100%;
          height: 100%;
          box-sizing: border-box;
          perspective: 2000px;
          background: transparent !important;
        }
        .stf__item {
          display: none;
          position: absolute;
          transform-style: preserve-3d;
          background: transparent !important;
        }
        .stf__outerShadow, .stf__innerShadow, .stf__hardShadow, .stf__hardInnerShadow {
          position: absolute;
          left: 0;
          top: 0;
        }

        /* 3D Cube & Other Animations */
        @keyframes sbCubeRotateOutNext {
          0% { transform: perspective(1400px) rotateY(0deg) translateZ(0); opacity: 1; }
          100% { transform: perspective(1400px) rotateY(-90deg) translateZ(100px); opacity: 0; }
        }
        @keyframes sbCubeRotateInNext {
          0% { transform: perspective(1400px) rotateY(90deg) translateZ(100px); opacity: 0; }
          100% { transform: perspective(1400px) rotateY(0deg) translateZ(0); opacity: 1; }
        }
        @keyframes sbCubeRotateOutPrev {
          0% { transform: perspective(1400px) rotateY(0deg) translateZ(0); opacity: 1; }
          100% { transform: perspective(1400px) rotateY(90deg) translateZ(100px); opacity: 0; }
        }
        @keyframes sbCubeRotateInPrev {
          0% { transform: perspective(1400px) rotateY(-90deg) translateZ(100px); opacity: 0; }
          100% { transform: perspective(1400px) rotateY(0deg) translateZ(0); opacity: 1; }
        }
        @keyframes sbCurtainShutter {
          0% { clip-path: inset(0 48% 0 48%); opacity: 0.5; }
          100% { clip-path: inset(0 0% 0 0%); opacity: 1; }
        }
        @keyframes sbFilmRollNext {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-30px); opacity: 0; }
        }
        @keyframes sbFilmRollInNext {
          0% { transform: translateY(30px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes sbFilmRollPrev {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(30px); opacity: 0; }
        }
        @keyframes sbFilmRollInPrev {
          0% { transform: translateY(-30px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes sbKenBurnsDrift {
          0% { transform: scale(1.08) translate(1%, -1%); opacity: 0; }
          30% { opacity: 1; }
          100% { transform: scale(1.0) translate(0%, 0%); opacity: 1; }
        }
      `}</style>

      {/* 1. TOP HEADER BAR */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, transparent 100%)',
        zIndex: 50
      }}>
        {/* Left: Album Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div style={{ 
            width: '38px', 
            height: '38px', 
            borderRadius: '12px', 
            background: 'linear-gradient(135deg, rgba(212,175,55,0.2) 0%, rgba(194,120,3,0.3) 100%)', 
            border: '1px solid rgba(212,175,55,0.4)', 
            color: '#F59E0B', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            flexShrink: 0,
            boxShadow: '0 4px 14px rgba(245,158,11,0.25)'
          }}>
            <BookOpen size={19} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: '15.5px', fontWeight: 700, margin: 0, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
              {album.title}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.65)' }}>
              <span>{vendorName}</span>
              {photos.length > 0 && (
                <>
                  <span>•</span>
                  <span style={{ color: '#F59E0B', fontWeight: 600 }}>
                    Halaman {currentIndex + 1} dari {photos.length}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Header Controls: Mode Selector Dropdown, Fullscreen, Close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {/* SLIDESHOW TRANSITION SELECTOR PILL */}
          <div ref={transitionMenuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIsTransitionMenuOpen(!isTransitionMenuOpen)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isTransitionMenuOpen ? '0 0 0 2px rgba(245,158,11,0.4)' : 'none'
              }}
              title="Ganti Mode Animasi Slideshow"
            >
              <span style={{ fontSize: '14px' }}>{currentTransitionConfig.icon}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>Mode:</span>
                <span style={{ color: '#FBBF24', fontWeight: 700 }}>{currentTransitionConfig.shortName}</span>
              </span>
              <ChevronDown 
                size={14} 
                style={{ 
                  color: 'rgba(255,255,255,0.5)', 
                  transform: isTransitionMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }} 
              />
            </button>

            {/* Transition Dropdown Popup (7 Options) */}
            {isTransitionMenuOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '340px',
                background: '#151518',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(212, 175, 55, 0.2)',
                padding: '8px',
                zIndex: 100,
                backdropFilter: 'blur(20px)'
              }}>
                <div style={{ padding: '8px 12px 6px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#F59E0B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      Gaya Animasi Slideshow
                    </span>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)' }}>
                      7 Pilihan Terkurasi
                    </span>
                  </div>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                    Pilih efek saat foto dibuka & dibalik di layar.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '360px', overflowY: 'auto' }}>
                  {SLIDESHOW_TRANSITIONS.map((opt) => {
                    const isSelected = transitionMode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setTransitionMode(opt.id);
                          setIsTransitionMenuOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          background: isSelected ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                          border: isSelected ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid transparent',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                          color: '#FFFFFF'
                        }}
                      >
                        <span style={{ fontSize: '18px', lineHeight: 1, marginTop: '2px' }}>{opt.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                            <span style={{ fontSize: '12.5px', fontWeight: isSelected ? 700 : 600, color: isSelected ? '#FBBF24' : '#FFFFFF' }}>
                              {opt.name}
                            </span>
                            {opt.badge && (
                              <span style={{
                                fontSize: '8.5px',
                                fontWeight: 800,
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: '#F59E0B',
                                color: '#000000',
                                letterSpacing: '0.04em'
                              }}>
                                {opt.badge}
                              </span>
                            )}
                          </div>
                          <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.35 }}>
                            {opt.desc}
                          </p>
                        </div>
                        {isSelected && (
                          <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '3px' }}>
                            <Check size={11} color="#000000" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            style={{
              padding: '8px 10px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            title={isFullscreen ? 'Keluar Fullscreen' : 'Layar Penuh'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {/* Close (X) Button */}
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 12px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.18)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#F87171',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
              fontSize: '12px',
              transition: 'all 0.15s ease'
            }}
            title="Tutup (Esc)"
          >
            <X size={16} />
            <span>Tutup</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN SLIDESHOW STAGE */}
      <div style={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        padding: '8px 16px'
      }}>
        {loading && (
          <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)' }}>
            <Loader2 size={42} className="animate-spin" color="#F59E0B" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: '14px', fontWeight: 600 }}>Menyiapkan foto album...</p>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Menyiapkan album foto definisi tinggi</span>
          </div>
        )}

        {error && !loading && (
          <div style={{
            maxWidth: '440px',
            textAlign: 'center',
            padding: '32px',
            borderRadius: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <AlertCircle size={40} color="#F59E0B" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ fontSize: '16.5px', fontWeight: 700, margin: '0 0 6px 0', color: '#FFFFFF' }}>
              Tidak Dapat Memuat Foto
            </h4>
            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              {error}
            </p>
          </div>
        )}

        {/* 2A. TRUE 3D STPAGEFLIP PHOTOBOOK STAGE (ZERO WHITE BLOCKS) */}
        {!loading && !error && photos.length > 1 && transitionMode === 'flipbook' && (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            {/* The StPageFlip mount container with 100% transparent canvas */}
            <div 
              ref={bookContainerRef} 
              style={{
                width: '100%',
                maxHeight: '75vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent'
              }} 
            />

            {/* Interactive Gesture Hint Pill */}
            <div style={{
              marginTop: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.06)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: 'rgba(255, 255, 255, 0.75)',
              fontSize: '11px',
              fontWeight: 500
            }}>
              <Hand size={13} color="#F59E0B" />
              <span>Tarik atau klik sudut foto dengan mouse/jari untuk membalik lembaran</span>
            </div>
          </div>
        )}

        {/* 2B. PHOTO DISPLAY STAGE FOR THE OTHER 6 TRANSITION ENGINES */}
        {!loading && !error && currentPhoto && (transitionMode !== 'flipbook' || photos.length === 1) && (
          <div 
            style={{
              position: 'relative',
              maxHeight: '100%',
              maxWidth: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              perspective: '1800px',
              transformStyle: 'preserve-3d'
            }}
          >
            {/* FINE-ART SOFT CROSSFADE */}
            {transitionMode === 'fade' && (
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isTransitioning && outgoingPhoto && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.4s ease-out',
                    opacity: 0,
                    transform: 'scale(1.03)',
                    filter: 'blur(4px)',
                    zIndex: 5
                  }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={outgoingPhoto.fullUrl || outgoingPhoto.url}
                      alt={outgoingPhoto.name}
                      style={{
                        maxHeight: '74vh',
                        maxWidth: '86vw',
                        objectFit: 'contain',
                        borderRadius: '12px'
                      }}
                    />
                  </div>
                )}
                <div style={{
                  position: 'relative',
                  zIndex: 10,
                  transition: 'all 0.4s ease-out',
                  opacity: 1,
                  transform: 'scale(1)'
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentPhoto.fullUrl || currentPhoto.url}
                    alt={currentPhoto.name || album.title}
                    style={{
                      maxHeight: '74vh',
                      maxWidth: '86vw',
                      objectFit: 'contain',
                      borderRadius: '12px',
                      boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)'
                    }}
                    loading="eager"
                  />
                </div>
              </div>
            )}

            {/* EDITORIAL HORIZONTAL PUSH */}
            {transitionMode === 'slide_horizontal' && (
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {isTransitioning && outgoingPhoto && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease',
                    transform: direction === 'next' ? 'translateX(-100%)' : 'translateX(100%)',
                    opacity: 0.3,
                    zIndex: 5
                  }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={outgoingPhoto.fullUrl || outgoingPhoto.url}
                      alt={outgoingPhoto.name}
                      style={{
                        maxHeight: '74vh',
                        maxWidth: '86vw',
                        objectFit: 'contain',
                        borderRadius: '12px'
                      }}
                    />
                  </div>
                )}
                <div style={{
                  position: 'relative',
                  zIndex: 10,
                  transition: isTransitioning ? 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease' : 'none',
                  transform: 'translateX(0)',
                  opacity: 1
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentPhoto.fullUrl || currentPhoto.url}
                    alt={currentPhoto.name || album.title}
                    style={{
                      maxHeight: '74vh',
                      maxWidth: '86vw',
                      objectFit: 'contain',
                      borderRadius: '12px',
                      boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)'
                    }}
                    loading="eager"
                  />
                </div>
              </div>
            )}

            {/* CINEMATIC KEN BURNS DRIFT */}
            {transitionMode === 'zoom_kenburns' && (
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{
                  position: 'relative',
                  zIndex: 10,
                  animation: isTransitioning ? 'sbKenBurnsDrift 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards' : 'none'
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentPhoto.fullUrl || currentPhoto.url}
                    alt={currentPhoto.name || album.title}
                    style={{
                      maxHeight: '74vh',
                      maxWidth: '86vw',
                      objectFit: 'contain',
                      borderRadius: '12px',
                      boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)'
                    }}
                    loading="eager"
                  />
                </div>
              </div>
            )}

            {/* 3D ROTATING PERSPECTIVE CUBE */}
            {transitionMode === 'cube_3d' && (
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                perspective: '1400px',
                transformStyle: 'preserve-3d'
              }}>
                {isTransitioning && outgoingPhoto && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: direction === 'next' 
                      ? 'sbCubeRotateOutNext 0.48s cubic-bezier(0.25, 1, 0.5, 1) forwards' 
                      : 'sbCubeRotateOutPrev 0.48s cubic-bezier(0.25, 1, 0.5, 1) forwards',
                    zIndex: 5
                  }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={outgoingPhoto.fullUrl || outgoingPhoto.url}
                      alt={outgoingPhoto.name}
                      style={{
                        maxHeight: '74vh',
                        maxWidth: '86vw',
                        objectFit: 'contain',
                        borderRadius: '12px'
                      }}
                    />
                  </div>
                )}
                <div style={{
                  position: 'relative',
                  zIndex: 10,
                  animation: isTransitioning ? (
                    direction === 'next' 
                      ? 'sbCubeRotateInNext 0.48s cubic-bezier(0.25, 1, 0.5, 1) forwards' 
                      : 'sbCubeRotateInPrev 0.48s cubic-bezier(0.25, 1, 0.5, 1) forwards'
                  ) : 'none'
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentPhoto.fullUrl || currentPhoto.url}
                    alt={currentPhoto.name || album.title}
                    style={{
                      maxHeight: '74vh',
                      maxWidth: '86vw',
                      objectFit: 'contain',
                      borderRadius: '12px',
                      boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)'
                    }}
                    loading="eager"
                  />
                </div>
              </div>
            )}

            {/* CAMERA SHUTTER BLADE WIPE */}
            {transitionMode === 'curtain_wipe' && (
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{
                  position: 'relative',
                  zIndex: 10,
                  animation: isTransitioning ? 'sbCurtainShutter 0.45s cubic-bezier(0.2, 0.9, 0.3, 1) forwards' : 'none'
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentPhoto.fullUrl || currentPhoto.url}
                    alt={currentPhoto.name || album.title}
                    style={{
                      maxHeight: '74vh',
                      maxWidth: '86vw',
                      objectFit: 'contain',
                      borderRadius: '12px',
                      boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)'
                    }}
                    loading="eager"
                  />
                </div>
              </div>
            )}

            {/* VINTAGE 35MM ANALOG REEL */}
            {transitionMode === 'film_reel' && (
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px 36px',
                background: '#0D0D0F',
                borderRadius: '14px',
                border: '2px solid rgba(255,255,255,0.1)',
                boxShadow: '0 30px 70px rgba(0,0,0,0.95)'
              }}>
                {/* 35mm Sprocket Holes Left */}
                <div style={{
                  position: 'absolute',
                  left: '8px',
                  top: '12px',
                  bottom: '12px',
                  width: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  pointerEvents: 'none'
                }}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} style={{ width: '12px', height: '14px', borderRadius: '3px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(0,0,0,0.8)' }} />
                  ))}
                </div>

                {/* 35mm Sprocket Holes Right */}
                <div style={{
                  position: 'absolute',
                  right: '8px',
                  top: '12px',
                  bottom: '12px',
                  width: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  pointerEvents: 'none'
                }}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} style={{ width: '12px', height: '14px', borderRadius: '3px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(0,0,0,0.8)' }} />
                  ))}
                </div>

                {/* Film Frame Label */}
                <div style={{
                  position: 'absolute',
                  top: '5px',
                  left: '36px',
                  fontSize: '9px',
                  fontFamily: 'var(--font-mono, monospace)',
                  color: '#F59E0B',
                  letterSpacing: '0.12em',
                  opacity: 0.85
                }}>
                  SB-35MM • ISO 400 • FRAME {String(currentIndex + 1).padStart(2, '0')}
                </div>

                {isTransitioning && outgoingPhoto && (
                  <div style={{
                    position: 'absolute',
                    inset: '24px 36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: direction === 'next' ? 'sbFilmRollNext 0.45s ease forwards' : 'sbFilmRollPrev 0.45s ease forwards',
                    zIndex: 5
                  }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={outgoingPhoto.fullUrl || outgoingPhoto.url}
                      alt={outgoingPhoto.name}
                      style={{
                        maxHeight: '68vh',
                        maxWidth: '78vw',
                        objectFit: 'contain',
                        borderRadius: '6px'
                      }}
                    />
                  </div>
                )}

                <div style={{
                  position: 'relative',
                  zIndex: 10,
                  animation: isTransitioning ? (
                    direction === 'next' ? 'sbFilmRollInNext 0.45s ease forwards' : 'sbFilmRollInPrev 0.45s ease forwards'
                  ) : 'none'
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentPhoto.fullUrl || currentPhoto.url}
                    alt={currentPhoto.name || album.title}
                    style={{
                      maxHeight: '68vh',
                      maxWidth: '78vw',
                      objectFit: 'contain',
                      borderRadius: '6px',
                      display: 'block'
                    }}
                    loading="eager"
                  />
                </div>
              </div>
            )}

            {/* Optional Photographer Watermark */}
            {watermarkEnabled && (
              <div style={{
                position: 'absolute',
                bottom: '16px',
                right: '16px',
                pointerEvents: 'none',
                opacity: 0.65,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(8px)',
                padding: '5px 12px',
                borderRadius: '8px',
                color: '#FFFFFF',
                fontSize: '11px',
                fontWeight: 600,
                border: '1px solid rgba(255,255,255,0.18)',
                zIndex: 30
              }}>
                {vendorLogo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={vendorLogo} alt="Watermark" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                )}
                <span>© {vendorName}</span>
              </div>
            )}
          </div>
        )}

        {/* Navigation Arrows */}
        {!loading && !error && photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              style={{
                position: 'absolute',
                left: '20px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.22)',
                color: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                zIndex: 40,
                transition: 'all 0.15s ease'
              }}
              title="Foto Sebelumnya (Panah Kiri)"
            >
              <ChevronLeft size={28} />
            </button>

            <button
              type="button"
              onClick={handleNext}
              style={{
                position: 'absolute',
                right: '20px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.22)',
                color: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                zIndex: 40,
                transition: 'all 0.15s ease'
              }}
              title="Foto Berikutnya (Panah Kanan)"
            >
              <ChevronRight size={28} />
            </button>
          </>
        )}
      </div>

      {/* 3. BOTTOM THUMBNAIL STRIP */}
      {!loading && !error && photos.length > 1 && (
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.88)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '12px 20px',
          zIndex: 50
        }}>
          <div style={{
            maxWidth: '920px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            overflowX: 'auto',
            padding: '2px 0'
          }}>
            {photos.map((p, idx) => (
              <button
                key={p.id || idx}
                type="button"
                onClick={() => handleSelectThumbnail(idx)}
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  border: idx === currentIndex ? '2px solid #F59E0B' : '2px solid transparent',
                  opacity: idx === currentIndex ? 1 : 0.45,
                  cursor: 'pointer',
                  padding: 0,
                  background: '#1A1A1E',
                  transition: 'all 0.18s ease',
                  transform: idx === currentIndex ? 'scale(1.08)' : 'scale(1)',
                  boxShadow: idx === currentIndex ? '0 0 12px rgba(245, 158, 11, 0.4)' : 'none'
                }}
                title={`Pindah ke foto ${idx + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url || p.fullUrl}
                  alt={p.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
