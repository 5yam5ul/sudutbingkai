'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import NumberFlow from '@number-flow/react';
import {
  Check, CheckCircle2, ChevronLeft, ChevronRight, Download,
  Folder, FolderOpen, Heart, Layers, MessageSquare, RefreshCw,
  Search, Send, Share2, Sliders, X, ZoomIn, Camera,
  AlertCircle, ShieldCheck, Clock, ExternalLink
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
  const [gridColumns, setGridColumns] = useState<2 | 4 | 6>(2);
  const [sortOrder, setSortOrder] = useState<'default' | 'random'>('default');

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const touchStartXRef = useRef<number>(0);
  const touchEndXRef = useRef<number>(0);

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

          // Populate existing selections if any
          const initialMap = new Map<string, ProofingSelectedItem>();
          (data.session.selectedPhotos || []).forEach((item: ProofingSelectedItem) => {
            initialMap.set(item.id, item);
          });
          setSelectedMap(initialMap);

          // Fetch Drive files for the root folder
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
          note: noteText
        });
      }
      return next;
    });
  };

  // Sorting
  const toggleSort = () => {
    if (sortOrder === 'default') {
      // Shuffle photos
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
      toast.info('Urutan foto dikembalikan ke default');
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

        // Format WhatsApp chat message
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
          // Fallback copy to clipboard
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FBFBFA' }}>
        <div className="flex flex-col items-center gap-3 text-[#C27803]">
          <RefreshCw size={32} className="animate-spin" />
          <span className="font-mono text-[13px] font-bold tracking-wider">MEMUAT PORTAL EKSKLUSIF...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center" style={{ background: '#FBFBFA' }}>
        <div className="glass-card max-w-md p-8 rounded-3xl flex flex-col items-center gap-4">
          <AlertCircle size={48} className="text-[#C27803]" />
          <h2 className="text-[20px] font-bold text-[#1D1D1F]">Sesi Proofing Tidak Ditemukan</h2>
          <p className="text-[14px] text-[#6E6E73] leading-relaxed">
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
    <div className="min-h-screen flex flex-col" style={{ background: '#FBFBFA', color: '#1D1D1F' }}>
      {/* 1. TOP HEADER BRANDING */}
      <header className="sticky top-0 z-40 glass-nav border-b border-black/5 px-4 md:px-8 py-3.5 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Vendor Studio Info */}
          <div className="flex items-center gap-3 min-w-0">
            {session.vendorLogo ? (
              <img
                src={formatSafeMediaUrl(session.vendorLogo)}
                alt={session.vendorName || 'Studio'}
                className="w-10 h-10 rounded-full object-cover border border-black/10 shadow-sm flex-shrink-0"
              />
            ) : (
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0"
                style={{ background: '#1D1D1F' }}
              >
                <Camera size={18} color="#C27803" />
              </div>
            )}
            <div className="min-w-0">
              <span className="text-[10.5px] font-mono tracking-widest text-[#C27803] uppercase font-bold block">
                {session.vendorName || 'STUDIO FOTOGRAFI'}
              </span>
              <h1 className="text-[15px] md:text-[17px] font-bold text-[#1D1D1F] truncate m-0">
                {session.clientName}
              </h1>
            </div>
          </div>

          {/* Odometer Quota Box */}
          <div 
            className="flex items-center gap-3 px-4 py-2 rounded-2xl border"
            style={{ 
              background: 'rgba(255, 255, 255, 0.85)', 
              borderColor: currentCount >= quota ? '#C27803' : 'rgba(0, 0, 0, 0.08)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}
          >
            <div className="text-right">
              <span className="text-[9.5px] font-mono uppercase tracking-wider text-[#86868B] block">
                KUOTA TERPILIH
              </span>
              <div className="flex items-center justify-end gap-1 font-bold text-[15px] font-mono" style={{ color: currentCount >= quota ? '#C27803' : '#1D1D1F' }}>
                <NumberFlow value={currentCount} format={{ minimumIntegerDigits: 2 }} />
                <span className="text-[#86868B]">/ {quota}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 2. SUB-BAR: CONTROLS & FOLDER NAVIGATION */}
      <section className="border-b border-black/5 bg-white/60 px-4 md:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Breadcrumb & Subfolder Navigation */}
          <div className="flex items-center gap-2 flex-wrap text-[13px]">
            {folderHistory.length > 0 && (
              <button
                onClick={handleNavigateBackFolder}
                className="glass-pill px-3 py-1.5 flex items-center gap-1 font-medium text-[12px] text-[#1D1D1F] hover:bg-black/5"
              >
                <ChevronLeft size={14} />
                <span>Kembali</span>
              </button>
            )}
            <div className="flex items-center gap-1.5 font-semibold text-[#1D1D1F]">
              <FolderOpen size={15} className="text-[#C27803]" />
              <span>{currentFolderName}</span>
              <span className="text-[#86868B] text-[11.5px] font-normal">
                ({displayedPhotos.length} foto)
              </span>
            </div>
          </div>

          {/* Action Tools: Filter, Sort, Grid Mode */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle: All vs Selected */}
            <button
              onClick={() => setViewFilter(prev => prev === 'all' ? 'selected' : 'all')}
              className={`glass-pill px-3.5 py-1.5 text-[12px] font-medium flex items-center gap-1.5 transition-all ${
                viewFilter === 'selected' 
                  ? 'bg-[#1D1D1F] text-white shadow-sm' 
                  : 'text-[#1D1D1F] hover:bg-black/5'
              }`}
            >
              <Heart size={13} fill={viewFilter === 'selected' ? '#C27803' : 'none'} color={viewFilter === 'selected' ? '#C27803' : 'currentColor'} />
              <span>{viewFilter === 'selected' ? 'Lihat Semua Foto' : `Pilihan Saya (${currentCount})`}</span>
            </button>

            {/* Randomize / Sort */}
            <button
              onClick={toggleSort}
              className="glass-pill px-3 py-1.5 text-[12px] font-medium flex items-center gap-1.5 text-[#1D1D1F] hover:bg-black/5"
              title="Acak urutan foto agar tidak bosan melihat pose mirip berturut-turut"
            >
              <RefreshCw size={12} className={sortOrder === 'random' ? 'text-[#C27803]' : ''} />
              <span>{sortOrder === 'random' ? 'Urutan Acak' : 'Urutan Asli'}</span>
            </button>

            {/* Grid density toggle */}
            <div className="hidden sm:flex items-center bg-black/5 p-1 rounded-xl">
              {[2, 4, 6].map((col) => (
                <button
                  key={col}
                  onClick={() => setGridColumns(col as any)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all ${
                    gridColumns === col ? 'bg-white text-[#1D1D1F] shadow-xs' : 'text-[#86868B]'
                  }`}
                >
                  {col}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. SUB-FOLDERS CARDS (IF ANY) */}
      {subFolders.length > 0 && viewFilter === 'all' && (
        <section className="px-4 md:px-8 pt-4 pb-2 max-w-7xl mx-auto w-full">
          <span className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider block mb-2">
            Sub-Folder Sesi Foto:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {subFolders.map(folder => (
              <button
                key={folder.id}
                onClick={() => handleOpenSubFolder(folder)}
                className="p-3 rounded-2xl border border-black/8 bg-white hover:border-[#C27803] hover:shadow-md transition-all flex items-center gap-2.5 text-left group cursor-pointer"
              >
                <Folder size={18} className="text-[#C27803] group-hover:scale-110 transition-transform" />
                <span className="text-[12.5px] font-semibold text-[#1D1D1F] truncate flex-1">
                  {folder.name}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 4. MAIN GALLERY GRID */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-6 pb-36">
        {loadingDrive ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-[#C27803]">
            <RefreshCw size={28} className="animate-spin" />
            <span className="font-mono text-[12px] font-semibold">MENARIK FOTO DARI GOOGLE DRIVE...</span>
          </div>
        ) : displayedPhotos.length === 0 ? (
          <div className="py-24 text-center">
            <div className="glass-card max-w-md mx-auto p-8 rounded-3xl">
              <Heart size={36} className="text-[#C27803] mx-auto mb-3" />
              <h3 className="text-[16px] font-bold text-[#1D1D1F] mb-1">
                {viewFilter === 'selected' ? 'Belum Ada Foto yang Dipilih' : 'Folder ini Kosong'}
              </h3>
              <p className="text-[13px] text-[#6E6E73]">
                {viewFilter === 'selected' 
                  ? 'Ketuk foto mana saja di galeri untuk menandainya ke dalam pilihan album Anda.' 
                  : 'Tidak ada file foto dalam folder ini.'}
              </p>
            </div>
          </div>
        ) : (
          <div 
            className={`grid gap-3 md:gap-4.5 ${
              gridColumns === 2 
                ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4' 
                : gridColumns === 4 
                  ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6' 
                  : 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8'
            }`}
          >
            {displayedPhotos.map((photo, index) => {
              const isSelected = selectedMap.has(photo.id);
              const selectedItem = selectedMap.get(photo.id);
              const hasNote = Boolean(selectedItem?.note && selectedItem.note.trim());

              return (
                <div
                  key={photo.id}
                  className={`group relative rounded-2xl overflow-hidden aspect-[4/5] bg-black/5 shadow-xs transition-all cursor-pointer ${
                    isSelected ? 'ring-3 ring-[#C27803] shadow-md scale-[0.98]' : 'hover:shadow-md'
                  }`}
                  onClick={() => toggleSelectPhoto(photo)}
                >
                  {/* Photo Thumbnail */}
                  <img
                    src={photo.url}
                    alt={photo.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />

                  {/* Subtle Studio Watermark Protection */}
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center pointer-events-none opacity-25 select-none">
                    <span className="font-mono text-[9px] md:text-[10px] uppercase font-bold text-white drop-shadow-md tracking-widest">
                      {session.vendorName || 'STUDIO PROOFING'}
                    </span>
                  </div>

                  {/* Top Badges (Selection & Note) */}
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10 pointer-events-none">
                    {hasNote && (
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white shadow-md text-[10px]"
                        style={{ background: '#F59E0B' }}
                        title="Ada catatan retouch"
                      >
                        <MessageSquare size={12} />
                      </div>
                    )}
                    <div 
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-white shadow-md transition-transform ${
                        isSelected ? 'bg-[#C27803] scale-100' : 'bg-black/30 backdrop-blur-sm scale-90 opacity-80'
                      }`}
                    >
                      {isSelected ? <Check size={14} strokeWidth={3} /> : null}
                    </div>
                  </div>

                  {/* Bottom File Label & Zoom Button */}
                  <div className="absolute inset-x-0 bottom-0 p-2 pt-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between text-white z-10">
                    <span className="text-[10.5px] font-mono truncate max-w-[70%] drop-shadow-sm font-medium">
                      {photo.name}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxIndex(index);
                      }}
                      className="w-6 h-6 rounded-lg bg-black/40 hover:bg-[#C27803] transition-colors flex items-center justify-center text-white"
                      title="Perbesar & beri instruksi edit"
                    >
                      <ZoomIn size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 5. FLOATING BOTTOM ACTION BAR */}
      <footer 
        className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-lg border-t border-black/8 shadow-2xl p-4 transition-transform"
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3.5">
          {/* Progress description */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div 
              className="w-11 h-11 rounded-2xl flex items-center justify-center font-mono font-bold text-white text-[15px] shadow-sm flex-shrink-0"
              style={{ background: '#1D1D1F' }}
            >
              {currentCount}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <strong className="text-[13.5px] text-[#1D1D1F]">
                  {currentCount >= quota ? 'Kuota Terpenuhi!' : `${quota - currentCount} Foto Lagi Diperlukan`}
                </strong>
                <span className="text-[11px] text-[#86868B] font-mono">
                  ({quotaPercent}%)
                </span>
              </div>
              <div className="w-48 bg-black/8 rounded-full h-1.5 mt-1 overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${quotaPercent}%`, background: '#C27803' }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleDownloadTxt}
              disabled={currentCount === 0}
              className="glass-pill px-3.5 py-2.5 text-[12.5px] font-semibold text-[#1D1D1F] hover:bg-black/5 disabled:opacity-40"
              title="Unduh daftar nama file (.txt)"
            >
              <Download size={14} className="inline mr-1" />
              <span>Unduh TXT</span>
            </button>

            <button
              type="button"
              onClick={handleSubmitSelection}
              disabled={isSubmitting || currentCount === 0}
              className="px-6 py-2.5 rounded-full text-white font-bold text-[13.5px] flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
              style={{ background: '#C27803' }}
            >
              <Send size={14} />
              <span>{isSubmitting ? 'Menyimpan...' : 'Kirim Pilihan ke Studio'}</span>
            </button>
          </div>
        </div>
      </footer>

      {/* 6. FULL-SCREEN LIGHTBOX MODAL */}
      {currentLightboxPhoto && (
        <div 
          className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white animate-fadeIn"
          onClick={() => setLightboxIndex(null)}
          onTouchStart={(e) => {
            touchStartXRef.current = e.changedTouches[0].screenX;
          }}
          onTouchEnd={(e) => {
            touchEndXRef.current = e.changedTouches[0].screenX;
            if (touchStartXRef.current - touchEndXRef.current > 50) {
              handleNextPhoto();
            } else if (touchEndXRef.current - touchStartXRef.current > 50) {
              handlePrevPhoto();
            }
          }}
        >
          {/* Lightbox Header */}
          <div 
            className="p-4 flex items-center justify-between border-b border-white/10 bg-black/40 backdrop-blur-md z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h4 className="text-[14px] font-bold text-white m-0">
                {currentLightboxPhoto.name}
              </h4>
              <span className="text-[11px] text-white/60 font-mono">
                Foto {lightboxIndex! + 1} dari {displayedPhotos.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Central Image View */}
          <div className="flex-1 relative flex items-center justify-center p-4 min-h-0">
            <img
              src={currentLightboxPhoto.fullUrl || currentLightboxPhoto.url}
              alt={currentLightboxPhoto.name}
              className="max-h-full max-w-full object-contain rounded-xl select-none shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Navigation Arrows */}
            {lightboxIndex! > 0 && (
              <button
                type="button"
                onClick={handlePrevPhoto}
                className="absolute left-4 w-11 h-11 rounded-full bg-black/60 hover:bg-[#C27803] flex items-center justify-center text-white transition-colors"
              >
                <ChevronLeft size={22} />
              </button>
            )}
            {lightboxIndex! < displayedPhotos.length - 1 && (
              <button
                type="button"
                onClick={handleNextPhoto}
                className="absolute right-4 w-11 h-11 rounded-full bg-black/60 hover:bg-[#C27803] flex items-center justify-center text-white transition-colors"
              >
                <ChevronRight size={22} />
              </button>
            )}
          </div>

          {/* Bottom Retouch Instruction & Selection Controls */}
          <div 
            className="p-4 border-t border-white/10 bg-black/70 backdrop-blur-lg flex flex-col md:flex-row items-center justify-between gap-3 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Note input for this specific photo */}
            <div className="w-full md:w-2/3">
              <input
                type="text"
                placeholder="Catatan edit khusus (contoh: tolong hilangkan jerawat, perbaiki dasi)..."
                value={selectedMap.get(currentLightboxPhoto.id)?.note || ''}
                onChange={(e) => updatePhotoNote(currentLightboxPhoto.id, e.target.value)}
                disabled={!selectedMap.has(currentLightboxPhoto.id)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-[13px] text-white placeholder:text-white/40 focus:outline-none focus:border-[#C27803] disabled:opacity-40"
              />
            </div>

            {/* Select/Deselect button */}
            <button
              type="button"
              onClick={() => toggleSelectPhoto(currentLightboxPhoto)}
              className={`w-full md:w-auto px-6 py-2.5 rounded-full font-bold text-[13px] flex items-center justify-center gap-2 transition-all ${
                selectedMap.has(currentLightboxPhoto.id)
                  ? 'bg-[#C27803] text-white shadow-lg'
                  : 'bg-white/15 hover:bg-white/25 text-white'
              }`}
            >
              <Check size={16} />
              <span>{selectedMap.has(currentLightboxPhoto.id) ? 'Foto Terpilih' : 'Pilih Foto Ini'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
