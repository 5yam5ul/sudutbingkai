'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Camera, Tv, Printer, Download, Share2, RefreshCw, ArrowLeft, 
  Image as ImageIcon, Users, Check, Lock, Unlock, Clock, Volume2, 
  Mic, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Film, CheckCircle2,
  SlidersHorizontal, Play, Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { hapticLightTap, hapticDialClick } from '@/lib/haptics';
import { EventData, PhotoRecord, VideoWishRecord } from '@/lib/types';
import { FILM_PRESETS } from '@/lib/filters';
import { FRAME_TEMPLATES } from '@/lib/frames';
import JSZip from 'jszip';
import MayarPaymentModal from '@/components/MayarPaymentModal';
import ConfirmModal from '@/components/ConfirmModal';
import SkeletonLoader from '@/components/SkeletonLoader';
import VideoWishStoriesPlayer from '@/components/VideoWishStoriesPlayer';
import { toast } from 'sonner';
import { getClientSession } from '@/lib/auth';

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

const formatIndonesianDate = (dateStr?: string) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

export default function EventDashboardPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventData | null>(null);
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNoteRecord[]>([]);
  const [videoWishes, setVideoWishes] = useState<VideoWishRecord[]>([]);
  const [showStoriesPlayer, setShowStoriesPlayer] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState('');
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    const session = getClientSession();
    if (session && (session.role === 'host' || session.role === 'vendor' || session.role === 'admin')) {
      setIsHost(true);
    }
  }, []);

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

      // Fetch video wishes (Premium Tiers)
      try {
        const resVideos = await fetch(`/api/video-wishes?eventId=${eventId}`);
        const dataVideos = await resVideos.json();
        if (dataVideos.success && dataVideos.videoWishes) {
          setVideoWishes(dataVideos.videoWishes);
        }
      } catch (vidErr) {
        console.warn('Video wishes not loaded:', vidErr);
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

  const downloadSinglePhoto = async (imageUrl: string, filename?: string) => {
    const toastId = toast.loading('Mengunduh foto...');
    try {
      let blob: Blob | null = null;
      if (imageUrl.startsWith('data:image')) {
        const res = await fetch(imageUrl);
        blob = await res.blob();
      } else {
        try {
          const res = await fetch(imageUrl, { mode: 'cors' });
          if (res.ok) blob = await res.blob();
        } catch (e) {
          console.warn('Direct fetch failed, falling back to canvas:', e);
        }
        if (!blob) {
          blob = await new Promise<Blob | null>((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0);
                  canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.95);
                } else {
                  resolve(null);
                }
              } catch {
                resolve(null);
              }
            };
            img.onerror = () => resolve(null);
            img.src = imageUrl;
          });
        }
      }

      if (blob) {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename || `SudutBingkai_${event?.title || 'Acara'}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
        toast.dismiss(toastId);
        toast.success('Foto berhasil diunduh ke galeri!');
        return;
      }

      const a = document.createElement('a');
      a.href = imageUrl;
      a.download = filename || `SudutBingkai_${event?.title || 'Acara'}.jpg`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.dismiss(toastId);
      toast.success('Foto terbuka!');
    } catch (err) {
      console.error('Download error:', err);
      toast.dismiss(toastId);
      toast.error('Gagal mengunduh foto');
    }
  };

  const handleSharePhoto = async (photo: PhotoRecord) => {
    const toastId = toast.loading('Menyiapkan foto...');
    try {
      let blob: Blob | null = null;
      if (photo.imageData.startsWith('data:image')) {
        const res = await fetch(photo.imageData);
        blob = await res.blob();
      } else {
        try {
          const res = await fetch(photo.imageData, { mode: 'cors' });
          if (res.ok) blob = await res.blob();
        } catch (e) {
          console.warn('Direct fetch failed, falling back to canvas:', e);
        }
        if (!blob) {
          blob = await new Promise<Blob | null>((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0);
                  canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.95);
                } else {
                  resolve(null);
                }
              } catch {
                resolve(null);
              }
            };
            img.onerror = () => resolve(null);
            img.src = photo.imageData;
          });
        }
      }

      if (!blob) {
        throw new Error('Gagal menyiapkan file foto');
      }

      const file = new File([blob], `SudutBingkai_${photo.guestName}_${photo.shotNumber}.jpg`, { type: 'image/jpeg' });
      toast.dismiss(toastId);

      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Foto ${photo.guestName} - ${event?.title || 'Sudut Bingkai'}`
        });
        return;
      }

      await downloadSinglePhoto(photo.imageData, `SudutBingkai_${photo.guestName}_${photo.shotNumber}.jpg`);
      toast.success('Foto tersimpan di galeri HP! Siap dibagikan ke WhatsApp atau Instagram Story.');
    } catch (err: any) {
      toast.dismiss(toastId);
      if (err.name !== 'AbortError') {
        console.warn('Share error:', err);
        await downloadSinglePhoto(photo.imageData, `SudutBingkai_${photo.guestName}_${photo.shotNumber}.jpg`);
        toast.info('Foto diunduh ke galeri HP untuk dibagikan.');
      }
    }
  };

  const copyGuestLink = () => {
    const slugOrId = event?.slug || eventId;
    const url = `${window.location.origin}/cam/${slugOrId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Tautan kamera tamu disalin!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareGallery = async () => {
    const url = window.location.href;
    const title = event?.coupleOrHost ? `Galeri Foto Bersama: ${event.coupleOrHost}` : (event?.title || 'Galeri Foto Sudut Bingkai');
    const text = `Lihat dan bagikan momen foto kebersamaan kita di acara ${event?.coupleOrHost || event?.title || 'spesial ini'}!`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // user dismissed
      }
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Tautan galeri berhasil disalin!');
      setTimeout(() => setCopied(false), 2500);
    }
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
        padding: 'calc(10px + env(safe-area-inset-top, 0px)) 16px 10px',
        borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
        backgroundColor: 'rgba(251, 251, 250, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)'
      }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          {/* Brand Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <Link href="/" style={{ textDecoration: 'none', color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: '6px' }} title="Kembali ke Beranda">
              <ArrowLeft size={16} />
              <img 
                src="/sudut-bingkai-logo.png" 
                alt="Sudut Bingkai" 
                style={{ height: '24px', width: 'auto', objectFit: 'contain', display: 'block' }} 
              />
            </Link>
            <span className="desktop-only" style={{ color: 'rgba(0,0,0,0.18)' }}>/</span>
            <span className="desktop-only font-mono-film" style={{ color: '#C27803', fontSize: '10.5px' }}>
              GALERI BERSAMA TAMU
            </span>
          </div>

          {/* Action Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {/* Share Button: Icon on mobile, Icon+Text on desktop */}
            <button
              type="button"
              onClick={handleShareGallery}
              className="glass-pill"
              style={{ padding: '7px 11px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}
              title="Bagikan Tautan Galeri"
            >
              {copied ? <Check size={14} color="#C27803" /> : <Share2 size={14} />}
              <span className="desktop-only">{copied ? 'Tersalin' : 'Bagikan'}</span>
            </button>

            {/* Host Tools: If authenticated host */}
            {isHost && (
              <>
                <Link
                  href={`/event/${eventId}/print`}
                  className="glass-pill desktop-only"
                  style={{ padding: '7px 11px', fontSize: '12px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  title="Cetak Barcode Meja Tamu"
                >
                  <Printer size={13} />
                  <span>Cetak Barcode</span>
                </Link>

                <Link
                  href={`/dashboard?eventId=${eventId}`}
                  className="glass-pill"
                  style={{
                    padding: '7px 10px',
                    fontSize: '12px',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    borderColor: 'rgba(194, 120, 3, 0.45)',
                    color: '#C27803',
                    background: 'rgba(194, 120, 3, 0.08)'
                  }}
                  title="Masuk ke Dashboard Host"
                >
                  <SlidersHorizontal size={13} />
                  <span className="desktop-only">Dashboard Host</span>
                  <span className="mobile-only">Host</span>
                </Link>
              </>
            )}

            {/* Open Camera: Black pill with Camera icon + label */}
            <Link
              href={`/cam/${event?.slug || eventId}`}
              className="btn-apple-black"
              style={{
                padding: '7px 14px',
                fontSize: '12px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                flexShrink: 0
              }}
              title="Buka Kamera Tamu"
            >
              <Camera size={14} />
              <span className="desktop-only">Buka Kamera</span>
              <span className="mobile-only">Kamera</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Full-Bleed Cinematic Hero Cover Section */}
      <section
        style={{
          position: 'relative',
          width: '100%',
          overflow: 'hidden',
          backgroundColor: '#141210',
          minHeight: 'clamp(460px, 68vh, 660px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end'
        }}
      >
        {/* Background Cover Image with Cinematic Vignette & Bottom Dissolve */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          <img
            src={event?.coverUrl || '/samples/dummy-couple.jpg'}
            alt={event?.coupleOrHost || 'Foto Pengantin'}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 35%'
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/samples/dummy-couple.jpg';
            }}
          />

          {/* Cinematic Dark Scrim for Perfect Typography Contrast */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(14, 12, 10, 0.95) 0%, rgba(14, 12, 10, 0.70) 45%, rgba(14, 12, 10, 0.3) 75%, rgba(14, 12, 10, 0.5) 100%)'
            }}
          />

          {/* Golden Warm Atmospheric Center Glow */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(ellipse at bottom, rgba(194, 120, 3, 0.22) 0%, transparent 70%)',
              pointerEvents: 'none'
            }}
          />

          {/* Seamless Bottom Gradient Fade into Page Background (#FBFBFA) */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '140px',
              background: 'linear-gradient(to bottom, transparent 0%, rgba(251, 251, 250, 0.4) 50%, rgba(251, 251, 250, 0.85) 80%, #FBFBFA 100%)',
              pointerEvents: 'none',
              zIndex: 2
            }}
          />
        </div>

        {/* Top Floating Badges Inside Hero (Cleaned from Clutter) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 4,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            padding: '16px 20px',
            maxWidth: '1240px',
            margin: '0 auto'
          }}
        >
          {isHost && (
            <Link
              href={`/dashboard?eventId=${eventId}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '999px',
                background: 'rgba(194, 120, 3, 0.9)',
                backdropFilter: 'blur(12px)',
                color: '#FFFFFF',
                fontSize: '11.5px',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(194, 120, 3, 0.4)'
              }}
            >
              <SlidersHorizontal size={12} />
              <span>Kelola di Dashboard</span>
            </Link>
          )}
        </div>

        {/* Bottom Hero Content */}
        <div
          style={{
            position: 'relative',
            zIndex: 3,
            padding: '24px 20px 48px',
            maxWidth: '1240px',
            width: '100%',
            margin: '0 auto'
          }}
        >
          {/* Subtitle */}
          <div style={{ display: 'inline-block', marginBottom: '8px' }}>
            <span
              style={{
                color: '#E5C07B',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '3px',
                textTransform: 'uppercase',
                display: 'inline-block',
                textShadow: '0 2px 8px rgba(0,0,0,0.7)'
              }}
            >
              THE WEDDING CELEBRATION OF
            </span>
          </div>

          {/* Couple Title */}
          <h1
            style={{
              fontFamily: 'var(--font-serif), Georgia, serif',
              fontSize: 'clamp(2.1rem, 5.5vw, 3.8rem)',
              fontWeight: 700,
              color: '#FFFFFF',
              margin: '0 0 10px 0',
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              textShadow: '0 3px 18px rgba(0, 0, 0, 0.7)'
            }}
          >
            {event?.coupleOrHost || event?.title || 'Galeri Acara'}
          </h1>

          {/* Date & Location */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              color: 'rgba(255, 255, 255, 0.92)',
              fontSize: '13.5px',
              marginBottom: '18px',
              textShadow: '0 1px 4px rgba(0,0,0,0.6)'
            }}
          >
            {event?.eventDate && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span>📅</span>
                <strong style={{ color: '#FFFFFF' }}>{formatIndonesianDate(event.eventDate)}</strong>
              </span>
            )}
            {event?.location && (
              <>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>•</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span>📍</span>
                  <span>{event.location}</span>
                </span>
              </>
            )}
          </div>

          {/* Joyful Celebration Counters / Metrics */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '24px'
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 13px',
                borderRadius: '999px',
                background: 'rgba(0, 0, 0, 0.45)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 500
              }}
            >
              <span>📸</span>
              <span><strong>{photos.length}</strong> Momen Terabadikan</span>
            </div>

            {event?.vendorName && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px 5px 6px',
                  borderRadius: '999px',
                  background: 'rgba(0, 0, 0, 0.45)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF',
                  fontSize: '11.5px',
                  fontWeight: 500
                }}
              >
                {event.vendorLogo ? (
                  <img
                    src={event.vendorLogo}
                    alt={event.vendorName}
                    style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'contain', background: '#FFFFFF' }}
                  />
                ) : (
                  <Briefcase size={12} color="#FCD34D" />
                )}
                <span>WO: <strong style={{ color: '#FCD34D' }}>{event.vendorName}</strong></span>
              </div>
            )}

            {voiceNotes.length > 0 && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 13px',
                  borderRadius: '999px',
                  background: 'rgba(0, 0, 0, 0.45)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 500
                }}
              >
                <span>🎙️</span>
                <span><strong>{voiceNotes.length}</strong> Ucapan Hangat</span>
              </div>
            )}

            {uniqueGuests.length > 0 && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 13px',
                  borderRadius: '999px',
                  background: 'rgba(0, 0, 0, 0.45)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 500
                }}
              >
                <span>👥</span>
                <span><strong>{uniqueGuests.length}</strong> Tamu Berbagi Sudut Pandang</span>
              </div>
            )}
          </div>

          {/* Hero Action CTA Buttons */}
          <div className="hero-action-buttons">
            <Link
              href={`/cam/${event?.slug || eventId}`}
              className="hero-cta-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '13px 26px',
                borderRadius: '999px',
                background: 'linear-gradient(135deg, #E5C07B 0%, #C27803 100%)',
                color: '#161412',
                fontSize: '14px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 8px 24px rgba(194, 120, 3, 0.45)',
                transition: 'transform 0.2s ease',
                cursor: 'pointer'
              }}
            >
              <Camera size={17} />
              <span>Buka Kamera & Jepret Momen</span>
            </Link>

            <div className="hero-secondary-grid" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleShareGallery}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  borderRadius: '999px',
                  background: 'rgba(255, 255, 255, 0.16)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.28)',
                  color: '#FFFFFF',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {copied ? <Check size={16} color="#E5C07B" /> : <Share2 size={16} />}
                <span>{copied ? 'Tautan Tersalin!' : 'Bagikan Galeri'}</span>
              </button>

              {photos.length > 0 && (
                <button
                  type="button"
                  onClick={() => downloadAllPhotosAsZip(displayedPhotos)}
                  disabled={isZipping}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    borderRadius: '999px',
                    background: 'rgba(0, 0, 0, 0.45)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: 'rgba(255, 255, 255, 0.92)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: isZipping ? 'wait' : 'pointer'
                  }}
                >
                  {isZipping ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={15} />}
                  <span>{isZipping ? zipProgress : 'Unduh ZIP Foto'}</span>
                </button>
              )}
            </div>

            {videoWishes.length > 0 && (
              <button
                type="button"
                className="hero-video-story-btn"
                onClick={() => {
                  setActiveStoryIndex(0);
                  setShowStoriesPlayer(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 22px',
                  borderRadius: '999px',
                  background: 'linear-gradient(135deg, #FF0055 0%, #7928CA 100%)',
                  color: '#FFFFFF',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(255, 0, 85, 0.4)',
                  border: 'none',
                  transition: 'transform 0.2s ease'
                }}
              >
                <Film size={16} />
                <span>🎬 Tonton Video Ucapan ({videoWishes.length})</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Content (Photo Feed & Filters) */}
      <main className="dashboard-main" style={{ position: 'relative', zIndex: 10, paddingTop: '20px' }}>

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
            <div className="glass-card" style={{ padding: '72px 24px', textAlign: 'center', borderRadius: '28px', maxWidth: '640px', margin: '0 auto' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(194, 120, 3, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  color: '#C27803'
                }}
              >
                <Camera size={32} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: '24px', fontWeight: 700, marginBottom: '10px', color: '#1D1D1F' }}>
                Jadilah yang Pertama Mengisi Rol Foto
              </h3>
              <p style={{ color: '#6E6E73', fontSize: '14.5px', lineHeight: 1.6, maxWidth: '460px', margin: '0 auto 26px' }}>
                Belum ada jepretan kamera dari para tamu. Abadikan senyum, tawa bahagia, dan momen hangat untuk {event?.coupleOrHost || 'tuan rumah'} sekarang juga.
              </p>
              <Link
                href={`/cam/${event?.slug || eventId}`}
                className="btn-apple-black"
                style={{
                  padding: '12px 28px',
                  fontSize: '14px',
                  fontWeight: 600,
                  borderRadius: '999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Camera size={16} />
                <span>Buka Kamera Sekarang</span>
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

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadSinglePhoto(photo.imageData, `sudutbingkai-${photo.guestName}-${photo.shotNumber}.jpg`);
                            }}
                            className="glass-pill"
                            style={{ padding: '6px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                            title="Unduh"
                          >
                            <Download size={12} />
                            <span className="desktop-only">Unduh</span>
                          </button>
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

        {/* Guest Video Wishes Section (Premium Tiers) */}
        {videoWishes.length > 0 && (
          <div className="glass-card" style={{ padding: '32px', borderRadius: '28px', marginBottom: '32px', background: 'linear-gradient(145deg, #1C1917, #0F0E0D)', border: '1px solid rgba(229, 192, 123, 0.3)', color: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #FF0055 0%, #7928CA 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(255, 0, 85, 0.4)' }}>
                  <Film size={22} color="#FFFFFF" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#E5C07B', fontWeight: 700, background: 'rgba(229, 192, 123, 0.15)', padding: '2px 8px', borderRadius: '999px', border: '1px solid rgba(229, 192, 123, 0.3)' }}>
                      Reels Tamu • Eksklusif
                    </span>
                  </div>
                  <h3 className="font-display-serif" style={{ fontSize: '24px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                    Video Ucapan 15 Detik <em>({videoWishes.length})</em>
                  </h3>
                  <p style={{ color: '#A8A29E', fontSize: '13px', marginTop: '4px', margin: 0 }}>
                    Momen ucapan langsung penuh tawa dan haru dari sahabat & kerabat.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveStoryIndex(0);
                  setShowStoriesPlayer(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 22px',
                  borderRadius: '999px',
                  background: 'linear-gradient(135deg, #E5C07B 0%, #C27803 100%)',
                  color: '#161412',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 6px 18px rgba(194, 120, 3, 0.35)'
                }}
              >
                <Play size={14} fill="#161412" />
                <span>Putar Semua Reels</span>
              </button>
            </div>

            {/* Video Cards Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '16px'
            }}>
              {videoWishes.map((wish, index) => (
                <div
                  key={wish.id}
                  onClick={() => {
                    setActiveStoryIndex(index);
                    setShowStoriesPlayer(true);
                  }}
                  style={{
                    position: 'relative',
                    aspectRatio: '9/16',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    backgroundColor: '#000000',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Thumbnail or Video Poster */}
                  {wish.thumbnailUrl ? (
                    <img
                      src={wish.thumbnailUrl}
                      alt={wish.guestName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <video
                      src={wish.videoUrl}
                      muted
                      playsInline
                      preload="metadata"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }}
                    />
                  )}

                  {/* Gradient Shadow Overlay */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.4) 100%)'
                  }} />

                  {/* Top Badge: Duration */}
                  <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', padding: '3px 8px', borderRadius: '999px', fontSize: '11px', color: '#FFF', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>{wish.durationSeconds ? `${wish.durationSeconds}s` : '15s'}</span>
                  </div>

                  {/* Play Button Icon Center */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.25)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Play size={18} fill="#FFFFFF" color="#FFFFFF" style={{ marginLeft: '2px' }} />
                  </div>

                  {/* Bottom Info: Guest Name & Time */}
                  <div style={{ position: 'absolute', bottom: '12px', left: '12px', right: '12px' }}>
                    <strong style={{ fontSize: '13.5px', color: '#FFFFFF', display: 'block', textShadow: '0 2px 4px rgba(0,0,0,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {wish.guestName}
                    </strong>
                    <span style={{ fontSize: '11px', color: '#E5C07B', opacity: 0.9 }}>
                      {new Date(wish.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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

                <button
                  onClick={() => downloadSinglePhoto(activePhoto.imageData, `sudutbingkai-${activePhoto.guestName}-${activePhoto.shotNumber}.jpg`)}
                  style={{
                    padding: '10px',
                    fontSize: '12.5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '7px',
                    color: '#FFFFFF',
                    background: 'rgba(255, 255, 255, 0.12)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    borderRadius: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Download size={14} />
                  <span>Unduh Foto</span>
                </button>
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
                  { pax: 50, price: 'Rp 89.000', perPax: 'Rp 1.780 / tamu', badge: 'PALING POPULER', desc: 'Ideal untuk tambahan rombongan 50 tamu undangan' },
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

      {/* Video Wish Stories Reels Viewer */}
      {showStoriesPlayer && videoWishes.length > 0 && (
        <VideoWishStoriesPlayer
          wishes={videoWishes}
          initialIndex={activeStoryIndex}
          coupleOrHost={event?.coupleOrHost || event?.title || 'Pengantin'}
          onClose={() => setShowStoriesPlayer(false)}
        />
      )}
    </div>
  );
}

