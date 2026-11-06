'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  X, ChevronLeft, ChevronRight, Loader2, AlertCircle, 
  ExternalLink, Maximize2, Minimize2, BookOpen 
} from 'lucide-react';
import { VendorPortfolioAlbum } from '@/lib/types';

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
}

export function PortfolioViewerModal({
  isOpen = true,
  onClose,
  album,
  vendorName,
  vendorLogo,
  whatsappUrl,
  watermarkEnabled = false
}: PortfolioViewerModalProps) {
  const [photos, setPhotos] = useState<DrivePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFlipping, setIsFlipping] = useState<'next' | 'prev' | null>(null);

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !album?.driveFolderUrl) {
      setPhotos([]);
      setCurrentIndex(0);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);
    setCurrentIndex(0);

    const fetchDrivePhotos = async () => {
      try {
        const res = await fetch(`/api/proofing/drive?folderId=${encodeURIComponent(album.driveFolderUrl)}`);
        const data = await res.json();

        if (!isMounted) return;

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Gagal memuat foto dari Google Drive. Pastikan izin folder disetel ke "Siapa saja yang memiliki link dapat melihat".');
        }

        const drivePhotos: DrivePhoto[] = data.photos || [];
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
    };
  }, [isOpen, album?.driveFolderUrl]);

  const handleNext = useCallback(() => {
    if (photos.length <= 1) return;
    setIsFlipping('next');
    setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % photos.length);
      setIsFlipping(null);
    }, 180);
  }, [photos.length]);

  const handlePrev = useCallback(() => {
    if (photos.length <= 1) return;
    setIsFlipping('prev');
    setTimeout(() => {
      setCurrentIndex(prev => (prev - 1 + photos.length) % photos.length);
      setIsFlipping(null);
    }, 180);
  }, [photos.length]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

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

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
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
        backgroundColor: 'rgba(0, 0, 0, 0.94)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        color: '#FFFFFF',
        userSelect: 'none'
      }}
    >
      {/* 1. TOP HEADER BAR */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)',
        zIndex: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(194, 120, 3, 0.2)', border: '1px solid rgba(194, 120, 3, 0.4)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BookOpen size={18} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {album.title}
            </h3>
            <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.65)' }}>
              {vendorName} {photos.length > 0 && `• Foto ${currentIndex + 1} dari ${photos.length}`}
            </span>
          </div>
        </div>

        {/* Header Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {album.driveFolderUrl && (
            <a 
              href={album.driveFolderUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Buka di Google Drive"
            >
              <span>Drive</span>
              <ExternalLink size={13} />
            </a>
          )}

          <button
            type="button"
            onClick={toggleFullscreen}
            style={{
              padding: '8px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={isFullscreen ? 'Keluar Fullscreen' : 'Layar Penuh'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#F87171',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Tutup (Esc)"
          >
            <X size={18} />
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
        padding: '12px 20px'
      }}>
        {loading && (
          <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)' }}>
            <Loader2 size={40} className="animate-spin" color="#F59E0B" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: '13.5px', fontWeight: 600 }}>Menghubungkan ke Google Drive...</p>
          </div>
        )}

        {error && !loading && (
          <div style={{
            maxWidth: '440px',
            textAlign: 'center',
            padding: '28px',
            borderRadius: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.15)'
          }}>
            <AlertCircle size={36} color="#F59E0B" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px 0', color: '#FFFFFF' }}>
              Tidak Dapat Memuat Foto
            </h4>
            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              {error}
            </p>
            {album.driveFolderUrl && (
              <a
                href={album.driveFolderUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 20px',
                  borderRadius: '12px',
                  backgroundColor: '#C27803',
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 600
                }}
              >
                <span>Buka Link Drive</span>
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        )}

        {!loading && !error && currentPhoto && (
          <div 
            style={{
              position: 'relative',
              maxHeight: '100%',
              maxWidth: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
              perspective: '1200px',
              transform: isFlipping === 'next' ? 'scale(0.96) rotateY(-12deg)' : isFlipping === 'prev' ? 'scale(0.96) rotateY(12deg)' : 'scale(1) rotateY(0deg)',
              opacity: isFlipping ? 0.4 : 1
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentPhoto.fullUrl || currentPhoto.url}
              alt={currentPhoto.name || album.title}
              style={{
                maxHeight: '74vh',
                maxWidth: '86vw',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                borderRadius: '14px',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)'
              }}
              loading="eager"
            />

            {watermarkEnabled && (
              <div style={{
                position: 'absolute',
                bottom: '16px',
                right: '16px',
                pointerEvents: 'none',
                opacity: 0.55,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(0,0,0,0.45)',
                backdropFilter: 'blur(6px)',
                padding: '4px 10px',
                borderRadius: '8px',
                color: '#FFFFFF',
                fontSize: '11px',
                fontWeight: 600,
                border: '1px solid rgba(255,255,255,0.15)'
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
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                zIndex: 10
              }}
              title="Foto Sebelumnya (Panah Kiri)"
            >
              <ChevronLeft size={26} />
            </button>

            <button
              type="button"
              onClick={handleNext}
              style={{
                position: 'absolute',
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                zIndex: 10
              }}
              title="Foto Berikutnya (Panah Kanan)"
            >
              <ChevronRight size={26} />
            </button>
          </>
        )}
      </div>

      {/* 3. BOTTOM THUMBNAIL STRIP */}
      {!loading && !error && photos.length > 1 && (
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '10px 16px',
          zIndex: 20
        }}>
          <div style={{
            maxWidth: '880px',
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
                onClick={() => setCurrentIndex(idx)}
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  border: idx === currentIndex ? '2px solid #F59E0B' : '2px solid transparent',
                  opacity: idx === currentIndex ? 1 : 0.45,
                  cursor: 'pointer',
                  padding: 0,
                  background: '#1D1D1F',
                  transition: 'all 0.15s ease',
                  transform: idx === currentIndex ? 'scale(1.08)' : 'scale(1)'
                }}
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
