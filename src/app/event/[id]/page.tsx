'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Camera, Tv, Printer, Download, Share2, RefreshCw, ArrowLeft, 
  Image as ImageIcon, Users, Check, Lock, Unlock, Clock, Volume2, 
  Mic, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Film, CheckCircle2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { hapticLightTap, hapticDialClick } from '@/lib/haptics';
import { EventData, PhotoRecord } from '@/lib/types';
import { FILM_PRESETS } from '@/lib/filters';
import { FRAME_TEMPLATES } from '@/lib/frames';
import JSZip from 'jszip';
import MayarPaymentModal from '@/components/MayarPaymentModal';
import ConfirmModal from '@/components/ConfirmModal';
import SkeletonLoader from '@/components/SkeletonLoader';
import { toast } from 'sonner';

interface VoiceNoteRecord {
  id: string;
  eventId: string;
  guestName: string;
  audioUrl: string;
  duration: number;
  timestamp: string;
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 320 : direction < 0 ? -320 : 0,
    opacity: 0,
    scale: 0.92,
    rotate: direction > 0 ? 3.5 : direction < 0 ? -3.5 : 0
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      x: { type: 'spring' as const, stiffness: 320, damping: 30 },
      opacity: { duration: 0.2 },
      scale: { type: 'spring' as const, stiffness: 320, damping: 30 },
      rotate: { type: 'spring' as const, stiffness: 320, damping: 30 }
    }
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 320 : -320,
    opacity: 0,
    scale: 0.92,
    rotate: direction < 0 ? 3.5 : -3.5,
    transition: {
      x: { type: 'spring' as const, stiffness: 320, damping: 30 },
      opacity: { duration: 0.2 }
    }
  })
};

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

  // Custom Glass Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    variant?: 'danger' | 'warning' | 'primary';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmText: 'Lanjutkan',
    variant: 'primary',
    onConfirm: () => {}
  });

  // Cuci Roll Countdown State
  const [countdown, setCountdown] = useState<{ hours: number; minutes: number; seconds: number; isExpired: boolean }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false
  });

  // Guest Filter State (Guest Chips)
  const [selectedGuest, setSelectedGuest] = useState<string>('all');

  // Top Up Pax Addon Modal State
  const [showTopUpPaxModal, setShowTopUpPaxModal] = useState(false);
  const [isUpdatingPax, setIsUpdatingPax] = useState(false);
  const [isUpdatingPresetMode, setIsUpdatingPresetMode] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [pendingPaymentData, setPendingPaymentData] = useState<{
    amount: number;
    title: string;
    description: string;
    isSimulation: boolean;
    paxAmount: number;
  } | null>(null);

  // Compute unique guest names and counts
  const guestCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    photos.forEach(p => {
      const name = p.guestName?.trim() || 'Tamu Anonim';
      counts[name] = (counts[name] || 0) + 1;
    });
    return counts;
  }, [photos]);

  const uniqueGuests = React.useMemo(() => {
    return Object.keys(guestCounts).sort();
  }, [guestCounts]);

  const displayedPhotos = React.useMemo(() => {
    if (selectedGuest === 'all') return photos;
    return photos.filter(p => (p.guestName?.trim() || 'Tamu Anonim') === selectedGuest);
  }, [photos, selectedGuest]);

  // Lightbox Photo Modal State
  const [activePhoto, setActivePhoto] = useState<PhotoRecord | null>(null);
  const [slideDirection, setSlideDirection] = useState<number>(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const filmStripRef = React.useRef<HTMLDivElement | null>(null);

  // Unlocked photos available for preview (now respects active guest filter!)
  const isRollLocked = event?.revealMode === 'delayed' && !countdown.isExpired;
  const availablePhotos = isRollLocked ? [] : displayedPhotos;
  const activeIndex = activePhoto ? availablePhotos.findIndex(p => p.id === activePhoto.id) : -1;

  const paginate = (newDirection: number) => {
    if (availablePhotos.length <= 1 || !activePhoto || activeIndex === -1) return;
    hapticLightTap();
    setIsZoomed(false);
    setSlideDirection(newDirection);
    const newIndex = (activeIndex + newDirection + availablePhotos.length) % availablePhotos.length;
    setActivePhoto(availablePhotos[newIndex]);
  };

  const jumpToPhoto = (targetPhoto: PhotoRecord, index: number) => {
    if (!activePhoto || targetPhoto.id === activePhoto.id) return;
    hapticDialClick();
    setIsZoomed(false);
    setSlideDirection(index > activeIndex ? 1 : -1);
    setActivePhoto(targetPhoto);
  };

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!activePhoto) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        paginate(1);
      } else if (e.key === 'ArrowLeft') {
        paginate(-1);
      } else if (e.key === 'Escape') {
        setActivePhoto(null);
        setIsZoomed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePhoto, availablePhotos, activeIndex]);

  // Center active thumbnail in film strip scrubber
  useEffect(() => {
    if (activePhoto && filmStripRef.current) {
      const activeEl = filmStripRef.current.querySelector(`[data-photo-id="${activePhoto.id}"]`) as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activePhoto]);

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

  const handleForceReveal = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Buka Album Sekarang?',
      description: 'Selesaikan proses cuci roll sekarang. Semua foto tamu akan langsung dapat dilihat dan dinikmati di galeri acara.',
      confirmText: 'Buka Album',
      variant: 'warning',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch('/api/events', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: eventId, revealMode: 'instant' })
          });
          const data = await res.json();
          if (data.success && data.event) {
            setEvent(data.event);
            toast.success('Rol film selesai dicuci! Galeri foto terbuka penuh.');
          } else {
            toast.error('Gagal membuka album: ' + (data.error || 'Terjadi kesalahan'));
          }
        } catch (e) {
          toast.error('Error membuka album.');
        }
      }
    });
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
    const slugOrId = event?.slug || eventId;
    const url = `${window.location.origin}/cam/${slugOrId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const executeTopUpPax = async (additionalPaxAmount: number) => {
    if (!event) return;
    setIsUpdatingPax(true);
    try {
      const currentAdditional = event.additionalPax || 0;
      const newAdditional = currentAdditional + additionalPaxAmount;
      const res = await fetch('/api/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: event.id, additionalPax: newAdditional })
      });
      const data = await res.json();
      if (data.success && data.event) {
        setEvent(data.event);
        setShowTopUpPaxModal(false);
        toast.success(`Berhasil menambahkan +${additionalPaxAmount} kuota tamu! Total kapasitas: ${data.event.maxGuests + (data.event.additionalPax || 0)} pax.`);
      } else {
        toast.error('Gagal menambah kuota: ' + (data.error || 'Terjadi kesalahan'));
      }
    } catch (e: any) {
      toast.error('Error: ' + e.message);
    } finally {
      setIsUpdatingPax(false);
    }
  };

  const handleTopUpPax = async (additionalPaxAmount: number) => {
    if (!event) return;

    setIsUpdatingPax(true);
    try {
      const payRes = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          isAddonPax: true,
          paxAmount: additionalPaxAmount,
          name: event.coupleOrHost || event.title,
        })
      });

      const payData = await payRes.json();
      if (payData.success) {
        if (!payData.isSimulation && payData.paymentUrl && !payData.paymentUrl.startsWith('/')) {
          window.location.href = payData.paymentUrl;
          return;
        }

        setPendingPaymentData({
          amount: payData.amount,
          title: `Top Up +${additionalPaxAmount} Pax Tamu`,
          description: `Penambahan kuota tamu untuk ${event.title}`,
          isSimulation: payData.isSimulation ?? true,
          paxAmount: additionalPaxAmount
        });
        setShowTopUpPaxModal(false);
        setPaymentModalOpen(true);
      } else {
        executeTopUpPax(additionalPaxAmount);
      }
    } catch {
      executeTopUpPax(additionalPaxAmount);
    } finally {
      setIsUpdatingPax(false);
    }
  };

  const handleTogglePresetMode = async () => {
    if (!event) return;
    setIsUpdatingPresetMode(true);
    try {
      const nextSwitchState = !event.allowGuestPresetSwitch;
      const res = await fetch('/api/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: event.id, allowGuestPresetSwitch: nextSwitchState })
      });
      const data = await res.json();
      if (data.success && data.event) {
        setEvent(data.event);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingPresetMode(false);
    }
  };

  const downloadAllPhotosAsZip = async (targetPhotos = displayedPhotos, customTag?: string) => {
    if (targetPhotos.length === 0) {
      toast.info('Belum ada foto yang dipilih untuk diunduh.');
      return;
    }
    setIsZipping(true);
    setZipProgress(`Menyiapkan arsip ZIP (0/${targetPhotos.length})...`);

    const cleanTag = customTag || (selectedGuest === 'all' ? 'semua-foto' : `foto-${selectedGuest.replace(/[^a-zA-Z0-9_\-]/g, '_')}`);

    try {
      const zip = new JSZip();
      const folderName = `sudutbingkai-${event?.slug || event?.id || 'album'}-${cleanTag}`;
      const folder = zip.folder(folderName);

      for (let i = 0; i < targetPhotos.length; i++) {
        const photo = targetPhotos[i];
        setZipProgress(`Mengemas foto (${i + 1}/${targetPhotos.length})...`);
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

          const safeGuest = (photo.guestName || 'tamu').replace(/[^a-zA-Z0-9_\-]/g, '_');
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
      a.download = `sudutbingkai-${event?.slug || event?.id || 'event'}-${cleanTag}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      toast.success('File ZIP berhasil diunduh!');
    } catch (err: unknown) {
      toast.error('Gagal membuat file ZIP: ' + (err as Error).message);
    } finally {
      setIsZipping(false);
      setZipProgress('');
    }
  };

  if (loading) {
    return <SkeletonLoader title="Memuat Album Acara..." subtitle="Menyelaraskan jepretan kamera analog dari sudut pandang para tamu" />;
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
        padding: 'calc(12px + env(safe-area-inset-top, 0px)) 20px 12px',
        borderBottom: '1px solid rgba(0, 0, 0, 0.06)'
      }}>
        <div style={{ maxWidth: '1160px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Link href="/" style={{ textDecoration: 'none', color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowLeft size={16} />
              <img 
                src="/sudut-bingkai-logo.png" 
                alt="Sudut Bingkai" 
                style={{ height: '30px', width: 'auto', objectFit: 'contain', display: 'block' }} 
              />
            </Link>
            <span style={{ color: 'rgba(0,0,0,0.15)' }}>/</span>
            <span className="font-mono-film" style={{ color: '#C27803', fontSize: '10.5px' }}>
              GALERI & KENDALI ACARA
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={copyGuestLink} className="glass-pill" style={{ padding: '8px 14px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              {copied ? <Check size={14} color="#C27803" /> : <Share2 size={14} />}
              <span>{copied ? 'Tersalin' : 'Salin Link'}</span>
            </button>

            <Link href={`/event/${eventId}/print`} className="glass-pill" style={{ padding: '8px 14px', fontSize: '12.5px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Printer size={14} />
              <span>Cetak QR Meja Tamu</span>
            </Link>

            <Link href={`/cam/${eventId}`} className="btn-apple-black" style={{ padding: '8px 16px', fontSize: '12.5px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Camera size={14} />
              <span>Buka Kamera</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main" style={{ position: 'relative', zIndex: 10 }}>
        {/* Event Header Banner */}
        <div className="glass-card form-section-card" style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2ECC71' }} />
                <span className="font-mono-film" style={{ color: '#C27803', fontSize: '11px' }}>
                  ACARA AKTIF
                </span>
              </div>

              <h1 className="font-display-serif" style={{ fontSize: 'clamp(1.8rem, 4.5vw, 2.4rem)', fontWeight: 700, marginBottom: '8px', color: '#1D1D1F' }}>
                {event?.title || 'Hari Pernikahan'}
              </h1>

              <p style={{ color: '#515154', fontSize: '14px' }}>
                Penyelenggara: <strong style={{ color: '#1D1D1F' }}>{event?.coupleOrHost}</strong>
                {event?.location && ` • Lokasi: ${event.location}`}
              </p>
            </div>

            <button 
              onClick={() => downloadAllPhotosAsZip(displayedPhotos)} 
              disabled={isZipping || displayedPhotos.length === 0}
              className="btn-apple-black" 
              style={{ padding: '10px 20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: isZipping ? 'wait' : 'pointer' }}
            >
              {isZipping ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={15} />}
              <span className="desktop-only">
                {isZipping ? zipProgress : selectedGuest === 'all' ? `Unduh Arsip ZIP (${photos.length} Foto)` : `Unduh ZIP ${selectedGuest} (${displayedPhotos.length} Foto)`}
              </span>
              <span className="mobile-only">
                {isZipping ? zipProgress : `Unduh ZIP (${displayedPhotos.length})`}
              </span>
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="responsive-metrics-grid" style={{ marginTop: '24px', borderTop: '1px solid rgba(0, 0, 0, 0.07)', paddingTop: '20px' }}>
            <div>
              <span className="font-mono-film" style={{ color: '#86868B', display: 'block', marginBottom: '4px' }}>TOTAL FOTO</span>
              <strong style={{ fontSize: '20px', color: '#1D1D1F' }}>{photos.length} Momen</strong>
            </div>

            <div>
              <span className="font-mono-film" style={{ color: '#86868B', display: 'block', marginBottom: '4px' }}>KUOTA TAMU (PAX)</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <strong style={{ fontSize: '20px', color: uniqueGuests.length >= ((event?.maxGuests || 150) + (event?.additionalPax || 0)) ? '#E11D48' : '#1D1D1F' }}>
                  {uniqueGuests.length} / {(event?.maxGuests || 150) + (event?.additionalPax || 0)} Pax
                </strong>
                {event?.additionalPax ? (
                  <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 700 }}>
                    (+{event.additionalPax})
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setShowTopUpPaxModal(true)}
                style={{
                  marginTop: '5px',
                  background: 'rgba(194, 120, 3, 0.1)',
                  border: '1px solid rgba(194, 120, 3, 0.3)',
                  color: '#C27803',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>+ Tambah Pax</span>
              </button>
            </div>

            <div>
              <span className="font-mono-film" style={{ color: '#86868B', display: 'block', marginBottom: '4px' }}>FILTER EMULASI</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <strong style={{ fontSize: '20px', color: '#C27803' }}>{presetInfo.name}</strong>
              </div>
              <button
                type="button"
                onClick={handleTogglePresetMode}
                disabled={isUpdatingPresetMode}
                style={{
                  marginTop: '5px',
                  background: 'rgba(0, 0, 0, 0.04)',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  color: '#515154',
                  padding: '3px 9px',
                  borderRadius: '999px',
                  fontSize: '10.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Ganti mode kurasi atau bebas filter untuk tamu"
              >
                <span>{event?.allowGuestPresetSwitch ? 'Bebas Pilih ⇄' : 'Terkunci 1 Warna 🔒'}</span>
              </button>
            </div>

            <div>
              <span className="font-mono-film" style={{ color: '#86868B', display: 'block', marginBottom: '4px' }}>BINGKAI RESMI</span>
              <strong style={{ fontSize: '20px', color: '#1D1D1F' }}>
                {FRAME_TEMPLATES[event?.frameId || 'minimal-gold']?.name?.split(' ')[0] || 'Minimal'}
              </strong>
            </div>

            <div>
              <span className="font-mono-film" style={{ color: '#86868B', display: 'block', marginBottom: '4px' }}>PESAN SUARA</span>
              <strong style={{ fontSize: '20px', color: '#C27803' }}>{voiceNotes.length} Ucapan</strong>
            </div>

            <div>
              <span className="font-mono-film" style={{ color: '#86868B', display: 'block', marginBottom: '4px' }}>JATAH PER TAMU</span>
              <strong style={{ fontSize: '20px', color: '#1D1D1F' }}>{event?.shotsPerGuest || 20} Foto</strong>
            </div>

            <div>
              <span className="font-mono-film" style={{ color: '#86868B', display: 'block', marginBottom: '4px' }}>STATUS PENGUNGKAPAN</span>
              <strong style={{ fontSize: '20px', color: '#1D1D1F' }}>
                {event?.revealMode === 'instant' ? 'Terbuka' : countdown.isExpired ? 'Selesai Dicuci' : 'Kamar Gelap'}
              </strong>
            </div>
          </div>
        </div>

        {/* Cuci Roll Developing Banner (When delayed & not expired) */}
        {event?.revealMode === 'delayed' && !countdown.isExpired && (
          <div className="glass-card form-section-card" style={{ marginBottom: '32px', background: 'linear-gradient(135deg, rgba(28, 25, 23, 0.96), rgba(15, 14, 12, 0.98))', color: '#FFF', border: '1px solid rgba(194, 120, 3, 0.35)' }}>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 className="font-display-serif" style={{ fontSize: '26px', fontWeight: 700, color: '#1D1D1F' }}>
                Roll Foto Bersama <em>({displayedPhotos.length}{selectedGuest !== 'all' ? ` / ${photos.length}` : ''})</em>
              </h2>
              {selectedGuest !== 'all' && (
                <span style={{ fontSize: '13px', color: '#C27803', fontWeight: 600 }}>
                  Menampilkan foto oleh: {selectedGuest}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {selectedGuest !== 'all' && (
                <button
                  type="button"
                  onClick={() => {
                    hapticLightTap();
                    setSelectedGuest('all');
                  }}
                  className="glass-pill"
                  style={{ padding: '6px 14px', fontSize: '12px', color: '#C27803', cursor: 'pointer' }}
                >
                  ✕ Bersihkan Filter
                </button>
              )}
              <button onClick={fetchEventData} className="glass-pill" style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <RefreshCw size={12} />
                <span>Perbarui</span>
              </button>
            </div>
          </div>

          {/* GUEST CHIPS HORIZONTAL CAROUSEL (Point 1: Filter Foto per Nama Tamu) */}
          {uniqueGuests.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="font-mono-film" style={{ fontSize: '11px', color: '#86868B', letterSpacing: '0.04em' }}>
                  FILTER SUDUT PANDANG TAMU ({uniqueGuests.length} TAMU)
                </span>
                <span style={{ fontSize: '11px', color: '#86868B' }}>
                  Geser horizontal →
                </span>
              </div>

              <div style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '10px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch'
              }}>
                {/* Chip: Semua Tamu */}
                <button
                  type="button"
                  onClick={() => {
                    hapticLightTap();
                    setSelectedGuest('all');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '8px 16px',
                    borderRadius: '999px',
                    fontSize: '12.5px',
                    fontWeight: selectedGuest === 'all' ? 700 : 500,
                    background: selectedGuest === 'all' ? '#1D1D1F' : '#FFFFFF',
                    color: selectedGuest === 'all' ? '#FFFFFF' : '#1D1D1F',
                    border: selectedGuest === 'all' ? '1.5px solid #1D1D1F' : '1px solid rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: selectedGuest === 'all' ? '0 4px 14px rgba(0,0,0,0.15)' : 'none',
                    transition: 'all 0.2s ease',
                    flexShrink: 0
                  }}
                >
                  <Users size={14} />
                  <span>Semua Tamu</span>
                  <span style={{
                    background: selectedGuest === 'all' ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.06)',
                    padding: '2px 7px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {photos.length}
                  </span>
                </button>

                {/* Individual Guest Chips */}
                {uniqueGuests.map(name => {
                  const count = guestCounts[name] || 0;
                  const isSelected = selectedGuest === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        hapticLightTap();
                        setSelectedGuest(name);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '7px',
                        padding: '8px 15px',
                        borderRadius: '999px',
                        fontSize: '12.5px',
                        fontWeight: isSelected ? 700 : 500,
                        background: isSelected ? '#C27803' : '#FFFFFF',
                        color: isSelected ? '#FFFFFF' : '#1D1D1F',
                        border: isSelected ? '1.5px solid #C27803' : '1px solid rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        boxShadow: isSelected ? '0 4px 14px rgba(194,120,3,0.3)' : 'none',
                        transition: 'all 0.2s ease',
                        flexShrink: 0
                      }}
                    >
                      <span style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(194,120,3,0.12)',
                        color: isSelected ? '#FFFFFF' : '#C27803',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 800
                      }}>
                        {name.charAt(0).toUpperCase()}
                      </span>
                      <span>{name}</span>
                      <span style={{
                        background: isSelected ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.06)',
                        padding: '2px 7px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)'
                      }}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {photos.length === 0 ? (
            <div className="glass-card" style={{ padding: '64px 24px', textAlign: 'center', borderRadius: '24px' }}>
              <Camera size={44} style={{ color: '#86868B', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: '#1D1D1F' }}>Belum ada foto yang masuk</h3>
              <p style={{ color: '#6E6E73', fontSize: '14px', maxWidth: '420px', margin: '0 auto 24px' }}>
                Bagikan tautan kamera atau buka kamera tamu untuk mengambil jepretan pertama Anda.
              </p>
              <Link href={`/cam/${event?.slug || eventId}`} className="btn-apple-black" style={{ padding: '10px 22px', fontSize: '13.5px' }}>
                Buka Kamera Tamu
              </Link>
            </div>
          ) : displayedPhotos.length === 0 ? (
            <div className="glass-card" style={{ padding: '48px 20px', textAlign: 'center', borderRadius: '24px' }}>
              <p style={{ color: '#6E6E73', fontSize: '14px', marginBottom: '14px' }}>
                Belum ada foto yang diambil oleh <strong>{selectedGuest}</strong>.
              </p>
              <button
                type="button"
                onClick={() => setSelectedGuest('all')}
                className="btn-apple-black"
                style={{ padding: '8px 20px', fontSize: '12.5px' }}
              >
                Tampilkan Semua Foto ({photos.length})
              </button>
            </div>
          ) : (
            <div className="mobile-photo-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '20px'
            }}>
              {displayedPhotos.map((photo) => {
                const isLocked = event?.revealMode === 'delayed' && !countdown.isExpired;

                return (
                  <div
                    key={photo.id}
                    className="glass-card"
                    style={{
                      borderRadius: '24px',
                      padding: '12px 12px 16px 12px',
                      overflow: 'hidden',
                      cursor: isLocked ? 'default' : 'pointer'
                    }}
                    onClick={() => {
                      if (!isLocked) setActivePhoto(photo);
                    }}
                  >
                    <div style={{ aspectRatio: '3/4', borderRadius: '18px', overflow: 'hidden', background: '#000', marginBottom: '12px', position: 'relative' }}>
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
                          <Lock size={22} color="#F59E0B" />
                          <span className="font-mono-film" style={{ fontSize: '9.5px', color: '#F59E0B', letterSpacing: '1px' }}>
                            DALAM CUCI ROLL
                          </span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px', flexWrap: 'wrap', gap: '4px' }}>
                      <div style={{ minWidth: 0, flex: '1 1 65px' }}>
                        <strong style={{ fontSize: '13px', color: '#1D1D1F', display: 'block', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {photo.guestName}
                        </strong>
                        <span className="font-mono-film" style={{ fontSize: '9.5px', color: '#86868B' }}>
                          #{photo.shotNumber}
                        </span>
                      </div>

                      {!isLocked ? (
                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSharePhoto(photo);
                            }}
                            className="glass-pill"
                            style={{ padding: '6px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                            title="Bagikan ke WhatsApp/Instagram"
                          >
                            <Share2 size={12} />
                          </button>

                          <a
                            href={photo.imageData}
                            download={`sudutbingkai-${photo.guestName}-${photo.shotNumber}.jpg`}
                            onClick={(e) => e.stopPropagation()}
                            className="glass-pill"
                            style={{ padding: '6px 8px', fontSize: '11px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Unduh"
                          >
                            <Download size={12} />
                            <span className="desktop-only">Unduh</span>
                          </a>
                        </div>
                      ) : (
                        <span className="font-mono-film" style={{ fontSize: '9px', color: '#86868B' }}>Terkunci</span>
                      )}
                    </div>

                    {!isLocked && photo.caption && (
                      <div
                        style={{
                          marginTop: '10px',
                          padding: '8px 10px',
                          borderRadius: '12px',
                          background: 'rgba(194, 120, 3, 0.08)',
                          border: '1px solid rgba(194, 120, 3, 0.22)',
                          fontSize: '11.5px',
                          color: '#78350F',
                          lineHeight: '1.4',
                          fontStyle: 'italic',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '6px'
                        }}
                      >
                        <span style={{ fontSize: '12px', flexShrink: 0, fontStyle: 'normal' }}>💬</span>
                        <span style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          fontWeight: 500
                        }}>
                          &ldquo;{photo.caption}&rdquo;
                        </span>
                      </div>
                    )}
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

      {/* Lightbox Photo Modal (Ultra-Smooth Drag/Swipe + Film Strip Scrubber) */}
      <AnimatePresence>
        {activePhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(8, 7, 6, 0.95)',
              backdropFilter: 'blur(20px)',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: 'calc(max(12px, env(safe-area-inset-top, 0px))) 16px calc(max(14px, env(safe-area-inset-bottom, 0px))) 16px',
              color: '#FFFFFF',
              userSelect: 'none',
              touchAction: 'none'
            }}
            onClick={() => {
              setActivePhoto(null);
              setIsZoomed(false);
            }}
          >
            {/* Header: Photo Counter, Guest Name, Zoom & Close */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                zIndex: 20,
                paddingBottom: '8px'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <span
                  style={{
                    background: 'rgba(245, 158, 11, 0.2)',
                    border: '1px solid rgba(245, 158, 11, 0.5)',
                    color: '#FBBF24',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    flexShrink: 0
                  }}
                >
                  FOTO {activeIndex + 1}/{availablePhotos.length}
                </span>

                <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <strong style={{ fontSize: '13.5px', color: '#FFFFFF', fontWeight: 600 }}>
                    {activePhoto.guestName}
                  </strong>
                  <span className="font-mono-film" style={{ fontSize: '11px', color: '#A1A1A6', marginLeft: '6px' }}>
                    #{activePhoto.shotNumber}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setIsZoomed(!isZoomed)}
                  style={{
                    background: isZoomed ? '#F59E0B' : 'rgba(255, 255, 255, 0.12)',
                    border: isZoomed ? '1px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.2)',
                    color: isZoomed ? '#000000' : '#FFFFFF',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  title={isZoomed ? "Perkecil (Zoom Out)" : "Perbesar (Zoom In 2x)"}
                >
                  {isZoomed ? <ZoomOut size={16} /> : <ZoomIn size={16} />}
                </button>

                <button
                  onClick={() => {
                    setActivePhoto(null);
                    setIsZoomed(false);
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.12)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  title="Tutup Preview (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Central Stage: Draggable / Swipeable Photo Canvas + Floating Chevrons */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                padding: '6px 0'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Floating Prev Button */}
              {availablePhotos.length > 1 && (
                <button
                  onClick={() => paginate(-1)}
                  style={{
                    position: 'absolute',
                    left: '6px',
                    zIndex: 25,
                    background: 'rgba(20, 18, 16, 0.65)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF',
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
                    transition: 'all 0.15s ease'
                  }}
                  title="Foto Sebelumnya (Geser Kanan)"
                >
                  <ChevronLeft size={22} />
                </button>
              )}

              {/* Animated Draggable Card */}
              <AnimatePresence initial={false} custom={slideDirection} mode="popLayout">
                <motion.div
                  key={activePhoto.id}
                  custom={slideDirection}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  drag={isZoomed ? false : "x"}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.7}
                  onDragEnd={(e, { offset, velocity }) => {
                    const swipeThreshold = 45;
                    const velocityThreshold = 400;
                    if (offset.x < -swipeThreshold || velocity.x < -velocityThreshold) {
                      paginate(1);
                    } else if (offset.x > swipeThreshold || velocity.x > velocityThreshold) {
                      paginate(-1);
                    }
                  }}
                  onDoubleClick={() => setIsZoomed(!isZoomed)}
                  style={{
                    width: '100%',
                    maxWidth: isZoomed ? 'min(94vw, 560px)' : 'min(90vw, 440px)',
                    maxHeight: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: isZoomed ? 'zoom-out' : 'grab',
                    touchAction: 'none'
                  }}
                  whileTap={{ cursor: isZoomed ? 'zoom-out' : 'grabbing' }}
                >
                  <div
                    style={{
                      position: 'relative',
                      borderRadius: '20px',
                      overflow: 'hidden',
                      background: '#000000',
                      boxShadow: '0 24px 60px rgba(0,0,0,0.85), inset 0 0 0 1px rgba(255, 255, 255, 0.12)',
                      transition: 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
                      transform: isZoomed ? 'scale(1.4)' : 'scale(1)',
                      maxHeight: '60vh',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <img
                      src={activePhoto.imageData}
                      alt={activePhoto.guestName}
                      draggable={false}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '60vh',
                        objectFit: 'contain',
                        display: 'block',
                        pointerEvents: 'none'
                      }}
                    />
                  </div>

                  {/* Swipe hint on touch devices */}
                  {!isZoomed && availablePhotos.length > 1 && (
                    <span
                      style={{
                        marginTop: '8px',
                        fontSize: '10.5px',
                        color: 'rgba(255, 255, 255, 0.45)',
                        letterSpacing: '0.04em'
                      }}
                    >
                      ← Geser kiri/kanan untuk foto lain →
                    </span>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Floating Next Button */}
              {availablePhotos.length > 1 && (
                <button
                  onClick={() => paginate(1)}
                  style={{
                    position: 'absolute',
                    right: '6px',
                    zIndex: 25,
                    background: 'rgba(20, 18, 16, 0.65)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF',
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
                    transition: 'all 0.15s ease'
                  }}
                  title="Foto Selanjutnya (Geser Kiri)"
                >
                  <ChevronRight size={22} />
                </button>
              )}
            </div>

            {/* Bottom Section: Wish Quote Card + Mini Film Strip + Quick Action Buttons */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                zIndex: 20
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Guest Wish / Caption Callout */}
              {activePhoto.caption && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '12px',
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    maxWidth: '520px',
                    margin: '0 auto',
                    width: '100%'
                  }}
                >
                  <span style={{ fontSize: '15px', lineHeight: 1 }}>💬</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span className="font-mono-film" style={{ fontSize: '9px', color: '#FBBF24', display: 'block', marginBottom: '2px', letterSpacing: '0.05em' }}>
                      UCAPAN DARI {activePhoto.guestName.toUpperCase()}
                    </span>
                    <p style={{ margin: 0, fontSize: '12px', color: '#FFFFFF', fontStyle: 'italic', lineHeight: '1.4', fontWeight: 500 }}>
                      &ldquo;{activePhoto.caption}&rdquo;
                    </p>
                  </div>
                </div>
              )}

              {/* Mini Film Strip Scrubber (Ide Kreatif: Deretan Klise Film 35mm) */}
              {availablePhotos.length > 1 && (
                <div
                  ref={filmStripRef}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    overflowX: 'auto',
                    padding: '6px 4px',
                    background: 'rgba(0, 0, 0, 0.45)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    maxWidth: '520px',
                    margin: '0 auto',
                    width: '100%',
                    scrollbarWidth: 'none'
                  }}
                >
                  {availablePhotos.map((p, idx) => {
                    const isSelected = p.id === activePhoto.id;
                    return (
                      <button
                        key={p.id}
                        data-photo-id={p.id}
                        onClick={() => jumpToPhoto(p, idx)}
                        style={{
                          flexShrink: 0,
                          width: '42px',
                          height: '42px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: isSelected ? '2px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.18)',
                          boxShadow: isSelected ? '0 0 12px rgba(245, 158, 11, 0.6)' : 'none',
                          padding: 0,
                          cursor: 'pointer',
                          background: '#000',
                          opacity: isSelected ? 1 : 0.55,
                          transform: isSelected ? 'scale(1.06)' : 'scale(1)',
                          transition: 'all 0.2s ease',
                          position: 'relative'
                        }}
                        title={`Lihat foto ${idx + 1}`}
                      >
                        <img
                          src={p.imageData}
                          alt={`Thumbnail ${idx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            bottom: '1px',
                            right: '2px',
                            fontSize: '8px',
                            fontFamily: 'var(--font-mono)',
                            color: '#FFFFFF',
                            background: 'rgba(0,0,0,0.7)',
                            padding: '0 2px',
                            borderRadius: '2px',
                            lineHeight: 1
                          }}
                        >
                          {p.shotNumber}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Action Buttons: Share & Download */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                  maxWidth: '520px',
                  margin: '0 auto',
                  width: '100%'
                }}
              >
                <button
                  onClick={() => handleSharePhoto(activePhoto)}
                  style={{
                    padding: '10px',
                    fontSize: '12.5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '7px',
                    cursor: 'pointer',
                    background: '#C27803',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: 600,
                    boxShadow: '0 4px 16px rgba(194, 120, 3, 0.4)'
                  }}
                >
                  <Share2 size={14} />
                  <span>Bagikan</span>
                </button>

                <a
                  href={activePhoto.imageData}
                  download={`sudutbingkai-${activePhoto.guestName}-${activePhoto.shotNumber}.jpg`}
                  style={{
                    padding: '10px',
                    fontSize: '12.5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '7px',
                    textDecoration: 'none',
                    color: '#FFFFFF',
                    background: 'rgba(255, 255, 255, 0.12)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    borderRadius: '12px',
                    fontWeight: 600
                  }}
                >
                  <Download size={14} />
                  <span>Unduh Foto</span>
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Up Pax Addon Modal */}
      <AnimatePresence>
        {showTopUpPaxModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.72)',
              backdropFilter: 'blur(8px)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
            onClick={() => setShowTopUpPaxModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card"
              style={{
                maxWidth: '460px',
                width: '100%',
                background: '#FFFFFF',
                borderRadius: '24px',
                padding: '28px 24px',
                boxShadow: '0 25px 60px -15px rgba(0,0,0,0.3)',
                color: '#1D1D1F'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(194,120,3,0.1)', color: '#C27803', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={20} />
                  </div>
                  <div>
                    <span className="font-mono-film" style={{ fontSize: '10.5px', color: '#C27803' }}>
                      ADD-ON KUOTA INSTAN
                    </span>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
                      Tambah Pax Kapan Saja
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTopUpPaxModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#86868B', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>

              <p style={{ fontSize: '13px', color: '#6E6E73', lineHeight: 1.5, marginBottom: '20px' }}>
                Tamu di venue bertambah dari rencana awal? Tambah kuota seketika tanpa jeda acara. Tamu baru bisa langsung memindai QR code dan mengabadikan momen.
              </p>

              {/* Status Pax Saat Ini */}
              <div style={{ padding: '12px 14px', borderRadius: '14px', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#86868B', display: 'block' }}>Kapasitas Paket Saat Ini</span>
                  <strong style={{ fontSize: '15px', color: '#1D1D1F' }}>
                    {(event?.maxGuests || 150) + (event?.additionalPax || 0)} Tamu
                  </strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: '#86868B', display: 'block' }}>Tamu Sudah Motret</span>
                  <strong style={{ fontSize: '15px', color: '#C27803' }}>
                    {uniqueGuests.length} Tamu
                  </strong>
                </div>
              </div>

              {/* Tier Selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {[
                  { pax: 25, price: 'Rp 49.000', perPax: 'Rp 1.960 / tamu', desc: 'Cocok jika rombongan kecil bertambah' },
                  { pax: 50, price: 'Rp 89.000', perPax: 'Rp 1.780 / tamu', badge: 'PALING POPULER', desc: 'Ideal untuk tambahan 5-6 meja tamu' },
                  { pax: 100, price: 'Rp 149.000', perPax: 'Rp 1.490 / tamu', desc: 'Untuk resepsi besar yang sangat ramai' },
                  { pax: 250, price: 'Rp 249.000', perPax: 'Rp 996 / tamu', desc: 'Keluarga besar & rekan kantor membludak' }
                ].map(opt => (
                  <button
                    key={opt.pax}
                    type="button"
                    disabled={isUpdatingPax}
                    onClick={() => handleTopUpPax(opt.pax)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      borderRadius: '16px',
                      border: opt.badge ? '2px solid #C27803' : '1px solid rgba(0,0,0,0.1)',
                      background: opt.badge ? 'rgba(194,120,3,0.04)' : '#FFFFFF',
                      cursor: isUpdatingPax ? 'wait' : 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '15px', color: '#1D1D1F' }}>+{opt.pax} Tamu</strong>
                        {opt.badge && (
                          <span style={{ fontSize: '9px', fontWeight: 800, background: '#C27803', color: '#FFF', padding: '2px 8px', borderRadius: '999px' }}>
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '11.5px', color: '#86868B', display: 'block', marginTop: '2px' }}>
                        {opt.desc} • {opt.perPax}
                      </span>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ fontSize: '14.5px', color: '#C27803', display: 'block' }}>
                        {opt.price}
                      </strong>
                      <span style={{ fontSize: '10.5px', color: '#27AE60', fontWeight: 600 }}>
                        + Tambah Langsung
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#86868B', fontSize: '11.5px' }}>
                <CheckCircle2 size={14} color="#C27803" />
                <span>Kapasitas langsung bertambah seketika dan QR code langsung menerima tamu baru.</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mayar Payment Modal (Top Up Pax) */}
      <MayarPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSuccess={() => {
          setPaymentModalOpen(false);
          if (pendingPaymentData?.paxAmount) {
            executeTopUpPax(pendingPaymentData.paxAmount);
          }
        }}
        title={pendingPaymentData?.title || 'Top Up Kuota Tamu'}
        description={pendingPaymentData?.description || ''}
        amount={pendingPaymentData?.amount || 49000}
        isSimulation={pendingPaymentData?.isSimulation}
      />

      {/* Sleek Custom Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmText={confirmModal.confirmText}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

