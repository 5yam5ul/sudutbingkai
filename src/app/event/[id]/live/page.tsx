'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { 
  Maximize2, Minimize2, ArrowLeft, Camera, RefreshCw, Layout, Film, Grid, 
  SplitSquareVertical, Clock, Building, Disc, Layers, Copy, Shuffle, MessageSquare,
  Play, Pause, QrCode as QrCodeIcon, Smartphone, Monitor, ChevronLeft, ChevronRight, X, Sliders, Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EventData, PhotoRecord } from '@/lib/types';

export type SlideshowMode = 
  | 'polaroid' 
  | 'kenburns' 
  | 'filmstrip' 
  | 'coverflow' 
  | 'stack' 
  | 'duo' 
  | 'mosaic' 
  | 'split'
  | 'vertical-waterfall'
  | 'vertical-polaroid'
  | 'vertical-split'
  | 'vertical-stories';

interface NewPhotoNotification {
  id: string;
  guestName: string;
  imageData: string;
  caption?: string;
  timestamp: string;
}

export default function LiveProjectorWallPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventData | null>(null);
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Playback & Presentation State
  const [isPaused, setIsPaused] = useState(false);
  const [displayMode, setDisplayMode] = useState<SlideshowMode>('polaroid');
  const [cycleSpeed, setCycleSpeed] = useState<number>(5000);
  const [isAutoMix, setIsAutoMix] = useState(false);
  // Smart Random Shuffle Mode (Default ON so photos are randomized dynamically)
  const [isShuffle, setIsShuffle] = useState(true);
  const shuffleQueueRef = useRef<number[]>([]);

  // Orientation State: Horizontal Widescreen vs Vertical Standing Totem / Kiosk
  const [isVertical, setIsVertical] = useState(false);

  // Stage Spotlight QR Modal for MC Callout ("Waktunya Foto Bareng!")
  const [showQrSpotlight, setShowQrSpotlight] = useState(false);

  // Live Toast for newly arriving photos
  const [newPhotoToast, setNewPhotoToast] = useState<NewPhotoNotification | null>(null);

  // Auto-Hiding Toolbar on Inactivity (Crucial for Live Stage/Videotron)
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Countdown Timer State for Delayed Mode (Anti-Leak Shield)
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
  const [isDelayedAndLocked, setIsDelayedAndLocked] = useState(false);

  // Persistent reference to track previous photo count without stale closure
  const lastCountRef = useRef<number>(-1);

  // Reset toolbar auto-hide timer on mouse interaction
  const resetHeaderTimer = useCallback(() => {
    setIsHeaderVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setIsHeaderVisible(false);
    }, 3500);
  }, []);

  // Generate smart shuffled deck preventing same photo back-to-back
  const getNextShuffledIndex = useCallback((currentIdx: number, total: number) => {
    if (total <= 1) return 0;

    // Refill and shuffle deck when empty
    if (shuffleQueueRef.current.length === 0) {
      const indices = Array.from({ length: total }, (_, i) => i);
      // Fisher-Yates shuffle algorithm
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      // Ensure the first photo of the new deck is not identical to current photo
      if (indices[0] === currentIdx && indices.length > 1) {
        const swapTarget = 1 + Math.floor(Math.random() * (indices.length - 1));
        [indices[0], indices[swapTarget]] = [indices[swapTarget], indices[0]];
      }
      shuffleQueueRef.current = indices;
    }

    const next = shuffleQueueRef.current.shift();
    return next !== undefined ? next : (currentIdx + 1) % total;
  }, []);

  // Auto-detect screen orientation on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isPortrait = window.innerHeight > window.innerWidth;
      setIsVertical(isPortrait);
      if (isPortrait) {
        setDisplayMode('vertical-waterfall');
      }
    }
  }, []);

  // Fetch event and photos
  const fetchData = async () => {
    try {
      const resE = await fetch(`/api/events?id=${eventId}`);
      const dataE = await resE.json();
      if (dataE.success && dataE.event) {
        setEvent(dataE.event);
      }

      const resP = await fetch(`/api/photos?eventId=${eventId}`);
      const dataP = await resP.json();
      if (dataP.success) {
        const newPhotos: PhotoRecord[] = dataP.photos;
        setPhotos(newPhotos);

        // Fire celebration confetti & display real-time live toast if new photos arrived!
        if (lastCountRef.current !== -1 && newPhotos.length > lastCountRef.current) {
          confetti({
            particleCount: 80,
            spread: 90,
            origin: { y: 0.6 }
          });

          // Most recent photo in chronological array
          const latestPhoto = newPhotos[newPhotos.length - 1];
          if (latestPhoto) {
            setNewPhotoToast({
              id: latestPhoto.id,
              guestName: latestPhoto.guestName,
              imageData: latestPhoto.imageData,
              caption: latestPhoto.caption,
              timestamp: latestPhoto.timestamp
            });

            // Automatically switch to the new photo so the audience sees it live
            setCurrentIndex(newPhotos.length - 1);

            // Auto-dismiss the toast banner after 6 seconds
            setTimeout(() => {
              setNewPhotoToast(null);
            }, 6000);
          }
        }
        lastCountRef.current = newPhotos.length;
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [eventId]);

  // Slideshow cycle respecting cycleSpeed, Pause, Shuffle, and Auto-Mix mode
  useEffect(() => {
    if (photos.length <= 1 || isPaused || isDelayedAndLocked || showQrSpotlight) return;

    const slideTimer = setInterval(() => {
      setCurrentIndex((prev) => {
        let nextIdx: number;
        if (isShuffle) {
          nextIdx = getNextShuffledIndex(prev, photos.length);
        } else {
          nextIdx = (prev + 1) % photos.length;
        }

        if (isAutoMix && nextIdx % 3 === 0) {
          const rotationModes: SlideshowMode[] = isVertical
            ? ['vertical-waterfall', 'vertical-polaroid', 'vertical-split', 'vertical-stories']
            : ['polaroid', 'filmstrip', 'coverflow', 'kenburns', 'stack', 'duo', 'mosaic'];
          setDisplayMode((prevMode) => {
            const nextModeIdx = (rotationModes.indexOf(prevMode) + 1) % rotationModes.length;
            return rotationModes[nextModeIdx];
          });
        }
        return nextIdx;
      });
    }, cycleSpeed);

    return () => clearInterval(slideTimer);
  }, [photos.length, cycleSpeed, isAutoMix, isPaused, isDelayedAndLocked, showQrSpotlight, isVertical, isShuffle, getNextShuffledIndex]);

  // Auto-hide toolbar listeners
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      // If hovering near top edge (y < 70), keep visible continuously
      if (e.clientY < 70) {
        setIsHeaderVisible(true);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      } else {
        resetHeaderTimer();
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    resetHeaderTimer();

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [resetHeaderTimer]);

  // Keyboard Shortcuts (Essential for Event Operators / VJs)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPaused(p => !p);
        resetHeaderTimer();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (photos.length > 0) {
          setCurrentIndex(p => (p + 1) % photos.length);
        }
        resetHeaderTimer();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (photos.length > 0) {
          setCurrentIndex(p => (p - 1 + photos.length) % photos.length);
        }
        resetHeaderTimer();
      } else if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        setShowQrSpotlight(p => !p);
        resetHeaderTimer();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        setIsVertical(prev => {
          const next = !prev;
          if (next) {
            setDisplayMode('vertical-waterfall');
          } else {
            setDisplayMode('polaroid');
          }
          return next;
        });
        resetHeaderTimer();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setIsAutoMix(p => !p);
        resetHeaderTimer();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setIsShuffle(p => {
          const next = !p;
          if (next) shuffleQueueRef.current = [];
          return next;
        });
        resetHeaderTimer();
      } else if (e.key === 'Escape') {
        if (showQrSpotlight) {
          setShowQrSpotlight(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photos.length, resetHeaderTimer, showQrSpotlight]);

  // Auto-scroll active photo card into view in Mosaic Mode
  useEffect(() => {
    if (displayMode === 'mosaic' && photos.length > 0) {
      const el = document.getElementById(`mosaic-card-${currentIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }
  }, [currentIndex, displayMode, photos.length]);

  // Generate Corner & Spotlight QR Codes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const guestUrl = `${window.location.origin}/cam/${eventId}`;
      QRCode.toDataURL(guestUrl, {
        width: 320,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      }).then(url => setQrDataUrl(url));
    }
  }, [eventId]);

  // Countdown Timer Effect for Delayed Mode (Anti-Leak Shield)
  useEffect(() => {
    if (!event || event.revealMode !== 'delayed' || !event.revealTime) {
      setIsDelayedAndLocked(false);
      setTimeLeft(null);
      return;
    }

    const checkLock = () => {
      const targetTime = new Date(event.revealTime!).getTime();
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setIsDelayedAndLocked(false);
        setTimeLeft(null);
      } else {
        setIsDelayedAndLocked(true);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds });
      }
    };

    checkLock();
    const timer = setInterval(checkLock, 1000);
    return () => clearInterval(timer);
  }, [event]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const currentPhoto = photos[currentIndex];

  // List of Modes adapted to Screen Orientation
  const horizontalModes = [
    { id: 'polaroid', label: 'Polaroid', icon: <Film size={12} /> },
    { id: 'filmstrip', label: 'Rol Film 35mm', icon: <Disc size={12} /> },
    { id: 'coverflow', label: '3D Coverflow', icon: <Layers size={12} /> },
    { id: 'kenburns', label: 'Sinematik Zoom', icon: <Camera size={12} /> },
    { id: 'stack', label: 'Tumpukan Meja', icon: <Copy size={12} /> },
    { id: 'duo', label: 'Duo Side-by-Side', icon: <Layout size={12} /> },
    { id: 'mosaic', label: 'Mosaik Wall', icon: <Grid size={12} /> },
    { id: 'split', label: 'Split Layar QR', icon: <SplitSquareVertical size={12} /> },
  ];

  const verticalModes = [
    { id: 'vertical-waterfall', label: 'Kaskade Rol Film', icon: <Disc size={12} /> },
    { id: 'vertical-polaroid', label: 'Totem Polaroid Kios', icon: <Film size={12} /> },
    { id: 'vertical-split', label: 'Split Kios & QR', icon: <SplitSquareVertical size={12} /> },
    { id: 'vertical-stories', label: 'Reels Stories 9:16', icon: <Camera size={12} /> },
  ];

  const activeModesList = isVertical ? verticalModes : horizontalModes;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 50% 50%, #151310 0%, #080706 100%)',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflowX: 'hidden',
      overflowY: displayMode === 'mosaic' ? 'auto' : 'hidden'
    }}>
      {/* Dynamic Ambient Stage Backlight (Banishes Dead Black Space) */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: isVertical ? 'min(650px, 95vw)' : 'min(1100px, 90vw)',
          height: isVertical ? 'min(950px, 95vh)' : 'min(750px, 80vh)',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(194, 120, 3, 0.22) 0%, rgba(217, 119, 6, 0.10) 45%, rgba(0, 0, 0, 0) 75%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
          zIndex: 1,
          transition: 'all 1s ease'
        }}
      />

      {/* Auto-Hiding Top Bar for Venue Operator (Hover or Move Mouse to Show) */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        padding: '10px 18px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.7) 70%, transparent 100%)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 50,
        gap: '10px',
        flexWrap: 'nowrap',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        opacity: isHeaderVisible ? 1 : 0,
        transform: isHeaderVisible ? 'translateY(0)' : 'translateY(-100%)',
        pointerEvents: isHeaderVisible ? 'auto' : 'none',
        transition: 'opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1), transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Left: Navigation & Live Event Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <Link 
            href={`/event/${eventId}`} 
            style={{ 
              color: '#86868B', 
              textDecoration: 'none', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '12.5px',
              padding: '5px 10px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.06)'
            }}
          >
            <ArrowLeft size={14} />
            <span style={{ display: isVertical ? 'none' : 'inline' }}>Kembali</span>
          </Link>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: '#10B981', 
              boxShadow: '0 0 8px #10B981',
              display: 'inline-block'
            }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#F59E0B' }}>
              {event?.title || 'Live Photo Wall'}
            </span>
            <span style={{ fontSize: '11.5px', color: '#A1A1A6' }}>
              ({photos.length > 0 ? currentIndex + 1 : 0} / {photos.length} foto)
            </span>
          </div>

          {/* Quick Play/Pause & Step Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'rgba(255,255,255,0.08)', padding: '2px 4px', borderRadius: '10px' }}>
            <button
              onClick={() => {
                if (photos.length > 0) {
                  setCurrentIndex(p => (p - 1 + photos.length) % photos.length);
                }
              }}
              title="Foto Sebelumnya (Panah Kiri)"
              style={{ background: 'transparent', border: 'none', color: '#FFF', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <ChevronLeft size={13} />
            </button>

            <button
              onClick={() => setIsPaused(p => !p)}
              title="Jeda / Lanjutkan Slideshow (Spasi)"
              style={{ 
                background: isPaused ? '#C27803' : 'transparent', 
                border: 'none', 
                color: '#FFF', 
                padding: '4px 8px', 
                borderRadius: '6px',
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 600
              }}
            >
              {isPaused ? <Play size={11} fill="#FFF" /> : <Pause size={11} />}
              <span>{isPaused ? 'Lanjut' : 'Jeda'}</span>
            </button>

            <button
              onClick={() => {
                if (photos.length > 0) {
                  setCurrentIndex(p => (p + 1) % photos.length);
                }
              }}
              title="Foto Berikutnya (Panah Kanan)"
              style={{ background: 'transparent', border: 'none', color: '#FFF', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        {/* Presentation Controls Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'nowrap', flexShrink: 0 }}>
          {/* Orientation Mode Switcher (Horizontal 16:9 vs Vertical Standing Totem) */}
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.08)',
            padding: '3px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.12)'
          }}>
            <button
              onClick={() => {
                setIsVertical(false);
                setDisplayMode('polaroid');
              }}
              title="Mode Layar Panggung Horizontal (16:9)"
              style={{
                padding: '4px 8px',
                borderRadius: '8px',
                border: 'none',
                background: !isVertical ? '#C27803' : 'transparent',
                color: !isVertical ? '#FFFFFF' : '#A1A1A6',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Monitor size={12} />
              <span style={{ display: isVertical ? 'none' : 'inline' }}>Horizontal</span>
            </button>

            <button
              onClick={() => {
                setIsVertical(true);
                setDisplayMode('vertical-waterfall');
              }}
              title="Mode Layar Berdiri / Totem Vertikal (9:16)"
              style={{
                padding: '4px 8px',
                borderRadius: '8px',
                border: 'none',
                background: isVertical ? '#C27803' : 'transparent',
                color: isVertical ? '#FFFFFF' : '#A1A1A6',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Smartphone size={12} />
              <span>Vertikal (Totem)</span>
            </button>
          </div>

          {/* Mode Switchers */}
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.08)',
            padding: '3px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            gap: '2px',
            maxWidth: '100%',
            overflowX: 'auto'
          }}>
            {activeModesList.map(m => (
              <button
                key={m.id}
                onClick={() => {
                  setDisplayMode(m.id as SlideshowMode);
                  setIsAutoMix(false);
                }}
                style={{
                  padding: '5px 9px',
                  borderRadius: '9px',
                  border: 'none',
                  background: displayMode === m.id && !isAutoMix ? '#C27803' : 'transparent',
                  color: displayMode === m.id && !isAutoMix ? '#FFFFFF' : '#A1A1A6',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                  transition: 'background 0.2s'
                }}
              >
                {m.icon}
                <span>{m.label}</span>
              </button>
            ))}
          </div>

          {/* Smart Shuffle Button (Acak Foto) */}
          <button
            onClick={() => {
              setIsShuffle(prev => {
                const next = !prev;
                if (next) shuffleQueueRef.current = [];
                return next;
              });
            }}
            title="Acak urutan foto agar dinamis & tidak bosan (Shortcut: S)"
            style={{
              padding: '5px 10px',
              borderRadius: '11px',
              border: isShuffle ? '1px solid #10B981' : '1px solid rgba(255, 255, 255, 0.15)',
              background: isShuffle ? 'linear-gradient(135deg, #059669 0%, #10B981 100%)' : 'rgba(255, 255, 255, 0.08)',
              color: '#FFFFFF',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: isShuffle ? '0 0 16px rgba(16, 185, 129, 0.4)' : 'none',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            <Shuffle size={12} />
            <span>{isShuffle ? 'Acak Foto: ON' : 'Urut'}</span>
          </button>

          {/* Auto-Mix Button */}
          <button
            onClick={() => setIsAutoMix(prev => !prev)}
            title="Otomatis berganti animasi setiap 3 foto (Shortcut: M)"
            style={{
              padding: '5px 10px',
              borderRadius: '11px',
              border: isAutoMix ? '1px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.15)',
              background: isAutoMix ? 'linear-gradient(135deg, #C27803 0%, #D97706 100%)' : 'rgba(255, 255, 255, 0.08)',
              color: '#FFFFFF',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: isAutoMix ? '0 0 16px rgba(245, 158, 11, 0.4)' : 'none',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            <Layers size={12} />
            <span>{isAutoMix ? 'Auto-Mix: ON' : 'Auto-Mix'}</span>
          </button>

          {/* Speed Toggle */}
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.08)',
            padding: '3px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.12)'
          }}>
            {[
              { val: 3000, label: '3s' },
              { val: 5000, label: '5s' },
              { val: 8000, label: '8s' }
            ].map(s => (
              <button
                key={s.val}
                onClick={() => setCycleSpeed(s.val)}
                style={{
                  padding: '5px 8px',
                  borderRadius: '8px',
                  border: 'none',
                  background: cycleSpeed === s.val ? 'rgba(255, 255, 255, 0.25)' : 'transparent',
                  color: '#FFFFFF',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* MC QR Spotlight Button (Shortcut Q) */}
          <button
            onClick={() => setShowQrSpotlight(p => !p)}
            title="Tampilkan QR Code Raksasa untuk MC Callout (Shortcut: Q)"
            style={{
              background: showQrSpotlight ? '#F59E0B' : 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              color: showQrSpotlight ? '#161412' : '#F59E0B',
              padding: '6px 11px',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '11.5px',
              fontWeight: 700,
              whiteSpace: 'nowrap'
            }}
          >
            <QrCodeIcon size={13} />
            <span>QR Panggung (Q)</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#fff',
              padding: '6px 11px',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '11.5px',
              whiteSpace: 'nowrap'
            }}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span>{isFullscreen ? 'Kecilkan' : 'Layar Penuh (F11)'}</span>
          </button>
        </div>
      </header>

      {/* Floating Real-time Toast: New Photo Arrival Banner */}
      <AnimatePresence>
        {newPhotoToast && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              top: '70px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(20, 18, 15, 0.92)',
              border: '1px solid rgba(245, 158, 11, 0.6)',
              borderRadius: '999px',
              padding: '8px 20px 8px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 16px 40px rgba(0,0,0,0.8), 0 0 30px rgba(245, 158, 11, 0.35)',
              backdropFilter: 'blur(16px)',
              zIndex: 60,
              maxWidth: '90vw'
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              overflow: 'hidden',
              background: '#000',
              border: '2px solid #F59E0B',
              flexShrink: 0
            }}>
              <img src={newPhotoToast.imageData} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#F59E0B', animation: 'pulse 1s infinite' }} />
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#F59E0B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Jepretan Baru Masuk!
                </span>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>
                @{newPhotoToast.guestName} baru saja mengunggah foto
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MC Spotlight QR Modal (Full-Screen Callout for Banquet / Stage Announcements) */}
      <AnimatePresence>
        {showQrSpotlight && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100,
              background: 'rgba(8, 7, 6, 0.92)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px'
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ duration: 0.3 }}
              style={{
                background: 'linear-gradient(145deg, rgba(28, 25, 21, 0.95), rgba(15, 14, 12, 0.98))',
                border: '2px solid rgba(245, 158, 11, 0.5)',
                borderRadius: '32px',
                padding: '40px 36px',
                maxWidth: '540px',
                width: '100%',
                textAlign: 'center',
                boxShadow: '0 30px 90px rgba(0, 0, 0, 0.9), 0 0 60px rgba(194, 120, 3, 0.25)',
                position: 'relative'
              }}
            >
              <button
                onClick={() => setShowQrSpotlight(false)}
                style={{
                  position: 'absolute',
                  top: '18px',
                  right: '18px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '999px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                color: '#F59E0B',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '16px'
              }}>
                <Camera size={13} />
                <span>Kamera Tamu Langsung Aktif</span>
              </div>

              <h2 style={{
                fontFamily: 'var(--font-display-serif), Georgia, serif',
                fontSize: '32px',
                fontWeight: 700,
                color: '#FFFFFF',
                margin: '0 0 10px',
                letterSpacing: '-0.02em'
              }}>
                Waktunya Foto Bareng!
              </h2>

              <p style={{ color: '#D4D4D8', fontSize: '14.5px', margin: '0 0 24px', lineHeight: 1.5 }}>
                Arahkan kamera smartphone ke kode QR di bawah ini untuk mulai memotret candid & tampil langsung di layar videotron!
              </p>

              {/* Giant QR Code Display */}
              <div style={{
                display: 'inline-block',
                background: '#FFFFFF',
                padding: '16px',
                borderRadius: '24px',
                boxShadow: '0 16px 40px rgba(0,0,0,0.5), 0 0 40px rgba(245, 158, 11, 0.35)',
                marginBottom: '20px'
              }}>
                {qrDataUrl && (
                  <img src={qrDataUrl} alt="Scan QR Tamu" style={{ width: '240px', height: '240px', display: 'block' }} />
                )}
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                color: '#A1A1A6',
                fontSize: '12px'
              }}>
                <span>Tanpa Perlu Unduh Aplikasi</span>
                <span>•</span>
                <span>Gratis & Sekali Klik</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Slideshow Stage */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: displayMode === 'mosaic' ? 'flex-start' : 'center',
        padding: isVertical ? '70px 16px 90px' : '85px 24px 80px',
        position: 'relative',
        width: '100%',
        boxSizing: 'border-box',
        zIndex: 10
      }}>
        {isDelayedAndLocked ? (
          /* RETRO AMBIENT COUNTDOWN CURTAIN (ANTI-LEAK SHIELD) */
          <div style={{
            textAlign: 'center',
            maxWidth: '680px',
            width: '100%',
            background: 'rgba(21, 19, 16, 0.85)',
            border: '1px solid rgba(194, 120, 3, 0.4)',
            borderRadius: '32px',
            padding: '48px 36px',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              borderRadius: '999px',
              background: 'rgba(194, 120, 3, 0.15)',
              border: '1px solid rgba(194, 120, 3, 0.35)',
              color: '#F59E0B',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase'
            }}>
              <Film size={14} />
              <span>Mode Cuci Roll Analog Aktif</span>
            </div>

            <div style={{ textAlign: 'center' }}>
              <h1 style={{
                fontFamily: 'var(--font-display-serif)',
                fontSize: 'clamp(2rem, 5vw, 2.8rem)',
                color: '#FAF8F5',
                margin: '0 0 10px',
                letterSpacing: '-0.01em'
              }}>
                {event?.title || 'Album Kenangan Acara'}
              </h1>
              <p style={{ color: '#D4D4D8', fontSize: '15px', margin: 0, lineHeight: 1.6 }}>
                Foto candid para tamu sedang diproses di kamar gelap digital. Seluruh hasil jepretan akan tayang serentak di videotron ini saat hitung mundur berakhir!
              </p>
            </div>

            {/* Retro 7-Segment Digital Countdown Display */}
            {timeLeft && (
              <div style={{
                display: 'flex',
                gap: '16px',
                justifyContent: 'center',
                alignItems: 'center',
                margin: '8px 0'
              }}>
                {[
                  { val: String(timeLeft.hours).padStart(2, '0'), label: 'JAM' },
                  { val: String(timeLeft.minutes).padStart(2, '0'), label: 'MENIT' },
                  { val: String(timeLeft.seconds).padStart(2, '0'), label: 'DETIK' }
                ].map((item, idx) => (
                  <React.Fragment key={item.label}>
                    {idx > 0 && <span style={{ fontSize: '32px', fontWeight: 800, color: '#C27803', marginTop: '-18px' }}>:</span>}
                    <div style={{
                      background: 'rgba(0, 0, 0, 0.6)',
                      border: '1px solid rgba(194, 120, 3, 0.4)',
                      borderRadius: '20px',
                      padding: '16px 20px',
                      minWidth: '96px',
                      textAlign: 'center',
                      boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)'
                    }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 'clamp(2.2rem, 5vw, 3.2rem)',
                        fontWeight: 800,
                        color: '#F59E0B',
                        display: 'block',
                        lineHeight: 1
                      }}>
                        {item.val}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        color: '#A1A1A6',
                        display: 'block',
                        marginTop: '6px'
                      }}>
                        {item.label}
                      </span>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Live Collection Badge */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '10px 20px',
              borderRadius: '999px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13.5px',
              color: '#E4E4E7'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
              <span><strong>{photos.length} Foto Candid</strong> telah masuk ke rol rahasia</span>
            </div>

            <p style={{ fontSize: '13px', color: '#A1A1A6', margin: 0 }}>
              Scan QR di sudut layar untuk terus mengabadikan momen sebelum rol dicuci!
            </p>
          </div>
        ) : photos.length === 0 ? (
          <div style={{ textAlign: 'center', maxWidth: '500px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(194, 120, 3, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              color: '#F59E0B'
            }}>
              <Camera size={40} />
            </div>
            <h1 style={{ fontSize: '32px', marginBottom: '12px', fontFamily: 'var(--font-display-serif)' }}>
              {event?.title || 'Live Photo Wall'}
            </h1>
            <p style={{ color: '#A1A1A6', fontSize: '16px', lineHeight: 1.6, marginBottom: '28px' }}>
              Menunggu jepretan candid pertama dari para tamu! Pindai kode QR di sudut layar atau kartu QR tamu untuk mulai memotret.
            </p>
          </div>
        ) : displayMode === 'vertical-waterfall' ? (
          /* VERTICAL MODE 1: KASKADE ROL FILM VERTIKAL */
          <div style={{
            width: '100%',
            maxWidth: '540px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative'
          }}>
            <div style={{
              width: '100%',
              background: '#0B0A08',
              borderRadius: '28px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 30px 90px rgba(0,0,0,0.95), 0 0 45px rgba(245, 158, 11, 0.2)',
              overflow: 'hidden',
              position: 'relative'
            }}>
              {/* Left & Right Sprocket Perforations */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                pointerEvents: 'none',
                zIndex: 20
              }}>
                {/* Left Sprocket Column */}
                <div style={{ width: '28px', background: '#12100C', borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'space-around', alignItems: 'center', padding: '12px 0' }}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} style={{ width: '14px', height: '18px', borderRadius: '4px', background: 'rgba(255,255,255,0.85)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.8)' }} />
                  ))}
                </div>
                {/* Right Sprocket Column */}
                <div style={{ width: '28px', background: '#12100C', borderLeft: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'space-around', alignItems: 'center', padding: '12px 0' }}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} style={{ width: '14px', height: '18px', borderRadius: '4px', background: 'rgba(255,255,255,0.85)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.8)' }} />
                  ))}
                </div>
              </div>

              {/* Film Header Badge */}
              <div style={{ padding: '12px 36px', background: '#171512', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="font-mono-film" style={{ fontSize: '11px', color: '#F59E0B', letterSpacing: '0.15em', fontWeight: 700 }}>
                  35MM VERTIKAL • FRAME #{currentPhoto.shotNumber}
                </span>
                <span className="font-mono-film" style={{ fontSize: '11px', color: '#A1A1A6' }}>
                  {new Date(currentPhoto.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Main Photo Frame */}
              <div style={{ padding: '20px 42px', background: '#090807' }}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentPhoto.id}
                    initial={{ opacity: 0, y: 40, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -40, scale: 0.95 }}
                    transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      aspectRatio: '3/4',
                      borderRadius: '18px',
                      overflow: 'hidden',
                      background: '#141210',
                      boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                      border: '2px solid rgba(245, 158, 11, 0.4)',
                      position: 'relative'
                    }}
                  >
                    <img src={currentPhoto.imageData} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Film Footer: Guest Details & Caption */}
              <div style={{ padding: '16px 36px 24px', background: '#12100C', borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                <span style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-display)', color: '#FFF', display: 'block' }}>
                  Diabadikan oleh @{currentPhoto.guestName}
                </span>
                {currentPhoto.caption && (
                  <p style={{ fontSize: '14px', color: '#FDE68A', fontStyle: 'italic', margin: '8px 0 0', lineHeight: 1.4 }}>
                    &ldquo;{currentPhoto.caption}&rdquo;
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : displayMode === 'vertical-polaroid' ? (
          /* VERTICAL MODE 2: TOTEM POLAROID KIOS */
          <div style={{
            width: '100%',
            maxWidth: '460px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px'
          }}>
            <AnimatePresence mode="popLayout">
              <motion.div
                key={currentPhoto.id}
                initial={{ opacity: 0, scale: 0.92, rotate: -2, y: 20 }}
                animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
                exit={{ opacity: 0, scale: 1.04, rotate: 2, y: -20 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  background: '#FAF8F5',
                  padding: '16px 16px 32px 16px',
                  borderRadius: '24px',
                  boxShadow: '0 30px 80px rgba(0, 0, 0, 0.95), 0 0 50px rgba(194, 120, 3, 0.22)',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}
              >
                <div style={{ width: '100%', aspectRatio: '3/4', borderRadius: '16px', overflow: 'hidden', background: '#12100B' }}>
                  <img src={currentPhoto.imageData} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ marginTop: '16px', textAlign: 'center', color: '#1A1815', width: '100%' }}>
                  <span style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-display)', display: 'block' }}>
                    @{currentPhoto.guestName}
                  </span>
                  <span style={{ fontSize: '12px', color: '#736D65', fontFamily: 'var(--font-lcd)', display: 'block', marginTop: '2px' }}>
                    FRAME #{currentPhoto.shotNumber} • {new Date(currentPhoto.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {currentPhoto.caption && (
                    <div style={{ marginTop: '10px', padding: '6px 14px', background: 'rgba(194, 120, 3, 0.08)', borderRadius: '10px', display: 'inline-block' }}>
                      <span style={{ fontSize: '13px', color: '#78350F', fontStyle: 'italic', fontWeight: 600 }}>
                        &ldquo;{currentPhoto.caption}&rdquo;
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Standing Totem Eye-Level Interactive Scanning Dock */}
            <div style={{
              width: '100%',
              background: 'rgba(20, 18, 15, 0.88)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '24px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
              backdropFilter: 'blur(16px)'
            }}>
              {qrDataUrl && (
                <div style={{ background: '#FFF', padding: '8px', borderRadius: '12px', flexShrink: 0 }}>
                  <img src={qrDataUrl} alt="Scan QR" style={{ width: '92px', height: '92px', display: 'block' }} />
                </div>
              )}
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#F59E0B', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block' }}>
                  Ayo Ikut Memotret!
                </span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF', display: 'block', marginTop: '2px' }}>
                  Arahkan HP-mu ke QR ini
                </span>
                <span style={{ fontSize: '11px', color: '#A1A1A6', display: 'block', marginTop: '4px' }}>
                  Hasil jepretan langsung tayang di totem layar ini
                </span>
              </div>
            </div>
          </div>
        ) : displayMode === 'vertical-split' ? (
          /* VERTICAL MODE 3: SPLIT KIOS & QR (50/50 Top Photo / Bottom Interactive QR) */
          <div style={{
            width: '100%',
            maxWidth: '480px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {/* Top Half: Cinematic Photo Card */}
            <div style={{
              borderRadius: '24px',
              overflow: 'hidden',
              background: '#12100B',
              boxShadow: '0 25px 65px rgba(0,0,0,0.9)',
              border: '1px solid rgba(255,255,255,0.15)',
              position: 'relative',
              aspectRatio: '4/3'
            }}>
              <img src={currentPhoto.imageData} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '16px 20px',
                background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)'
              }}>
                <span style={{ fontSize: '17px', fontWeight: 800, color: '#FFF', display: 'block' }}>
                  @{currentPhoto.guestName}
                </span>
                {currentPhoto.caption && (
                  <span style={{ fontSize: '13px', color: '#FDE68A', fontStyle: 'italic', display: 'block' }}>
                    &ldquo;{currentPhoto.caption}&rdquo;
                  </span>
                )}
              </div>
            </div>

            {/* Bottom Half: Giant QR Station */}
            <div style={{
              background: 'linear-gradient(145deg, rgba(25, 22, 18, 0.92), rgba(15, 14, 12, 0.95))',
              border: '1px solid rgba(245, 158, 11, 0.45)',
              borderRadius: '24px',
              padding: '24px 20px',
              textAlign: 'center',
              boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
              backdropFilter: 'blur(14px)'
            }}>
              <span className="font-mono-film" style={{ fontSize: '11px', color: '#F59E0B', letterSpacing: '0.1em', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                LIVE GUEST CANDID CAMERA
              </span>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#FFF', margin: '0 0 14px' }}>
                Scan QR untuk Ambil Foto
              </h3>

              <div style={{ background: '#FFF', padding: '12px', borderRadius: '16px', display: 'inline-block', marginBottom: '14px' }}>
                {qrDataUrl && (
                  <img src={qrDataUrl} alt="Scan QR" style={{ width: '160px', height: '160px', display: 'block' }} />
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', color: '#D4D4D8', fontSize: '11px', marginTop: '6px' }}>
                <div style={{ background: 'rgba(255,255,255,0.06)', padding: '6px', borderRadius: '8px' }}>
                  1. Scan QR
                </div>
                <div style={{ background: 'rgba(255,255,255,0.06)', padding: '6px', borderRadius: '8px' }}>
                  2. Jepret Momen
                </div>
                <div style={{ background: 'rgba(255,255,255,0.06)', padding: '6px', borderRadius: '8px' }}>
                  3. Tampil Live!
                </div>
              </div>
            </div>
          </div>
        ) : displayMode === 'vertical-stories' ? (
          /* VERTICAL MODE 4: REELS & STORIES 9:16 PRO - WITH ANIMATED PROGRESS, FLOATING HEARTS & GLASSMORPHIC DOCK */
          (() => {
            const totalSegments = Math.min(photos.length, 12);
            const activeSegmentIndex = totalSegments > 0 ? currentIndex % totalSegments : 0;

            return (
              <div style={{
                width: '100%',
                maxWidth: '430px',
                height: 'calc(100vh - 110px)',
                maxHeight: '840px',
                borderRadius: '32px',
                overflow: 'hidden',
                position: 'relative',
                background: '#0D0C0A',
                boxShadow: '0 30px 90px rgba(0,0,0,0.95), 0 0 55px rgba(245, 158, 11, 0.28)',
                border: '2px solid rgba(245, 158, 11, 0.45)'
              }}>
                {/* Photo Transition with Cinematic Ken-Burns Pan */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentPhoto.id}
                    initial={{ opacity: 0, scale: 1.06, x: 15 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.96, x: -15 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: `url(${currentPhoto.imageData})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      filter: 'brightness(0.96)'
                    }}
                  />
                </AnimatePresence>

                {/* Top & Bottom Cinematic Vignette Scrim */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.78) 0%, transparent 26%, transparent 62%, rgba(0,0,0,0.92) 100%)',
                  pointerEvents: 'none',
                  zIndex: 5
                }} />

                {/* Top Instagram Stories Segmented Progress Bar (Animated Fill) */}
                <div style={{
                  position: 'absolute',
                  top: '14px',
                  left: '14px',
                  right: '14px',
                  display: 'flex',
                  gap: '4px',
                  zIndex: 25
                }}>
                  {Array.from({ length: totalSegments }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: '3.5px',
                        borderRadius: '2px',
                        background: 'rgba(255, 255, 255, 0.28)',
                        overflow: 'hidden',
                        position: 'relative'
                      }}
                    >
                      {i < activeSegmentIndex ? (
                        <div style={{ width: '100%', height: '100%', background: '#F59E0B', borderRadius: '2px' }} />
                      ) : i === activeSegmentIndex ? (
                        <motion.div
                          key={`${currentPhoto.id}-${isPaused}`}
                          initial={{ width: '0%' }}
                          animate={{ width: isPaused ? '0%' : '100%' }}
                          transition={{ duration: cycleSpeed / 1000, ease: 'linear' }}
                          style={{ height: '100%', background: '#F59E0B', borderRadius: '2px' }}
                        />
                      ) : (
                        <div style={{ width: '0%', height: '100%' }} />
                      )}
                    </div>
                  ))}
                </div>

                {/* Top Header Row: User Profile & Mini QR Badge */}
                <div style={{
                  position: 'absolute',
                  top: '28px',
                  left: '14px',
                  right: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  zIndex: 25
                }}>
                  {/* Left: User Avatar with Instagram Story Gradient Ring */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      padding: '2.5px',
                      background: 'linear-gradient(45deg, #F59E0B 0%, #EC4899 50%, #8B5CF6 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)'
                    }}>
                      <div style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        background: '#12100B',
                        border: '2px solid #000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFF',
                        fontWeight: 800,
                        fontSize: '15px'
                      }}>
                        {currentPhoto.guestName.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#FFF' }}>
                          @{currentPhoto.guestName}
                        </span>
                        <span style={{ fontSize: '10px', background: 'rgba(245, 158, 11, 0.25)', border: '1px solid rgba(245, 158, 11, 0.5)', color: '#FCD34D', padding: '1px 6px', borderRadius: '999px', fontWeight: 700 }}>
                          Live
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: '#D4D4D8' }}>
                        {new Date(currentPhoto.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Right: Direct "Scan & Ikut Tampil" QR Button */}
                  <button
                    onClick={() => setShowQrSpotlight(true)}
                    title="Scan untuk ikut tampil di Reels ini (Shortcut: Q)"
                    style={{
                      background: 'rgba(0, 0, 0, 0.55)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      border: '1px solid rgba(245, 158, 11, 0.45)',
                      borderRadius: '999px',
                      padding: '5px 12px 5px 6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                      transition: 'transform 0.2s ease'
                    }}
                  >
                    {qrDataUrl && (
                      <img src={qrDataUrl} alt="" style={{ width: '22px', height: '22px', borderRadius: '4px', background: '#FFF' }} />
                    )}
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#F59E0B', letterSpacing: '0.04em' }}>
                      Ikut Tampil
                    </span>
                  </button>
                </div>

                {/* Right Action Rail & Floating Hearts Reaction */}
                <div style={{
                  position: 'absolute',
                  right: '12px',
                  bottom: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px',
                  zIndex: 20
                }}>
                  {/* Floating Hearts Particles */}
                  <div style={{ position: 'absolute', bottom: '60px', right: '4px', width: '32px', height: '140px', pointerEvents: 'none', overflow: 'hidden' }}>
                    <div className="floating-heart heart-1">
                      <Heart size={16} fill="#EF4444" color="#EF4444" />
                    </div>
                    <div className="floating-heart heart-2">
                      <Heart size={14} fill="#F59E0B" color="#F59E0B" />
                    </div>
                    <div className="floating-heart heart-3">
                      <Heart size={18} fill="#EC4899" color="#EC4899" />
                    </div>
                  </div>

                  {/* Love Button with Dynamic Likes */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '3px'
                  }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: 'rgba(0, 0, 0, 0.55)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 15px rgba(239, 68, 68, 0.35)'
                    }}>
                      <Heart size={20} fill="#EF4444" color="#EF4444" />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#FFF' }}>
                      {Math.floor(18 + (currentIndex * 7) % 85)}
                    </span>
                  </div>

                  {/* Comment Bubble */}
                  {currentPhoto.caption && (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '3px'
                    }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: 'rgba(0, 0, 0, 0.55)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <MessageSquare size={19} color="#FFF" />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#FFF' }}>1</span>
                    </div>
                  )}
                </div>

                {/* Bottom Glassmorphic Caption Card & Audio Equalizer Ticker */}
                <div style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '14px',
                  right: '14px',
                  zIndex: 20,
                  background: 'rgba(15, 13, 10, 0.78)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  borderRadius: '20px',
                  padding: '14px 16px',
                  boxShadow: '0 12px 36px rgba(0,0,0,0.6)'
                }}>
                  {/* Guest Caption / Quote */}
                  {currentPhoto.caption ? (
                    <div style={{ marginBottom: '8px' }}>
                      <p style={{ margin: 0, fontSize: '14px', color: '#FDE68A', fontStyle: 'italic', fontWeight: 600, lineHeight: 1.4 }}>
                        &ldquo;{currentPhoto.caption}&rdquo;
                      </p>
                    </div>
                  ) : (
                    <div style={{ marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', color: '#FFFFFF', fontWeight: 600 }}>
                        Momen candid persembahan @{currentPhoto.guestName}
                      </span>
                    </div>
                  )}

                  {/* Audio Equalizer & Frame Code Ticker */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '8px',
                    borderTop: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* Animated Equalizer Bars */}
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '14px' }}>
                        <span className="eq-bar eq-bar-1" />
                        <span className="eq-bar eq-bar-2" />
                        <span className="eq-bar eq-bar-3" />
                        <span className="eq-bar eq-bar-4" />
                      </div>
                      <span className="font-mono-film" style={{ fontSize: '11px', color: '#D4D4D8', letterSpacing: '0.04em' }}>
                        {event?.title || 'Suasana Acara'} • Live Story
                      </span>
                    </div>

                    <span className="font-mono-film" style={{ fontSize: '10.5px', color: '#F59E0B' }}>
                      FRAME #{currentPhoto.shotNumber}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()
        ) : displayMode === 'polaroid' ? (
          /* HORIZONTAL MODE 1: POLAROID SPOTLIGHT */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '900px', width: '100%' }}>
            <AnimatePresence mode="popLayout">
              <motion.div
                key={currentPhoto.id}
                initial={{ opacity: 0, scale: 0.94, rotate: -2, y: 15 }}
                animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
                exit={{ opacity: 0, scale: 1.04, rotate: 2, y: -15 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  background: '#FAF8F5',
                  padding: '16px 16px 36px 16px',
                  borderRadius: '24px',
                  boxShadow: '0 30px 80px rgba(0, 0, 0, 0.9), 0 0 50px rgba(194, 120, 3, 0.22)',
                  width: '100%',
                  maxWidth: '460px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}
              >
                <div style={{
                  width: '100%',
                  aspectRatio: '3/4',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  background: '#12100B',
                  position: 'relative'
                }}>
                  <img
                    src={currentPhoto.imageData}
                    alt={`Diabadikan oleh ${currentPhoto.guestName}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>

                <div style={{ marginTop: '16px', textAlign: 'center', color: '#1A1815', width: '100%' }}>
                  <span style={{ fontSize: '18px', fontWeight: '800', fontFamily: 'var(--font-display)', display: 'block' }}>
                    Diabadikan oleh @{currentPhoto.guestName}
                  </span>
                  <span style={{ fontSize: '13px', color: '#736D65', fontFamily: 'var(--font-lcd)', display: 'block', marginTop: '2px' }}>
                    FRAME #{currentPhoto.shotNumber} • {new Date(currentPhoto.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  {currentPhoto.caption && (
                    <div style={{
                      marginTop: '12px',
                      padding: '8px 16px',
                      background: 'rgba(194, 120, 3, 0.08)',
                      borderRadius: '12px',
                      border: '1px solid rgba(194, 120, 3, 0.25)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      maxWidth: '95%'
                    }}>
                      <MessageSquare size={14} color="#78350F" style={{ flexShrink: 0 }} />
                      <span style={{
                        fontSize: '13.5px',
                        color: '#78350F',
                        fontStyle: 'italic',
                        fontWeight: 600,
                        lineHeight: '1.4'
                      }}>
                        &ldquo;{currentPhoto.caption}&rdquo;
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        ) : displayMode === 'filmstrip' ? (
          /* HORIZONTAL MODE: ROL FILM 35MM */
          <div style={{ width: '100%', maxWidth: '1280px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            <div style={{
              width: '100%',
              background: '#0E0D0B',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              overflow: 'hidden',
              boxShadow: '0 30px 80px rgba(0,0,0,0.9)',
              position: 'relative'
            }}>
              {/* Top Sprocket Perforations */}
              <div style={{
                height: '42px',
                background: '#141210',
                borderBottom: '2px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 20px',
                overflow: 'hidden'
              }}>
                <span className="font-mono-film" style={{ fontSize: '11px', color: '#D97706', letterSpacing: '0.18em', fontWeight: 700 }}>
                  KODAK VISION3 500T • SAFETY FILM
                </span>
                <div style={{ display: 'flex', gap: '14px' }}>
                  {Array.from({ length: 18 }).map((_, i) => (
                    <div key={i} style={{ width: '15px', height: '22px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.85)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.7)' }} />
                  ))}
                </div>
                <span className="font-mono-film" style={{ fontSize: '11px', color: '#D97706', letterSpacing: '0.18em' }}>
                  EXP #{currentPhoto.shotNumber} 36A
                </span>
              </div>

              {/* Main Film Frames Reel */}
              <div style={{
                padding: '24px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '24px',
                overflow: 'hidden',
                background: '#090807',
                position: 'relative'
              }}>
                {[-1, 0, 1].map((offset) => {
                  const pIdx = (currentIndex + offset + photos.length) % photos.length;
                  const p = photos[pIdx];
                  if (!p) return null;
                  const isCenter = offset === 0;
                  const itemKey = photos.length >= 3 ? p.id : `${p.id}-${offset}`;

                  return (
                    <div
                      key={itemKey}
                      style={{
                        flexShrink: 0,
                        width: isCenter ? '360px' : '260px',
                        transition: 'all 0.65s cubic-bezier(0.22, 1, 0.36, 1)',
                        transform: isCenter ? 'scale(1.05)' : 'scale(0.92)',
                        opacity: isCenter ? 1 : 0.45,
                        filter: isCenter ? 'none' : 'grayscale(35%) brightness(0.6)'
                      }}
                    >
                      <div style={{
                        background: '#000',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        aspectRatio: '3/4',
                        border: isCenter ? '3px solid #D97706' : '1px solid rgba(255,255,255,0.1)',
                        boxShadow: isCenter ? '0 0 50px rgba(217, 119, 6, 0.35)' : 'none',
                        position: 'relative'
                      }}>
                        <img src={p.imageData} alt={p.guestName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <span className="font-mono-film" style={{
                          position: 'absolute',
                          top: '10px',
                          left: '12px',
                          fontSize: '10px',
                          color: '#F59E0B',
                          background: 'rgba(0,0,0,0.7)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          letterSpacing: '0.08em'
                        }}>
                          #{p.shotNumber}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Sprocket Perforations */}
              <div style={{
                height: '42px',
                background: '#141210',
                borderTop: '2px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 20px',
                overflow: 'hidden'
              }}>
                <span className="font-mono-film" style={{ fontSize: '11px', color: '#D97706', letterSpacing: '0.18em' }}>
                  SUDUT BINGKAI LIVE FILM REEL
                </span>
                <div style={{ display: 'flex', gap: '14px' }}>
                  {Array.from({ length: 18 }).map((_, i) => (
                    <div key={i} style={{ width: '15px', height: '22px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.85)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.7)' }} />
                  ))}
                </div>
                <span className="font-mono-film" style={{ fontSize: '11px', color: '#D97706', letterSpacing: '0.18em' }}>
                  35MM ANALOG
                </span>
              </div>
            </div>

            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <span className="font-display-serif" style={{ fontSize: '24px', fontWeight: 700, color: '#FFFFFF', display: 'block' }}>
                Diabadikan oleh @{currentPhoto.guestName}
              </span>
              {currentPhoto.caption && (
                <p style={{ fontSize: '15px', color: '#FDE68A', fontStyle: 'italic', margin: '4px 0 0' }}>
                  &ldquo;{currentPhoto.caption}&rdquo;
                </p>
              )}
            </div>
          </div>
        ) : displayMode === 'coverflow' ? (
          /* HORIZONTAL MODE: 3D COVERFLOW STAGE */
          <div style={{ width: '100%', maxWidth: '1300px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            <div style={{
              perspective: '1200px',
              width: '100%',
              height: '520px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              {[-2, -1, 0, 1, 2].map((offset) => {
                const pIdx = (currentIndex + offset + photos.length) % photos.length;
                const p = photos[pIdx];
                if (!p) return null;
                const isCenter = offset === 0;
                const xPos = offset * 260;
                const zPos = isCenter ? 60 : -100 - Math.abs(offset) * 50;
                const rotY = isCenter ? 0 : offset < 0 ? 38 : -38;
                const opac = isCenter ? 1 : Math.max(0.35, 1 - Math.abs(offset) * 0.3);
                const scaleVal = isCenter ? 1.06 : 0.86;
                const itemKey = photos.length >= 5 ? p.id : `${p.id}-${offset}`;

                return (
                  <div
                    key={itemKey}
                    onClick={() => setCurrentIndex(pIdx)}
                    style={{
                      position: 'absolute',
                      width: '320px',
                      cursor: 'pointer',
                      transform: `translateX(${xPos}px) translateZ(${zPos}px) rotateY(${rotY}deg) scale(${scaleVal})`,
                      opacity: opac,
                      transition: 'all 0.65s cubic-bezier(0.25, 1, 0.5, 1)',
                      zIndex: 10 - Math.abs(offset),
                      filter: isCenter ? 'none' : 'brightness(0.65)'
                    }}
                  >
                    <div style={{
                      background: '#FAF8F5',
                      padding: '12px 12px 28px',
                      borderRadius: '20px',
                      boxShadow: isCenter ? '0 30px 70px rgba(0, 0, 0, 0.95), 0 0 40px rgba(194, 120, 3, 0.3)' : '0 15px 35px rgba(0,0,0,0.6)',
                      border: isCenter ? '2px solid #C27803' : '1px solid rgba(255,255,255,0.1)'
                    }}>
                      <div style={{ width: '100%', aspectRatio: '3/4', borderRadius: '14px', overflow: 'hidden', background: '#12100B' }}>
                        <img src={p.imageData} alt={p.guestName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ marginTop: '12px', textAlign: 'center', color: '#1A1815' }}>
                        <strong style={{ fontSize: '14px', display: 'block' }}>@{p.guestName}</strong>
                        <span className="font-mono-film" style={{ fontSize: '10.5px', color: '#78350F' }}>
                          FRAME #{p.shotNumber}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {currentPhoto.caption && (
              <div style={{
                marginTop: '16px',
                padding: '10px 24px',
                borderRadius: '999px',
                background: 'rgba(20, 18, 15, 0.85)',
                border: '1px solid rgba(194, 120, 3, 0.4)',
                backdropFilter: 'blur(10px)',
                color: '#FDE68A',
                boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <MessageSquare size={15} color="#F59E0B" />
                <span>&ldquo;{currentPhoto.caption}&rdquo;</span>
              </div>
            )}
          </div>
        ) : displayMode === 'stack' ? (
          /* HORIZONTAL MODE: POLAROID STACK */
          <div style={{ width: '100%', maxWidth: '700px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            <div style={{ position: 'relative', width: '380px', height: '490px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* Back Card 3 */}
              {photos.length > 2 && (
                <div style={{
                  position: 'absolute',
                  width: '360px',
                  background: '#ECEBE6',
                  padding: '14px 14px 34px',
                  borderRadius: '22px',
                  transform: 'rotate(-7deg) translateY(18px) scale(0.92)',
                  boxShadow: '0 15px 35px rgba(0,0,0,0.5)',
                  opacity: 0.65
                }}>
                  <div style={{ width: '100%', aspectRatio: '3/4', borderRadius: '14px', background: '#2B2824', overflow: 'hidden' }}>
                    <img src={photos[(currentIndex + 2) % photos.length]?.imageData} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.6)' }} />
                  </div>
                </div>
              )}

              {/* Back Card 2 */}
              {photos.length > 1 && (
                <div style={{
                  position: 'absolute',
                  width: '365px',
                  background: '#F3F1EC',
                  padding: '14px 14px 36px',
                  borderRadius: '22px',
                  transform: 'rotate(5deg) translateY(8px) scale(0.96)',
                  boxShadow: '0 20px 45px rgba(0,0,0,0.6)',
                  opacity: 0.85
                }}>
                  <div style={{ width: '100%', aspectRatio: '3/4', borderRadius: '14px', background: '#2B2824', overflow: 'hidden' }}>
                    <img src={photos[(currentIndex + 1) % photos.length]?.imageData} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.8)' }} />
                  </div>
                </div>
              )}

              {/* Top Animated Active Card */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPhoto.id}
                  initial={{ opacity: 0, x: -60, rotate: -6, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, rotate: -1, scale: 1 }}
                  exit={{ opacity: 0, x: 380, rotate: 22, scale: 1.05 }}
                  transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    position: 'absolute',
                    width: '370px',
                    background: '#FAF8F5',
                    padding: '14px 14px 36px',
                    borderRadius: '22px',
                    boxShadow: '0 30px 80px rgba(0,0,0,0.95), 0 0 35px rgba(194, 120, 3, 0.2)',
                    zIndex: 20
                  }}
                >
                  <div style={{ width: '100%', aspectRatio: '3/4', borderRadius: '14px', overflow: 'hidden', background: '#12100B' }}>
                    <img src={currentPhoto.imageData} alt={currentPhoto.guestName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>

                  <div style={{ marginTop: '14px', textAlign: 'center', color: '#1A1815' }}>
                    <span style={{ fontSize: '17px', fontWeight: 800, fontFamily: 'var(--font-display)', display: 'block' }}>
                      @{currentPhoto.guestName}
                    </span>
                    <span className="font-mono-film" style={{ fontSize: '11px', color: '#736D65' }}>
                      Jepretan #{currentPhoto.shotNumber}
                    </span>
                    {currentPhoto.caption && (
                      <p style={{ fontSize: '12.5px', color: '#78350F', fontStyle: 'italic', margin: '6px 0 0' }}>
                        &ldquo;{currentPhoto.caption}&rdquo;
                      </p>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        ) : displayMode === 'duo' ? (
          /* HORIZONTAL MODE: DUO SHOWCASE */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '32px',
            maxWidth: '1000px',
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {[currentPhoto, photos[(currentIndex + 1) % photos.length]].map((p, idx) => {
              if (!p) return null;
              const itemKey = photos.length >= 2 ? p.id : `${p.id}-${idx}`;
              return (
                <div
                  key={itemKey}
                  style={{
                    background: '#FAF8F5',
                    padding: '16px 16px 36px',
                    borderRadius: '24px',
                    boxShadow: '0 25px 65px rgba(0,0,0,0.85)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    transform: idx === 0 ? 'rotate(-1.5deg)' : 'rotate(1.5deg)',
                    transition: 'all 0.5s ease'
                  }}
                >
                  <div style={{ width: '100%', aspectRatio: '3/4', borderRadius: '16px', overflow: 'hidden', background: '#12100B' }}>
                    <img src={p.imageData} alt={p.guestName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ marginTop: '14px', textAlign: 'center', color: '#1A1815' }}>
                    <span style={{ fontSize: '17px', fontWeight: 800, fontFamily: 'var(--font-display)', display: 'block' }}>
                      @{p.guestName}
                    </span>
                    <span className="font-mono-film" style={{ fontSize: '11px', color: '#736D65' }}>
                      FRAME #{p.shotNumber} • {new Date(p.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {p.caption && (
                      <p style={{ fontSize: '13px', color: '#78350F', fontStyle: 'italic', margin: '8px 0 0', fontWeight: 600 }}>
                        &ldquo;{p.caption}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : displayMode === 'kenburns' ? (
          /* HORIZONTAL MODE: KEN BURNS FULLSCREEN ZOOM */
          <div style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <AnimatePresence>
              <motion.div
                key={currentPhoto.id}
                initial={{ opacity: 0, scale: 1.08 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  inset: '-20px',
                  backgroundImage: `url(${currentPhoto.imageData})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'brightness(0.9)',
                  animation: 'kenBurnsMotion 14s ease-in-out infinite alternate'
                }}
              />
            </AnimatePresence>
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.85) 100%), linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 40%)'
            }} />

            <div style={{
              position: 'absolute',
              bottom: '40px',
              left: '40px',
              maxWidth: '650px',
              zIndex: 20
            }}>
              <span className="font-mono-film" style={{ color: '#F59E0B', fontSize: '12px', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>
                • ROLL FRAME #{currentPhoto.shotNumber} • {new Date(currentPhoto.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <h2 className="font-display-serif" style={{ fontSize: '36px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 8px' }}>
                Diabadikan oleh {currentPhoto.guestName}
              </h2>
              {currentPhoto.caption && (
                <p style={{ fontSize: '18px', color: '#FDE68A', fontStyle: 'italic', margin: 0, lineHeight: 1.4 }}>
                  &ldquo;{currentPhoto.caption}&rdquo;
                </p>
              )}
            </div>
          </div>
        ) : displayMode === 'split' ? (
          /* HORIZONTAL MODE: SPLIT-SCREEN (Giant QR on Left, Live Photo on Right) */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(320px, 420px) 1fr',
            gap: '40px',
            maxWidth: '1200px',
            width: '100%',
            height: 'calc(100vh - 120px)',
            alignItems: 'center'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(194, 120, 3, 0.3)',
              borderRadius: '28px',
              padding: '36px 28px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
            }}>
              <span className="font-mono-film" style={{ color: '#F59E0B', fontSize: '12px', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>
                LIVE GUEST CAMERA
              </span>
              <h2 className="font-display-serif" style={{ fontSize: '26px', fontWeight: 700, margin: '0 0 16px', color: '#FFFFFF' }}>
                Ayo Ikut Memotret!
              </h2>

              <div style={{
                background: '#FFFFFF',
                padding: '16px',
                borderRadius: '20px',
                boxShadow: '0 12px 30px rgba(0,0,0,0.3)',
                marginBottom: '20px'
              }}>
                {qrDataUrl && (
                  <img src={qrDataUrl} alt="Scan QR Tamu" style={{ width: '220px', height: '220px', display: 'block' }} />
                )}
              </div>

              <p style={{ color: '#D1D5DB', fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
                Arahkan kamera HP ke kartu barcode QR atau layar ini untuk membuka kamera analog sekali pakai.
              </p>
            </div>

            <div style={{
              height: '100%',
              maxHeight: '620px',
              borderRadius: '28px',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <img
                src={currentPhoto.imageData}
                alt={currentPhoto.guestName}
                style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#0D0C0A' }}
              />
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '24px 28px',
                background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)'
              }}>
                <strong style={{ fontSize: '20px', color: '#FFF', display: 'block' }}>@{currentPhoto.guestName}</strong>
                {currentPhoto.caption && (
                  <span style={{ fontSize: '15px', color: '#FDE68A', fontStyle: 'italic', display: 'block', marginTop: '4px' }}>
                    &ldquo;{currentPhoto.caption}&rdquo;
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* HORIZONTAL MODE: MOSAIC WALL */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
            gap: '20px',
            maxWidth: '1440px',
            width: '100%',
            paddingBottom: '90px'
          }}>
            {photos.map((p, idx) => (
              <div
                key={p.id || idx}
                id={`mosaic-card-${idx}`}
                style={{
                  background: '#FAF8F5',
                  padding: '12px 12px 20px',
                  borderRadius: '18px',
                  boxShadow: idx === currentIndex ? '0 20px 45px rgba(194, 120, 3, 0.45)' : '0 16px 36px rgba(0,0,0,0.6)',
                  border: idx === currentIndex ? '3px solid #C27803' : '1px solid rgba(255,255,255,0.1)',
                  transform: idx === currentIndex ? 'scale(1.04)' : 'scale(1)',
                  transition: 'all 0.35s ease',
                  scrollMarginTop: '100px'
                }}
              >
                <div style={{ width: '100%', aspectRatio: '3/4', borderRadius: '12px', overflow: 'hidden', background: '#12100B' }}>
                  <img src={p.imageData} alt={p.guestName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ marginTop: '10px', textAlign: 'center', color: '#1A1815' }}>
                  <strong style={{ fontSize: '13px', display: 'block' }}>@{p.guestName}</strong>
                  {p.caption && (
                    <span style={{ fontSize: '11px', color: '#78350F', fontStyle: 'italic', display: 'block', marginTop: '2px' }}>
                      &ldquo;{p.caption}&rdquo;
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating Corner QR Code (Clickable to open MC Spotlight QR) */}
      {displayMode !== 'split' && displayMode !== 'vertical-split' && (
        <div 
          onClick={() => setShowQrSpotlight(true)}
          title="Klik untuk perbesar QR Code (Shortcut: Q)"
          style={{
            position: 'fixed',
            bottom: '22px',
            right: '22px',
            background: 'rgba(20, 18, 15, 0.94)',
            border: '1px solid rgba(194, 120, 3, 0.45)',
            borderRadius: '20px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 15px 35px rgba(0,0,0,0.7), 0 0 25px rgba(194, 120, 3, 0.2)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            zIndex: 40,
            cursor: 'pointer',
            transition: 'transform 0.2s ease'
          }}
        >
          {qrDataUrl && (
            <div style={{ background: '#FFF', padding: '4px', borderRadius: '10px', flexShrink: 0 }}>
              <img src={qrDataUrl} alt="Scan QR Tamu" style={{ width: '80px', height: '80px', display: 'block', borderRadius: '6px' }} />
            </div>
          )}
          <div style={{ textAlign: 'left' }}>
            <span style={{ fontSize: '10px', fontWeight: '800', color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block' }}>
              Ikut Memotret
            </span>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff', display: 'block' }}>
              Scan Lewat HP-mu
            </span>
            <span style={{ fontSize: '10px', color: '#86868B', display: 'block', marginTop: '2px' }}>
              Klik / Tekan Q untuk Perbesar
            </span>
          </div>
        </div>
      )}

      {/* Partner Co-Branding Watermark */}
      {event?.vendorName && (
        <div style={{
          position: 'fixed',
          bottom: '22px',
          left: '22px',
          background: 'rgba(18, 16, 11, 0.82)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 40,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
        }}>
          {event.vendorLogo ? (
            <img src={event.vendorLogo} alt={event.vendorName} style={{ height: '22px', maxWidth: '80px', objectFit: 'contain' }} />
          ) : (
            <Building size={14} color="#86868B" />
          )}
          <div style={{ textAlign: 'left' }}>
            <span style={{ fontSize: '9px', fontWeight: 600, color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
              Official Organizer
            </span>
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#fff' }}>
              {event.vendorName}
            </span>
          </div>
        </div>
      )}

      {/* Keyframe Animations for Reels Live Effects & Ken Burns */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes kenBurnsMotion {
          0% {
            transform: scale(1) translate(0, 0);
          }
          50% {
            transform: scale(1.08) translate(-1.5%, -1.5%);
          }
          100% {
            transform: scale(1.04) translate(1%, 0.5%);
          }
        }

        @keyframes eqBounce {
          0%, 100% { height: 3px; }
          50% { height: 13px; }
        }
        .eq-bar {
          width: 2.5px;
          background: #F59E0B;
          border-radius: 1px;
          display: inline-block;
        }
        .eq-bar-1 { animation: eqBounce 0.75s ease-in-out infinite; }
        .eq-bar-2 { animation: eqBounce 0.55s ease-in-out infinite 0.2s; }
        .eq-bar-3 { animation: eqBounce 0.95s ease-in-out infinite 0.4s; }
        .eq-bar-4 { animation: eqBounce 0.65s ease-in-out infinite 0.15s; }

        @keyframes floatHeartUp1 {
          0% { transform: translateY(100px) scale(0.6) rotate(0deg); opacity: 0; }
          20% { opacity: 0.95; transform: translateY(70px) scale(1) rotate(-8deg); }
          65% { opacity: 0.85; transform: translateY(25px) scale(1.1) rotate(12deg); }
          100% { transform: translateY(-15px) scale(0.7) rotate(-14deg); opacity: 0; }
        }
        @keyframes floatHeartUp2 {
          0% { transform: translateY(110px) scale(0.5) rotate(0deg); opacity: 0; }
          25% { opacity: 0.9; transform: translateY(65px) scale(1) rotate(10deg); }
          70% { opacity: 0.8; transform: translateY(20px) scale(1.05) rotate(-10deg); }
          100% { transform: translateY(-20px) scale(0.6) rotate(15deg); opacity: 0; }
        }
        @keyframes floatHeartUp3 {
          0% { transform: translateY(120px) scale(0.7) rotate(0deg); opacity: 0; }
          15% { opacity: 1; transform: translateY(80px) scale(1.15) rotate(-12deg); }
          65% { opacity: 0.85; transform: translateY(30px) scale(1.2) rotate(8deg); }
          100% { transform: translateY(-25px) scale(0.8) rotate(-16deg); opacity: 0; }
        }
        .floating-heart {
          position: absolute;
          bottom: 0;
          right: 6px;
          pointer-events: none;
        }
        .heart-1 { animation: floatHeartUp1 2.8s ease-in-out infinite; }
        .heart-2 { animation: floatHeartUp2 3.4s ease-in-out infinite 0.9s; }
        .heart-3 { animation: floatHeartUp3 3.1s ease-in-out infinite 1.8s; }
      `
        }}
      />
    </div>
  );
}
