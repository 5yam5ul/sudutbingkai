'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Camera, Tv, Printer, Download, Share2, Eye, EyeOff, Trash2, Sliders, Check, RefreshCw, LogOut, ArrowRight, ArrowLeft, Briefcase, AlertCircle, ChevronDown, Mic, Volume2, Layers, Lock, Unlock, CheckCircle2, MessageSquare, X, Heart, Upload, Video, Film, Play, Link2, Globe, Copy, CreditCard, FileText, BookOpen, Users, Clock, Search } from 'lucide-react';
import { EventData, PhotoRecord, UserAccount, FilmPresetId, EventPackageTier, PACKAGE_TIERS, VideoWishRecord, EventCategoryType, getEventRetentionInfo, resolveEventCategory, getEventCategoryMeta } from '@/lib/types';
import { getClientSession, setClientSession, clearClientSession, authFetch } from '@/lib/auth';
import { formatSafeMediaUrl } from '@/lib/media-url';
import { FILM_PRESETS } from '@/lib/filters';
import { FrameId, FRAME_TEMPLATES } from '@/lib/frames';
import FrameCustomizer from '@/components/FrameCustomizer';
import ConfirmModal from '@/components/ConfirmModal';
import SkeletonLoader from '@/components/SkeletonLoader';
import VideoWishStoriesPlayer from '@/components/VideoWishStoriesPlayer';
import MayarPaymentModal from '@/components/MayarPaymentModal';
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

interface GuestRecord {
  id: string;
  eventId: string;
  guestName: string;
  sessionId: string;
  checkedInAt: string;
  lastActiveAt?: string;
  shotsCount: number;
  hasVoiceNote: boolean;
  hasVideoWish: boolean;
  latestPhotoUrl?: string;
  notes?: string;
}

export default function BrideDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserAccount | null>(null);
  const [events, setEvents] = useState<EventData[]>([]);
  const [event, setEvent] = useState<EventData | null>(null);
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNoteRecord[]>([]);
  const [videoWishes, setVideoWishes] = useState<VideoWishRecord[]>([]);
  const [guests, setGuests] = useState<GuestRecord[]>([]);
  const [guestSearch, setGuestSearch] = useState('');
  const [loadingGuests, setLoadingGuests] = useState(false);
  const [showStoriesPlayer, setShowStoriesPlayer] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'photos' | 'settings' | 'guests'>('photos');
  const [gallerySubTab, setGallerySubTab] = useState<'photos' | 'voices' | 'videos'>('photos');
  const [filterTab, setFilterTab] = useState<'all' | 'visible' | 'hidden' | 'wishes'>('all');
  const [activePhoto, setActivePhoto] = useState<PhotoRecord | null>(null);
  const [copied, setCopied] = useState(false);

  // Pending Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);
  const [pendingPaymentData, setPendingPaymentData] = useState<{
    amount: number;
    title: string;
    description: string;
    isSimulation?: boolean;
  } | null>(null);

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
  const [eventTitle, setEventTitle] = useState('');
  const [coupleOrHost, setCoupleOrHost] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventCategory, setEventCategory] = useState<EventCategoryType>('wedding');
  const [allowGuestFrameToggle, setAllowGuestFrameToggle] = useState(true);
  const [allowVoiceNote, setAllowVoiceNote] = useState(true);
  const [coverUrl, setCoverUrl] = useState<string>('');
  const unsavedCoverUploadRef = React.useRef<string>('');
  const [isUploadingCover, setIsUploadingCover] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [eventSlug, setEventSlug] = useState<string>('');

  // Real ZIP state
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState('');
  const [showCreatedBanner, setShowCreatedBanner] = useState(false);
  const [isHostMismatched, setIsHostMismatched] = useState(false);

  const handleCompletePendingPayment = async () => {
    if (!event) return;
    setIsInitiatingPayment(true);
    try {
      const tierKey = (event.packageTier || 'wedding') as EventPackageTier;
      const tierInfo = PACKAGE_TIERS[tierKey] || PACKAGE_TIERS.wedding;
      const fallbackAmount = parseInt(tierInfo.price.replace(/[^0-9]/g, ''), 10) || 499000;
      const hostUrl = typeof window !== 'undefined' ? window.location.origin : 'https://sudutbingkai.vercel.app';

      const payRes = await authFetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageTier: tierKey,
          name: event.coupleOrHost || event.title,
          email: event.hostEmail || user?.email || 'host@sudutbingkai.id',
          eventId: event.id,
          referralCode: event.referralCodeUsed || undefined,
          redirectUrl: `${hostUrl}/dashboard?eventId=${event.id}&paid=true`,
        }),
      });
      const payData = await payRes.json();
      if (payData.success) {
        if (!payData.isSimulation && payData.paymentUrl && !payData.paymentUrl.startsWith('/')) {
          window.location.href = payData.paymentUrl;
          return;
        }
        setPendingPaymentData({
          amount: payData.amount || fallbackAmount,
          title: `Paket ${tierInfo.name} (${tierInfo.guestsLabel})`,
          description: `Pelunasan Album Digital SudutBingkai: ${event.title}`,
          isSimulation: payData.isSimulation ?? true,
        });
        setPaymentModalOpen(true);
      } else {
        toast.error(payData.message || payData.error || 'Gagal menginisiasi pembayaran.');
      }
    } catch (err: any) {
      toast.error('Gagal menginisiasi pembayaran: ' + (err.message || 'Kesalahan jaringan'));
    } finally {
      setIsInitiatingPayment(false);
    }
  };

  useEffect(() => {
    const current = getClientSession();
    if (!current || (current.role !== 'host' && current.role !== 'vendor' && current.role !== 'admin')) {
      router.push('/login');
      return;
    }
    setUser(current);

    let requestedEventId: string | null = null;
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('created') === 'true') {
        setShowCreatedBanner(true);
      }
      requestedEventId = urlParams.get('eventId');
    }

    fetchData(current, requestedEventId || undefined);
  }, []);

  const handleRestoreHostRole = async () => {
    if (!user) return;
    const restoredUser: UserAccount = {
      ...user,
      role: 'host'
    };
    let signedToken: string | undefined;
    try {
      const res = await authFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'oauth',
          role: 'host',
          email: restoredUser.email,
          name: restoredUser.name
        })
      });
      const data = await res.json();
      if (data.success && (data.token || data.sessionToken)) {
        signedToken = data.token || data.sessionToken;
      }
    } catch {}
    setUser(restoredUser);
    setClientSession(restoredUser, signedToken);
    setIsHostMismatched(false);
    toast.success('Peran akun Anda berhasil dikembalikan sebagai Pengantin / Penyelenggara!');
    fetchData(restoredUser);
  };

  const selectActiveEvent = async (selected: EventData) => {
    setEvent(selected);
    const tierKey = (selected.packageTier && PACKAGE_TIERS[selected.packageTier as EventPackageTier]) ? (selected.packageTier as EventPackageTier) : 'starter';
    const tierConfig = PACKAGE_TIERS[tierKey] || PACKAGE_TIERS.starter;
    const maxAllowedShots = tierConfig.shotsPerGuest || 10;
    const maxAllowedPresets = tierConfig.maxPresets || 1;
    const safeShots = Math.min(selected.shotsPerGuest || maxAllowedShots, maxAllowedShots);
    const safePreset = selected.preset || 'portra';

    setPackageTier(tierKey);
    setShotsPerGuest(safeShots);
    setRevealMode(selected.revealMode || 'instant');
    setRevealTime(selected.revealTime || '');
    setPreset(safePreset);

    // Enforce maxPresets quota on event load
    if (maxAllowedPresets <= 1) {
      setAllowedPresets([safePreset]);
      setAllowGuestPresetSwitch(false);
    } else {
      let safeAllowed = (selected.allowedPresets && selected.allowedPresets.length > 0)
        ? selected.allowedPresets.slice(0, maxAllowedPresets)
        : [safePreset];
      if (!safeAllowed.includes(safePreset)) {
        safeAllowed = [safePreset, ...safeAllowed.slice(0, maxAllowedPresets - 1)];
      }
      setAllowedPresets(safeAllowed);
      setAllowGuestPresetSwitch(selected.allowGuestPresetSwitch || false);
    }
    setFrameId(selected.frameId || 'minimal-gold');
    setCustomFrameUrl(formatSafeMediaUrl(selected.customFrameUrl || ''));
    const rawTagline = selected.frameText || '';
    setFrameText(rawTagline.includes('•') ? (rawTagline.split('•').pop()?.trim() || '') : rawTagline);
    setEventTitle(selected.title || '');
    setCoupleOrHost(selected.coupleOrHost || '');
    setEventDate(selected.eventDate || '');
    setEventLocation(selected.location || '');
    setEventCategory(resolveEventCategory(selected));
    setAllowGuestFrameToggle(selected.allowGuestFrameToggle !== false);
    setAllowVoiceNote(selected.allowVoiceNote !== false);
    if (unsavedCoverUploadRef.current) {
      const pendingUrl = unsavedCoverUploadRef.current;
      unsavedCoverUploadRef.current = '';
      authFetch(`/api/upload?url=${encodeURIComponent(pendingUrl)}`, {
        method: 'DELETE',
        keepalive: true,
      }).catch(() => {});
    }
    setCoverUrl(formatSafeMediaUrl(selected.coverUrl || ''));
    setEventSlug(selected.slug || '');

    // Fetch all photos including hidden for host moderation
    try {
      const resPhotos = await authFetch(`/api/photos?eventId=${selected.id}&includeHidden=true`);
      const dataPhotos = await resPhotos.json();
      if (dataPhotos.success && dataPhotos.photos) {
        setPhotos(dataPhotos.photos.map((p: PhotoRecord) => ({
          ...p,
          imageData: formatSafeMediaUrl(p.imageData),
        })));
      } else {
        setPhotos([]);
      }
    } catch {
      setPhotos([]);
    }

    // Fetch voice notes
    try {
      const resVoices = await authFetch(`/api/voice-notes?eventId=${selected.id}`);
      const dataVoices = await resVoices.json();
      if (dataVoices.success && dataVoices.voiceNotes) {
        setVoiceNotes(dataVoices.voiceNotes);
      } else {
        setVoiceNotes([]);
      }
    } catch (vErr) {
      console.warn('Gagal memuat pesan suara:', vErr);
      setVoiceNotes([]);
    }

    // Fetch video wishes
    try {
      const resVideos = await authFetch(`/api/video-wishes?eventId=${selected.id}`);
      const dataVideos = await resVideos.json();
      if (dataVideos.success && (dataVideos.videoWishes || dataVideos.wishes)) {
        setVideoWishes(dataVideos.videoWishes || dataVideos.wishes || []);
      } else {
        setVideoWishes([]);
      }
    } catch (vidErr) {
      console.warn('Gagal memuat video ucapan:', vidErr);
      setVideoWishes([]);
    }

    // Fetch guests for Buku Tamu
    try {
      setLoadingGuests(true);
      const resGuests = await authFetch(`/api/guests?eventId=${selected.id}`);
      const dataGuests = await resGuests.json();
      if (dataGuests.success && dataGuests.guests) {
        setGuests(dataGuests.guests);
      } else {
        setGuests([]);
      }
    } catch (gErr) {
      console.warn('Gagal memuat buku tamu:', gErr);
      setGuests([]);
    } finally {
      setLoadingGuests(false);
    }
  };

  const fetchData = async (currentUser?: UserAccount, targetEventId?: string) => {
    try {
      setLoading(true);
      const activeRole = currentUser?.role || user?.role || 'host';
      const email = currentUser?.email || user?.email || 'pengantin@sudutbingkai.id';
      const vendorId = currentUser?.id || user?.id || '';

      const queryUrl = activeRole === 'vendor' && vendorId
        ? `/api/events?vendorId=${encodeURIComponent(vendorId)}`
        : `/api/events?hostEmail=${encodeURIComponent(email)}`;

      const resEvents = await authFetch(queryUrl);
      let dataEvents = await resEvents.json();

      // Smart recovery: If active role is 'vendor' but 0 vendor events, check if host events exist under this email
      if (activeRole === 'vendor' && (!dataEvents.events || dataEvents.events.length === 0) && email) {
        try {
          const fallbackRes = await authFetch(`/api/events?hostEmail=${encodeURIComponent(email)}`);
          const fallbackData = await fallbackRes.json();
          if (fallbackData.success && fallbackData.events && fallbackData.events.length > 0) {
            dataEvents = fallbackData;
            setIsHostMismatched(true);
          }
        } catch {}
      }
      let selected: EventData | null = null;

      if (dataEvents.success && dataEvents.events && dataEvents.events.length > 0) {
        setEvents(dataEvents.events);
        if (targetEventId) {
          selected = dataEvents.events.find((e: EventData) => e.id === targetEventId || e.slug === targetEventId) || dataEvents.events[0];
        } else {
          selected = dataEvents.events[0];
        }
      } else {
        if (targetEventId) {
          try {
            const singleRes = await authFetch(`/api/events?id=${encodeURIComponent(targetEventId)}`);
            const singleData = await singleRes.json();
            if (singleData.success && singleData.event) {
              selected = singleData.event;
              setEvents([singleData.event]);
            }
          } catch {}
        }
      }

      if (selected) {
        await selectActiveEvent(selected);
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
    const slugOrId = event.slug || event.id;
    const url = `${window.location.origin}/cam/${slugOrId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Tautan kamera tamu berhasil disalin!');
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
      await authFetch('/api/photos', {
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
      description: 'Foto ini akan dihapus dari album dan penyimpanan cloud serta tidak dapat dipulihkan kembali.',
      confirmText: 'Hapus Foto',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setPhotos(prev => prev.filter(p => p.id !== photoId));
        if (activePhoto?.id === photoId) setActivePhoto(null);
        toast.success('Foto berhasil dihapus.');
        try {
          await authFetch(`/api/photos?id=${photoId}`, { method: 'DELETE' });
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
      const folderName = `sudutbingkai-${event?.slug || event?.id || 'album'}`;
      const folder = zip.folder(folderName);
      const BATCH_SIZE = 4;
      let completed = 0;

      for (let i = 0; i < photos.length; i += BATCH_SIZE) {
        const batch = photos.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async (photo, batchIdx) => {
            const globalIdx = i + batchIdx;
            try {
              const res = await fetch(photo.imageData);
              const blob = await res.blob();
              const safeGuest = (photo.guestName || 'tamu').replace(/[^a-zA-Z0-9_\-]/g, '_');
              folder?.file(`${globalIdx + 1}_${safeGuest}_jepretan${photo.shotNumber}.jpg`, blob, { compression: 'STORE' });
            } catch (err) {
              console.warn('Gagal memproses foto:', photo.id, err);
            } finally {
              completed++;
              setZipProgress(`Mengemas foto (${completed}/${photos.length})...`);
            }
          })
        );
      }

      setZipProgress('Menyusun file ZIP...');
      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
      const downloadUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `sudutbingkai-${event?.slug || event?.id || 'wedding'}-semua-foto.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 3000);
      toast.success('File ZIP berhasil diunduh!');
    } catch (err: unknown) {
      toast.error('Gagal membuat file ZIP: ' + (err as Error).message);
    } finally {
      setIsZipping(false);
      setZipProgress('');
    }
  };

  const exportGuestsToCSV = () => {
    if (guests.length === 0) {
      toast.info('Belum ada data tamu untuk diekspor.');
      return;
    }
    const headers = ['No', 'Nama Tamu', 'Waktu Hadir (WIB)', 'Aktivitas Terakhir (WIB)', 'Jumlah Foto', 'Pesan Suara', 'Video Ucapan', 'ID Sesi'];
    const rows = guests.map((g, idx) => [
      idx + 1,
      `"${(g.guestName || 'Tamu Undangan').replace(/"/g, '""')}"`,
      `"${new Date(g.checkedInAt).toLocaleString('id-ID')}"`,
      `"${g.lastActiveAt ? new Date(g.lastActiveAt).toLocaleString('id-ID') : '-'}"`,
      g.shotsCount,
      g.hasVoiceNote ? 'Ada' : 'Tidak',
      g.hasVideoWish ? 'Ada' : 'Tidak',
      `"${g.sessionId || '-'}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Buku_Tamu_${(event?.title || 'SudutBingkai').replace(/[^a-zA-Z0-9_\-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Buku tamu berhasil diekspor ke CSV!');
  };

  const filteredGuests = guests.filter(g =>
    !guestSearch.trim() || (g.guestName && g.guestName.toLowerCase().includes(guestSearch.trim().toLowerCase()))
  );

  const handleDeleteVoiceNote = (noteId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Pesan Suara?',
      description: 'Pesan suara dari tamu ini akan dihapus permanen dari arsip kenangan dan penyimpanan cloud.',
      confirmText: 'Hapus Suara',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setVoiceNotes(prev => prev.filter(n => n.id !== noteId));
        toast.success('Pesan suara berhasil dihapus.');
        try {
          await authFetch(`/api/voice-notes?id=${noteId}`, { method: 'DELETE' });
        } catch (err) {
          console.error('Gagal menghapus pesan suara:', err);
        }
      }
    });
  };

  const handleDeleteVideoWish = (wishId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Video Ucapan?',
      description: 'Video ucapan hangat dari tamu ini akan dihapus permanen dari album kenangan dan penyimpanan cloud.',
      confirmText: 'Hapus Video',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setVideoWishes(prev => prev.filter(w => w.id !== wishId));
        toast.success('Video ucapan berhasil dihapus.');
        try {
          await authFetch(`/api/video-wishes?id=${wishId}`, { method: 'DELETE' });
        } catch (err) {
          console.error('Gagal menghapus video ucapan:', err);
        }
      }
    });
  };

  const cleanupUnsavedCover = React.useCallback(() => {
    const pendingUrl = unsavedCoverUploadRef.current;
    if (pendingUrl) {
      unsavedCoverUploadRef.current = '';
      authFetch(`/api/upload?url=${encodeURIComponent(pendingUrl)}`, {
        method: 'DELETE',
        keepalive: true,
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      cleanupUnsavedCover();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      cleanupUnsavedCover();
    };
  }, [cleanupUnsavedCover]);

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'cover');
      if (unsavedCoverUploadRef.current) {
        formData.append('oldUrl', unsavedCoverUploadRef.current);
      }
      const res = await authFetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        unsavedCoverUploadRef.current = data.url;
        setCoverUrl(data.url);
        toast.success('Foto cover berhasil diunggah! Jangan lupa klik Simpan Pengaturan di bawah.');
      } else {
        toast.error('Gagal mengunggah foto: ' + (data.error || 'Terjadi kesalahan'));
      }
    } catch (err: unknown) {
      toast.error('Error mengunggah foto: ' + (err as Error).message);
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!event) return;
    setIsSavingSettings(true);
    const maxAllowedShots = PACKAGE_TIERS[packageTier]?.shotsPerGuest || 10;
    const maxAllowedPresets = PACKAGE_TIERS[packageTier]?.maxPresets || 1;
    const safeShots = Math.min(shotsPerGuest, maxAllowedShots);
    const safeGuestSwitch = maxAllowedPresets > 1 ? Boolean(allowGuestPresetSwitch) : false;
    const safeAllowedPresets = maxAllowedPresets <= 1 
      ? [preset] 
      : (allowedPresets.includes(preset) ? allowedPresets.slice(0, maxAllowedPresets) : [preset, ...allowedPresets.slice(0, maxAllowedPresets - 1)]);

    const cleanSlug = eventSlug.trim().toLowerCase().replace(/[^a-z0-9\-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    try {
      const res = await authFetch('/api/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: event.id,
          slug: cleanSlug || undefined,
          eventType: eventCategory,
          title: eventTitle.trim() || event.title,
          coupleOrHost: coupleOrHost.trim() || event.coupleOrHost,
          eventDate: eventDate || event.eventDate,
          location: eventLocation.trim(),
          shotsPerGuest: safeShots,
          revealMode,
          revealTime: revealMode === 'delayed' ? revealTime : '',
          preset,
          allowedPresets: safeAllowedPresets,
          allowGuestPresetSwitch: safeGuestSwitch,
          frameId,
          customFrameUrl: frameId === 'custom' ? (customFrameUrl || '') : '',
          frameText,
          allowGuestFrameToggle,
          allowVoiceNote,
          closingWishType: !allowVoiceNote
            ? 'none'
            : (event.closingWishType && event.closingWishType !== 'none'
                ? event.closingWishType
                : (event.packageTier === 'wedding' || event.packageTier === 'unlimited' ? 'video' : 'voice')),
          coverUrl: coverUrl || ''
        })
      });
      const data = await res.json();
      if (data.success && data.event) {
        unsavedCoverUploadRef.current = '';
        setEvent(data.event);
        setEvents(prev => prev.map(ev => ev.id === data.event.id ? data.event : ev));
        if (data.event.slug) setEventSlug(data.event.slug);
        setSaveSuccess(true);
        toast.success('Pengaturan album & identitas acara berhasil disimpan!');
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
    return <SkeletonLoader title="Memuat Dashboard Tuan Rumah..." subtitle="Menyiapkan rol film dan ringkasan foto tamu" />;
  }

  const presetInfo = event ? FILM_PRESETS[event.preset] || FILM_PRESETS.portra : FILM_PRESETS.portra;
  const activeCategory = eventCategory || resolveEventCategory(event);
  const categoryMeta = getEventCategoryMeta(activeCategory);

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
              {user?.role === 'vendor' ? 'SETTING ALBUM KLIEN (VENDOR)' : 'DASHBOARD TUAN RUMAH (HOST)'}
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {user?.role === 'vendor' && (
              <>
                <button
                  type="button"
                  onClick={handleRestoreHostRole}
                  className="glass-pill"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 12px',
                    fontSize: '12px',
                    color: '#C27803',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid rgba(194, 120, 3, 0.3)',
                    background: 'rgba(194, 120, 3, 0.08)'
                  }}
                  title="Kembalikan peran ke Pengantin / Penyelenggara"
                >
                  <Heart size={13} />
                  <span>Mode Pengantin</span>
                </button>

                <Link
                  href="/vendor?tab=clients"
                  className="glass-pill"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 12px',
                    fontSize: '12px',
                    color: '#515154',
                    fontWeight: 500,
                    textDecoration: 'none',
                    border: '1px solid rgba(0, 0, 0, 0.08)'
                  }}
                >
                  <ArrowLeft size={13} />
                  <span>Portal Mitra</span>
                </Link>
              </>
            )}

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
        {/* Role Recovery Alert Banner if User was Mutated */}
        {isHostMismatched && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(194, 120, 3, 0.12), rgba(255, 255, 255, 0.95))',
            border: '1.5px solid rgba(194, 120, 3, 0.35)',
            borderRadius: '16px',
            padding: '14px 18px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={18} color="#C27803" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: '#1D1D1F' }}>
                Peran akun Anda saat ini terdeteksi sebagai <strong>Mitra Vendor</strong>. Kami telah memuat data acara pernikahan Anda di bawah.
              </span>
            </div>
            <button
              type="button"
              onClick={handleRestoreHostRole}
              className="btn-apple-black"
              style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '10px', cursor: 'pointer' }}
            >
              Kembalikan ke Akun Pengantin
            </button>
          </div>
        )}

        {/* New Album Created Welcome Banner */}
        {showCreatedBanner && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(194, 120, 3, 0.12), rgba(212, 175, 55, 0.08))',
            border: '1px solid rgba(194, 120, 3, 0.3)',
            borderRadius: '16px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: '#C27803',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Check size={20} />
              </div>
              <div>
                <strong style={{ fontSize: '15px', color: '#1D1D1F', display: 'block' }}>
                  Selamat! Album digital Anda telah siap dan aktif.
                </strong>
                <span style={{ fontSize: '13px', color: '#6E6E73' }}>
                  Akun dashboard Anda telah terhubung. Anda dapat mencetak kartu QR tamu, menguji kamera, atau membagikan link ke para tamu sekarang.
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowCreatedBanner(false)}
              className="glass-pill"
              style={{
                fontSize: '12px',
                padding: '6px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <X size={14} /> Tutup
            </button>
          </div>
        )}

        {/* Empty State if Host has no events yet */}
        {!loading && !event && (
          <div className="glass-card" style={{ padding: '64px 24px', textAlign: 'center', borderRadius: '28px', maxWidth: '560px', margin: '40px auto' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(194, 120, 3, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Camera size={28} color="#C27803" />
            </div>
            <h2 className="font-display-serif" style={{ fontSize: '24px', fontWeight: 700, color: '#1D1D1F', marginBottom: '10px' }}>
              Belum Ada Album Acara
            </h2>
            <p style={{ color: '#6E6E73', fontSize: '14px', lineHeight: 1.6, marginBottom: '28px' }}>
              Halo <strong>{user?.name || 'Keluarga'}</strong>! Akun Anda belum memiliki album foto yang terdaftar. Siapkan album pernikahan, ulang tahun, atau gathering Anda sekarang untuk mendapatkan kartu barcode QR tamu.
            </p>
            <Link
              href="/create"
              className="btn-apple-black"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 28px', borderRadius: '999px', fontSize: '14.5px', textDecoration: 'none' }}
            >
              <span>Buat Wadah Album Acara (Gratis)</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        )}

        {event && (
          <>
            {/* Pending Payment Alert Banner */}
            {event.paymentStatus === 'pending' && (
              <div style={{
                marginBottom: '20px',
                padding: '20px 24px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.12) 0%, rgba(194, 120, 3, 0.06) 100%)',
                border: '1.5px solid rgba(217, 119, 6, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', maxWidth: '620px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: 'rgba(217, 119, 6, 0.15)',
                    color: '#D97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '15px', color: '#1D1D1F', display: 'block', marginBottom: '4px' }}>
                      Album Acara Menunggu Pelunasan Pembayaran
                    </strong>
                    <p style={{ margin: 0, fontSize: '13px', color: '#515154', lineHeight: 1.5 }}>
                      Kamera tamu dan galeri publik saat ini masih terkunci. Selesaikan pembayaran paket Anda agar seluruh tamu undangan dapat langsung memindai QR Code dan memotret momen.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <Link
                    href={`/invoice/inv_${event.id}`}
                    className="glass-pill"
                    style={{
                      padding: '10px 16px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      textDecoration: 'none',
                      color: '#1D1D1F',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#FFFFFF'
                    }}
                  >
                    <FileText size={14} color="#C27803" />
                    <span>Lihat Tagihan</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleCompletePendingPayment}
                    disabled={isInitiatingPayment}
                    className="btn-apple-black"
                    style={{
                      padding: '10px 20px',
                      fontSize: '13px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: isInitiatingPayment ? 'wait' : 'pointer',
                      background: '#C27803',
                      color: '#FFFFFF',
                      border: 'none'
                    }}
                  >
                    <CreditCard size={15} />
                    <span>{isInitiatingPayment ? 'Memproses...' : 'Bayar Sekarang'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Event Quick Overview Card */}
            <div className="glass-card form-section-card" style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: event?.paymentStatus === 'pending' ? '#D97706' : '#2ECC71'
                }} />
                <span className="font-mono-film" style={{ color: event?.paymentStatus === 'pending' ? '#D97706' : '#C27803', fontSize: '11px' }}>
                  {event?.paymentStatus === 'pending' ? 'MENUNGGU PEMBAYARAN' : 'ACARA AKTIF'}
                </span>
                {events.length > 1 && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginLeft: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#86868B', fontFamily: 'var(--font-mono)' }}>GANTI:</span>
                    <select
                      value={event?.id}
                      onChange={(e) => {
                        const found = events.find(ev => ev.id === e.target.value);
                        if (found) selectActiveEvent(found);
                      }}
                      style={{
                        padding: '3px 8px',
                        fontSize: '12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(194, 120, 3, 0.35)',
                        background: '#FFFFFF',
                        color: '#1D1D1F',
                        cursor: 'pointer'
                      }}
                    >
                      {events.map(ev => (
                        <option key={ev.id} value={ev.id}>{ev.title}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <h1 className="font-display-serif" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.2rem)', fontWeight: 700, color: '#1D1D1F', marginBottom: '6px' }}>
                {event?.title || categoryMeta.defaultTitle}
              </h1>
              <p style={{ color: '#515154', fontSize: '14px' }}>
                {event?.coupleOrHost} {event?.location && `• ${event.location}`}
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', width: '100%', maxWidth: '640px' }}>
              <button
                onClick={copyGuestLink}
                className="glass-pill"
                style={{ padding: '9px 12px', fontSize: '12.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
              >
                {copied ? <Check size={14} color="#C27803" /> : <Share2 size={14} />}
                <span>{copied ? 'Tersalin' : 'Salin Link'}</span>
              </button>

              <Link
                href={`/event/${event?.slug || event?.id}`}
                className="glass-pill"
                style={{ padding: '9px 12px', fontSize: '12.5px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Eye size={14} />
                <span>Galeri Tamu</span>
              </Link>

              <Link
                href={`/event/${event?.slug || event?.id}/print`}
                className="glass-pill"
                style={{ padding: '9px 12px', fontSize: '12.5px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Printer size={14} />
                <span>Cetak Barcode</span>
              </Link>

              <Link
                href={`/cam/${event?.slug || event?.id}`}
                className="btn-apple-black"
                style={{ padding: '9px 12px', fontSize: '12.5px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Camera size={14} />
                <span>Uji Kamera</span>
              </Link>

              <Link
                href={`/event/${event?.slug || event?.id}/live`}
                className="glass-pill"
                style={{ padding: '9px 12px', fontSize: '12.5px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Tv size={14} />
                <span>Layar TV</span>
              </Link>

              <Link
                href={`/invoice/inv_${event?.id}`}
                className="glass-pill"
                style={{ padding: '9px 12px', fontSize: '12.5px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <FileText size={14} />
                <span>Invoice</span>
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
              <span className="font-mono-film" style={{ color: '#86868B', display: 'block', marginBottom: '4px' }}>
                {videoWishes.length > 0 && voiceNotes.length > 0
                  ? 'VIDEO & SUARA'
                  : videoWishes.length > 0 || packageTier === 'wedding' || packageTier === 'unlimited'
                    ? 'UCAPAN TAMU'
                    : 'PESAN SUARA'}
              </span>
              <strong style={{ fontSize: '20px', color: '#C27803' }}>{voiceNotes.length + videoWishes.length} Ucapan</strong>
            </div>

            <div>
              <span className="font-mono-film" style={{ color: '#86868B', display: 'block', marginBottom: '4px' }}>JATAH PER TAMU</span>
              <strong style={{ fontSize: '20px', color: '#1D1D1F' }}>
                {Math.min(event?.shotsPerGuest || 10, PACKAGE_TIERS[packageTier]?.shotsPerGuest || 10)} Foto
              </strong>
            </div>

            <div>
              <span className="font-mono-film" style={{ color: '#86868B', display: 'block', marginBottom: '4px' }}>STATUS TAMPIL</span>
              <strong style={{ fontSize: '20px', color: '#1D1D1F' }}>
                {event?.revealMode === 'instant' ? 'Langsung' : 'Cuci Roll'}
              </strong>
            </div>

            <div>
              <span className="font-mono-film" style={{ color: '#86868B', display: 'block', marginBottom: '4px' }}>MASA SIMPAN ARSIP</span>
              {(() => {
                const ret = getEventRetentionInfo(event?.eventDate, packageTier);
                return (
                  <div>
                    <strong style={{ fontSize: '18px', color: ret.badgeColor, display: 'block', lineHeight: 1.2 }}>
                      {ret.label}
                    </strong>
                    <span style={{ fontSize: '11px', color: '#86868B', display: 'block', marginTop: '3px' }}>
                      {ret.status === 'upcoming' 
                        ? 'Timer 30 hari aktif pasca hari-H' 
                        : 'Akses unduh full ZIP aktif'}
                    </span>
                  </div>
                );
              })()}
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
              <span className="desktop-only">Galeri & Moderasi ({photos.length} Foto{videoWishes.length > 0 ? `, ${videoWishes.length} Video` : ''}, {voiceNotes.length} Suara)</span>
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

            <button
              onClick={() => setActiveTab('guests')}
              className="glass-pill"
              style={{
                background: activeTab === 'guests' ? '#1D1D1F' : 'rgba(255, 255, 255, 0.7)',
                color: activeTab === 'guests' ? '#FFFFFF' : '#1D1D1F',
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <BookOpen size={14} />
              <span className="desktop-only">Buku Tamu ({guests.length})</span>
              <span className="mobile-only">Tamu ({guests.length})</span>
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
            {/* Gallery Sub-Tabs: Photos vs Voice Notes vs Video Wishes */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '12px', flexWrap: 'wrap' }}>
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
                  color: gallerySubTab === 'photos' ? '#FFFFFF' : '#1D1D1F',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Camera size={13} />
                <span>Momen Foto ({photos.length})</span>
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

              <button
                onClick={() => setGallerySubTab('videos')}
                className="glass-pill"
                style={{
                  padding: '7px 16px',
                  borderRadius: '9999px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: gallerySubTab === 'videos' ? '#C27803' : 'rgba(255,255,255,0.7)',
                  color: gallerySubTab === 'videos' ? '#FFFFFF' : '#1D1D1F',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Film size={13} />
                <span>Video Ucapan Tamu ({videoWishes.length})</span>
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
                      color: filterTab === 'wishes' ? '#FFFFFF' : '#C27803',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <MessageSquare size={13} />
                    <span>Ada Ucapan ({photos.filter(p => !!p.caption && p.caption.trim().length > 0).length})</span>
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
                      Buka kamera tamu atau bagikan kartu QR untuk mengambil foto baru.
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
                            <MessageSquare size={12} style={{ flexShrink: 0, marginTop: '2px', color: '#C27803' }} />
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

            {/* Video Wishes Sub-View */}
            {gallerySubTab === 'videos' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#1D1D1F' }}>
                      Koleksi Video Ucapan Tamu Undangan
                    </h3>
                    <p style={{ color: '#6E6E73', fontSize: '13px', margin: '4px 0 0' }}>
                      Format vertikal sinematik 9:16 dari para tamu yang menyampaikan doa dan ucapan hangat secara langsung.
                    </p>
                  </div>

                  {videoWishes.length > 0 && (
                    <button
                      onClick={() => {
                        setActiveStoryIndex(0);
                        setShowStoriesPlayer(true);
                      }}
                      className="btn-apple-black"
                      style={{ padding: '9px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                    >
                      <Play size={14} fill="#FFFFFF" />
                      <span>Putar Format Stories ({videoWishes.length})</span>
                    </button>
                  )}
                </div>

                {videoWishes.length === 0 ? (
                  <div className="glass-card" style={{ padding: '64px 24px', textAlign: 'center', borderRadius: '24px' }}>
                    <Film size={44} style={{ color: '#86868B', margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '6px' }}>Belum ada video ucapan yang terekam</h3>
                    <p style={{ color: '#6E6E73', fontSize: '13.5px', maxWidth: '440px', margin: '0 auto', lineHeight: 1.5 }}>
                      Saat kuota foto tamu selesai, para tamu akan diberikan kesempatan merekam video ucapan 15 detik untuk Anda. Video yang dikirimkan akan otomatis masuk ke sini.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
                    {videoWishes.map((wish, idx) => (
                      <div
                        key={wish.id}
                        className="glass-card"
                        style={{
                          borderRadius: '24px',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
                        }}
                      >
                        {/* Video Thumbnail / Preview with Play Overlay */}
                        <div
                          onClick={() => {
                            setActiveStoryIndex(idx);
                            setShowStoriesPlayer(true);
                          }}
                          style={{
                            position: 'relative',
                            width: '100%',
                            aspectRatio: '9/16',
                            maxHeight: '360px',
                            background: '#000000',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden'
                          }}
                        >
                          <video
                            src={wish.videoUrl}
                            preload="metadata"
                            playsInline
                            muted
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.2) 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <div style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '50%',
                              background: 'rgba(255,255,255,0.9)',
                              color: '#1D1D1F',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
                            }}>
                              <Play size={22} fill="#1D1D1F" style={{ marginLeft: '2px' }} />
                            </div>
                          </div>

                          <div style={{
                            position: 'absolute',
                            bottom: '10px',
                            left: '12px',
                            right: '12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            color: '#FFFFFF',
                            fontSize: '11px',
                            textShadow: '0 1px 4px rgba(0,0,0,0.8)'
                          }}>
                            <span style={{ fontWeight: 600 }}>{wish.durationSeconds} Detik</span>
                            <span style={{ background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: '999px' }}>9:16 HD</span>
                          </div>
                        </div>

                        {/* Details and Actions */}
                        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <div style={{ minWidth: 0 }}>
                            <strong style={{ fontSize: '13.5px', color: '#1D1D1F', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {wish.guestName}
                            </strong>
                            <span style={{ fontSize: '11px', color: '#86868B', display: 'block' }}>
                              {new Date(wish.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                            <a
                              href={wish.videoUrl}
                              download={`video-${wish.guestName}.mp4`}
                              className="glass-pill"
                              style={{ padding: '6px 10px', fontSize: '11px', textDecoration: 'none', color: '#1D1D1F', display: 'flex', alignItems: 'center' }}
                              title="Unduh video ucapan"
                            >
                              <Download size={13} />
                            </a>

                            <button
                              onClick={() => handleDeleteVideoWish(wish.id)}
                              className="glass-pill"
                              style={{ padding: '6px 10px', fontSize: '11px', cursor: 'pointer', color: '#E74C3C' }}
                              title="Hapus video ucapan"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
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
            {/* Section: Identitas, Kategori & Waktu Acara */}
            <div className="glass-card form-section-card">
              <div style={{ marginBottom: '20px' }}>
                <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '6px' }}>
                  IDENTITAS, KATEGORI & WAKTU ACARA
                </span>
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1D1D1F', marginBottom: '6px' }}>
                  Nama Acara, Kategori Perayaan & Lokasi Venue
                </h2>
                <p style={{ color: '#6E6E73', fontSize: '13.5px' }}>
                  Ubah judul utama album, kategori acara (Pernikahan, Ulang Tahun, Korporat, atau Lainnya), nama penyelenggara, tanggal, serta lokasi acara kapan saja.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Kategori Perayaan */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '8px' }}>
                    Kategori Perayaan
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {(['wedding', 'birthday', 'corporate', 'other'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          const prevDefaultTagline = getEventCategoryMeta(eventCategory).defaultFrameTagline;
                          const nextDefaultTagline = getEventCategoryMeta(cat).defaultFrameTagline;
                          setEventCategory(cat);
                          if (!frameText || frameText === prevDefaultTagline || frameText === 'The Beginning of Forever') {
                            setFrameText(nextDefaultTagline);
                          }
                        }}
                        className="glass-pill"
                        style={{
                          padding: '8px 16px',
                          fontSize: '12.5px',
                          fontWeight: eventCategory === cat ? 700 : 500,
                          background: eventCategory === cat ? (cat === 'wedding' ? '#C27803' : '#1D1D1F') : 'rgba(255, 255, 255, 0.8)',
                          color: eventCategory === cat ? '#FFFFFF' : '#1D1D1F',
                          border: eventCategory === cat ? 'none' : '1px solid rgba(0,0,0,0.1)',
                          cursor: 'pointer'
                        }}
                      >
                        {cat === 'wedding' && 'Pernikahan & Resepsi'}
                        {cat === 'birthday' && 'Ulang Tahun & Sweet 17'}
                        {cat === 'corporate' && 'Gathering Kantor & Gala'}
                        {cat === 'other' && 'Reuni, Konser & Festival'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grid Input: Judul Acara & Nama Penyelenggara */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                      Nama / Judul Acara Utama *
                    </label>
                    <input
                      type="text"
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      placeholder={
                        eventCategory === 'birthday'
                          ? 'Contoh: 8 Tahun Mbuy / Sweet 17 Keisha'
                          : eventCategory === 'corporate'
                            ? 'Contoh: Gala Dinner & Townhall 2026'
                            : eventCategory === 'other'
                              ? 'Contoh: Reuni Akbar & Halal Bihalal'
                              : 'Contoh: Hari Pernikahan Dimas & Sarah'
                      }
                      className="glass-input"
                      style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', fontSize: '14px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                      {eventCategory === 'wedding' ? 'Nama Pasangan Pengantin *' : 'Penyelenggara / Tuan Rumah *'}
                    </label>
                    <input
                      type="text"
                      value={coupleOrHost}
                      onChange={(e) => setCoupleOrHost(e.target.value)}
                      placeholder={
                        eventCategory === 'wedding'
                          ? 'Contoh: Dimas & Sarah'
                          : 'Contoh: Keluarga Syamsul / Panitia Acara'
                      }
                      className="glass-input"
                      style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', fontSize: '14px' }}
                    />
                  </div>
                </div>

                {/* Grid Input: Tanggal Acara & Lokasi Venue */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                      Tanggal Acara
                    </label>
                    <input
                      type="date"
                      value={eventDate ? eventDate.slice(0, 10) : ''}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="glass-input"
                      style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', fontSize: '14px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                      Lokasi / Venue Acara
                    </label>
                    <input
                      type="text"
                      value={eventLocation}
                      onChange={(e) => setEventLocation(e.target.value)}
                      placeholder="Contoh: The Glasshouse, Ritz-Carlton Jakarta"
                      className="glass-input"
                      style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', fontSize: '14px' }}
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    disabled={isSavingSettings}
                    className="btn-apple-black"
                    style={{ padding: '10px 22px', fontSize: '13px', cursor: isSavingSettings ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    {saveSuccess && <Check size={14} />}
                    <span>{isSavingSettings ? 'Menyimpan...' : saveSuccess ? 'Tersimpan!' : 'Simpan Identitas Acara'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Section: Kustomisasi Tautan URL Album (Slug) */}
            <div className="glass-card form-section-card">
              <div style={{ marginBottom: '20px' }}>
                <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '6px' }}>
                  KUSTOMISASI TAUTAN URL ALBUM (CUSTOM SLUG)
                </span>
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1D1D1F', marginBottom: '6px' }}>
                  Tautan Elegan & Unik Acara Anda
                </h2>
                <p style={{ color: '#6E6E73', fontSize: '13.5px' }}>
                  Gunakan nama panggilan Anda dan pasangan atau nama acara (huruf kecil, angka, dan tanda strip). Tautan ini mempermudah tamu membuka kamera dan melihat galeri acara secara personal.
                </p>
              </div>

              <div style={{ maxWidth: '640px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '8px' }}>
                  Slug / URL Khusus Acara
                </label>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  borderRadius: '12px', 
                  border: '1px solid rgba(0,0,0,0.12)', 
                  background: '#FFFFFF', 
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                  <div style={{ 
                    padding: '12px 14px', 
                    background: '#F5F5F7', 
                    color: '#86868B', 
                    fontSize: '13.5px', 
                    fontFamily: 'var(--font-mono)', 
                    borderRight: '1px solid rgba(0,0,0,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap'
                  }}>
                    <Globe size={14} color="#C27803" />
                    <span>sudutbingkai.id/event/</span>
                  </div>
                  <input
                    type="text"
                    value={eventSlug}
                    onChange={(e) => {
                      const clean = e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, '-').replace(/-+/g, '-');
                      setEventSlug(clean);
                    }}
                    placeholder={event?.coupleOrHost ? event.coupleOrHost.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'sarah-dimas'}
                    style={{
                      flex: 1,
                      border: 'none',
                      outline: 'none',
                      padding: '12px 14px',
                      fontSize: '14px',
                      fontFamily: 'var(--font-mono)',
                      color: '#1D1D1F',
                      fontWeight: 600,
                      background: 'transparent'
                    }}
                  />
                </div>

                {/* Live Preview Links */}
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '10px 14px', 
                    borderRadius: '10px', 
                    background: 'rgba(194, 120, 3, 0.05)', 
                    border: '1px solid rgba(194, 120, 3, 0.2)' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      <Camera size={14} color="#C27803" />
                      <span style={{ fontSize: '11px', color: '#86868B', fontWeight: 600, textTransform: 'uppercase' }}>Kamera Tamu:</span>
                      <span style={{ fontSize: '12.5px', fontFamily: 'var(--font-mono)', color: '#1D1D1F', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {typeof window !== 'undefined' ? window.location.origin : 'https://sudutbingkai.id'}/cam/{eventSlug || event?.slug || event?.id}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${typeof window !== 'undefined' ? window.location.origin : 'https://sudutbingkai.id'}/cam/${eventSlug || event?.slug || event?.id}`;
                        navigator.clipboard.writeText(url);
                        toast.success('Tautan kamera tamu disalin!');
                      }}
                      className="glass-pill"
                      style={{ padding: '4px 10px', fontSize: '11.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                    >
                      <Copy size={12} />
                      <span>Salin</span>
                    </button>
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '10px 14px', 
                    borderRadius: '10px', 
                    background: 'rgba(0, 0, 0, 0.03)', 
                    border: '1px solid rgba(0, 0, 0, 0.06)' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      <Eye size={14} color="#6E6E73" />
                      <span style={{ fontSize: '11px', color: '#86868B', fontWeight: 600, textTransform: 'uppercase' }}>Galeri Acara:</span>
                      <span style={{ fontSize: '12.5px', fontFamily: 'var(--font-mono)', color: '#1D1D1F', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {typeof window !== 'undefined' ? window.location.origin : 'https://sudutbingkai.id'}/event/{eventSlug || event?.slug || event?.id}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${typeof window !== 'undefined' ? window.location.origin : 'https://sudutbingkai.id'}/event/${eventSlug || event?.slug || event?.id}`;
                        navigator.clipboard.writeText(url);
                        toast.success('Tautan galeri album disalin!');
                      }}
                      className="glass-pill"
                      style={{ padding: '4px 10px', fontSize: '11.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                    >
                      <Copy size={12} />
                      <span>Salin</span>
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <button 
                    onClick={handleSaveSettings} 
                    disabled={isSavingSettings}
                    className="btn-apple-black" 
                    style={{ padding: '9px 20px', fontSize: '13px', cursor: isSavingSettings ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    {saveSuccess && <Check size={14} />}
                    <span>{isSavingSettings ? 'Menyimpan...' : saveSuccess ? 'Tersimpan!' : 'Simpan Tautan'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Section 0: Hero Cover Banner Tamu */}
            <div className="glass-card form-section-card">
              <div style={{ marginBottom: '20px' }}>
                <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '6px' }}>
                  FOTO COVER GALERI TAMU (HERO BANNER)
                </span>
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1D1D1F', marginBottom: '6px' }}>
                  Cover Sinematik Halaman Tamu Undangan
                </h2>
                <p style={{ color: '#6E6E73', fontSize: '13.5px' }}>
                  Foto utama yang tampil megah di bagian atas galeri bersama tamu saat mereka membuka tautan undangan.
                </p>
              </div>

              {/* Live Preview Card */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '240px',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  marginBottom: '20px',
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.12)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  backgroundColor: '#111'
                }}
              >
                <img
                  src={formatSafeMediaUrl(coverUrl) || categoryMeta.defaultCoverUrl}
                  alt="Cover Preview"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.src.endsWith(categoryMeta.defaultCoverUrl)) {
                      target.src = categoryMeta.defaultCoverUrl;
                    }
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.6) 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    padding: '24px 20px',
                    color: '#fff'
                  }}
                >
                  <span style={{ fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: '#D4AF37', fontWeight: 600, marginBottom: '4px' }}>
                    {categoryMeta.heroBadgeText}
                  </span>
                  <h3 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: '26px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                    {eventTitle || event?.title || coupleOrHost || event?.coupleOrHost || 'Nama Acara'}
                  </h3>
                  <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.85)', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span>{eventDate || event?.eventDate || '14 FEBRUARI 2026'}</span>
                    <span>•</span>
                    <span>{eventLocation || event?.location || 'Venue Acara'}</span>
                  </p>
                </div>
                <div
                  style={{
                    position: 'absolute',
                    top: '14px',
                    right: '14px',
                    background: 'rgba(0,0,0,0.55)',
                    backdropFilter: 'blur(8px)',
                    color: '#fff',
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Eye size={12} />
                  <span>Live Preview Tamu</span>
                </div>
              </div>

              {/* Upload Controls & URL Input */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1D1D1F', marginBottom: '6px' }}>
                    Unggah dari Perangkat / Komputer
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        flex: '1',
                        minWidth: '200px',
                        padding: '12px 18px',
                        borderRadius: '12px',
                        background: '#1D1D1F',
                        color: '#fff',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        cursor: isUploadingCover ? 'wait' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: isUploadingCover ? 0.7 : 1
                      }}
                    >
                      <Upload size={16} />
                      {isUploadingCover ? 'Mengunggah Foto...' : coverUrl ? 'Ganti Foto Cover' : 'Pilih Foto Cover / Host (JPG/PNG)'}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        disabled={isUploadingCover}
                        onChange={handleUploadCover}
                      />
                    </label>

                    {coverUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          cleanupUnsavedCover();
                          setCoverUrl('');
                          toast.info('Foto cover dihapus (kembali ke default). Klik Simpan Pengaturan di bawah.');
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '12px 16px',
                          borderRadius: '12px',
                          background: 'rgba(239, 68, 68, 0.08)',
                          color: '#EF4444',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={15} />
                        <span>Hapus Cover</span>
                      </button>
                    )}
                  </div>
                  <p style={{ fontSize: '11.5px', color: '#86868B', marginTop: '6px' }}>
                    Rekomendasi rasio landscape (16:9 atau 3:2), resolusi minimal 1200x800px.
                  </p>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1D1D1F', marginBottom: '6px' }}>
                    Atau Masukkan URL Gambar Web
                  </label>
                  <input
                    type="url"
                    value={coverUrl}
                    onChange={(e) => {
                      if (unsavedCoverUploadRef.current && unsavedCoverUploadRef.current !== e.target.value) {
                        cleanupUnsavedCover();
                      }
                      setCoverUrl(e.target.value);
                    }}
                    placeholder="https://... (URL foto acara)"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: '1px solid rgba(0,0,0,0.12)',
                      fontSize: '13px',
                      outline: 'none',
                      backgroundColor: '#FFFFFF'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    {coverUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          cleanupUnsavedCover();
                          setCoverUrl('');
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#FF3B30',
                          fontSize: '12px',
                          cursor: 'pointer',
                          padding: 0,
                          fontWeight: 500
                        }}
                      >
                        Hapus foto & kembali ke default
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Preset Shortcuts */}
              <div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#6E6E73', display: 'block', marginBottom: '8px' }}>
                  CONTOH FOTO SAMPEL CEPAT:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {[
                    { label: 'Suasana Tamu & Pesta', url: '/samples/dummy-guests.jpg' },
                    { label: 'Potret Pengantin', url: '/samples/dummy-couple.jpg' },
                    { label: 'Romantic Warmth (Unsplash)', url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80' },
                    { label: 'Sunset Silhouette (Unsplash)', url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1600&q=80' },
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        cleanupUnsavedCover();
                        setCoverUrl(p.url);
                        toast.success(`Foto cover diubah ke "${p.label}". Simpan pengaturan di bawah.`);
                      }}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        borderRadius: '20px',
                        border: coverUrl === p.url ? '1px solid #C27803' : '1px solid rgba(0,0,0,0.1)',
                        background: coverUrl === p.url ? '#FFF8ED' : '#FFFFFF',
                        color: coverUrl === p.url ? '#C27803' : '#1D1D1F',
                        cursor: 'pointer',
                        fontWeight: coverUrl === p.url ? 600 : 400,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

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
                initialCoupleName={(activeCategory === 'wedding' ? (coupleOrHost || eventTitle || event?.coupleOrHost || event?.title) : (eventTitle || coupleOrHost || event?.title || event?.coupleOrHost)) || 'Nama Acara'}
                initialEventDate={eventDate || event?.eventDate || ''}
                initialTagline={frameText || categoryMeta.defaultFrameTagline}
                initialAllowGuestToggle={allowGuestFrameToggle}
                initialSampleModel={activeCategory === 'wedding' ? 'couple' : 'guests'}
                eventType={activeCategory}
                onUpdate={({ frameId: fId, customFrameUrl: cUrl, coupleName: cName, eventDate: eDate, tagline: tLine, allowGuestFrameToggle: aToggle, isCoupleEdited, isDateEdited }) => {
                  setFrameId(fId);
                  setCustomFrameUrl(cUrl || '');
                  if (isCoupleEdited && cName) {
                    if (activeCategory === 'wedding') {
                      setCoupleOrHost(cName);
                    } else {
                      setEventTitle(cName);
                    }
                  }
                  if (isDateEdited && eDate) {
                    setEventDate(eDate);
                  }
                  setFrameText(tLine);
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
                      {PACKAGE_TIERS[packageTier]?.guestsLabel || 'Hingga 300 Tamu'} • {PACKAGE_TIERS[packageTier]?.shotsPerGuest || 25} Foto/Tamu • {PACKAGE_TIERS[packageTier]?.retentionLabel || '30 Hari Pasca Acara'} • Unduh Resolusi Asli Penuh
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
                          const chosenPreset = id as FilmPresetId;
                          setPreset(chosenPreset);
                          const maxP = PACKAGE_TIERS[packageTier]?.maxPresets || 1;
                          if (maxP <= 1) {
                            setAllowedPresets([chosenPreset]);
                          } else {
                            if (!allowedPresets.includes(chosenPreset)) {
                              if (allowedPresets.length < maxP) {
                                setAllowedPresets([...allowedPresets, chosenPreset]);
                              } else {
                                setAllowedPresets([chosenPreset, ...allowedPresets.slice(1, maxP)]);
                              }
                            }
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
                            src={categoryMeta.defaultCoverUrl}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '13.5px', color: '#1D1D1F', display: 'block' }}>
                        Izinkan Tamu Ganti Filter Film di Kamera
                      </strong>
                      {(PACKAGE_TIERS[packageTier]?.maxPresets || 1) <= 1 && (
                        <span style={{ fontSize: '10px', background: '#F3F4F6', color: '#6B7280', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                          Terkunci di Paket Starter
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '11.5px', color: '#86868B' }}>
                      {(PACKAGE_TIERS[packageTier]?.maxPresets || 1) <= 1
                        ? `Paket ${PACKAGE_TIERS[packageTier]?.name || 'Starter'} hanya menyertakan 1 filter analog aktif (${FILM_PRESETS[preset]?.name || 'Signature'}). Tamu otomatis memotret dengan filter ini. Upgrade paket untuk membuka fitur multi-filter pilihan tamu.`
                        : 'Jika aktif, tamu dapat memilih filter analog sendiri di ponsel saat memotret.'}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    disabled={(PACKAGE_TIERS[packageTier]?.maxPresets || 1) <= 1}
                    checked={allowGuestPresetSwitch && (PACKAGE_TIERS[packageTier]?.maxPresets || 1) > 1}
                    onChange={(e) => setAllowGuestPresetSwitch(e.target.checked)}
                    style={{ 
                      width: '20px', 
                      height: '20px', 
                      accentColor: '#C27803', 
                      cursor: (PACKAGE_TIERS[packageTier]?.maxPresets || 1) <= 1 ? 'not-allowed' : 'pointer' 
                    }}
                  />
                </div>

                {(PACKAGE_TIERS[packageTier]?.maxPresets || 1) <= 1 && (
                  <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(194, 120, 3, 0.08)', border: '1px dashed rgba(194, 120, 3, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#6E6E73' }}>
                      Ingin membebaskan tamu memilih berbagai roll film analog di ponsel mereka?
                    </span>
                    <Link 
                      href="/#pricing"
                      style={{ fontSize: '11.5px', fontWeight: 600, color: '#C27803', textDecoration: 'underline', whiteSpace: 'nowrap' }}
                    >
                      Upgrade Paket →
                    </Link>
                  </div>
                )}

                {allowGuestPresetSwitch && (PACKAGE_TIERS[packageTier]?.maxPresets || 1) > 1 && (
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B' }}>
                        Jatah Foto Per Tamu
                      </label>
                      <span style={{ fontSize: '11px', color: '#86868B', marginLeft: '8px' }}>
                        (Paket {PACKAGE_TIERS[packageTier]?.name || 'Starter'}: maks {PACKAGE_TIERS[packageTier]?.shotsPerGuest || 10} foto)
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ color: '#C27803', fontSize: '15px' }}>
                        {shotsPerGuest} Jepretan
                      </strong>
                      {shotsPerGuest >= (PACKAGE_TIERS[packageTier]?.shotsPerGuest || 10) && (
                        <span style={{ fontSize: '10px', background: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          MAX PAKET
                        </span>
                      )}
                    </div>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={PACKAGE_TIERS[packageTier]?.shotsPerGuest || 10}
                    step={1}
                    value={Math.min(shotsPerGuest, PACKAGE_TIERS[packageTier]?.shotsPerGuest || 10)}
                    onChange={(e) => {
                      const maxVal = PACKAGE_TIERS[packageTier]?.shotsPerGuest || 10;
                      const val = Math.min(Number(e.target.value), maxVal);
                      setShotsPerGuest(val);
                    }}
                    style={{ width: '100%', accentColor: '#C27803', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '11px', color: '#86868B' }}>
                    <span>1 Foto</span>
                    <span>Maksimal: {PACKAGE_TIERS[packageTier]?.shotsPerGuest || 10} Foto / Tamu</span>
                  </div>

                  {shotsPerGuest >= (PACKAGE_TIERS[packageTier]?.shotsPerGuest || 10) && (
                    <div style={{ marginTop: '12px', padding: '12px 14px', borderRadius: '12px', background: 'rgba(194, 120, 3, 0.08)', border: '1px dashed rgba(194, 120, 3, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#6E6E73' }}>
                        Butuh jatah foto lebih banyak atau kuota tamu lebih besar?
                      </span>
                      <Link 
                        href="/#pricing"
                        style={{ fontSize: '11.5px', fontWeight: 600, color: '#C27803', textDecoration: 'underline', whiteSpace: 'nowrap' }}
                      >
                        Upgrade Paket →
                      </Link>
                    </div>
                  )}
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
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                        <label style={{ display: 'block', fontSize: '11.5px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#C27803', margin: 0 }}>
                          Jadwal Pengungkapan Serentak (Hitung Mundur)
                        </label>
                        <span className="font-mono-film" style={{ fontSize: '10.5px', background: 'rgba(194, 120, 3, 0.15)', color: '#92400E', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                          Zona: {typeof Intl !== 'undefined' ? (Intl.DateTimeFormat().resolvedOptions().timeZone.includes('Jakarta') ? 'WIB (UTC+7)' : Intl.DateTimeFormat().resolvedOptions().timeZone.includes('Makassar') ? 'WITA (UTC+8)' : Intl.DateTimeFormat().resolvedOptions().timeZone.includes('Jayapura') ? 'WIT (UTC+9)' : 'WIB') : 'WIB'}
                        </span>
                      </div>

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
                                  const res = await authFetch('/api/events', {
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
                                  } else {
                                    toast.error(d.error || 'Gagal membuka kunci album.');
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
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Unlock size={13} />
                          <span>Buka Album Sekarang</span>
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
                    <strong style={{ fontSize: '13px', color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      {packageTier === 'wedding' || packageTier === 'unlimited' ? (
                        <>
                          <Film size={14} color="#C27803" />
                          <span>Video Ucapan Tamu 15 Detik (Fitur Spesial Paket Wedding/Unlimited)</span>
                        </>
                      ) : (
                        <>
                          <Mic size={14} color="#C27803" />
                          <span>Pesan Suara Penutup Tamu (Voice Note 15 Detik)</span>
                        </>
                      )}
                    </strong>
                    <span style={{ fontSize: '11.5px', color: '#86868B' }}>
                      {packageTier === 'wedding' || packageTier === 'unlimited'
                        ? 'Saat kuota foto tamu habis, izinkan mereka merekam video ucapan penutup 15 detik untuk Anda.'
                        : 'Saat kuota foto tamu habis, izinkan mereka merekam ucapan suara penutup untuk Anda.'}
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
                    style={{ padding: '12px 28px', fontSize: '14px', cursor: isSavingSettings ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    {saveSuccess && <Check size={15} />}
                    <span>{isSavingSettings ? 'Menyimpan Pengaturan...' : saveSuccess ? 'Pengaturan & Bingkai Disimpan!' : 'Simpan Semua Perubahan'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BUKU TAMU DIGITAL (GUESTBOOK) */}
        {activeTab === 'guests' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header Description & Stats Card */}
            <div className="glass-card form-section-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '6px' }}>
                    BUKU TAMU & PRESENSI DIGITAL
                  </span>
                  <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1D1D1F', margin: '0 0 6px 0' }}>
                    Daftar Kehadiran Tamu Undangan
                  </h2>
                  <p style={{ color: '#6E6E73', fontSize: '14px', margin: 0, maxWidth: '640px' }}>
                    Setiap tamu yang memindai QR code dan membuka kamera acara otomatis tercatat secara real-time di buku tamu ini beserta jumlah jepretan dan doa yang mereka sampaikan.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    onClick={exportGuestsToCSV}
                    disabled={guests.length === 0}
                    className="glass-pill"
                    style={{
                      padding: '9px 18px',
                      fontSize: '13px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: guests.length === 0 ? 'not-allowed' : 'pointer',
                      border: '1px solid rgba(194, 120, 3, 0.3)',
                      background: 'rgba(194, 120, 3, 0.08)',
                      color: '#C27803'
                    }}
                    title="Unduh data buku tamu dalam format Excel / CSV"
                  >
                    <Download size={14} />
                    <span>Ekspor Buku Tamu (.CSV)</span>
                  </button>

                  <button
                    onClick={() => {
                      if (event) {
                        setLoadingGuests(true);
                        authFetch(`/api/guests?eventId=${event.id}`)
                          .then(r => r.json())
                          .then(d => {
                            if (d.success && d.guests) setGuests(d.guests);
                            toast.success('Buku tamu diperbarui!');
                          })
                          .catch(() => toast.error('Gagal memuat buku tamu'))
                          .finally(() => setLoadingGuests(false));
                      }
                    }}
                    className="glass-pill"
                    style={{ padding: '9px 16px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                  >
                    <RefreshCw size={14} className={loadingGuests ? 'animate-spin' : ''} />
                    <span>Segarkan</span>
                  </button>
                </div>
              </div>

              {/* Stat Counters Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '14px',
                padding: '16px',
                borderRadius: '16px',
                background: 'rgba(0,0,0,0.02)',
                border: '1px solid rgba(0,0,0,0.05)'
              }}>
                <div>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#86868B', textTransform: 'uppercase' }}>
                    Total Tamu Hadir / Scan
                  </span>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#1D1D1F', marginTop: '2px' }}>
                    {guests.length} <span style={{ fontSize: '13px', fontWeight: 500, color: '#86868B' }}>/ {event?.maxGuests || 5} Pax</span>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#86868B', textTransform: 'uppercase' }}>
                    Total Foto Terkumpul
                  </span>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#C27803', marginTop: '2px' }}>
                    {photos.length} <span style={{ fontSize: '13px', fontWeight: 500, color: '#86868B' }}>Foto</span>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#86868B', textTransform: 'uppercase' }}>
                    Tamu Aktif Jepret
                  </span>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#1D1D1F', marginTop: '2px' }}>
                    {guests.filter(g => g.shotsCount > 0).length} <span style={{ fontSize: '13px', fontWeight: 500, color: '#86868B' }}>Tamu</span>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#86868B', textTransform: 'uppercase' }}>
                    Pesan Suara & Video
                  </span>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#1D1D1F', marginTop: '2px' }}>
                    {voiceNotes.length + videoWishes.length} <span style={{ fontSize: '13px', fontWeight: 500, color: '#86868B' }}>Ucapan</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Guest List & Search */}
            <div className="glass-card form-section-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
                  <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#86868B' }} />
                  <input
                    type="text"
                    value={guestSearch}
                    onChange={(e) => setGuestSearch(e.target.value)}
                    placeholder="Cari nama tamu undangan..."
                    className="glass-input"
                    style={{ width: '100%', paddingLeft: '36px', paddingRight: '12px', height: '40px', fontSize: '13px', borderRadius: '12px' }}
                  />
                  {guestSearch && (
                    <button
                      onClick={() => setGuestSearch('')}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#86868B', padding: 0 }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <span style={{ fontSize: '12.5px', color: '#86868B' }}>
                  Menampilkan {filteredGuests.length} dari {guests.length} tamu
                </span>
              </div>

              {filteredGuests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 20px', background: 'rgba(0,0,0,0.02)', borderRadius: '16px' }}>
                  <Users size={36} color="#86868B" style={{ margin: '0 auto 12px', opacity: 0.6 }} />
                  <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#1D1D1F', margin: '0 0 6px 0' }}>
                    {guestSearch ? 'Tidak ada nama tamu yang sesuai pencarian' : 'Belum Ada Tamu yang Scan Kamera'}
                  </h4>
                  <p style={{ color: '#86868B', fontSize: '13px', margin: '0 auto 16px', maxWidth: '420px' }}>
                    {guestSearch
                      ? 'Coba gunakan kata kunci pencarian yang lain.'
                      : 'Bagikan kartu QR fisik atau tautan kamera ke para tamu. Begitu mereka membuka kamera dan memasukkan nama, data kehadiran mereka akan langsung muncul di sini.'}
                  </p>
                  {!guestSearch && event && (
                    <button
                      onClick={() => {
                        const url = `${typeof window !== 'undefined' ? window.location.origin : 'https://sudutbingkai.id'}/cam/${eventSlug || event.slug || event.id}`;
                        navigator.clipboard.writeText(url);
                        toast.success('Tautan kamera tamu berhasil disalin!');
                      }}
                      className="btn-apple-black"
                      style={{ padding: '8px 18px', fontSize: '12.5px' }}
                    >
                      Salin Tautan Kamera Tamu
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {filteredGuests.map((g, idx) => (
                    <div
                      key={g.id || idx}
                      style={{
                        padding: '16px',
                        borderRadius: '16px',
                        background: '#FFFFFF',
                        border: '1px solid rgba(0,0,0,0.07)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '14px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '240px' }}>
                        {/* Guest Initial Avatar */}
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #FFF8ED 0%, #F5E6CC 100%)',
                          border: '1.5px solid rgba(194, 120, 3, 0.4)',
                          color: '#C27803',
                          fontWeight: 700,
                          fontSize: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {g.guestName ? g.guestName.charAt(0).toUpperCase() : 'T'}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '15px', color: '#1D1D1F' }}>
                              {g.guestName}
                            </strong>
                            {g.shotsCount >= (event?.shotsPerGuest || 10) ? (
                              <span style={{ fontSize: '10px', fontWeight: 600, background: '#ECFDF5', color: '#047857', padding: '2px 8px', borderRadius: '12px' }}>
                                Kuota Selesai ({g.shotsCount}/{event?.shotsPerGuest || 10})
                              </span>
                            ) : g.shotsCount > 0 ? (
                              <span style={{ fontSize: '10px', fontWeight: 600, background: '#FFF8ED', color: '#C27803', padding: '2px 8px', borderRadius: '12px' }}>
                                Aktif ({g.shotsCount}/{event?.shotsPerGuest || 10} Foto)
                              </span>
                            ) : (
                              <span style={{ fontSize: '10px', fontWeight: 600, background: 'rgba(0,0,0,0.05)', color: '#6E6E73', padding: '2px 8px', borderRadius: '12px' }}>
                                Baru Masuk
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '11.5px', color: '#86868B', flexWrap: 'wrap' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} />
                              Hadir: {new Date(g.checkedInAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })} WIB
                            </span>
                            {g.sessionId && (
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: '#A1A1A6' }}>
                                ID: {g.sessionId.slice(-8)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Contribution Badges & Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        {g.hasVoiceNote && (
                          <span style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#047857', background: '#ECFDF5', padding: '4px 10px', borderRadius: '20px', fontWeight: 500 }}>
                            <Mic size={12} /> Ada Pesan Suara
                          </span>
                        )}
                        {g.hasVideoWish && (
                          <span style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#6366F1', background: '#EEF2FF', padding: '4px 10px', borderRadius: '20px', fontWeight: 500 }}>
                            <Video size={12} /> Ada Video
                          </span>
                        )}

                        {g.shotsCount > 0 && (
                          <button
                            onClick={() => {
                              setActiveTab('photos');
                              setGallerySubTab('photos');
                              window.scrollTo({ top: 300, behavior: 'smooth' });
                            }}
                            className="glass-pill"
                            style={{ padding: '6px 14px', fontSize: '11.5px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                            title={`Lihat ${g.shotsCount} foto milik ${g.guestName}`}
                          >
                            <Camera size={12} color="#C27803" />
                            <span>{g.shotsCount} Foto</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                  <MessageSquare size={18} style={{ color: '#C27803', flexShrink: 0, marginTop: '2px' }} />
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

          </>
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

      {/* Video Wish Stories Player Modal */}
      {showStoriesPlayer && videoWishes.length > 0 && (
        <VideoWishStoriesPlayer
          wishes={videoWishes}
          initialIndex={activeStoryIndex}
          coupleOrHost={event?.coupleOrHost || 'Tuan Rumah'}
          onClose={() => setShowStoriesPlayer(false)}
        />
      )}

      {/* Mayar Payment Modal for Pending Event */}
      <MayarPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSuccess={async () => {
          setPaymentModalOpen(false);
          if (!event) return;
          try {
            const res = await authFetch('/api/events', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: event.id,
                paymentStatus: 'paid',
              }),
            });
            const data = await res.json();
            if (data.success && data.event) {
              setEvent(data.event);
              setEvents(prev => prev.map(ev => ev.id === data.event.id ? data.event : ev));
              toast.success('Pembayaran berhasil dikonfirmasi! Album acara Anda kini telah aktif sepenuhnya.');
            } else {
              toast.error(data.error || 'Gagal memperbarui status pembayaran acara.');
            }
          } catch {
            toast.error('Gagal menghubungi server untuk memperbarui status pembayaran.');
          }
        }}
        title={pendingPaymentData?.title || 'Pelunasan Paket Album'}
        description={pendingPaymentData?.description || ''}
        amount={pendingPaymentData?.amount || 499000}
        invoiceId={event ? `inv_${event.id}` : undefined}
        isSimulation={pendingPaymentData?.isSimulation}
      />
    </div>
  );
}
