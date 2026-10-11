'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Camera, Tv, Printer, Download, Share2, Eye, EyeOff, Trash2, Sliders, Check, RefreshCw, LogOut, ArrowRight, AlertCircle, ChevronDown, Mic, Volume2, Layers, Lock, CheckCircle2, MessageSquare, X, Heart } from 'lucide-react';
import { EventData, PhotoRecord, UserAccount, FilmPresetId, EventPackageTier, PACKAGE_TIERS } from '@/lib/types';
import { getClientSession, clearClientSession, DEMO_USERS } from '@/lib/auth';
import { FILM_PRESETS } from '@/lib/filters';
import { FrameId, FRAME_TEMPLATES } from '@/lib/frames';
import FrameCustomizer from '@/components/FrameCustomizer';
import ConfirmModal from '@/components/ConfirmModal';
import SkeletonLoader from '@/components/SkeletonLoader';
import { toast } from 'sonner';
import JSZip from 'jszip';

interface VoiceNoteRecord {
  id: string;
  eventId: string;
  guestName: string;
  audioUrl: string;
  duration: number;
  timestamp: string;
}

export default function BrideDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserAccount | null>(null);
  const [events, setEvents] = useState<EventData[]>([]);
  const [event, setEvent] = useState<EventData | null>(null);
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNoteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'photos' | 'settings'>('photos');
  const [gallerySubTab, setGallerySubTab] = useState<'photos' | 'voices'>('photos');
  const [filterTab, setFilterTab] = useState<'all' | 'visible' | 'hidden' | 'wishes'>('all');
  const [activePhoto, setActivePhoto] = useState<PhotoRecord | null>(null);
  const [copied, setCopied] = useState(false);

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

  // Settings State
  const [shotsPerGuest, setShotsPerGuest] = useState(20);
  const [revealMode, setRevealMode] = useState<'instant' | 'delayed'>('instant');
  const [revealTime, setRevealTime] = useState('');
  const [preset, setPreset] = useState<FilmPresetId>('portra');
  const [allowedPresets, setAllowedPresets] = useState<FilmPresetId[]>(['portra']);
  const [allowGuestPresetSwitch, setAllowGuestPresetSwitch] = useState(false);
  const [packageTier, setPackageTier] = useState<EventPackageTier>('wedding');
  const [frameId, setFrameId] = useState<FrameId>('minimal-gold');
  const [customFrameUrl, setCustomFrameUrl] = useState('');
  const [frameText, setFrameText] = useState('');
  const [allowGuestFrameToggle, setAllowGuestFrameToggle] = useState(true);
  const [allowVoiceNote, setAllowVoiceNote] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Real ZIP state
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState('');

  useEffect(() => {
    const current = getClientSession();
    if (!current || current.role !== 'host') {
      router.push('/login');
      return;
    }
    setUser(current);
    fetchData(current);
  }, []);

  const fetchData = async (currentUser?: UserAccount) => {
    try {
      setLoading(true);
      const email = currentUser?.email || user?.email || 'pengantin@sudutbingkai.id';
      const resEvents = await fetch(`/api/events?hostEmail=${encodeURIComponent(email)}`);
      const dataEvents = await resEvents.json();
      let selected: EventData | null = null;
      if (dataEvents.success && dataEvents.events && dataEvents.events.length > 0) {
        selected = dataEvents.events[0];
      } else {
        const fallbackRes = await fetch('/api/events?id=wedding-sarah-dimas');
        const fallbackData = await fallbackRes.json();
        if (fallbackData.success && fallbackData.event) {
          selected = fallbackData.event;
        }
      }

      if (selected) {
        setEvents([selected]);
        setEvent(selected);
        setShotsPerGuest(selected.shotsPerGuest || 20);
        setRevealMode(selected.revealMode || 'instant');
        setRevealTime(selected.revealTime || '');
        setPreset(selected.preset || 'portra');
        setAllowedPresets(selected.allowedPresets && selected.allowedPresets.length > 0 ? selected.allowedPresets : [selected.preset || 'portra']);
        setAllowGuestPresetSwitch(selected.allowGuestPresetSwitch || false);
        setPackageTier((selected.packageTier && PACKAGE_TIERS[selected.packageTier]) ? selected.packageTier : 'wedding');
        setFrameId(selected.frameId || 'minimal-gold');
        setCustomFrameUrl(selected.customFrameUrl || '');
        setFrameText(selected.frameText || '');
        setAllowGuestFrameToggle(selected.allowGuestFrameToggle !== false);
        setAllowVoiceNote(selected.allowVoiceNote !== false);

        // Fetch all photos including hidden for host moderation
        const resPhotos = await fetch(`/api/photos?eventId=${selected.id}&includeHidden=true`);
        const dataPhotos = await resPhotos.json();
        if (dataPhotos.success) {
          setPhotos(dataPhotos.photos);
        }

        // Fetch voice notes
        try {
          const resVoices = await fetch(`/api/voice-notes?eventId=${selected.id}`);
          const dataVoices = await resVoices.json();
          if (dataVoices.success && dataVoices.voiceNotes) {
            setVoiceNotes(dataVoices.voiceNotes);
          }
        } catch (vErr) {
          console.warn('Gagal memuat pesan suara:', vErr);
        }
      }
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };


  const handleLogout = () => {
    clearClientSession();
    router.push('/login');
  };

  const copyGuestLink = () => {
    if (!event) return;
    const url = `${window.location.origin}/cam/${event.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const toggleHidePhoto = async (photoId: string, currentHidden: boolean) => {
    // Optimistic UI update
    setPhotos(prev => prev.map(p => {
      if (p.id === photoId) {
        return { ...p, isHidden: !currentHidden };
      }
      return p;
    }));

    try {
      await fetch('/api/photos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: photoId, isHidden: !currentHidden })
      });
    } catch (err) {
      console.error('Gagal memperbarui status foto:', err);
    }
  };

  const handleDeletePhoto = (photoId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Foto Permanen?',
      description: 'Foto ini akan dihapus dari album dan tidak dapat dipulihkan kembali.',
      confirmText: 'Hapus Foto',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setPhotos(prev => prev.filter(p => p.id !== photoId));
        if (activePhoto?.id === photoId) setActivePhoto(null);
        toast.success('Foto berhasil dihapus.');
        try {
          await fetch(`/api/photos?id=${photoId}`, { method: 'DELETE' });
        } catch (err) {
          console.error('Gagal menghapus foto:', err);
        }
      }
    });
  };

  const downloadAllPhotosAsZip = async () => {
    if (photos.length === 0) {
      toast.info('Belum ada foto yang diambil oleh tamu.');
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
      a.download = `sudutbingkai-${event?.id || 'wedding'}-semua-foto.zip`;
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

  const handleDeleteVoiceNote = (noteId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Pesan Suara?',
      description: 'Pesan suara dari tamu ini akan dihapus dari arsip kenangan Anda.',
      confirmText: 'Hapus Suara',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setVoiceNotes(prev => prev.filter(n => n.id !== noteId));
        toast.success('Pesan suara berhasil dihapus.');
        try {
          await fetch(`/api/voice-notes?id=${noteId}`, { method: 'DELETE' });
        } catch (err) {
          console.error('Gagal menghapus pesan suara:', err);
        }
      }
    });
  };

  const handleSaveSettings = async () => {
    if (!event) return;
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: event.id,
          shotsPerGuest,
          revealMode,
          revealTime: revealMode === 'delayed' ? revealTime : undefined,
          preset,
          allowedPresets,
          allowGuestPresetSwitch,
          packageTier,
          frameId,
          customFrameUrl: customFrameUrl || undefined,
          frameText,
          allowGuestFrameToggle,
          allowVoiceNote
        })
      });
      const data = await res.json();
      if (data.success && data.event) {
        setEvent(data.event);
        setSaveSuccess(true);
        toast.success('Pengaturan album berhasil disimpan!');
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        toast.error('Gagal menyimpan: ' + (data.error || 'Terjadi kesalahan'));
      }
    } catch (err: unknown) {
      toast.error('Error menyimpan pengaturan: ' + (err as Error).message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const filteredPhotos = photos.filter(p => {
    if (filterTab === 'visible') return !p.isHidden;
    if (filterTab === 'hidden') return !!p.isHidden;
    if (filterTab === 'wishes') return !!p.caption && p.caption.trim().length > 0;
    return true;
  });

  if (loading) {
    return <SkeletonLoader title="Memuat Dashboard Pengantin..." subtitle="Menyiapkan rol film dan ringkasan foto tamu" />;
  }

  const presetInfo = event ? FILM_PRESETS[event.preset] || FILM_PRESETS.portra : FILM_PRESETS.portra;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FBFBFA', color: '#1D1D1F' }}>
      {/* Top Navigation */}
      <header className="glass-nav" style={{ padding: 'calc(12px + env(safe-area-inset-top, 0px)) 20px 12px', borderBottom: '1px solid rgba(0, 0, 0, 0.06)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              <img 
                src="/sudut-bingkai-logo.png" 
                alt="Sudut Bingkai" 
                style={{ height: '32px', width: 'auto', objectFit: 'contain', display: 'block' }} 
              />
            </Link>
            <span style={{ color: 'rgba(0,0,0,0.15)' }}>/</span>
            <span className="font-mono-film" style={{ color: '#C27803', fontSize: '10.5px' }}>
              DASHBOARD PENGANTIN
            </span>
          </div>

          {event && (
            <div className="desktop-only" style={{
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(194, 120, 3, 0.08)',
              border: '1px solid rgba(194, 120, 3, 0.25)',
              padding: '5px 14px',
              borderRadius: '999px',
              fontSize: '12px',
              color: '#C27803',
              fontWeight: 600
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C27803' }} />
              <span>{event.title}</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right' }} className="desktop-only">
              <strong style={{ fontSize: '13.5px', color: '#1D1D1F', display: 'block' }}>{user?.name}</strong>
              <span style={{ fontSize: '11.5px', color: '#86868B' }}>{user?.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="glass-pill"
              style={{ padding: '8px 14px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            >
              <LogOut size={13} />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Event Quick Overview Card */}
        <div className="glass-card form-section-card" style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2ECC71' }} />
                <span className="font-mono-film" style={{ color: '#C27803', fontSize: '11px' }}>
                  ACARA AKTIF
                </span>
              </div>
              <h1 className="font-display-serif" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.2rem)', fontWeight: 700, color: '#1D1D1F', marginBottom: '6px' }}>
                {event?.title || 'Album Pernikahan'}
              </h1>
              <p style={{ color: '#515154', fontSize: '14px' }}>
                {event?.coupleOrHost} {event?.location && `• ${event.location}`}
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', width: '100%', maxWidth: '560px' }}>
              <button
                onClick={copyGuestLink}
                className="glass-pill"
                style={{ padding: '9px 12px', fontSize: '12.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
              >
                {copied ? <Check size={14} color="#C27803" /> : <Share2 size={14} />}
                <span>{copied ? 'Tersalin' : 'Salin Link'}</span>
              </button>

              <Link
                href={`/event/${event?.id}/print`}
                className="glass-pill"
                style={{ padding: '9px 12px', fontSize: '12.5px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Printer size={14} />
                <span>Cetak QR Meja Tamu</span>
              </Link>

              <Link
                href={`/cam/${event?.id}`}
                className="btn-apple-black"
                style={{ padding: '9px 12px', fontSize: '12.5px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Camera size={14} />
                <span>Uji Kamera</span>
              </Link>

              <Link
                href={`/event/${event?.id}/live`}
                className="glass-pill"
                style={{ padding: '9px 12px', fontSize: '12.5px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Tv size={14} />
                <span>Layar TV</span>
              </Link>
            </div>
          </div>

          {/* Metrics Bar */}
          <div className="responsive-metrics-grid" style={{ marginTop: '24px', borderTop: '1px solid rgba(0, 0, 0, 0.07)', paddingTop: '20px' }}>
            <div>
              <span className="font-mono-film" style={{ color: '#86868B', display: 'block', marginBottom: '4px' }}>TOTAL FOTO MASUK</span>
              <strong style={{ fontSize: '20px', color: '#1D1D1F' }}>{photos.length} Momen</strong>
            </div>

            <div>
              <span className="font-mono-film" style={{ color: '#86868B', display: 'block', marginBottom: '4px' }}>FILTER ANALOG</span>
              <strong style={{ fontSize: '20px', color: '#C27803' }}>{presetInfo.name}</strong>
            </div>

            <div>
              <span className="font-mono-film" style={{ color: '#86868B', display: 'block', marginBottom: '4px' }}>BINGKAI AKTIF</span>
              <strong style={{ fontSize: '20px', color: '#1D1D1F' }}>
                {FRAME_TEMPLATES[frameId || 'minimal-gold']?.name?.split(' ')[0] || 'Minimal'}
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
              <span className="font-mono-film" style={{ color: '#86868B', display: 'block', marginBottom: '4px' }}>STATUS TAMPIL</span>
              <strong style={{ fontSize: '20px', color: '#1D1D1F' }}>
                {event?.revealMode === 'instant' ? 'Langsung' : 'Cuci Roll'}
              </strong>
            </div>

            <div>
              <span className="font-mono-film" style={{ color: '#86868B', display: 'block', marginBottom: '4px' }}>MASA SIMPAN DATA</span>
              <strong style={{ fontSize: '20px', color: '#27AE60' }}>
                {PACKAGE_TIERS[packageTier]?.retentionLabel || '60 Hari (2 Bulan)'}
              </strong>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('photos')}
              className="glass-pill"
              style={{
                background: activeTab === 'photos' ? '#1D1D1F' : 'rgba(255, 255, 255, 0.7)',
                color: activeTab === 'photos' ? '#FFFFFF' : '#1D1D1F',
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <span className="desktop-only">Galeri & Moderasi ({photos.length} Foto, {voiceNotes.length} Suara)</span>
              <span className="mobile-only">Galeri ({photos.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className="glass-pill"
              style={{
                background: activeTab === 'settings' ? '#1D1D1F' : 'rgba(255, 255, 255, 0.7)',
                color: activeTab === 'settings' ? '#FFFFFF' : '#1D1D1F',
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <span className="desktop-only">Pengaturan & Bingkai</span>
              <span className="mobile-only">Pengaturan</span>
            </button>
          </div>

          {activeTab === 'photos' && gallerySubTab === 'photos' && (
            <button
              onClick={downloadAllPhotosAsZip}
              disabled={isZipping || photos.length === 0}
              className="btn-apple-black"
              style={{ padding: '8px 16px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px', cursor: isZipping ? 'wait' : 'pointer' }}
            >
              {isZipping ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={13} />}
              <span className="desktop-only">{isZipping ? zipProgress : 'Unduh Semua Foto (.ZIP)'}</span>
              <span className="mobile-only">{isZipping ? zipProgress : 'Unduh ZIP'}</span>
            </button>
          )}
        </div>

        {/* TAB 1: GALERI & MODERASI */}
        {activeTab === 'photos' && (
          <div>
            {/* Gallery Sub-Tabs: Photos vs Voice Notes */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '12px' }}>
              <button
                onClick={() => setGallerySubTab('photos')}
                className="glass-pill"
                style={{
                  padding: '7px 16px',
                  borderRadius: '9999px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: gallerySubTab === 'photos' ? '#1D1D1F' : 'rgba(255,255,255,0.7)',
                  color: gallerySubTab === 'photos' ? '#FFFFFF' : '#1D1D1F'
                }}
              >
                📸 Momen Foto ({photos.length})
              </button>

              <button
                onClick={() => setGallerySubTab('voices')}
                className="glass-pill"
                style={{
                  padding: '7px 16px',
                  borderRadius: '9999px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: gallerySubTab === 'voices' ? '#C27803' : 'rgba(255,255,255,0.7)',
                  color: gallerySubTab === 'voices' ? '#FFFFFF' : '#1D1D1F',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Mic size={13} />
                <span>Pesan Suara Tamu ({voiceNotes.length})</span>
              </button>
            </div>

            {/* Photos Sub-View */}
            {gallerySubTab === 'photos' && (
              <div>
                {/* Filter Pills */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setFilterTab('all')}
                    className="glass-pill"
                    style={{
                      padding: '8px 16px',
                      borderRadius: '9999px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: filterTab === 'all' ? 'rgba(20, 20, 22, 0.9)' : 'rgba(255,255,255,0.75)',
                      color: filterTab === 'all' ? '#FFFFFF' : '#515154'
                    }}
                  >
                    Semua ({photos.length})
                  </button>

                  <button
                    onClick={() => setFilterTab('wishes')}
                    className="glass-pill"
                    style={{
                      padding: '8px 16px',
                      borderRadius: '9999px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: filterTab === 'wishes' ? 'rgba(20, 20, 22, 0.9)' : 'rgba(255,255,255,0.75)',
                      color: filterTab === 'wishes' ? '#FFFFFF' : '#C27803'
                    }}
                  >
                    💬 Ada Ucapan ({photos.filter(p => !!p.caption && p.caption.trim().length > 0).length})
                  </button>

                  <button
                    onClick={() => setFilterTab('visible')}
                    className="glass-pill"
                    style={{
                      padding: '8px 16px',
                      borderRadius: '9999px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: filterTab === 'visible' ? 'rgba(20, 20, 22, 0.9)' : 'rgba(255,255,255,0.75)',
                      color: filterTab === 'visible' ? '#FFFFFF' : '#515154'
                    }}
                  >
                    Tampil ({photos.filter(p => !p.isHidden).length})
                  </button>

                  <button
                    onClick={() => setFilterTab('hidden')}
                    className="glass-pill"
                    style={{
                      padding: '8px 16px',
                      borderRadius: '9999px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: filterTab === 'hidden' ? 'rgba(20, 20, 22, 0.9)' : 'rgba(255,255,255,0.75)',
                      color: filterTab === 'hidden' ? '#FFFFFF' : '#515154'
                    }}
                  >
                    Disembunyikan ({photos.filter(p => p.isHidden).length})
                  </button>
                </div>

                {filteredPhotos.length === 0 ? (
                  <div className="glass-card" style={{ padding: '64px 24px', textAlign: 'center', borderRadius: '24px' }}>
                    <Camera size={44} style={{ color: '#86868B', margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '6px' }}>Tidak ada foto dalam kategori ini</h3>
                    <p style={{ color: '#6E6E73', fontSize: '13.5px' }}>
                      Buka kamera tamu atau scan kartu meja untuk mengambil foto baru.
                    </p>
                  </div>
                ) : (
                  <div className="mobile-photo-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
                    {filteredPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="glass-card"
                        style={{
                          borderRadius: '24px',
                          padding: '12px 12px 16px 12px',
                          opacity: photo.isHidden ? 0.65 : 1,
                          position: 'relative'
                        }}
                      >
                        <div
                          style={{ aspectRatio: '3/4', borderRadius: '18px', overflow: 'hidden', background: '#000', marginBottom: '12px', position: 'relative', cursor: 'pointer' }}
                          onClick={() => setActivePhoto(photo)}
                          title="Klik untuk memperbesar & membaca ucapan"
                        >
                          <img src={photo.imageData} alt={photo.guestName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          {photo.isHidden && (
                            <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.75)', color: '#fff', fontSize: '10px', padding: '3px 8px', borderRadius: '9999px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <EyeOff size={10} />
                              <span>Hidden</span>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px', flexWrap: 'wrap', gap: '6px' }}>
                          <div
                            style={{ minWidth: 0, flex: '1 1 65px', cursor: 'pointer' }}
                            onClick={() => setActivePhoto(photo)}
                          >
                            <strong style={{ fontSize: '12px', color: '#1D1D1F', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{photo.guestName}</strong>
                            <span className="font-mono-film" style={{ fontSize: '9.5px', color: '#86868B' }}>#{photo.shotNumber}</span>
                          </div>

                          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                            <button
                              onClick={() => toggleHidePhoto(photo.id, !!photo.isHidden)}
                              className="glass-pill"
                              style={{
                                padding: '5px 8px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                color: photo.isHidden ? '#27AE60' : '#E74C3C',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title={photo.isHidden ? 'Tampilkan kembali di layar' : 'Sembunyikan'}
                            >
                              {photo.isHidden ? <Eye size={12} /> : <EyeOff size={12} />}
                              <span className="desktop-only">{photo.isHidden ? 'Tampil' : 'Hide'}</span>
                            </button>

                            <button
                              onClick={() => handleDeletePhoto(photo.id)}
                              className="glass-pill"
                              style={{ padding: '5px 8px', fontSize: '11px', cursor: 'pointer', color: '#86868B' }}
                              title="Hapus foto permanen"
                            >
                              <Trash2 size={12} />
                            </button>

                            <a
                              href={photo.imageData}
                              download={`foto-${photo.guestName}.jpg`}
                              className="glass-pill"
                              style={{ padding: '5px 8px', fontSize: '11px', textDecoration: 'none', color: '#1D1D1F', display: 'flex', alignItems: 'center' }}
                              title="Unduh foto"
                            >
                              <Download size={12} />
                            </a>
                          </div>
                        </div>

                        {/* Guest Wish / Caption Badge */}
                        {photo.caption && (
                          <div
                            onClick={() => setActivePhoto(photo)}
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
                              gap: '6px',
                              cursor: 'pointer'
                            }}
                            title="Klik untuk melihat foto & ucapan lengkap"
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
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Voice Notes Sub-View */}
            {gallerySubTab === 'voices' && (
              <div>
                {voiceNotes.length === 0 ? (
                  <div className="glass-card" style={{ padding: '64px 24px', textAlign: 'center', borderRadius: '24px' }}>
                    <Mic size={44} style={{ color: '#86868B', margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '6px' }}>Belum ada pesan suara yang terekam</h3>
                    <p style={{ color: '#6E6E73', fontSize: '13.5px', maxWidth: '440px', margin: '0 auto' }}>
                      Saat kuota foto tamu habis, mereka akan diberikan opsi untuk merekam ucapan suara penutup berdurasi 15 detik untuk Anda.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                    {voiceNotes.map((note) => (
                      <div
                        key={note.id}
                        className="glass-card"
                        style={{
                          borderRadius: '24px',
                          padding: '20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '14px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(194, 120, 3, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Volume2 size={18} color="#C27803" />
                            </div>
                            <div>
                              <strong style={{ fontSize: '14px', color: '#1D1D1F', display: 'block' }}>{note.guestName}</strong>
                              <span style={{ fontSize: '11px', color: '#86868B' }}>
                                {new Date(note.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • {note.duration ? `${note.duration} dtk` : '15 dtk'}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '6px' }}>
                            <a
                              href={note.audioUrl}
                              download={`suara-${note.guestName}.webm`}
                              className="glass-pill"
                              style={{ padding: '6px 10px', fontSize: '11px', textDecoration: 'none', color: '#1D1D1F' }}
                              title="Unduh rekaman suara"
                            >
                              <Download size={12} />
                            </a>

                            <button
                              onClick={() => handleDeleteVoiceNote(note.id)}
                              className="glass-pill"
                              style={{ padding: '6px 10px', fontSize: '11px', cursor: 'pointer', color: '#E74C3C' }}
                              title="Hapus rekaman suara"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Audio Player */}
                        <audio
                          controls
                          src={note.audioUrl}
                          style={{ width: '100%', height: '40px', borderRadius: '12px' }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PENGATURAN ACARA & BINGKAI */}
        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Section A: Frame Customizer */}
            <div className="glass-card form-section-card">
              <div style={{ marginBottom: '24px' }}>
                <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '6px' }}>
                  KUSTOMISASI BINGKAI FOTO
                </span>
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1D1D1F', marginBottom: '6px' }}>
                  Pilih Template Bingkai & Desain Sendiri
                </h2>
                <p style={{ color: '#6E6E73', fontSize: '13.5px' }}>
                  Pilih dari 10 desain estetis, foto asli RAW, atau unggah PNG karya sendiri untuk kamera tamu.
                </p>
              </div>

              <FrameCustomizer
                initialFrameId={frameId}
                initialCustomFrameUrl={customFrameUrl}
                initialCoupleName={event?.coupleOrHost || 'Sarah & Dimas'}
                initialEventDate={event?.eventDate || ''}
                initialTagline="The Beginning of Forever"
                initialAllowGuestToggle={allowGuestFrameToggle}
                onUpdate={({ frameId: fId, customFrameUrl: cUrl, coupleName: cName, eventDate: eDate, tagline: tLine, allowGuestFrameToggle: aToggle }) => {
                  setFrameId(fId);
                  setCustomFrameUrl(cUrl || '');
                  setFrameText(`${cName} • ${eDate} • ${tLine}`);
                  setAllowGuestFrameToggle(aToggle);
                }}
              />
            </div>

            {/* Section B: Film Presets & Guest Filter Permission */}
            <div className="glass-card form-section-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '14px' }}>
                <div>
                  <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '6px' }}>
                    EMULASI FILM ANALOG (8 PRESET)
                  </span>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1D1D1F', marginBottom: '4px' }}>
                    Karakter Warna & Izin Filter Tamu
                  </h2>
                  <p style={{ color: '#6E6E73', fontSize: '13.5px' }}>
                    Pilih tone film utama khas acara Anda, dan tentukan apakah tamu diizinkan berganti film di ponsel mereka.
                  </p>
                </div>

                {/* Package Tier Badge */}
                <div style={{
                  padding: '8px 16px',
                  borderRadius: '16px',
                  background: 'rgba(194, 120, 3, 0.08)',
                  border: '1px solid rgba(194, 120, 3, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Lock size={14} color="#C27803" />
                  <div>
                    <strong style={{ fontSize: '12px', color: '#1D1D1F', display: 'block' }}>
                      Paket {PACKAGE_TIERS[packageTier]?.name || 'Wedding'}
                    </strong>
                    <span style={{ fontSize: '10.5px', color: '#86868B' }}>
                      {PACKAGE_TIERS[packageTier]?.guestsLabel || 'Hingga 300 Tamu'} • {PACKAGE_TIERS[packageTier]?.shotsPerGuest || 25} Foto/Tamu • {PACKAGE_TIERS[packageTier]?.retentionLabel || '60 Hari'} • {PACKAGE_TIERS[packageTier]?.storageCapacity || '20 GB'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signature Film Selector */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '12px' }}>
                  Filter Utama Acara (Signature Film)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '12px' }}>
                  {Object.entries(FILM_PRESETS).map(([id, p]) => {
                    const isSelected = preset === id;
                    return (
                      <div
                        key={id}
                        onClick={() => {
                          setPreset(id as FilmPresetId);
                          if (!allowedPresets.includes(id as FilmPresetId)) {
                            setAllowedPresets([...allowedPresets, id as FilmPresetId]);
                          }
                        }}
                        style={{
                          padding: '12px',
                          borderRadius: '16px',
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(194, 120, 3, 0.08)' : 'rgba(255,255,255,0.7)',
                          border: isSelected ? '2px solid #C27803' : '1px solid rgba(0,0,0,0.08)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {/* Visual Photo Preview */}
                        <div style={{
                          width: '100%',
                          aspectRatio: '16/10',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          position: 'relative',
                          marginBottom: '8px',
                          background: '#1D1D1F'
                        }}>
                          <img
                            src="/samples/dummy-couple.jpg"
                            alt={p.name}
                            className={`film-${id}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <span style={{ position: 'absolute', bottom: '4px', right: '6px', color: '#ff9900', fontFamily: 'var(--font-mono)', fontSize: '8px', fontWeight: 'bold' }}>
                            '26 10 11
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: p.accentColor || '#C27803' }} />
                            <strong style={{ fontSize: '13px', color: '#1D1D1F' }}>{p.name}</strong>
                          </div>
                          {isSelected && <Check size={14} color="#C27803" />}
                        </div>
                        <span style={{ fontSize: '11px', color: '#86868B', display: 'block', lineHeight: 1.35 }}>
                          {p.description}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Guest Switching Toggle & Allowed List */}
              <div style={{ padding: '18px', borderRadius: '16px', background: 'rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <strong style={{ fontSize: '13.5px', color: '#1D1D1F', display: 'block' }}>
                      Izinkan Tamu Ganti Filter Film di Kamera
                    </strong>
                    <span style={{ fontSize: '11.5px', color: '#86868B' }}>
                      Jika aktif, tamu dapat memilih filter analog sendiri di ponsel saat memotret.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowGuestPresetSwitch}
                    onChange={(e) => setAllowGuestPresetSwitch(e.target.checked)}
                    style={{ width: '20px', height: '20px', accentColor: '#C27803', cursor: 'pointer' }}
                  />
                </div>

                {allowGuestPresetSwitch && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#1D1D1F' }}>
                        Filter Yang Tersedia Untuk Tamu:
                      </span>
                      <span style={{ fontSize: '11px', color: '#86868B', fontFamily: 'var(--font-mono)' }}>
                        {allowedPresets.length} / {PACKAGE_TIERS[packageTier]?.maxPresets || 4} Terpilih (Sesuai Kuota Paket)
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                      {Object.entries(FILM_PRESETS).map(([id, p]) => {
                        const pid = id as FilmPresetId;
                        const isAllowed = allowedPresets.includes(pid);
                        const isPrimary = preset === pid;
                        return (
                          <label
                            key={id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 12px',
                              borderRadius: '10px',
                              background: isAllowed ? 'rgba(194, 120, 3, 0.08)' : 'rgba(255,255,255,0.7)',
                              border: isAllowed ? '1px solid rgba(194, 120, 3, 0.4)' : '1px solid rgba(0,0,0,0.06)',
                              cursor: isPrimary ? 'default' : 'pointer',
                              fontSize: '12px',
                              color: '#1D1D1F'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isAllowed}
                              disabled={isPrimary}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const maxP = PACKAGE_TIERS[packageTier]?.maxPresets || 4;
                                  if (allowedPresets.length >= maxP) {
                                    toast.error(`Batas paket ${PACKAGE_TIERS[packageTier]?.name || ''} maksimal ${maxP} filter.`);
                                    return;
                                  }
                                  setAllowedPresets([...allowedPresets, pid]);
                                } else {
                                  setAllowedPresets(allowedPresets.filter(x => x !== pid));
                                }
                              }}
                              style={{ accentColor: '#C27803' }}
                            />
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: p.accentColor || '#C27803' }} />
                            <span style={{ fontWeight: isAllowed ? 600 : 400 }}>{p.name.replace(/^(Kodak|Fujifilm|Ilford|Agfa|CineStill)\s+/i, '')}</span>
                            {isPrimary && <span style={{ fontSize: '9px', color: '#C27803', marginLeft: 'auto' }}>(Utama)</span>}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section C: Camera Rules & Reveal Mode */}
            <div className="glass-card form-section-card" style={{ maxWidth: '720px' }}>
              <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '6px' }}>
                ATURAN KAMERA & PENGUNGKAPAN
              </span>
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Pengaturan Kuota & Sensasi Cuci Roll</h2>
              <p style={{ color: '#6E6E73', fontSize: '14px', marginBottom: '28px' }}>
                Atur pembatasan jepretan, pesan suara tamu, dan waktu serentak foto dibuka.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Shots Per Guest */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B' }}>
                      Jatah Foto Per Tamu
                    </label>
                    <strong style={{ color: '#C27803', fontSize: '14px' }}>{shotsPerGuest} Jepretan</strong>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={50}
                    step={5}
                    value={shotsPerGuest}
                    onChange={(e) => setShotsPerGuest(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#C27803', cursor: 'pointer' }}
                  />
                </div>

                {/* Reveal Mode */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '8px' }}>
                    Waktu Buka Album (Reveal Mode)
                  </label>
                  <div className="responsive-two-col">
                    <div
                      onClick={() => setRevealMode('instant')}
                      style={{
                        padding: '16px',
                        borderRadius: '16px',
                        cursor: 'pointer',
                        background: revealMode === 'instant' ? 'rgba(194, 120, 3, 0.1)' : 'rgba(255,255,255,0.7)',
                        border: revealMode === 'instant' ? '2px solid #C27803' : '1px solid rgba(0,0,0,0.08)'
                      }}
                    >
                      <strong style={{ fontSize: '14px', color: '#1D1D1F', display: 'block', marginBottom: '4px' }}>Langsung Terbuka</strong>
                      <span style={{ fontSize: '12px', color: '#6E6E73' }}>Foto langsung muncul di album begitu dijepret</span>
                    </div>

                    <div
                      onClick={() => setRevealMode('delayed')}
                      style={{
                        padding: '16px',
                        borderRadius: '16px',
                        cursor: 'pointer',
                        background: revealMode === 'delayed' ? 'rgba(194, 120, 3, 0.1)' : 'rgba(255,255,255,0.7)',
                        border: revealMode === 'delayed' ? '2px solid #C27803' : '1px solid rgba(0,0,0,0.08)'
                      }}
                    >
                      <strong style={{ fontSize: '14px', color: '#1D1D1F', display: 'block', marginBottom: '4px' }}>Sensasi Cuci Roll</strong>
                      <span style={{ fontSize: '12px', color: '#6E6E73' }}>Foto dirahasiakan & diungkapkan serentak</span>
                    </div>
                  </div>

                  {revealMode === 'delayed' && (
                    <div style={{ marginTop: '14px', padding: '16px', background: 'rgba(194, 120, 3, 0.06)', borderRadius: '14px', border: '1px solid rgba(194, 120, 3, 0.2)' }}>
                      <label style={{ display: 'block', fontSize: '11.5px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#C27803', marginBottom: '8px' }}>
                        Jadwal Pengungkapan Serentak (Hitung Mundur)
                      </label>

                      {/* Quick presets */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                        {[
                          { label: 'Malam Ini 22:00', getVal: () => { const d = new Date(); d.setHours(22, 0, 0, 0); return d; } },
                          { label: 'Tengah Malam 23:59', getVal: () => { const d = new Date(); d.setHours(23, 59, 0, 0); return d; } },
                          { label: 'Besok Pagi 09:00', getVal: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; } },
                          { label: '+24 Jam', getVal: () => new Date(Date.now() + 24 * 3600 * 1000) }
                        ].map((q, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setRevealTime(q.getVal().toISOString())}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '8px',
                              background: '#FFFFFF',
                              border: '1px solid rgba(194, 120, 3, 0.3)',
                              color: '#C27803',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            {q.label}
                          </button>
                        ))}
                      </div>

                      <input
                        type="datetime-local"
                        value={revealTime ? new Date(revealTime).toISOString().slice(0, 16) : ''}
                        onChange={(e) => setRevealTime(e.target.value ? new Date(e.target.value).toISOString() : '')}
                        className="glass-input"
                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '8px', marginBottom: '10px' }}
                      />

                      {/* Instant Unlock Button right here */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#FFFFFF', borderRadius: '10px', border: '1px solid rgba(194, 120, 3, 0.2)' }}>
                        <div>
                          <strong style={{ fontSize: '12px', color: '#1D1D1F', display: 'block' }}>Mau Buka Sekarang Lebih Awal?</strong>
                          <span style={{ fontSize: '10.5px', color: '#86868B' }}>Foto tamu langsung terungkap tanpa menunggu hitung mundur.</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              title: 'Buka Album Sekarang?',
                              description: 'Semua foto tamu akan langsung dapat dilihat dan diunduh di galeri acara tanpa menunggu jadwal cuci roll.',
                              confirmText: 'Buka Sekarang',
                              variant: 'warning',
                              onConfirm: async () => {
                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                setRevealMode('instant');
                                setRevealTime('');
                                setIsSavingSettings(true);
                                try {
                                  const res = await fetch('/api/events', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ id: event?.id, revealMode: 'instant', revealTime: '' })
                                  });
                                  const d = await res.json();
                                  if (d.success && d.event) {
                                    setEvent(d.event);
                                    setSaveSuccess(true);
                                    toast.success('Album langsung dibuka untuk seluruh tamu!');
                                    setTimeout(() => setSaveSuccess(false), 3000);
                                  }
                                } catch (e) {
                                  toast.error('Gagal membuka album.');
                                } finally {
                                  setIsSavingSettings(false);
                                }
                              }
                            });
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: '#C27803',
                            color: '#FFFFFF',
                            fontSize: '11px',
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          🔓 Buka Album Sekarang
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Voice Note Permission */}
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '14px',
                    background: 'rgba(0,0,0,0.03)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '13px', color: '#1D1D1F', display: 'block' }}>
                      Pesan Suara Penutup Tamu (Voice Note 15 Detik)
                    </strong>
                    <span style={{ fontSize: '11.5px', color: '#86868B' }}>
                      Saat kuota foto tamu habis, izinkan mereka merekam ucapan suara penutup untuk Anda.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowVoiceNote}
                    onChange={(e) => setAllowVoiceNote(e.target.checked)}
                    style={{ width: '20px', height: '20px', accentColor: '#C27803', cursor: 'pointer' }}
                  />
                </div>

                <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <button 
                    onClick={handleSaveSettings} 
                    disabled={isSavingSettings}
                    className="btn-apple-black" 
                    style={{ padding: '12px 28px', fontSize: '14px', cursor: isSavingSettings ? 'wait' : 'pointer' }}
                  >
                    <span>{isSavingSettings ? 'Menyimpan Pengaturan...' : saveSuccess ? '✓ Pengaturan & Bingkai Disimpan!' : 'Simpan Semua Perubahan'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lightbox / Detail Photo Modal */}
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
              padding: '20px'
            }}
            onClick={() => setActivePhoto(null)}
          >
            <div
              className="glass-card"
              style={{
                background: '#FFFFFF',
                maxWidth: '520px',
                width: '100%',
                borderRadius: '24px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                maxHeight: '90vh',
                overflowY: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '15px', color: '#1D1D1F', display: 'block' }}>{activePhoto.guestName}</strong>
                  <span className="font-mono-film" style={{ fontSize: '11px', color: '#86868B' }}>
                    Jepretan #{activePhoto.shotNumber} • {new Date(activePhoto.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <button
                  onClick={() => setActivePhoto(null)}
                  className="glass-pill"
                  style={{ padding: '6px 10px', fontSize: '12px', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ borderRadius: '16px', overflow: 'hidden', background: '#000', maxHeight: '55vh', display: 'flex', justifyContent: 'center' }}>
                <img
                  src={activePhoto.imageData}
                  alt={activePhoto.guestName}
                  style={{ maxWidth: '100%', maxHeight: '55vh', objectFit: 'contain' }}
                />
              </div>

              {/* Full Guest Wish Callout */}
              {activePhoto.caption ? (
                <div style={{
                  padding: '12px 14px',
                  borderRadius: '14px',
                  background: 'rgba(194, 120, 3, 0.08)',
                  border: '1px solid rgba(194, 120, 3, 0.25)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}>
                  <span style={{ fontSize: '18px', lineHeight: 1 }}>💬</span>
                  <div>
                    <span className="font-mono-film" style={{ fontSize: '9.5px', color: '#C27803', display: 'block', marginBottom: '3px', letterSpacing: '0.5px' }}>
                      UCAPAN DARI {activePhoto.guestName.toUpperCase()}
                    </span>
                    <p style={{ margin: 0, fontSize: '13.5px', color: '#1D1D1F', fontStyle: 'italic', lineHeight: '1.5', fontWeight: 500 }}>
                      &ldquo;{activePhoto.caption}&rdquo;
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#86868B', fontStyle: 'italic', textAlign: 'center', padding: '4px' }}>
                  (Foto ini tidak disertai ucapan teks)
                </div>
              )}

              {/* Moderation Actions in Lightbox */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', paddingTop: '4px' }}>
                <button
                  onClick={() => {
                    toggleHidePhoto(activePhoto.id, !!activePhoto.isHidden);
                    setActivePhoto(prev => prev ? { ...prev, isHidden: !prev.isHidden } : null);
                  }}
                  className="glass-pill"
                  style={{
                    padding: '10px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    color: activePhoto.isHidden ? '#27AE60' : '#E74C3C',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  {activePhoto.isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                  <span>{activePhoto.isHidden ? 'Tampilkan' : 'Sembunyikan'}</span>
                </button>

                <a
                  href={activePhoto.imageData}
                  download={`foto-${activePhoto.guestName}.jpg`}
                  className="glass-pill"
                  style={{ padding: '10px', fontSize: '12px', textDecoration: 'none', color: '#1D1D1F', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Download size={14} />
                  <span>Unduh</span>
                </a>

                <button
                  onClick={() => handleDeletePhoto(activePhoto.id)}
                  className="glass-pill"
                  style={{ padding: '10px', fontSize: '12px', cursor: 'pointer', color: '#E74C3C', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Trash2 size={14} />
                  <span>Hapus</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

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
