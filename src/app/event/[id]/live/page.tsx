'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { Maximize2, Minimize2, ArrowLeft, Camera, RefreshCw } from 'lucide-react';
import { EventData, PhotoRecord } from '@/lib/types';

export default function LiveProjectorWallPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventData | null>(null);
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // Slideshow cycle every 5 seconds
  useEffect(() => {
    if (photos.length <= 1) return;
    const slideTimer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, 5000);
    return () => clearInterval(slideTimer);
  }, [photos.length]);

  // Generate Corner QR Code
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const guestUrl = `${window.location.origin}/cam/${eventId}`;
      QRCode.toDataURL(guestUrl, {
        width: 180,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      }).then(url => setQrDataUrl(url));
    }
  }, [eventId]);

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
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
        zIndex: 40
      }}>
        <Link href={`/event/${eventId}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <ArrowLeft size={16} />
          <span>Keluar ke Dashboard</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Foto ke-{photos.length > 0 ? currentIndex + 1 : 0} dari {photos.length}
          </span>
          <button
            onClick={toggleFullscreen}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px'
            }}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            <span>{isFullscreen ? 'Kecilkan' : 'Layar Penuh (F11)'}</span>
          </button>
        </div>
      </header>

      {/* Main Stage Display */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px 40px' }}>
        {photos.length === 0 ? (
          <div style={{ textAlign: 'center', maxWidth: '500px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(212, 175, 55, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              color: 'var(--gold-primary)'
            }}>
              <Camera size={40} />
            </div>
            <h1 style={{ fontSize: '32px', marginBottom: '12px' }}>
              {event?.title || 'Live Photo Wall'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '16px', lineHeight: 1.6, marginBottom: '28px' }}>
              Menunggu jepretan candid pertama dari meja tamu! Pindai kode QR di sudut layar atau kartu meja untuk memotret.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '900px', width: '100%' }}>
            {/* Event Name Tag */}
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 14px',
                borderRadius: '999px',
                background: 'rgba(212, 175, 55, 0.15)',
                border: '1px solid var(--border-gold)',
                color: 'var(--gold-light)',
                fontSize: '11px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '6px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                <span>{event?.title || 'Momen Tamu'}</span>
              </div>
            </div>

            {/* Featured Photo Frame (Cinema Polaroid Style) */}
            <div style={{
              background: '#faf8f5',
              padding: '16px 16px 48px 16px',
              borderRadius: '24px',
              boxShadow: '0 30px 80px rgba(0, 0, 0, 0.9), 0 0 40px rgba(212, 175, 55, 0.15)',
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
                background: '#12100b',
                position: 'relative'
              }}>
                <img
                  src={currentPhoto.imageData}
                  alt={`Diabadikan oleh ${currentPhoto.guestName}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              <div style={{ marginTop: '18px', textAlign: 'center', color: '#1a1815' }}>
                <span style={{ fontSize: '18px', fontWeight: '800', fontFamily: 'var(--font-display)', display: 'block' }}>
                  Diabadikan oleh @{currentPhoto.guestName}
                </span>
                <span style={{ fontSize: '13px', color: '#736d65', fontFamily: 'var(--font-lcd)', display: 'block', marginTop: '2px' }}>
                  FRAME #{currentPhoto.shotNumber} • {new Date(currentPhoto.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Corner QR Code (For Guests in Audience) */}
      <div style={{
        position: 'absolute',
        bottom: '24px',
        right: '24px',
        background: 'rgba(20, 18, 15, 0.92)',
        border: '1px solid var(--border-gold)',
        borderRadius: '18px',
        padding: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        boxShadow: '0 15px 35px rgba(0,0,0,0.7)',
        backdropFilter: 'blur(10px)',
        zIndex: 30
      }}>
        {qrDataUrl && (
          <img src={qrDataUrl} alt="Scan QR Meja" style={{ width: '70px', height: '70px', borderRadius: '8px' }} />
        )}
        <div style={{ textAlign: 'left' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--gold-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block' }}>
            Ikut Memotret
          </span>
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff', display: 'block' }}>
            Scan Lewat HP-mu
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            Tanpa Perlu Unduh App
          </span>
        </div>
      </div>
    </div>
  );
}
