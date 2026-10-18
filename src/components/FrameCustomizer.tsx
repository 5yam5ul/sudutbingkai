'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FRAME_TEMPLATES, FrameId, applyFrameToCanvas } from '@/lib/frames';
import { applyAnalogFilterToCanvas } from '@/lib/filters';
import { FilmPresetId } from '@/lib/types';
import { Upload, Image as ImageIcon, HelpCircle, Check, Sliders, Info, Download, Heart, Camera, Film, PartyPopper, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { authFetch } from '@/lib/auth';
import { toast } from 'sonner';

interface FrameCustomizerProps {
  initialFrameId?: FrameId;
  initialCustomFrameUrl?: string;
  initialCoupleName?: string;
  initialEventDate?: string;
  initialTagline?: string;
  initialAllowGuestToggle?: boolean;
  initialSampleModel?: 'couple' | 'guests';
  eventType?: 'wedding' | 'birthday' | 'corporate' | 'other';
  activeFilmPreset?: FilmPresetId;
  onUpdate: (data: {
    frameId: FrameId;
    customFrameUrl?: string;
    coupleName: string;
    eventDate: string;
    tagline: string;
    allowGuestFrameToggle: boolean;
    isCoupleEdited?: boolean;
    isDateEdited?: boolean;
  }) => void;
}

export default function FrameCustomizer({
  initialFrameId = 'minimal-gold',
  initialCustomFrameUrl = '',
  initialCoupleName = 'Nama Acara',
  initialEventDate = '',
  initialTagline = 'The Beginning of Forever',
  initialAllowGuestToggle = true,
  initialSampleModel = 'couple',
  eventType = 'wedding',
  activeFilmPreset = 'portra',
  onUpdate
}: FrameCustomizerProps) {
  const defaultTaglineForType =
    eventType === 'birthday'
      ? 'Cheers to Another Year'
      : eventType === 'corporate'
        ? 'Together We Grow'
        : eventType === 'other'
          ? 'Captured Moments Together'
          : 'The Beginning of Forever';

  const extractCleanTagline = (raw?: string) => {
    if (!raw) return defaultTaglineForType;
    return raw.includes('•') ? (raw.split('•').pop()?.trim() || defaultTaglineForType) : raw;
  };

  const [selectedFrame, setSelectedFrame] = useState<FrameId>(initialFrameId);
  const [customFrameUrl, setCustomFrameUrl] = useState(initialCustomFrameUrl);
  const [coupleName, setCoupleName] = useState(initialCoupleName);
  const [eventDate, setEventDate] = useState(initialEventDate);
  const [tagline, setTagline] = useState(() => extractCleanTagline(initialTagline));
  const [allowGuestToggle, setAllowGuestToggle] = useState(initialAllowGuestToggle);

  const [isCoupleEdited, setIsCoupleEdited] = useState(false);
  const [isDateEdited, setIsDateEdited] = useState(false);
  const [isTaglineEdited, setIsTaglineEdited] = useState(false);
  const unsavedFrameUploadRef = useRef<string>('');

  const [activeCategory, setActiveCategory] = useState<'all' | 'wedding' | 'classic' | 'retro' | 'party'>('all');
  const [sampleModel, setSampleModel] = useState<'couple' | 'guests'>(initialSampleModel);
  const [isUploading, setIsUploading] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Frame Reel Carousel Ref & Drag-to-Scroll Handlers
  const frameCarouselRef = useRef<HTMLDivElement | null>(null);
  const isDraggingFrameRef = useRef(false);
  const frameStartXRef = useRef(0);
  const frameScrollLeftRef = useRef(0);

  const handleFrameMouseDown = (e: React.MouseEvent) => {
    if (!frameCarouselRef.current) return;
    isDraggingFrameRef.current = true;
    frameStartXRef.current = e.pageX - frameCarouselRef.current.offsetLeft;
    frameScrollLeftRef.current = frameCarouselRef.current.scrollLeft;
  };

  const handleFrameMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingFrameRef.current || !frameCarouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - frameCarouselRef.current.offsetLeft;
    const walk = (x - frameStartXRef.current) * 1.5;
    frameCarouselRef.current.scrollLeft = frameScrollLeftRef.current - walk;
  };

  const handleFrameMouseUpOrLeave = () => {
    isDraggingFrameRef.current = false;
  };

  const scrollFrame = (dir: 'left' | 'right') => {
    if (!frameCarouselRef.current) return;
    const offset = dir === 'left' ? -180 : 180;
    frameCarouselRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  useEffect(() => {
    setSampleModel(initialSampleModel);
  }, [initialSampleModel]);

  // Sync from parent when user edits Section 1 fields or switches events in Dashboard
  useEffect(() => {
    if (!isCoupleEdited && initialCoupleName) {
      setCoupleName(initialCoupleName);
    }
  }, [initialCoupleName, isCoupleEdited]);

  useEffect(() => {
    if (!isDateEdited && initialEventDate !== undefined) {
      setEventDate(initialEventDate);
    }
  }, [initialEventDate, isDateEdited]);

  useEffect(() => {
    if (!isTaglineEdited && initialTagline !== undefined) {
      setTagline(extractCleanTagline(initialTagline));
    }
  }, [initialTagline, isTaglineEdited]);

  useEffect(() => {
    setSelectedFrame(initialFrameId);
  }, [initialFrameId]);

  const cleanupUnsavedFrame = React.useCallback(() => {
    const pendingUrl = unsavedFrameUploadRef.current;
    if (pendingUrl) {
      unsavedFrameUploadRef.current = '';
      authFetch(`/api/upload?url=${encodeURIComponent(pendingUrl)}`, {
        method: 'DELETE',
        keepalive: true,
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const nextUrl = initialCustomFrameUrl || '';
    if (unsavedFrameUploadRef.current && unsavedFrameUploadRef.current !== nextUrl) {
      cleanupUnsavedFrame();
    } else if (nextUrl && unsavedFrameUploadRef.current === nextUrl) {
      unsavedFrameUploadRef.current = '';
    }
    setCustomFrameUrl(nextUrl);
  }, [initialCustomFrameUrl, cleanupUnsavedFrame]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      cleanupUnsavedFrame();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      cleanupUnsavedFrame();
    };
  }, [cleanupUnsavedFrame]);

  useEffect(() => {
    setAllowGuestToggle(initialAllowGuestToggle);
  }, [initialAllowGuestToggle]);

  // Notify parent whenever values change
  useEffect(() => {
    onUpdate({
      frameId: selectedFrame,
      customFrameUrl: selectedFrame === 'custom' ? (customFrameUrl || undefined) : undefined,
      coupleName,
      eventDate,
      tagline,
      allowGuestFrameToggle: allowGuestToggle,
      isCoupleEdited,
      isDateEdited
    });
    renderLivePreview();
  }, [selectedFrame, customFrameUrl, coupleName, eventDate, tagline, allowGuestToggle, sampleModel, isCoupleEdited, isDateEdited, activeFilmPreset]);

  // Draw simulated live preview on canvas using REAL DUMMY PHOTOS
  const renderLivePreview = async () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 480;
    const h = 640;
    canvas.width = w;
    canvas.height = h;

    // Load selected real dummy photo
    const imageSrc = sampleModel === 'couple' ? '/samples/dummy-couple.jpg' : '/samples/dummy-guests.jpg';
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;

    await new Promise<void>((resolve) => {
      if (img.complete && img.naturalWidth > 0) {
        resolve();
      } else {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      }
    });

    if (img.complete && img.naturalWidth > 0) {
      // Center-crop 3:4 coverage
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const canvasRatio = w / h;
      let sw = img.naturalWidth;
      let sh = img.naturalHeight;
      let sx = 0;
      let sy = 0;

      if (imgRatio > canvasRatio) {
        sw = sh * canvasRatio;
        sx = (img.naturalWidth - sw) / 2;
      } else {
        sh = sw / canvasRatio;
        sy = (img.naturalHeight - sh) / 2;
      }

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);

      // Apply selected analog film filter curves, grain & tone
      if (activeFilmPreset) {
        applyAnalogFilterToCanvas(canvas, ctx, activeFilmPreset, false);
      }
    } else {
      // Fallback elegant dark slate background
      ctx.fillStyle = '#1D1D1F';
      ctx.fillRect(0, 0, w, h);
    }

    // Apply the upgraded luxury frame on top of the real photo
    await applyFrameToCanvas(canvas, ctx, {
      frameId: selectedFrame,
      coupleOrTitle: coupleName,
      eventDate: eventDate,
      tagline: tagline,
      customFrameUrl: customFrameUrl
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('png')) {
      toast.error('File harus berformat PNG transparan!');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'frame');
      if (unsavedFrameUploadRef.current) {
        formData.append('oldUrl', unsavedFrameUploadRef.current);
      }

      const res = await authFetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success && data.url) {
        unsavedFrameUploadRef.current = data.url;
        setCustomFrameUrl(data.url);
        setSelectedFrame('custom');
        toast.success('Bingkai custom berhasil diunggah!');
      } else {
        toast.error('Gagal mengunggah file: ' + (data.error || 'Terjadi kesalahan'));
      }
    } catch (err: unknown) {
      toast.error('Error mengunggah: ' + (err as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  const downloadStarterKit = () => {
    // Generate a simple starter PNG template with transparent center and guided borders
    const c = document.createElement('canvas');
    c.width = 1200;
    c.height = 1600;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    // Clear transparent center
    ctx.clearRect(0, 0, 1200, 1600);

    // Draw faint guide border
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 14;
    ctx.strokeRect(40, 40, 1120, 1520);

    // Guide text
    ctx.fillStyle = '#D4AF37';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NAMA PENGANTIN / EVENT TITLE', 600, 1500);

    const a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = 'sudutbingkai-starter-template-1200x1600.png';
    a.click();
  };

  const frameEntries = Object.entries(FRAME_TEMPLATES).filter(([id, t]) => {
    if (activeCategory === 'all') return true;
    return t.category === activeCategory;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="frame-customizer-container">
        {/* 1. Live Interactive Canvas Preview (HERO on Mobile, STICKY LEFT on Desktop) */}
        <div className="frame-preview-section">
          <div style={{
            padding: '16px',
            borderRadius: '20px',
            background: 'rgba(0,0,0,0.02)',
            border: '1px solid rgba(0,0,0,0.06)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span className="font-mono-film" style={{ color: '#C27803', fontSize: '11px', fontWeight: 700 }}>
                PREVIEW BINGKAI KAMERA
              </span>
              <span style={{ fontSize: '11px', color: '#86868B', fontFamily: 'var(--font-mono)' }}>
                Rasio 3:4 Standar HP
              </span>
            </div>

            {/* Model Switcher: Wedding Couple vs Guest Selfie */}
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '12px', background: 'rgba(0,0,0,0.04)', padding: '4px', borderRadius: '12px' }}>
              <button
                type="button"
                onClick={() => setSampleModel('couple')}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  fontSize: '11.5px',
                  fontWeight: sampleModel === 'couple' ? 700 : 500,
                  borderRadius: '8px',
                  border: 'none',
                  background: sampleModel === 'couple' ? '#FFFFFF' : 'transparent',
                  color: sampleModel === 'couple' ? '#1D1D1F' : '#6E6E73',
                  boxShadow: sampleModel === 'couple' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px'
                }}
              >
                <Heart size={13} style={{ color: sampleModel === 'couple' ? '#C27803' : '#86868B' }} />
                <span>{eventType === 'wedding' ? 'Foto Pengantin' : 'Potret Utama'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSampleModel('guests')}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  fontSize: '11.5px',
                  fontWeight: sampleModel === 'guests' ? 700 : 500,
                  borderRadius: '8px',
                  border: 'none',
                  background: sampleModel === 'guests' ? '#FFFFFF' : 'transparent',
                  color: sampleModel === 'guests' ? '#1D1D1F' : '#6E6E73',
                  boxShadow: sampleModel === 'guests' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px'
                }}
              >
                <Camera size={13} style={{ color: sampleModel === 'guests' ? '#C27803' : '#86868B' }} />
                <span>Selfie Para Tamu</span>
              </button>
            </div>

            {/* Interactive Canvas Polaroid */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{
                width: '100%',
                maxWidth: '220px',
                aspectRatio: '3/4',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
                background: '#1D1D1F'
              }}>
                <canvas
                  ref={previewCanvasRef}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Controls Section (Carousel + Form + Upload) */}
        <div className="frame-controls-section" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Frame Picker Reel Card */}
          <div style={{
            padding: '16px',
            borderRadius: '20px',
            background: 'rgba(0,0,0,0.02)',
            border: '1px solid rgba(0,0,0,0.06)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              <div>
                <span className="font-mono-film" style={{ fontSize: '11px', color: '#86868B', fontWeight: 700, display: 'block' }}>
                  PILIHAN TEMA BINGKAI
                </span>
                <span style={{ fontSize: '11.5px', color: '#86868B' }}>
                  Aktif: <strong style={{ color: '#C27803' }}>{FRAME_TEMPLATES[selectedFrame]?.name || 'Kustom PNG'}</strong>
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowGuideModal(true)}
                  className="glass-pill"
                  style={{ padding: '3px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', color: '#C27803', cursor: 'pointer' }}
                >
                  <HelpCircle size={12} />
                  <span>Panduan PNG</span>
                </button>

                {/* Desktop Navigation Arrows */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <button
                    type="button"
                    onClick={() => scrollFrame('left')}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.04)',
                      border: '1px solid rgba(0,0,0,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#1D1D1F'
                    }}
                    title="Geser bingkai ke kiri"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollFrame('right')}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.04)',
                      border: '1px solid rgba(0,0,0,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#1D1D1F'
                    }}
                    title="Geser bingkai ke kanan"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Category Pills */}
            <div className="horizontal-scroll-row" style={{ gap: '6px', paddingBottom: '8px', marginBottom: '8px' }}>
              {(['all', 'wedding', 'classic', 'retro', 'party'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: '5px 12px',
                    fontSize: '11.5px',
                    fontWeight: activeCategory === cat ? 700 : 500,
                    background: activeCategory === cat ? '#1D1D1F' : 'rgba(0,0,0,0.04)',
                    color: activeCategory === cat ? '#FFFFFF' : '#1D1D1F',
                    border: 'none',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {cat === 'all' && 'Semua (10+)'}
                  {cat === 'wedding' && <><Heart size={11} /> Wedding</>}
                  {cat === 'classic' && <><Camera size={11} /> Polaroid</>}
                  {cat === 'retro' && <><Film size={11} /> Vintage</>}
                  {cat === 'party' && <><PartyPopper size={11} /> Party</>}
                </button>
              ))}
            </div>

            {/* Horizontal Frame Reel Carousel */}
            <div
              ref={frameCarouselRef}
              onMouseDown={handleFrameMouseDown}
              onMouseMove={handleFrameMouseMove}
              onMouseUp={handleFrameMouseUpOrLeave}
              onMouseLeave={handleFrameMouseUpOrLeave}
              style={{
                display: 'flex',
                gap: '10px',
                overflowX: 'auto',
                paddingBottom: '8px',
                paddingTop: '2px',
                paddingLeft: '2px',
                paddingRight: '2px',
                scrollSnapType: 'x mandatory',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                cursor: 'grab',
                userSelect: 'none'
              }}
            >
              {frameEntries.map(([id, t]) => {
                const isSelected = selectedFrame === id;
                return (
                  <div
                    key={id}
                    onClick={() => setSelectedFrame(id as FrameId)}
                    style={{
                      minWidth: '145px',
                      maxWidth: '145px',
                      borderRadius: '16px',
                      background: isSelected ? '#FFFFFF' : '#FAFAFA',
                      border: isSelected ? '2px solid #C27803' : '1px solid rgba(0,0,0,0.08)',
                      boxShadow: isSelected ? '0 8px 24px -6px rgba(194, 120, 3, 0.25)' : 'none',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      scrollSnapAlign: 'start',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      flexShrink: 0
                    }}
                  >
                    {/* Mini Frame Header with Accent Color */}
                    <div style={{
                      height: '38px',
                      background: isSelected ? 'rgba(194,120,3,0.1)' : 'rgba(0,0,0,0.03)',
                      padding: '8px 10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid rgba(0,0,0,0.05)'
                    }}>
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: t.accentColor,
                          boxShadow: `0 0 6px ${t.accentColor}`
                        }}
                      />
                      {isSelected && (
                        <span style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: '#C27803',
                          color: '#FFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Check size={10} strokeWidth={3} />
                        </span>
                      )}
                    </div>

                    {/* Body */}
                    <div style={{ padding: '8px 10px 10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <strong style={{
                        fontSize: '12px',
                        color: isSelected ? '#C27803' : '#1D1D1F',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {t.name}
                      </strong>
                      <span style={{
                        fontSize: '10.5px',
                        color: '#86868B',
                        lineHeight: 1.25,
                        display: '-webkit-box',
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {t.tagline}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Dots for Frame Reel */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '5px',
              marginTop: '6px'
            }}>
              {frameEntries.map(([id]) => {
                const isSelected = selectedFrame === id;
                return (
                  <span
                    key={id}
                    onClick={() => setSelectedFrame(id as FrameId)}
                    style={{
                      width: isSelected ? '14px' : '5px',
                      height: '5px',
                      borderRadius: '3px',
                      background: isSelected ? '#C27803' : 'rgba(0,0,0,0.15)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Text Fields Editor Card */}
          <div style={{
            padding: '16px',
            borderRadius: '20px',
            background: 'rgba(0,0,0,0.02)',
            border: '1px solid rgba(0,0,0,0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '10.5px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '4px' }}>
                {eventType === 'wedding' ? 'Nama Pasangan / Inisial di Bingkai' : 'Teks Utama / Nama Acara di Bingkai'}
              </label>
              <input
                type="text"
                placeholder={
                  eventType === 'birthday'
                    ? 'Contoh: 8 Tahun Mbuy'
                    : eventType === 'corporate'
                      ? 'Contoh: Annual Gala 2026'
                      : eventType === 'other'
                        ? 'Contoh: Reuni Akbar 2026'
                        : 'Contoh: Dimas & Sarah'
                }
                value={coupleName}
                onChange={(e) => {
                  setIsCoupleEdited(true);
                  setCoupleName(e.target.value);
                }}
                className="glass-input"
                style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '10px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10.5px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '4px' }}>
                  Format Tanggal
                </label>
                <input
                  type="text"
                  placeholder="12 . 10 . 2026"
                  value={eventDate}
                  onChange={(e) => {
                    setIsDateEdited(true);
                    setEventDate(e.target.value);
                  }}
                  className="glass-input"
                  style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '10px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10.5px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '4px' }}>
                  Tagline / Kata Mutiara
                </label>
                <input
                  type="text"
                  placeholder={defaultTaglineForType}
                  value={tagline}
                  onChange={(e) => {
                    setIsTaglineEdited(true);
                    setTagline(e.target.value);
                  }}
                  className="glass-input"
                  style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '10px' }}
                />
              </div>
            </div>

            {/* Toggle: Izinkan Tamu Matikan Bingkai */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              paddingTop: '8px',
              borderTop: '1px solid rgba(0,0,0,0.06)'
            }}>
              <div>
                <strong style={{ fontSize: '12px', color: '#1D1D1F', display: 'block' }}>
                  Izinkan Tamu Mematikan Bingkai (Foto RAW)
                </strong>
                <span style={{ fontSize: '10.5px', color: '#86868B' }}>
                  Tamu dapat mengganti antara mode Bingkai ON / RAW di tombol kamera
                </span>
              </div>
              <input
                type="checkbox"
                checked={allowGuestToggle}
                onChange={(e) => setAllowGuestToggle(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#C27803', cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* Compact Custom PNG Upload Box */}
          <div style={{
            padding: '12px 14px',
            borderRadius: '16px',
            border: selectedFrame === 'custom' ? '1.5px dashed #C27803' : '1px dashed rgba(0,0,0,0.15)',
            background: selectedFrame === 'custom' ? 'rgba(194, 120, 3, 0.05)' : 'rgba(255,255,255,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Upload size={16} color="#C27803" />
              <div>
                <strong style={{ fontSize: '12px', color: '#1D1D1F', display: 'block' }}>
                  Unggah Bingkai Buatan Sendiri (.PNG)
                </strong>
                <span style={{ fontSize: '10.5px', color: '#86868B' }}>
                  Format PNG transparan 1200 x 1600 px (Rasio 3:4)
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {customFrameUrl && (
                <button
                  type="button"
                  onClick={() => {
                    cleanupUnsavedFrame();
                    setCustomFrameUrl('');
                    if (selectedFrame === 'custom') {
                      setSelectedFrame('minimal-gold');
                    }
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#FF3B30',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '4px 6px'
                  }}
                >
                  Hapus
                </button>
              )}
              <label
                className="btn-apple-black"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 14px',
                  fontSize: '11.5px',
                  borderRadius: '8px',
                  cursor: isUploading ? 'wait' : 'pointer'
                }}
              >
                <span>{isUploading ? 'Mengunggah...' : customFrameUrl ? 'Ganti PNG' : 'Pilih File PNG'}</span>
                <input
                  type="file"
                  accept="image/png"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Guide Modal */}
      {showGuideModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowGuideModal(false)}
        >
          <div
            className="glass-card"
            style={{
              background: '#FFFFFF',
              maxWidth: '560px',
              width: '100%',
              borderRadius: '24px',
              padding: '32px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="font-display-serif" style={{ fontSize: '22px', fontWeight: 700, color: '#1D1D1F' }}>
                Panduan Desain Bingkai Sendiri (Custom PNG)
              </h3>
              <button
                onClick={() => setShowGuideModal(false)}
                className="glass-pill"
                style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <X size={13} />
                <span>Tutup</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13.5px', color: '#515154', lineHeight: 1.5 }}>
              <div style={{ padding: '14px', background: '#F5F5F7', borderRadius: '12px' }}>
                <strong style={{ color: '#1D1D1F', display: 'block', marginBottom: '4px' }}>1. Dimensi & Resolusi Standar</strong>
                <span>Rekomendasi rasio <strong>3:4</strong> dengan resolusi <strong>1200 x 1600 piksel</strong>. Format rasio ini sesuai dengan viewfinder kamera HP standar.</span>
              </div>

              <div style={{ padding: '14px', background: '#F5F5F7', borderRadius: '12px' }}>
                <strong style={{ color: '#1D1D1F', display: 'block', marginBottom: '4px' }}>2. Format File: PNG Transparan (Alpha Channel)</strong>
                <span>Pastikan bagian tengah bingkai <strong>100% transparan (bolong)</strong> tanpa background putih atau hitam, agar hasil jepretan tamu terlihat jelas.</span>
              </div>

              <div style={{ padding: '14px', background: '#F5F5F7', borderRadius: '12px' }}>
                <strong style={{ color: '#1D1D1F', display: 'block', marginBottom: '4px' }}>3. Area Aman (Safe Zone Margin)</strong>
                <span>Tempatkan ornamen garis, bunga, inisial nama, atau tanggal dalam jarak <strong>60-120 piksel</strong> dari tepi luar bingkai agar tidak menutupi wajah tamu.</span>
              </div>

              <div style={{ padding: '14px', background: '#F5F5F7', borderRadius: '12px' }}>
                <strong style={{ color: '#1D1D1F', display: 'block', marginBottom: '4px' }}>4. Software yang Didukung</strong>
                <span>Anda dapat mendesain menggunakan Canva, Adobe Photoshop, Figma, atau Illustrator, lalu Export / Unduh sebagai <strong>PNG Transparan</strong>.</span>
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={downloadStarterKit}
                className="glass-pill"
                style={{ padding: '10px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
              >
                <Download size={14} />
                <span>Unduh Starter Template PNG</span>
              </button>

              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="btn-apple-black"
                style={{ padding: '10px 20px', fontSize: '13px', cursor: 'pointer' }}
              >
                Mengerti & Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
