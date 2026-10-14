'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FRAME_TEMPLATES, FrameId, applyFrameToCanvas } from '@/lib/frames';
import { Upload, Image as ImageIcon, HelpCircle, Check, Sliders, Info, Download, Heart, Camera, Film, PartyPopper, X } from 'lucide-react';
import { authFetch } from '@/lib/auth';
import { toast } from 'sonner';

interface FrameCustomizerProps {
  initialFrameId?: FrameId;
  initialCustomFrameUrl?: string;
  initialCoupleName?: string;
  initialEventDate?: string;
  initialTagline?: string;
  initialAllowGuestToggle?: boolean;
  onUpdate: (data: {
    frameId: FrameId;
    customFrameUrl?: string;
    coupleName: string;
    eventDate: string;
    tagline: string;
    allowGuestFrameToggle: boolean;
  }) => void;
}

export default function FrameCustomizer({
  initialFrameId = 'minimal-gold',
  initialCustomFrameUrl = '',
  initialCoupleName = 'Nama Acara',
  initialEventDate = '',
  initialTagline = 'The Beginning of Forever',
  initialAllowGuestToggle = true,
  onUpdate
}: FrameCustomizerProps) {
  const extractCleanTagline = (raw?: string) => {
    if (!raw) return 'The Beginning of Forever';
    return raw.includes('•') ? (raw.split('•').pop()?.trim() || 'The Beginning of Forever') : raw;
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
  const [sampleModel, setSampleModel] = useState<'couple' | 'guests'>('couple');
  const [isUploading, setIsUploading] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

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

  useEffect(() => {
    setCustomFrameUrl(initialCustomFrameUrl || '');
    unsavedFrameUploadRef.current = '';
  }, [initialCustomFrameUrl]);

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
      customFrameUrl: customFrameUrl || undefined,
      coupleName,
      eventDate,
      tagline,
      allowGuestFrameToggle: allowGuestToggle
    });
    renderLivePreview();
  }, [selectedFrame, customFrameUrl, coupleName, eventDate, tagline, allowGuestToggle, sampleModel]);

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Category selector & Guide Trigger */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span className="font-mono-film" style={{ fontSize: '10.5px', color: '#86868B' }}>
            KATEGORI TEMA BINGKAI
          </span>
          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            className="glass-pill"
            style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px', color: '#C27803', cursor: 'pointer' }}
          >
            <HelpCircle size={13} />
            <span>Panduan PNG Custom</span>
          </button>
        </div>

        <div className="horizontal-scroll-row" style={{ gap: '8px', paddingBottom: '4px' }}>
          {(['all', 'wedding', 'classic', 'retro', 'party'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className="glass-pill"
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: activeCategory === cat ? 700 : 500,
                background: activeCategory === cat ? '#1D1D1F' : 'rgba(255,255,255,0.7)',
                color: activeCategory === cat ? '#FFFFFF' : '#1D1D1F',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {cat === 'all' && 'Semua (10+)'}
              {cat === 'wedding' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Heart size={12} /> Wedding</span>}
              {cat === 'classic' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Camera size={12} /> Polaroid</span>}
              {cat === 'retro' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Film size={12} /> Vintage</span>}
              {cat === 'party' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><PartyPopper size={12} /> Party</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Frame Selector (Left) and Live Interactive Preview (Right) */}
      <div className="frame-customizer-grid">
        {/* Left: Frame Picker Grid */}
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px', maxHeight: '480px', overflowY: 'auto', paddingRight: '4px' }}>
            {frameEntries.map(([id, t]) => {
              const isSelected = selectedFrame === id;
              return (
                <div
                  key={id}
                  onClick={() => setSelectedFrame(id as FrameId)}
                  style={{
                    padding: '12px',
                    borderRadius: '16px',
                    background: isSelected ? 'rgba(194, 120, 3, 0.08)' : 'rgba(255, 255, 255, 0.85)',
                    border: isSelected ? '2px solid #C27803' : '1px solid rgba(0,0,0,0.08)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    position: 'relative'
                  }}
                >
                  {/* Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: t.accentColor,
                        display: 'inline-block'
                      }}
                    />
                    {isSelected && (
                      <div style={{ background: '#C27803', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={12} color="#FFF" />
                      </div>
                    )}
                  </div>

                  <strong style={{ fontSize: '12.5px', color: isSelected ? '#C27803' : '#1D1D1F', display: 'block', lineHeight: 1.3, marginBottom: '4px' }}>
                    {t.name}
                  </strong>
                  <span style={{ fontSize: '10.5px', color: '#86868B', display: 'block', lineHeight: 1.3 }}>
                    {t.tagline}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Custom PNG Frame Upload Box */}
          <div
            style={{
              marginTop: '16px',
              padding: '16px',
              borderRadius: '16px',
              border: selectedFrame === 'custom' ? '2px dashed #C27803' : '1px dashed rgba(0,0,0,0.15)',
              background: selectedFrame === 'custom' ? 'rgba(194, 120, 3, 0.05)' : 'rgba(255,255,255,0.6)',
              textAlign: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
              <Upload size={18} color="#C27803" />
              <strong style={{ fontSize: '13px', color: '#1D1D1F' }}>Unggah Bingkai Buatan Sendiri (.PNG)</strong>
            </div>
            <p style={{ fontSize: '11.5px', color: '#6E6E73', marginBottom: '12px' }}>
              Gunakan file PNG transparan 1200 x 1600 px (Rasio 3:4)
            </p>

            <label
              className="btn-apple-black"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 18px',
                fontSize: '12px',
                cursor: isUploading ? 'wait' : 'pointer'
              }}
            >
              <span>{isUploading ? 'Mengunggah...' : customFrameUrl ? 'Ganti File PNG' : 'Pilih File PNG'}</span>
              <input
                type="file"
                accept="image/png"
                onChange={handleFileUpload}
                disabled={isUploading}
                style={{ display: 'none' }}
              />
            </label>

            {customFrameUrl && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '8px', fontSize: '11px', color: '#27AE60', fontWeight: 600 }}>
                <Check size={12} strokeWidth={2.5} /> Bingkai khusus aktif ({customFrameUrl.split('/').pop()})
              </span>
            )}
          </div>
        </div>

        {/* Right: Live Interactive Canvas Preview & Text Editor */}
        <div className="glass-card" style={{ padding: '20px', borderRadius: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span className="font-mono-film" style={{ color: '#C27803', fontSize: '11px' }}>
              PREVIEW BINGKAI KAMERA
            </span>
            <span style={{ fontSize: '11.5px', color: '#86868B' }}>
              Rasio 3:4 Standar HP
            </span>
          </div>

          {/* Model Switcher: Wedding Couple vs Guest Selfie */}
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '14px', background: 'rgba(0,0,0,0.04)', padding: '4px', borderRadius: '12px' }}>
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
              <Heart size={13} />
              <span>Foto Pengantin</span>
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
              <Camera size={13} />
              <span>Selfie Para Tamu</span>
            </button>
          </div>

          {/* Interactive Canvas */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <div style={{ width: '240px', height: '320px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 12px 32px rgba(0,0,0,0.18)', background: '#1D1D1F' }}>
              <canvas
                ref={previewCanvasRef}
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
              />
            </div>
          </div>

          {/* Text Customizer Form Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '4px' }}>
                Nama Pasangan / Inisial di Bingkai
              </label>
              <input
                type="text"
                placeholder="Contoh: Kevin & Cindy"
                value={coupleName}
                onChange={(e) => {
                  setIsCoupleEdited(true);
                  setCoupleName(e.target.value);
                }}
                className="glass-input"
                style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '10px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '4px' }}>
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
                  style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '10px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '4px' }}>
                  Tagline / Kata Mutiara
                </label>
                <input
                  type="text"
                  placeholder="The Beginning of Forever"
                  value={tagline}
                  onChange={(e) => {
                    setIsTaglineEdited(true);
                    setTagline(e.target.value);
                  }}
                  className="glass-input"
                  style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '10px' }}
                />
              </div>
            </div>

            {/* Guest Freedom Toggle */}
            <div
              style={{
                marginTop: '10px',
                padding: '12px',
                borderRadius: '12px',
                background: 'rgba(0,0,0,0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div>
                <strong style={{ fontSize: '12.5px', color: '#1D1D1F', display: 'block' }}>
                  Izinkan Tamu Mematikan Bingkai (Foto RAW)
                </strong>
                <span style={{ fontSize: '11px', color: '#86868B' }}>
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
