'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  X, ChevronLeft, ChevronRight, Loader2, AlertCircle, 
  ExternalLink, Maximize2, Minimize2, Image as ImageIcon, BookOpen 
} from 'lucide-react';
import { VendorPortfolioAlbum } from '@/lib/types';

interface DrivePhoto {
  id: string;
  name: string;
  url: string;
  fullUrl: string;
}

interface PortfolioViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  album: VendorPortfolioAlbum | null;
  vendorName: string;
}

export function PortfolioViewerModal({
  isOpen,
  onClose,
  album,
  vendorName
}: PortfolioViewerModalProps) {
  const [photos, setPhotos] = useState<DrivePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFlipping, setIsFlipping] = useState<'next' | 'prev' | null>(null);

  // Touch swipe tracking
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  // Fetch photos from Google Drive folder via existing proxy API
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
          throw new Error(data.error || 'Gagal memuat foto dari Google Drive. Pastikan folder dapat diakses publik.');
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

  // Navigation handlers
  const handleNext = useCallback(() => {
    if (photos.length <= 1) return;
    setIsFlipping('next');
    setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % photos.length);
      setIsFlipping(null);
    }, 200);
  }, [photos.length]);

  const handlePrev = useCallback(() => {
    if (photos.length <= 1) return;
    setIsFlipping('prev');
    setTimeout(() => {
      setCurrentIndex(prev => (prev - 1 + photos.length) % photos.length);
      setIsFlipping(null);
    }, 200);
  }, [photos.length]);

  // Keyboard navigation
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

  // Prevent background body scroll when open
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

  // Swipe handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diffX = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 45;

    if (diffX > minSwipeDistance) {
      handleNext();
    } else if (diffX < -minSwipeDistance) {
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
      className="fixed inset-0 z-[9999] flex flex-col bg-black/95 backdrop-blur-md select-none text-white transition-opacity duration-300"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 bg-gradient-to-b from-black/80 to-transparent z-20">
        <div className="flex items-center gap-3 min-w-0 pr-4">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <BookOpen size={16} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-semibold truncate text-white">
              {album.title}
            </h3>
            <p className="text-xs text-white/60 truncate">
              {vendorName} {photos.length > 0 && `• ${currentIndex + 1} dari ${photos.length} Foto`}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {album.driveFolderUrl && (
            <a 
              href={album.driveFolderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors hidden sm:flex items-center justify-center"
              title="Buka di Google Drive"
            >
              <ExternalLink size={18} />
            </a>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors hidden sm:flex items-center justify-center"
            title={isFullscreen ? 'Keluar Fullscreen' : 'Layar Penuh'}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/15 transition-all"
            title="Tutup (Esc)"
          >
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Main Slideshow Stage */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden px-2 sm:px-16 pb-3">
        {loading && (
          <div className="flex flex-col items-center gap-3 text-white/70">
            <Loader2 size={36} className="animate-spin text-amber-400" />
            <p className="text-xs sm:text-sm font-medium animate-pulse">Menghubungkan ke Google Drive...</p>
          </div>
        )}

        {error && !loading && (
          <div className="max-w-md mx-auto text-center p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center gap-3">
            <AlertCircle size={36} className="text-amber-400" />
            <h4 className="font-semibold text-white text-base">Tidak Dapat Memuat Foto</h4>
            <p className="text-xs sm:text-sm text-white/70 leading-relaxed">{error}</p>
            {album.driveFolderUrl && (
              <a
                href={album.driveFolderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs transition"
              >
                <span>Buka Link Drive</span>
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        )}

        {!loading && !error && currentPhoto && (
          <div 
            className={`relative max-h-full max-w-full flex items-center justify-center transition-all duration-300 ease-out ${
              isFlipping === 'next' 
                ? 'opacity-30 scale-95 [transform:rotateY(-15deg)]' 
                : isFlipping === 'prev' 
                  ? 'opacity-30 scale-95 [transform:rotateY(15deg)]' 
                  : 'opacity-100 scale-100 [transform:rotateY(0deg)]'
            }`}
            style={{ perspective: '1200px' }}
          >
            {/* The main active photo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentPhoto.fullUrl || currentPhoto.url}
              alt={currentPhoto.name || album.title}
              className="max-h-[75vh] sm:max-h-[80vh] w-auto max-w-[95vw] sm:max-w-[85vw] object-contain rounded-lg shadow-2xl drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)] pointer-events-auto"
              loading="eager"
            />
          </div>
        )}

        {/* Navigation Arrows */}
        {!loading && !error && photos.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition shadow-lg z-10 active:scale-95"
              title="Foto Sebelumnya (Panah Kiri)"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition shadow-lg z-10 active:scale-95"
              title="Foto Berikutnya (Panah Kanan)"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      {!loading && !error && photos.length > 1 && (
        <div className="bg-black/80 backdrop-blur-md border-t border-white/10 px-4 py-2 z-20">
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-2 overflow-x-auto py-1 scrollbar-none">
            {photos.map((p, idx) => (
              <button
                key={p.id || idx}
                onClick={() => setCurrentIndex(idx)}
                className={`relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                  idx === currentIndex 
                    ? 'border-amber-400 scale-105 shadow-md shadow-amber-500/20 opacity-100' 
                    : 'border-transparent opacity-50 hover:opacity-80'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url || p.fullUrl}
                  alt={p.name}
                  className="w-full h-full object-cover"
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
