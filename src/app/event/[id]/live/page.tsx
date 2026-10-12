'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { Maximize2, Minimize2, ArrowLeft, Camera, RefreshCw, Layout, Film, Grid, SplitSquareVertical, Clock, Sparkles } from 'lucide-react';
import { EventData, PhotoRecord } from '@/lib/types';

type SlideshowMode = 'polaroid' | 'kenburns' | 'split' | 'mosaic';

export default function LiveProjectorWallPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventData | null>(null);
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Slideshow presentation options
  const [displayMode, setDisplayMode] = useState<SlideshowMode>('polaroid');
  const [cycleSpeed, setCycleSpeed] = useState<number>(5000);

  // Countdown Timer State for Delayed Mode (Anti-Leak Shield)
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
  const [isDelayedAndLocked, setIsDelayedAndLocked] = useState(false);

  // Persistent reference to track previous photo count without stale closure
  const lastCountRef = useRef<number>(-1);

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

        // Fire celebration confetti if new photos arrived!
        if (lastCountRef.current !== -1 && newPhotos.length > lastCountRef.current) {
          confetti({
            particleCount: 75,
            spread: 80,
            origin: { y: 0.6 }
          });
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

  // Slideshow cycle respecting cycleSpeed
  useEffect(() => {
    if (photos.length <= 1) return;
    const slideTimer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, cycleSpeed);
    return () => clearInterval(slideTimer);
  }, [photos.length, cycleSpeed]);

  // Generate Corner QR Code
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const guestUrl = `${window.location.origin}/cam/${eventId}`;
      QRCode.toDataURL(guestUrl, {
        width: 280,
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

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 50% 50%, #151310 0%, #080706 100%)',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Top Bar for Venue Operator (Hover to see) */}
      <header style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: '14px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.85), transparent)',
        zIndex: 50,
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Link href={`/event/${eventId}`} style={{ color: '#86868B', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <ArrowLeft size={16} />
            <span>Kembali</span>
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#F59E0B' }}>
            {event?.title || 'Live Photo Wall'}
          </span>
          <span style={{ fontSize: '12px', color: '#86868B' }}>
            ({photos.length > 0 ? currentIndex + 1 : 0} / {photos.length} foto)
          </span>
        </div>

        {/* Presentation Controls Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Mode Switchers */}
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.08)',
            padding: '3px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.12)'
          }}>
            {[
              { id: 'polaroid', label: 'Polaroid', icon: <Film size={13} /> },
              { id: 'kenburns', label: 'Sinematik Zoom', icon: <Camera size={13} /> },
              { id: 'split', label: 'Split QR Meja', icon: <SplitSquareVertical size={13} /> },
              { id: 'mosaic', label: 'Mosaik Wall', icon: <Grid size={13} /> }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setDisplayMode(m.id as SlideshowMode)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '9px',
                  border: 'none',
                  background: displayMode === m.id ? '#C27803' : 'transparent',
                  color: displayMode === m.id ? '#FFFFFF' : '#A1A1A6',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'background 0.2s'
                }}
              >
                {m.icon}
                <span>{m.label}</span>
              </button>
            ))}
          </div>

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

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#fff',
              padding: '6px 12px',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px'
            }}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span>{isFullscreen ? 'Kecilkan' : 'Layar Penuh (F11)'}</span>
          </button>
        </div>
      </header>

      {/* Main Slideshow Stage */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '70px 20px 40px', position: 'relative' }}>
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
              <Sparkles size={14} />
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
        ) : displayMode === 'polaroid' ? (
          /* MODE 1: POLAROID SPOTLIGHT */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '900px', width: '100%' }}>
            <div style={{
              background: '#FAF8F5',
              padding: '16px 16px 40px 16px',
              borderRadius: '24px',
              boxShadow: '0 30px 80px rgba(0, 0, 0, 0.9), 0 0 50px rgba(194, 120, 3, 0.18)',
              width: '100%',
              maxWidth: '460px',
              transition: 'all 0.5s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
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
                    <span style={{ fontSize: '14px' }}>💬</span>
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
            </div>
          </div>
        ) : displayMode === 'kenburns' ? (
          /* MODE 2: CINEMATIC FULLSCREEN KEN BURNS ZOOM */
          <div style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div
              key={currentPhoto.id}
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
            {/* Film vignette & dark gradient */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.85) 100%), linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 40%)'
            }} />

            {/* Bottom Title Card Overlay */}
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
          /* MODE 3: SPLIT-SCREEN (Giant QR on Left, Live Photo on Right) */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(320px, 420px) 1fr',
            gap: '40px',
            maxWidth: '1200px',
            width: '100%',
            height: 'calc(100vh - 120px)',
            alignItems: 'center'
          }}>
            {/* Left QR Column */}
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
                  <img src={qrDataUrl} alt="Scan QR Meja" style={{ width: '220px', height: '220px', display: 'block' }} />
                )}
              </div>

              <p style={{ color: '#D1D5DB', fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
                Arahkan kamera HP ke barcode meja atau layar ini untuk membuka kamera analog sekali pakai.
              </p>
            </div>

            {/* Right Photo Column */}
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
          /* MODE 4: MOSAIC WALL (Multi-photo Masonry Grid) */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '20px',
            maxWidth: '1200px',
            width: '100%'
          }}>
            {photos.slice(0, 6).map((p, idx) => (
              <div
                key={p.id}
                style={{
                  background: '#FAF8F5',
                  padding: '12px 12px 24px',
                  borderRadius: '18px',
                  boxShadow: '0 16px 36px rgba(0,0,0,0.6)',
                  border: idx === currentIndex % 6 ? '2px solid #C27803' : '1px solid rgba(255,255,255,0.1)',
                  transform: idx === currentIndex % 6 ? 'scale(1.03)' : 'scale(1)',
                  transition: 'all 0.4s ease'
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

      {/* Floating Corner QR Code (For Guests in Audience - Hidden in Split mode since already large) */}
      {displayMode !== 'split' && (
        <div style={{
          position: 'absolute',
          bottom: '24px',
          right: '24px',
          background: 'rgba(20, 18, 15, 0.94)',
          border: '1px solid rgba(194, 120, 3, 0.4)',
          borderRadius: '18px',
          padding: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: '0 15px 35px rgba(0,0,0,0.7)',
          backdropFilter: 'blur(10px)',
          zIndex: 40
        }}>
          {qrDataUrl && (
            <img src={qrDataUrl} alt="Scan QR Meja" style={{ width: '70px', height: '70px', borderRadius: '8px' }} />
          )}
          <div style={{ textAlign: 'left' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block' }}>
              Ikut Memotret
            </span>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff', display: 'block' }}>
              Scan Lewat HP-mu
            </span>
            <span style={{ fontSize: '10px', color: '#86868B' }}>
              Tanpa Perlu Unduh App
            </span>
          </div>
        </div>
      )}

      {/* Partner Co-Branding Watermark */}
      {event?.vendorName && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          background: 'rgba(18, 16, 11, 0.82)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backdropFilter: 'blur(10px)',
          zIndex: 40,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
        }}>
          {event.vendorLogo ? (
            <img src={event.vendorLogo} alt={event.vendorName} style={{ height: '22px', maxWidth: '80px', objectFit: 'contain' }} />
          ) : (
            <span style={{ fontSize: '14px' }}>✨</span>
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

      {/* Ken Burns Keyframe CSS */}
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
      `
        }}
      />
    </div>
  );
}
