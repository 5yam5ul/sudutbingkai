'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Camera, Tv, Printer, Download, Share2, RefreshCw, ArrowLeft, Image as ImageIcon, Users, Check, Lock, Unlock, Clock, Volume2, Mic, X } from 'lucide-react';
import { EventData, PhotoRecord } from '@/lib/types';
import { FILM_PRESETS } from '@/lib/filters';
import { FRAME_TEMPLATES } from '@/lib/frames';
import JSZip from 'jszip';

interface VoiceNoteRecord {
  id: string;
  eventId: string;
  guestName: string;
  audioUrl: string;
  duration: number;
  timestamp: string;
}

export default function EventDashboardPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventData | null>(null);
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNoteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState('');

  // Cuci Roll Countdown State
  const [countdown, setCountdown] = useState<{ hours: number; minutes: number; seconds: number; isExpired: boolean }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false
  });

  // Lightbox Photo Modal State
  const [activePhoto, setActivePhoto] = useState<PhotoRecord | null>(null);

  const fetchEventData = async () => {
    try {
      const resEvents = await fetch(`/api/events?id=${eventId}`);
      const dataEvents = await resEvents.json();
      if (dataEvents.success && dataEvents.event) {
        setEvent(dataEvents.event);
      }

      const resPhotos = await fetch(`/api/photos?eventId=${eventId}`);
      const dataPhotos = await resPhotos.json();
      if (dataPhotos.success) {
        setPhotos(dataPhotos.photos);
      }

      // Fetch voice notes
      try {
        const resVoices = await fetch(`/api/voice-notes?eventId=${eventId}`);
        const dataVoices = await resVoices.json();
        if (dataVoices.success && dataVoices.voiceNotes) {
          setVoiceNotes(dataVoices.voiceNotes);
        }
      } catch (vErr) {
        console.warn('Voice notes not loaded:', vErr);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventData();
    const interval = setInterval(fetchEventData, 6000);
    return () => clearInterval(interval);
  }, [eventId]);

  // Cuci roll countdown ticker
  useEffect(() => {
    if (!event || event.revealMode !== 'delayed' || !event.revealTime) return;

    const tick = () => {
      const target = new Date(event.revealTime!).getTime();
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setCountdown({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown({ hours, minutes, seconds, isExpired: false });
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [event]);

  const handleForceReveal = async () => {
    if (!confirm('Buka album sekarang dan selesaikan cuci roll? Semua foto akan langsung dapat dilihat.')) return;
    try {
      const res = await fetch('/api/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: eventId, revealMode: 'instant' })
      });
      const data = await res.json();
      if (data.success && data.event) {
        setEvent(data.event);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSharePhoto = async (photo: PhotoRecord) => {
    if (navigator.share) {
      try {
        let file: File | null = null;
        if (photo.imageData.startsWith('data:image')) {
          const res = await fetch(photo.imageData);
          const blob = await res.blob();
          file = new File([blob], `sudutbingkai-${photo.guestName}.jpg`, { type: 'image/jpeg' });
        }
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Momen Foto ${photo.guestName}`,
            text: `Foto kenangan dari acara ${event?.title || 'Sudut Bingkai'}`
          });
          return;
        } else {
          await navigator.share({
            title: `Momen Foto ${photo.guestName}`,
            text: `Lihat foto ${photo.guestName} di acara ${event?.title}`,
            url: window.location.href
          });
          return;
        }
      } catch (err) {
        console.warn('Share dismissed or failed:', err);
      }
    }
    // WhatsApp fallback
    const text = encodeURIComponent(`Lihat foto kenangan dari acara ${event?.title || 'Sudut Bingkai'}: ${window.location.href}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const copyGuestLink = () => {
    const url = `${window.location.origin}/cam/${eventId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const downloadAllPhotosAsZip = async () => {
    if (photos.length === 0) {
      alert('Belum ada foto yang diambil oleh tamu.');
      return;
    }
    setIsZipping(true);
    setZipProgress(`Menyiapkan arsip ZIP (0/${photos.length})...`);

    try {
      const zip = new JSZip();
      const folderName = `sudutbingkai-${event?.id || 'album'}`;
      const folder = zip.folder(folderName);

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        setZipProgress(`Mengemas foto (${i + 1}/${photos.length})...`);
        try {
          let blob: Blob;
          if (photo.imageData.startsWith('data:image')) {
            const matches = photo.imageData.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
            const ext = matches && matches[1] === 'png' ? 'png' : 'jpg';
            const base64 = matches ? matches[2] : photo.imageData.replace(/^data:image\/\w+;base64,/, '');
            const byteChars = atob(base64);
            const byteNumbers = new Array(byteChars.length);
            for (let j = 0; j < byteChars.length; j++) {
              byteNumbers[j] = byteChars.charCodeAt(j);
            }
            blob = new Blob([new Uint8Array(byteNumbers)], { type: `image/${ext}` });
          } else {
            const res = await fetch(photo.imageData);
            blob = await res.blob();
          }

          const safeGuest = photo.guestName.replace(/[^a-zA-Z0-9_\-]/g, '_');
          folder?.file(`${i + 1}_${safeGuest}_jepretan${photo.shotNumber}.jpg`, blob);
        } catch (err) {
          console.warn('Gagal memproses foto:', photo.id, err);
        }
      }

      setZipProgress('Mengompresi file ZIP...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `sudutbingkai-${event?.id || 'event'}-semua-foto.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err: unknown) {
      alert('Gagal membuat file ZIP: ' + (err as Error).message);
    } finally {
      setIsZipping(false);
      setZipProgress('');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FBFBFA', color: '#1D1D1F' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw size={32} style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 16px', color: '#C27803' }} />
          <p style={{ color: '#6E6E73', fontSize: '14px' }}>Memuat Album Acara...</p>
        </div>
      </div>
    );
  }

  const presetInfo = event ? FILM_PRESETS[event.preset] || FILM_PRESETS.portra : FILM_PRESETS.portra;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FBFBFA', color: '#1D1D1F', position: 'relative' }}>
      {/* Background Radial Glow */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '900px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(194, 120, 3, 0.05) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Top Glass Navigation */}
      <header className="glass-nav" style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '16px 24px',
        borderBottom: '1px solid rgba(0, 0, 0, 0.06)'
      }}>
        <div style={{ maxWidth: '1160px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href="/" style={{ textDecoration: 'none', color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ArrowLeft size={16} />
              <img 
                src="/sudut-bingkai-logo.png" 
                alt="Sudut Bingkai" 
                style={{ height: '32px', width: 'auto', objectFit: 'contain', display: 'block' }} 
              />
            </Link>
            <span style={{ color: 'rgba(0,0,0,0.15)' }}>/</span>
            <span className="font-mono-film" style={{ color: '#C27803', fontSize: '10.5px' }}>
              GALERI & KENDALI ACARA
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={copyGuestLink} className="glass-pill" style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              {copied ? <Check size={14} color="#C27803" /> : <Share2 size={14} />}
              <span>{copied ? 'Tautan Tersalin' : 'Salin Link Tamu'}</span>
            </button>

            <Link href={`/event/${eventId}/print`} className="glass-pill" style={{ padding: '8px 16px', fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Printer size={14} />
              <span>Cetak Kartu Meja</span>
            </Link>


            <Link href={`/cam/${eventId}`} className="btn-apple-black" style={{ padding: '8px 18px', fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Camera size={14} />
              <span>Buka Kamera</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ position: 'relative', zIndex: 10, padding: '40px 24px 80px', maxWidth: '1160px', margin: '0 auto' }}>
        {/* Event Header Banner */}
        <div className="glass-card" style={{ padding: '36px', borderRadius: '28px', marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2ECC71' }} />
                <span className="font-mono-film" style={{ color: '#C27803', fontSize: '11px' }}>
                  ACARA AKTIF
                </span>
              </div>

              <h1 className="font-display-serif" style={{ fontSize: '38px', fontWeight: 700, marginBottom: '8px', color: '#1D1D1F' }}>
                {event?.title || 'Hari Pernikahan'}
              </h1>

              <p style={{ color: '#515154', fontSize: '14.5px' }}>
                Penyelenggara: <strong style={{ color: '#1D1D1F' }}>{event?.coupleOrHost}</strong>
                {event?.location && ` • Lokasi: ${event.location}`}
              </p>
            </div>

            <button 
              onClick={downloadAllPhotosAsZip} 
              disabled={isZipping || photos.length === 0}
              className="btn-apple-black" 
              style={{ padding: '12px 24px', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '8px', cursor: isZipping ? 'wait' : 'pointer' }}
            >
              {isZipping ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={16} />}
              <span>{isZipping ? zipProgress : `Unduh Arsip ZIP (${photos.length} Foto)`}</span>
            </button>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginTop: '28px', borderTop: '1px solid rgba(0, 0, 0, 0.07)', paddingTop: '24px' }}>
            <div>
              <span className="font-mono-film" style={{ color: '#86868B', display: 'block', marginBottom: '4px' }}>TOTAL FOTO</span>
              <strong style={{ fontSize: '22px', color: '#1D1D1F' }}>{photos.length} Momen</strong>
            </div>

            <div>
              <span className="font-mono-film" style={{ color: '#86868B', display: 'block', marginBottom: '4px' }}>FILTER EMULASI</span>
              <strong style={{ fontSize: '22px', color: '#C27803' }}>{presetInfo.name}</strong>
            </div>

            <div>
              <span className="font-mono-film" style={{ color: '#86868B', display: 'block', marginBottom: '4px' }}>BINGKAI RESMI</span>
              <strong style={{ fontSize: '22px', color: '#1D1D1F' }}>
                {FRAME_TEMPLATES[event?.frameId || 'minimal-gold']?.name?.split(' ')[0] || 'Minimal'}
              </strong>
            </div>

            <div>
              <span className="font-mono-film" style={{ color: '#86868B', display: 'block', marginBottom: '4px' }}>PESAN SUARA</span>
              <strong style={{ fontSize: '22px', color: '#C27803' }}>{voiceNotes.length} Ucapan</strong>
            </div>

            <div>
              <span className="font-mono-film" style={{ color: '#86868B', display: 'block', marginBottom: '4px' }}>JATAH PER TAMU</span>
              <strong style={{ fontSize: '22px', color: '#1D1D1F' }}>{event?.shotsPerGuest || 20} Foto</strong>
            </div>

            <div>
              <span className="font-mono-film" style={{ color: '#86868B', display: 'block', marginBottom: '4px' }}>STATUS PENGUNGKAPAN</span>
              <strong style={{ fontSize: '22px', color: '#1D1D1F' }}>
                {event?.revealMode === 'instant' ? 'Terbuka' : countdown.isExpired ? 'Selesai Dicuci' : 'Kamar Gelap (Cuci Roll)'}
              </strong>
            </div>
          </div>
        </div>

        {/* Cuci Roll Developing Banner (When delayed & not expired) */}
        {event?.revealMode === 'delayed' && !countdown.isExpired && (
          <div className="glass-card" style={{ padding: '28px 32px', borderRadius: '24px', marginBottom: '36px', background: 'linear-gradient(135deg, rgba(28, 25, 23, 0.96), rgba(15, 14, 12, 0.98))', color: '#FFF', border: '1px solid rgba(194, 120, 3, 0.35)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(194, 120, 3, 0.2)', border: '1px solid #C27803', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={24} color="#F59E0B" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B', animation: 'pulse 1.5s infinite' }} />
                    <span className="font-mono-film" style={{ color: '#F59E0B', fontSize: '11px' }}>
                      SENSASI CUCI ROLL • SEDANG DIPROSES
                    </span>
                  </div>
                  <h3 style={{ fontSize: '19px', fontWeight: 700, color: '#FFF', marginBottom: '4px' }}>
                    Roll Film Tamu Sedang Dicuci Bersama
                  </h3>
                  <p style={{ color: '#A8A29E', fontSize: '13px' }}>
                    Semua jepretan kamera tamu dirahasiakan dan akan diungkapkan serentak begitu waktu cuci roll selesai.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                {/* Retro Clock Display */}
                <div style={{ display: 'flex', gap: '8px', fontFamily: 'var(--font-mono)' }}>
                  <div style={{ background: 'rgba(0,0,0,0.6)', padding: '8px 12px', borderRadius: '10px', textAlign: 'center', minWidth: '50px' }}>
                    <strong style={{ fontSize: '22px', color: '#F59E0B', display: 'block' }}>{String(countdown.hours).padStart(2, '0')}</strong>
                    <span style={{ fontSize: '9px', color: '#78716C' }}>JAM</span>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.6)', padding: '8px 12px', borderRadius: '10px', textAlign: 'center', minWidth: '50px' }}>
                    <strong style={{ fontSize: '22px', color: '#F59E0B', display: 'block' }}>{String(countdown.minutes).padStart(2, '0')}</strong>
                    <span style={{ fontSize: '9px', color: '#78716C' }}>MENIT</span>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.6)', padding: '8px 12px', borderRadius: '10px', textAlign: 'center', minWidth: '50px' }}>
                    <strong style={{ fontSize: '22px', color: '#F59E0B', display: 'block' }}>{String(countdown.seconds).padStart(2, '0')}</strong>
                    <span style={{ fontSize: '9px', color: '#78716C' }}>DETIK</span>
                  </div>
                </div>

                <button
                  onClick={handleForceReveal}
                  className="glass-pill"
                  style={{ padding: '9px 16px', fontSize: '12.5px', color: '#F59E0B', cursor: 'pointer', background: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.4)', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Unlock size={14} />
                  <span>Buka Sekarang</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Gallery Section */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 className="font-display-serif" style={{ fontSize: '26px', fontWeight: 700, color: '#1D1D1F' }}>
              Roll Foto Bersama <em>({photos.length})</em>
            </h2>
            <button onClick={fetchEventData} className="glass-pill" style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <RefreshCw size={12} />
              <span>Perbarui</span>
            </button>
          </div>

          {photos.length === 0 ? (
            <div className="glass-card" style={{ padding: '64px 24px', textAlign: 'center', borderRadius: '24px' }}>
              <Camera size={44} style={{ color: '#86868B', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: '#1D1D1F' }}>Belum ada foto yang masuk</h3>
              <p style={{ color: '#6E6E73', fontSize: '14px', maxWidth: '420px', margin: '0 auto 24px' }}>
                Bagikan tautan kamera atau buka kamera tamu demo untuk mengambil jepretan pertama Anda.
              </p>
              <Link href={`/cam/${eventId}`} className="btn-apple-black" style={{ padding: '10px 22px', fontSize: '13.5px' }}>
                Buka Kamera Tamu Demo
              </Link>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '24px'
            }}>
              {photos.map((photo) => {
                const isLocked = event?.revealMode === 'delayed' && !countdown.isExpired;

                return (
                  <div
                    key={photo.id}
                    className="glass-card"
                    style={{
                      borderRadius: '28px',
                      padding: '14px 14px 18px 14px',
                      overflow: 'hidden',
                      cursor: isLocked ? 'default' : 'pointer'
                    }}
                    onClick={() => {
                      if (!isLocked) setActivePhoto(photo);
                    }}
                  >
                    <div style={{ aspectRatio: '3/4', borderRadius: '20px', overflow: 'hidden', background: '#000', marginBottom: '14px', position: 'relative' }}>
                      <img
                        src={photo.imageData}
                        alt={`Foto oleh ${photo.guestName}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          filter: isLocked ? 'blur(16px) brightness(0.65)' : 'none',
                          transition: 'filter 0.3s ease'
                        }}
                      />
                      {isLocked && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#FFF' }}>
                          <Lock size={24} color="#F59E0B" />
                          <span className="font-mono-film" style={{ fontSize: '10px', color: '#F59E0B', letterSpacing: '1px' }}>
                            DALAM CUCI ROLL
                          </span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 6px' }}>
                      <div>
                        <strong style={{ fontSize: '14px', color: '#1D1D1F', display: 'block', fontWeight: 600 }}>
                          {photo.guestName}
                        </strong>
                        <span className="font-mono-film" style={{ fontSize: '10px', color: '#86868B' }}>
                          Jepretan #{photo.shotNumber}
                        </span>
                      </div>

                      {!isLocked ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSharePhoto(photo);
                            }}
                            className="glass-pill"
                            style={{ padding: '7px 12px', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}
                            title="Bagikan ke WhatsApp/Instagram"
                          >
                            <Share2 size={12} />
                          </button>

                          <a
                            href={photo.imageData}
                            download={`sudutbingkai-${photo.guestName}-${photo.shotNumber}.jpg`}
                            onClick={(e) => e.stopPropagation()}
                            className="glass-pill"
                            style={{ padding: '7px 14px', fontSize: '11.5px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}
                          >
                            <Download size={12} />
                            <span>Unduh</span>
                          </a>
                        </div>
                      ) : (
                        <span className="font-mono-film" style={{ fontSize: '10px', color: '#86868B' }}>Terkunci</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Guest Voice Notes Section */}
        {voiceNotes.length > 0 && (
          <div className="glass-card" style={{ padding: '32px', borderRadius: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(194, 120, 3, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mic size={18} color="#C27803" />
              </div>
              <div>
                <h3 className="font-display-serif" style={{ fontSize: '22px', fontWeight: 700, color: '#1D1D1F' }}>
                  Pesan Suara Tamu <em>({voiceNotes.length})</em>
                </h3>
                <p style={{ color: '#6E6E73', fontSize: '13px' }}>
                  Ucapan penutup hangat yang direkam langsung oleh tamu acara.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {voiceNotes.map((note) => (
                <div
                  key={note.id}
                  style={{
                    padding: '16px',
                    borderRadius: '18px',
                    background: 'rgba(255, 255, 255, 0.85)',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '13.5px', color: '#1D1D1F', display: 'block' }}>{note.guestName}</strong>
                      <span style={{ fontSize: '11px', color: '#86868B' }}>
                        {new Date(note.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • {note.duration ? `${note.duration} dtk` : '15 dtk'}
                      </span>
                    </div>

                    <a
                      href={note.audioUrl}
                      download={`suara-${note.guestName}.webm`}
                      className="glass-pill"
                      style={{ padding: '6px 10px', fontSize: '11px', textDecoration: 'none', color: '#1D1D1F' }}
                      title="Unduh rekaman suara"
                    >
                      <Download size={12} />
                    </a>
                  </div>

                  <audio controls src={note.audioUrl} style={{ width: '100%', height: '36px' }} />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Lightbox Photo Modal */}
      {activePhoto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
          onClick={() => setActivePhoto(null)}
        >
          <div
            className="glass-card"
            style={{
              background: '#FFFFFF',
              maxWidth: '520px',
              width: '100%',
              borderRadius: '28px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '15px', color: '#1D1D1F', display: 'block' }}>{activePhoto.guestName}</strong>
                <span className="font-mono-film" style={{ fontSize: '11px', color: '#86868B' }}>Jepretan #{activePhoto.shotNumber}</span>
              </div>
              <button
                onClick={() => setActivePhoto(null)}
                className="glass-pill"
                style={{ padding: '6px 10px', fontSize: '12px', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ borderRadius: '20px', overflow: 'hidden', background: '#000', maxHeight: '65vh', display: 'flex', justifyContent: 'center' }}>
              <img
                src={activePhoto.imageData}
                alt={activePhoto.guestName}
                style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                onClick={() => handleSharePhoto(activePhoto)}
                className="btn-apple-black"
                style={{ padding: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
              >
                <Share2 size={14} />
                <span>Bagikan (Share)</span>
              </button>

              <a
                href={activePhoto.imageData}
                download={`sudutbingkai-${activePhoto.guestName}-${activePhoto.shotNumber}.jpg`}
                className="glass-pill"
                style={{ padding: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', textDecoration: 'none', color: '#1D1D1F' }}
              >
                <Download size={14} />
                <span>Unduh Foto</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

