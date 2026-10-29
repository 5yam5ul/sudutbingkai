'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import NumberFlow from '@number-flow/react';
import {
  Check, ChevronLeft, ChevronRight, Download,
  Folder, FolderOpen, Heart, MessageSquare, RefreshCw,
  Send, Sliders, X, ZoomIn, Camera, AlertCircle, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { VendorProofingSession, ProofingSelectedItem } from '@/lib/types';
import { formatSafeMediaUrl } from '@/lib/media-url';

interface DrivePhoto {
  id: string;
  name: string;
  url: string;
  fullUrl: string;
  folderName?: string;
}

interface DriveFolder {
  id: string;
  name: string;
}

export default function ClientProofingPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [session, setSession] = useState<VendorProofingSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingDrive, setLoadingDrive] = useState(false);

  // Folder navigation
  const [currentFolderId, setCurrentFolderId] = useState<string>('');
  const [currentFolderName, setCurrentFolderName] = useState<string>('Galeri Utama');
  const [folderHistory, setFolderHistory] = useState<Array<{ id: string; name: string }>>([]);

  const [subFolders, setSubFolders] = useState<DriveFolder[]>([]);
  const [photos, setPhotos] = useState<DrivePhoto[]>([]);
  const [originalPhotos, setOriginalPhotos] = useState<DrivePhoto[]>([]);

  // Selection state
  const [selectedMap, setSelectedMap] = useState<Map<string, ProofingSelectedItem>>(new Map());
  const [viewFilter, setViewFilter] = useState<'all' | 'selected'>('all');
  const [gridColumns, setGridColumns] = useState<2 | 4 | 6>(4);
  const [sortOrder, setSortOrder] = useState<'default' | 'random'>('default');

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // 1. Fetch proofing session data
  useEffect(() => {
    if (!slug) return;
    setLoadingSession(true);

    fetch(`/api/proofing/session?slug=${encodeURIComponent(slug)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.session) {
          setSession(data.session);
          setCurrentFolderId(data.session.gdriveFolderId);

          const initialMap = new Map<string, ProofingSelectedItem>();
          (data.session.selectedPhotos || []).forEach((item: ProofingSelectedItem) => {
            initialMap.set(item.id, item);
          });
          setSelectedMap(initialMap);

          loadDriveFolder(data.session.gdriveFolderId, 'Galeri Utama');
        } else {
          toast.error(data.error || 'Sesi proofing tidak ditemukan');
        }
      })
      .catch(err => {
        console.error(err);
        toast.error('Gagal terhubung ke server');
      })
      .finally(() => setLoadingSession(false));
  }, [slug]);

  // 2. Fetch Google Drive folder content via backend proxy
  const loadDriveFolder = async (folderId: string, folderName: string) => {
    if (!folderId) return;
    setLoadingDrive(true);

    try {
      const res = await fetch(`/api/proofing/drive?folderId=${encodeURIComponent(folderId)}`);
      const data = await res.json();

      if (data.success) {
        setSubFolders(data.folders || []);
        const loadedPhotos: DrivePhoto[] = (data.photos || []).map((p: any) => ({
          ...p,
          folderName
        }));
        setPhotos(loadedPhotos);
        setOriginalPhotos(loadedPhotos);
        setCurrentFolderName(folderName);
        setCurrentFolderId(folderId);
      } else {
        toast.error(data.error || 'Gagal memuat foto dari Google Drive');
      }
    } catch {
      toast.error('Koneksi ke Google Drive terputus');
    } finally {
      setLoadingDrive(false);
    }
  };

  // Subfolder navigation handlers
  const handleOpenSubFolder = (folder: DriveFolder) => {
    setFolderHistory(prev => [...prev, { id: currentFolderId, name: currentFolderName }]);
    loadDriveFolder(folder.id, folder.name);
  };

  const handleNavigateBackFolder = () => {
    if (folderHistory.length === 0) return;
    const historyCopy = [...folderHistory];
    const prev = historyCopy.pop();
    setFolderHistory(historyCopy);
    if (prev) {
      loadDriveFolder(prev.id, prev.name);
    }
  };

  // Toggle selection
  const toggleSelectPhoto = (photo: DrivePhoto) => {
    const quota = session?.quotaLimit || 50;

    setSelectedMap(prev => {
      const next = new Map(prev);
      if (next.has(photo.id)) {
        next.delete(photo.id);
      } else {
        if (next.size >= quota) {
          toast.error(`Batas kuota ${quota} foto telah tercapai.`);
          return prev;
        }
        next.set(photo.id, {
          id: photo.id,
          name: photo.name,
          folderName: photo.folderName,
          url: photo.url,
          note: ''
        });
      }
      return next;
    });
  };

  const updatePhotoNote = (photoId: string, noteText: string) => {
    setSelectedMap(prev => {
      const next = new Map(prev);
      const existing = next.get(photoId);
      if (existing) {
        next.set(photoId, {
          ...existing,
          note: noteText,
          notes: noteText
        });
      }
      return next;
    });
  };

  // Sorting
  const toggleSort = () => {
    if (sortOrder === 'default') {
      const shuffled = [...photos];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setPhotos(shuffled);
      setSortOrder('random');
      toast.info('Urutan foto diacak');
    } else {
      setPhotos([...originalPhotos]);
      setSortOrder('default');
      toast.info('Urutan foto dikembalikan ke awal');
    }
  };

  // Displayed photos depending on view filter
  const displayedPhotos = viewFilter === 'selected'
    ? Array.from(selectedMap.values()).map(s => ({
        id: s.id,
        name: s.name,
        url: s.url || '',
        fullUrl: s.url ? s.url.replace('=s500', '=s1600') : '',
        folderName: s.folderName
      }))
    : photos;

  // Submit selection to server and WhatsApp
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleSubmitSelection = async () => {
    if (selectedMap.size === 0) {
      toast.error('Pilih minimal 1 foto terlebih dahulu.');
      return;
    }

    if (!session) return;
    setIsSubmitting(true);

    try {
      const selectedList = Array.from(selectedMap.values());
      const res = await fetch('/api/proofing/session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: session.id,
          selectedPhotos: selectedList,
          status: 'submitted'
        })
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Pilihan foto berhasil disimpan!');

        const vendorPhone = session.vendorWhatsapp ? session.vendorWhatsapp.replace(/[^0-9]/g, '') : '';
        const studioName = session.vendorName || 'Studio Fotografi';

        let waMessage = `Halo ${studioName},\nSaya *${session.clientName}* telah selesai menyeleksi foto untuk sesi album kami.\n\n`;
        waMessage += `*Total Foto Dipilih:* ${selectedList.length} / ${session.quotaLimit} Foto\n`;
        waMessage += `*Tautan Portal:* ${window.location.href}\n\n`;
        waMessage += `*Daftar File Foto:*\n`;

        selectedList.forEach((item, index) => {
          waMessage += `${index + 1}. ${item.name}${item.folderName ? ` (${item.folderName})` : ''}\n`;
          if (item.note && item.note.trim()) {
            waMessage += `   _Catatan Edit: ${item.note.trim()}_\n`;
          }
        });

        waMessage += `\nTerima kasih! Mohon diproses untuk tahapan editing ya.`;

        if (vendorPhone) {
          const cleanPhone = vendorPhone.startsWith('0') ? '62' + vendorPhone.slice(1) : vendorPhone;
          window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMessage)}`, '_blank');
        } else {
          navigator.clipboard.writeText(waMessage);
          toast.success('Daftar foto disalin! Silakan kirimkan ke WhatsApp studio.');
        }
      } else {
        toast.error(data.error || 'Gagal menyimpan pilihan');
      }
    } catch {
      toast.error('Terjadi kesalahan saat menyimpan pilihan');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Download .TXT selection list
  const handleDownloadTxt = () => {
    if (selectedMap.size === 0) return;
    const selectedList = Array.from(selectedMap.values());
    const studioName = session?.vendorName || 'Studio';

    let txt = `====================================================\n`;
    txt += `DAFTAR FOTO PILIHAN KLIEN — ${studioName.toUpperCase()}\n`;
    txt += `Klien: ${session?.clientName || '-'}\n`;
    txt += `Total Foto: ${selectedList.length} Foto\n`;
    txt += `Tanggal Seleksi: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}\n`;
    txt += `====================================================\n\n`;

    selectedList.forEach((item, idx) => {
      txt += `${idx + 1}. ${item.name}\n`;
      if (item.note) txt += `   Instruksi: ${item.note}\n`;
    });

    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `List_Foto_${(session?.clientName || 'klien').replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Daftar foto berhasil diunduh sebagai file teks');
  };

  // Lightbox navigation
  const currentLightboxPhoto = lightboxIndex !== null ? displayedPhotos[lightboxIndex] : null;

  const handleNextPhoto = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (lightboxIndex !== null && lightboxIndex < displayedPhotos.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    }
  };

  const handlePrevPhoto = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    }
  };

  if (loadingSession) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FBFBFA' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', color: '#C27803' }}>
          <RefreshCw size={36} className="animate-spin" />
          <span className="font-mono-film" style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', color: '#C27803' }}>
            MEMUAT PORTAL EKSKLUSIF...
          </span>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#FBFBFA' }}>
        <div className="glass-card" style={{ maxWidth: '440px', padding: '36px', borderRadius: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(194,120,3,0.1)', color: '#C27803', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={32} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1D1D1F', margin: 0 }}>Sesi Proofing Tidak Ditemukan</h2>
          <p style={{ fontSize: '14px', color: '#6E6E73', lineHeight: 1.6, margin: 0 }}>
            Tautan ini tidak valid atau telah dihapus oleh pihak studio foto. Silakan hubungi studio Anda untuk konfirmasi tautan.
          </p>
        </div>
      </div>
    );
  }

  const quota = session.quotaLimit || 50;
  const currentCount = selectedMap.size;
  const quotaPercent = Math.min(100, Math.round((currentCount / quota) * 100));

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#FBFBFA', color: '#1D1D1F' }}>
      
      {/* 1. TOP NAVBAR BRANDING */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
          padding: '12px 24px'
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          {/* Studio Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            {session.vendorLogo ? (
              <img
                src={formatSafeMediaUrl(session.vendorLogo)}
                alt={session.vendorName || 'Studio'}
                style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }}
              />
            ) : (
              <div 
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: '#1D1D1F',
                  color: '#C27803',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Camera size={20} />
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <span className="font-mono-film" style={{ fontSize: '11px', color: '#C27803', textTransform: 'uppercase', display: 'block', letterSpacing: '0.04em' }}>
                {session.vendorName || 'STUDIO FOTOGRAFI'}
              </span>
              <h1 style={{ fontSize: '16px', fontWeight: 700, color: '#1D1D1F', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {session.clientName}
              </h1>
            </div>
          </div>

          {/* Odometer Capsule */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '8px 18px',
              borderRadius: '999px',
              background: '#FFFFFF',
              border: currentCount >= quota ? '1.5px solid #C27803' : '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ textAlign: 'right' }}>
              <span className="font-mono-film" style={{ fontSize: '10px', color: '#86868B', display: 'block', textTransform: 'uppercase' }}>
                KUOTA TERPILIH
              </span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', fontWeight: 700, fontSize: '16px', fontFamily: 'monospace', color: currentCount >= quota ? '#C27803' : '#1D1D1F' }}>
                <NumberFlow value={currentCount} format={{ minimumIntegerDigits: 2 }} />
                <span style={{ color: '#86868B', fontWeight: 500 }}>/ {quota}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 2. HERO / WELCOME & PROGRESS SECTION */}
      <section style={{ maxWidth: '1280px', margin: '0 auto', width: '100%', padding: '32px 24px 16px' }}>
        <div className="glass-card" style={{ padding: '28px 32px', borderRadius: '24px', background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(254,249,242,0.7) 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ maxWidth: '680px' }}>
              <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '6px', fontSize: '12px' }}>
                PORTAL SELEKSI FOTO EKSKLUSIF
              </span>
              <h2 style={{ fontSize: '32px', fontWeight: 700, color: '#1D1D1F', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                {session.clientName}
              </h2>
              <p style={{ color: '#6E6E73', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                Silakan tandai foto-foto favorit Anda hingga batas <strong>{quota} foto</strong> untuk diproses retouching dan dicetak ke dalam album. Ketuk foto mana saja untuk memperbesar atau memberikan catatan edit khusus.
              </p>
            </div>

            {/* Quota Progress Pill */}
            <div style={{ minWidth: '220px', background: '#FFFFFF', padding: '16px 20px', borderRadius: '18px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#1D1D1F' }}>
                  {currentCount >= quota ? 'Kuota Lengkap' : `${quota - currentCount} Foto Tersisa`}
                </span>
                <span className="font-mono-film" style={{ fontSize: '12px', fontWeight: 700, color: '#C27803' }}>
                  {quotaPercent}%
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${quotaPercent}%`,
                    background: currentCount >= quota ? '#10B981' : '#C27803',
                    borderRadius: '999px',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SUB-BAR: CONTROLS & FOLDER NAVIGATION */}
      <section style={{ maxWidth: '1280px', margin: '0 auto', width: '100%', padding: '12px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', background: '#FFFFFF', padding: '12px 20px', borderRadius: '18px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          {/* Breadcrumb / Current Folder */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {folderHistory.length > 0 && (
              <button
                onClick={handleNavigateBackFolder}
                className="glass-pill"
                style={{ padding: '6px 14px', fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
              >
                <ChevronLeft size={15} />
                Kembali
              </button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 700, color: '#1D1D1F' }}>
              <FolderOpen size={17} color="#C27803" />
              <span>{currentFolderName}</span>
              <span style={{ fontSize: '12px', color: '#86868B', fontWeight: 400 }}>
                ({displayedPhotos.length} foto)
              </span>
            </div>
          </div>

          {/* Action Tools */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* View Filter Pill */}
            <button
              onClick={() => setViewFilter(prev => prev === 'all' ? 'selected' : 'all')}
              className="glass-pill"
              style={{
                background: viewFilter === 'selected' ? '#1D1D1F' : 'rgba(255, 255, 255, 0.9)',
                color: viewFilter === 'selected' ? '#FFFFFF' : '#1D1D1F',
                padding: '8px 16px',
                fontSize: '12.5px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                border: viewFilter === 'selected' ? '1px solid #1D1D1F' : '1px solid rgba(0,0,0,0.1)'
              }}
            >
              <Heart size={14} fill={viewFilter === 'selected' ? '#C27803' : 'none'} color={viewFilter === 'selected' ? '#C27803' : 'currentColor'} />
              <span>{viewFilter === 'selected' ? 'Lihat Semua Foto' : `Pilihan Saya (${currentCount})`}</span>
            </button>

            {/* Randomize order */}
            <button
              onClick={toggleSort}
              className="glass-pill"
              style={{ padding: '8px 14px', fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
              title="Acak urutan foto agar tidak jenuh melihat pose berturut-turut"
            >
              <RefreshCw size={13} color={sortOrder === 'random' ? '#C27803' : 'currentColor'} />
              <span>{sortOrder === 'random' ? 'Acak' : 'Urutan Asli'}</span>
            </button>

            {/* Grid density buttons */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.04)', padding: '3px', borderRadius: '12px' }}>
              {[2, 4, 6].map((col) => (
                <button
                  key={col}
                  onClick={() => setGridColumns(col as any)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: gridColumns === col ? '#FFFFFF' : 'transparent',
                    color: gridColumns === col ? '#1D1D1F' : '#86868B',
                    boxShadow: gridColumns === col ? '0 1px 4px rgba(0,0,0,0.08)' : 'none'
                  }}
                >
                  {col}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. SUB-FOLDERS CHIPS (IF ANY) */}
      {subFolders.length > 0 && viewFilter === 'all' && (
        <section style={{ maxWidth: '1280px', margin: '0 auto', width: '100%', padding: '0 24px 16px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
            Sub-Folder Acara / Sesi:
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
            {subFolders.map(folder => (
              <button
                key={folder.id}
                onClick={() => handleOpenSubFolder(folder)}
                style={{
                  padding: '12px 16px',
                  borderRadius: '14px',
                  border: '1px solid rgba(0,0,0,0.08)',
                  background: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease'
                }}
              >
                <Folder size={18} color="#C27803" />
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1D1D1F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {folder.name}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 5. MAIN PHOTO GALLERY GRID */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', width: '100%', padding: '0 24px 140px', flex: 1 }}>
        {loadingDrive ? (
          <div style={{ padding: '80px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', color: '#C27803' }}>
            <RefreshCw size={32} className="animate-spin" />
            <span className="font-mono-film" style={{ fontSize: '13px', fontWeight: 700 }}>MENARIK FOTO DARI GOOGLE DRIVE...</span>
          </div>
        ) : displayedPhotos.length === 0 ? (
          <div style={{ padding: '80px 0', textAlign: 'center' }}>
            <div className="glass-card" style={{ maxWidth: '420px', margin: '0 auto', padding: '36px', borderRadius: '24px' }}>
              <Heart size={36} color="#C27803" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#1D1D1F', marginBottom: '6px' }}>
                {viewFilter === 'selected' ? 'Belum Ada Foto Dipilih' : 'Folder ini Kosong'}
              </h3>
              <p style={{ fontSize: '13.5px', color: '#6E6E73', margin: 0, lineHeight: 1.5 }}>
                {viewFilter === 'selected'
                  ? 'Klik tombol centang di foto mana saja pada galeri untuk menyimpannya ke pilihan album Anda.'
                  : 'Tidak ada file foto di folder ini.'}
              </p>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: gridColumns === 2 
                ? 'repeat(auto-fill, minmax(360px, 1fr))' 
                : gridColumns === 4 
                  ? 'repeat(auto-fill, minmax(240px, 1fr))' 
                  : 'repeat(auto-fill, minmax(170px, 1fr))',
              gap: '16px'
            }}
          >
            {displayedPhotos.map((photo, index) => {
              const isSelected = selectedMap.has(photo.id);
              const selectedItem = selectedMap.get(photo.id);
              const hasNote = Boolean(selectedItem?.note && selectedItem.note.trim());

              return (
                <div
                  key={photo.id}
                  onClick={() => toggleSelectPhoto(photo)}
                  style={{
                    position: 'relative',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    aspectRatio: '4 / 3',
                    background: '#EEEEEC',
                    cursor: 'pointer',
                    border: isSelected ? '2.5px solid #C27803' : '1px solid rgba(0,0,0,0.06)',
                    boxShadow: isSelected ? '0 12px 28px rgba(194, 120, 3, 0.22)' : '0 2px 8px rgba(0,0,0,0.04)',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    transform: isSelected ? 'scale(0.985)' : 'none'
                  }}
                >
                  {/* Photo Image */}
                  <img
                    src={photo.url}
                    alt={photo.name}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />

                  {/* Watermark Protection */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      pointerEvents: 'none',
                      color: 'rgba(255, 255, 255, 0.35)',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      textShadow: '0 2px 4px rgba(0,0,0,0.6)',
                      textTransform: 'uppercase',
                      textAlign: 'center',
                      width: '90%'
                    }}
                  >
                    {session.vendorName || 'STUDIO PROOFING'}
                  </div>

                  {/* Top Right Badges (Checkmark & Note) */}
                  <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', alignItems: 'center', gap: '6px', zIndex: 10 }}>
                    {hasNote && (
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: '#F59E0B',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                        }}
                        title="Ada catatan retouch khusus"
                      >
                        <MessageSquare size={13} />
                      </div>
                    )}
                    <div
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        background: isSelected ? '#C27803' : 'rgba(0,0,0,0.45)',
                        backdropFilter: 'blur(8px)',
                        color: '#FFFFFF',
                        border: isSelected ? 'none' : '1.5px solid rgba(255,255,255,0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {isSelected && <Check size={16} strokeWidth={3} />}
                    </div>
                  </div>

                  {/* Bottom Gradient Bar: Name & Zoom */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: '24px 12px 10px',
                      background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      color: '#FFFFFF',
                      zIndex: 10
                    }}
                  >
                    <span className="font-mono-film" style={{ fontSize: '11px', fontWeight: 600, maxWidth: '75%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
                      {photo.name}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxIndex(index);
                      }}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.25)',
                        backdropFilter: 'blur(4px)',
                        border: 'none',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                      title="Perbesar foto & beri instruksi retouch"
                    >
                      <ZoomIn size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 6. FLOATING BOTTOM BAR (APPLE STYLE) */}
      <footer
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 40,
          background: 'rgba(29, 29, 31, 0.94)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '999px',
          padding: '10px 18px 10px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          boxShadow: '0 20px 48px rgba(0,0,0,0.35)',
          border: '1px solid rgba(255,255,255,0.15)',
          maxWidth: '92vw'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#C27803',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontFamily: 'monospace',
              fontSize: '14px'
            }}
          >
            {currentCount}
          </div>
          <div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', display: 'block' }}>
              {currentCount >= quota ? 'Kuota Terpenuhi!' : `${quota - currentCount} Foto Lagi`}
            </span>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
              Target: {quota} Foto Album
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleDownloadTxt}
            disabled={currentCount === 0}
            style={{
              padding: '9px 14px',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.12)',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 600,
              cursor: currentCount > 0 ? 'pointer' : 'not-allowed',
              opacity: currentCount > 0 ? 1 : 0.4,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Download daftar foto sebagai file teks"
          >
            <Download size={13} />
            <span className="desktop-only">Unduh .TXT</span>
          </button>

          <button
            type="button"
            onClick={handleSubmitSelection}
            disabled={isSubmitting || currentCount === 0}
            style={{
              padding: '10px 20px',
              borderRadius: '999px',
              background: currentCount >= quota ? '#10B981' : '#C27803',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 700,
              cursor: currentCount > 0 ? 'pointer' : 'not-allowed',
              opacity: currentCount > 0 ? 1 : 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
            }}
          >
            <Send size={14} />
            <span>{isSubmitting ? 'Menyimpan...' : 'Kirim Pilihan (WhatsApp)'}</span>
          </button>
        </div>
      </footer>

      {/* 7. FULLSCREEN LIGHTBOX & NOTE MODAL */}
      {lightboxIndex !== null && currentLightboxPhoto && (
        <div
          onClick={() => setLightboxIndex(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.94)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '20px'
          }}
        >
          {/* Top Bar Lightbox */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#FFFFFF',
              maxWidth: '1200px',
              margin: '0 auto',
              width: '100%'
            }}
          >
            <div>
              <span className="font-mono-film" style={{ fontSize: '13px', color: '#C27803', display: 'block' }}>
                FOTO #{lightboxIndex + 1} DARI {displayedPhotos.length}
              </span>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>{currentLightboxPhoto.name}</h4>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => toggleSelectPhoto(currentLightboxPhoto)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '999px',
                  background: selectedMap.has(currentLightboxPhoto.id) ? '#C27803' : 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Check size={14} />
                {selectedMap.has(currentLightboxPhoto.id) ? 'Foto Terpilih' : 'Pilih Foto Ini'}
              </button>

              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Center Image Container */}
          <div
            style={{
              flex: 1,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              padding: '16px 0'
            }}
          >
            {/* Prev Button */}
            {lightboxIndex > 0 && (
              <button
                type="button"
                onClick={handlePrevPhoto}
                style={{
                  position: 'absolute',
                  left: '20px',
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(8px)',
                  border: 'none',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 20
                }}
              >
                <ChevronLeft size={28} />
              </button>
            )}

            {/* High-Res Image with Watermark */}
            <div style={{ position: 'relative', maxHeight: '100%', maxWidth: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={currentLightboxPhoto.fullUrl || currentLightboxPhoto.url}
                alt={currentLightboxPhoto.name}
                onClick={(e) => e.stopPropagation()}
                style={{
                  maxHeight: '70vh',
                  maxWidth: '85vw',
                  objectFit: 'contain',
                  borderRadius: '12px',
                  boxShadow: '0 20px 48px rgba(0,0,0,0.5)'
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'none',
                  color: 'rgba(255, 255, 255, 0.3)',
                  fontFamily: 'monospace',
                  fontSize: '16px',
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  textShadow: '0 2px 8px rgba(0,0,0,0.7)',
                  textAlign: 'center',
                  width: '90%'
                }}
              >
                {session.vendorName || 'STUDIO PROOFING'}
              </div>
            </div>

            {/* Next Button */}
            {lightboxIndex < displayedPhotos.length - 1 && (
              <button
                type="button"
                onClick={handleNextPhoto}
                style={{
                  position: 'absolute',
                  right: '20px',
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(8px)',
                  border: 'none',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 20
                }}
              >
                <ChevronRight size={28} />
              </button>
            )}
          </div>

          {/* Bottom Retouch Note Box */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '640px',
              margin: '0 auto',
              width: '100%',
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(16px)',
              borderRadius: '16px',
              padding: '12px 16px',
              border: '1px solid rgba(255, 255, 255, 0.15)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <MessageSquare size={14} color="#C27803" />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#FFFFFF' }}>
                Catatan Khusus Retouch / Edit (Opsional):
              </span>
            </div>
            <input
              type="text"
              value={selectedMap.get(currentLightboxPhoto.id)?.note || ''}
              onChange={(e) => {
                // Auto-select if note is typed
                if (!selectedMap.has(currentLightboxPhoto.id)) {
                  toggleSelectPhoto(currentLightboxPhoto);
                }
                updatePhotoNote(currentLightboxPhoto.id, e.target.value);
              }}
              placeholder="Contoh: Tolong hilangkan kerutan jas atau rapikan poni rambut..."
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '10px',
                padding: '10px 14px',
                color: '#FFFFFF',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
