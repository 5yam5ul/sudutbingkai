'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, ExternalLink, Copy, Check, Plus, Trash2, Edit3, 
  Image as ImageIcon, BookOpen, AlertCircle, Loader2, Save, 
  Globe, MessageCircle, RefreshCw, Upload, Eye
} from 'lucide-react';
import { UserAccount, VendorPortfolioAlbum } from '@/lib/types';
import { authFetch } from '@/lib/auth';
import { toast } from 'sonner';

function InstagramIcon({ size = 15, className = '' }: { size?: number; className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  );
}

interface VendorPortfolioTabProps {
  vendor: UserAccount;
  onUpdateVendor?: (updated: Partial<UserAccount>) => void;
}

interface DriveSamplePhoto {
  id: string;
  name: string;
  url: string;
  fullUrl: string;
}

export default function VendorPortfolioTab({ vendor, onUpdateVendor }: VendorPortfolioTabProps) {
  // Form profile states
  const [slug, setSlug] = useState('');
  const [bio, setBio] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [albums, setAlbums] = useState<VendorPortfolioAlbum[]>([]);
  
  // UI states
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Modal Add/Edit Album states
  const [albumModalOpen, setAlbumModalOpen] = useState(false);
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null);
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumDesc, setAlbumDesc] = useState('');
  const [albumDriveUrl, setAlbumDriveUrl] = useState('');
  const [albumCoverUrl, setAlbumCoverUrl] = useState('');
  const [coverSource, setCoverSource] = useState<'drive' | 'custom'>('drive');

  // Drive test & thumbnail picker states
  const [isCheckingDrive, setIsCheckingDrive] = useState(false);
  const [drivePhotos, setDrivePhotos] = useState<DriveSamplePhoto[]>([]);
  const [driveCheckError, setDriveCheckError] = useState<string | null>(null);

  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const albumCoverInputRef = useRef<HTMLInputElement>(null);

  // Initialize data
  useEffect(() => {
    if (!vendor?.id) return;

    const initialSlug = vendor.slug || (vendor.companyName || vendor.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    setSlug(initialSlug);
    setBio(vendor.bio || '');
    setCoverUrl(vendor.coverUrl || '');
    setWhatsapp(vendor.whatsapp || vendor.phone || '');
    setWebsite(vendor.website || '');
    setInstagram(vendor.instagram || '');
    if (Array.isArray(vendor.portfolioAlbums)) {
      setAlbums(vendor.portfolioAlbums);
    }

    // Refresh from API
    setIsLoadingPortfolio(true);
    authFetch(`/api/vendors/portfolio?vendorId=${encodeURIComponent(vendor.id)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.portfolio) {
          const p = data.portfolio;
          if (p.slug) setSlug(p.slug);
          if (p.bio !== undefined) setBio(p.bio);
          if (p.coverUrl !== undefined) setCoverUrl(p.coverUrl);
          if (p.whatsapp !== undefined) setWhatsapp(p.whatsapp);
          if (p.website !== undefined) setWebsite(p.website);
          if (p.instagram !== undefined) setInstagram(p.instagram);
          if (Array.isArray(p.albums)) setAlbums(p.albums);
        }
      })
      .catch(err => console.warn('Portfolio load notice:', err))
      .finally(() => setIsLoadingPortfolio(false));
  }, [vendor]);

  const publicPortfolioUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/${slug}` 
    : `https://sudutbingkai.id/${slug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicPortfolioUrl);
    setCopiedLink(true);
    toast.success('Link landing page portofolio berhasil disalin!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Handle Cover Banner Upload (Base64)
  const handleCoverFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran gambar cover maksimal 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) setCoverUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  // Handle Custom Album Cover Upload
  const handleAlbumCoverFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran gambar sampul album maksimal 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) setAlbumCoverUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  // Check Drive folder and get thumbnail previews
  const handleCheckDriveFolder = async () => {
    if (!albumDriveUrl.trim()) {
      toast.error('Masukkan link folder Google Drive terlebih dahulu');
      return;
    }

    setIsCheckingDrive(true);
    setDriveCheckError(null);
    setDrivePhotos([]);

    try {
      const res = await fetch(`/api/proofing/drive?folderId=${encodeURIComponent(albumDriveUrl.trim())}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal membaca folder Google Drive. Pastikan izin disetel ke "Siapa saja yang memiliki link dapat melihat".');
      }

      const fetchedPhotos: DriveSamplePhoto[] = data.photos || [];
      if (fetchedPhotos.length === 0) {
        setDriveCheckError('Folder Google Drive terdeteksi, namun belum ada file gambar atau sedang diproses.');
      } else {
        setDrivePhotos(fetchedPhotos);
        // Automatically select the 1st photo as cover if no cover selected yet
        if (!albumCoverUrl) {
          setAlbumCoverUrl(fetchedPhotos[0].url || fetchedPhotos[0].fullUrl);
        }
        toast.success(`Ditemukan ${fetchedPhotos.length} foto dari Google Drive!`);
      }
    } catch (err: any) {
      console.error('Drive check error:', err);
      setDriveCheckError(err.message || 'Kendala saat mengakses Google Drive');
      toast.error(err.message || 'Gagal mengakses Google Drive');
    } finally {
      setIsCheckingDrive(false);
    }
  };

  // Open modal to add new album
  const openAddAlbumModal = () => {
    setEditingAlbumId(null);
    setAlbumTitle('');
    setAlbumDesc('');
    setAlbumDriveUrl('');
    setAlbumCoverUrl('');
    setDrivePhotos([]);
    setDriveCheckError(null);
    setCoverSource('drive');
    setAlbumModalOpen(true);
  };

  // Open modal to edit existing album
  const openEditAlbumModal = (album: VendorPortfolioAlbum) => {
    setEditingAlbumId(album.id);
    setAlbumTitle(album.title);
    setAlbumDesc(album.description || '');
    setAlbumDriveUrl(album.driveFolderUrl);
    setAlbumCoverUrl(album.coverImageUrl);
    setDrivePhotos([]);
    setDriveCheckError(null);
    setCoverSource(album.coverImageUrl ? 'drive' : 'custom');
    setAlbumModalOpen(true);
  };

  // Save or update album inside state
  const handleSaveAlbum = () => {
    if (!albumTitle.trim()) {
      toast.error('Nama kategori/album wajib diisi');
      return;
    }
    if (!albumDriveUrl.trim()) {
      toast.error('Link folder Google Drive wajib diisi');
      return;
    }

    const currentCover = albumCoverUrl || (drivePhotos[0]?.url || drivePhotos[0]?.fullUrl) || '';

    if (editingAlbumId) {
      setAlbums(prev => prev.map(a => a.id === editingAlbumId ? {
        ...a,
        title: albumTitle.trim(),
        description: albumDesc.trim(),
        driveFolderUrl: albumDriveUrl.trim(),
        coverImageUrl: currentCover,
        photoCount: drivePhotos.length > 0 ? drivePhotos.length : a.photoCount
      } : a));
      toast.success('Album berhasil diperbarui di daftar');
    } else {
      const newAlbum: VendorPortfolioAlbum = {
        id: `alb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: albumTitle.trim(),
        description: albumDesc.trim(),
        driveFolderUrl: albumDriveUrl.trim(),
        coverImageUrl: currentCover,
        photoCount: drivePhotos.length > 0 ? drivePhotos.length : undefined,
        order: albums.length,
        createdAt: new Date().toISOString()
      };
      setAlbums(prev => [...prev, newAlbum]);
      toast.success('Album baru ditambahkan ke daftar');
    }

    setAlbumModalOpen(false);
  };

  // Delete album
  const handleDeleteAlbum = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus kategori album ini dari portofolio?')) {
      setAlbums(prev => prev.filter(a => a.id !== id));
      toast.success('Album dihapus dari daftar');
    }
  };

  // Save all profile and albums to backend
  const handleSaveAllPortfolio = async () => {
    setIsSavingProfile(true);

    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
    if (!cleanSlug || cleanSlug.length < 2) {
      toast.error('Slug URL minimal 2 karakter (huruf, angka, strip)');
      setIsSavingProfile(false);
      return;
    }

    try {
      const payload = {
        slug: cleanSlug,
        bio,
        coverUrl,
        whatsapp,
        website,
        instagram,
        albums
      };

      const res = await authFetch('/api/vendors/portfolio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyimpan portofolio');
      }

      toast.success('Portofolio landing page berhasil disimpan & dipublikasikan!');
      if (onUpdateVendor) {
        onUpdateVendor({
          slug: cleanSlug,
          bio,
          coverUrl,
          whatsapp,
          website,
          portfolioAlbums: albums
        });
      }
    } catch (err: any) {
      console.error('Error saving portfolio:', err);
      toast.error(err.message || 'Gagal menyimpan portofolio');
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. TOP LIVE PREVIEW & SHARE BAR */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-stone-900 via-stone-850 to-amber-950/40 border border-amber-500/20 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Sparkles size={13} />
              <span>Landing Page Portofolio Eksklusif</span>
            </span>
            <span className="text-xs text-white/50">• 0 Byte Server Storage</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            Tampilkan Karya Terbaik Anda dengan URL Personal
          </h2>
          <p className="text-xs sm:text-sm text-stone-300 max-w-2xl leading-relaxed">
            Bagikan link eksklusif ini di bio Instagram atau WhatsApp Anda. Calon klien dapat langsung menjelajahi album foto interaktif dari Google Drive Anda.
          </p>
          <div className="pt-1 flex items-center gap-2 text-xs font-mono text-amber-300/90 break-all">
            <Globe size={13} className="shrink-0 text-amber-400" />
            <span>{publicPortfolioUrl}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto shrink-0">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/15 transition shadow-sm active:scale-95"
          >
            {copiedLink ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            <span>{copiedLink ? 'Tersalin' : 'Salin Link'}</span>
          </button>

          <a
            href={`/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition active:scale-95"
          >
            <Eye size={15} />
            <span>Buka Portofolio</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {/* 2. PROFILE & BRANDING EDITOR */}
      <div className="p-6 rounded-2xl bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border border-stone-200/80 dark:border-white/10 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-white/10">
          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-white">
              Identitas & Tampilan Landing Page
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Atur banner sampul profil, biodata singkat, nomor WhatsApp reservasi, dan alamat URL Anda.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cover Banner Uploader */}
          <div className="space-y-2 md:col-span-2">
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
              Banner Sampul Profil (Cover Header)
            </label>
            <div className="relative w-full h-40 sm:h-48 rounded-2xl overflow-hidden border-2 border-dashed border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-850 flex items-center justify-center group">
              {coverUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => coverFileInputRef.current?.click()}
                      className="px-3.5 py-1.5 rounded-lg bg-white/90 text-stone-900 text-xs font-semibold hover:bg-white transition"
                    >
                      Ganti Foto Cover
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverUrl('')}
                      className="px-3.5 py-1.5 rounded-lg bg-red-600/90 text-white text-xs font-semibold hover:bg-red-600 transition"
                    >
                      Hapus
                    </button>
                  </div>
                </>
              ) : (
                <div 
                  onClick={() => coverFileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 text-stone-500 dark:text-stone-400 cursor-pointer p-4 text-center"
                >
                  <Upload size={24} className="text-amber-500" />
                  <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                    Klik untuk upload foto banner sampul (16:6 atau rasio lanskap)
                  </p>
                  <p className="text-[11px] text-stone-400">Format JPG, PNG, WEBP hingga 5MB</p>
                </div>
              )}
            </div>
            <input 
              ref={coverFileInputRef}
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleCoverFileUpload} 
            />
          </div>

          {/* URL Slug Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
              Alamat URL Portofolio (Slug) *
            </label>
            <div className="flex items-center rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-850 px-3 py-2 text-xs focus-within:border-amber-500 transition">
              <span className="text-stone-400 select-none font-mono">sudutbingkai.id/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                placeholder="nama-vendor"
                className="bg-transparent text-stone-900 dark:text-white font-semibold outline-none flex-1 font-mono text-xs pl-0.5"
              />
            </div>
            <p className="text-[11px] text-stone-400">
              Hanya huruf kecil, angka, dan tanda strip (-). Contoh: <code>aletheia-photo</code>
            </p>
          </div>

          {/* WhatsApp Direct Booking */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
              Nomor WhatsApp Konsultasi / Reservasi *
            </label>
            <div className="flex items-center rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-850 px-3 py-2 text-xs focus-within:border-amber-500 transition">
              <MessageCircle size={15} className="text-green-500 mr-2 shrink-0" />
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="081234567890"
                className="bg-transparent text-stone-900 dark:text-white font-medium outline-none flex-1 text-xs"
              />
            </div>
            <p className="text-[11px] text-stone-400">
              Tombol "Konsultasi & Reservasi" di landing page akan langsung membuka chat ke nomor ini.
            </p>
          </div>

          {/* Bio / Tagline */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
              Bio Singkat & Gaya Fotografi
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Contoh: Mengabadikan kehangatan cinta melalui sentuhan visual sinematik & candid. Berpengalaman menangani 150+ wedding di seluruh Indonesia."
              className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-850 p-3 text-xs text-stone-900 dark:text-white outline-none focus:border-amber-500 transition resize-none"
            />
          </div>

          {/* Instagram Handle */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
              Instagram
            </label>
            <div className="flex items-center rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-850 px-3 py-2 text-xs focus-within:border-amber-500 transition">
              <InstagramIcon size={15} className="text-pink-500 mr-2 shrink-0" />
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@nama.vendor"
                className="bg-transparent text-stone-900 dark:text-white outline-none flex-1 text-xs"
              />
            </div>
          </div>

          {/* Website External */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
              Website Eksternal (Opsional)
            </label>
            <div className="flex items-center rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-850 px-3 py-2 text-xs focus-within:border-amber-500 transition">
              <Globe size={15} className="text-sky-500 mr-2 shrink-0" />
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://vendoranda.com"
                className="bg-transparent text-stone-900 dark:text-white outline-none flex-1 text-xs"
              />
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleSaveAllPortfolio}
            disabled={isSavingProfile}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-md transition disabled:opacity-50 active:scale-95"
          >
            {isSavingProfile ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            <span>{isSavingProfile ? 'Menyimpan Perubahan...' : 'Simpan Pengaturan Portofolio'}</span>
          </button>
        </div>
      </div>

      {/* 3. ALBUMS / CATEGORIES MANAGER */}
      <div className="p-6 rounded-2xl bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border border-stone-200/80 dark:border-white/10 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-stone-900 dark:text-white">
                Kategori Album Karya ({albums.length})
              </h3>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                Google Drive Sync
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Setiap kategori berisi link folder Google Drive. Foto tampil dalam kartu estetik dan terbuka otomatis dalam slideshow elegan.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddAlbumModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-black dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-950 font-bold text-xs shadow-md transition active:scale-95 shrink-0"
          >
            <Plus size={15} />
            <span>Tambah Kategori / Album</span>
          </button>
        </div>

        {/* Albums List Grid */}
        {albums.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {albums.map((album, idx) => (
              <div 
                key={album.id}
                className="group rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 overflow-hidden flex flex-col transition shadow-sm hover:shadow-md"
              >
                {/* Thumbnail Preview */}
                <div className="relative aspect-[16/10] bg-stone-900 overflow-hidden">
                  {album.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={album.coverImageUrl} 
                      alt={album.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-stone-500 gap-1.5">
                      <BookOpen size={28} />
                      <span className="text-[11px]">Sampul Otomatis Drive</span>
                    </div>
                  )}

                  <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold border border-white/10">
                    Album #{idx + 1}
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-sm text-stone-900 dark:text-white line-clamp-1">
                      {album.title}
                    </h4>
                    {album.description && (
                      <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 mt-0.5">
                        {album.description}
                      </p>
                    )}
                    <a
                      href={album.driveFolderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 hover:underline max-w-full truncate"
                    >
                      <ExternalLink size={12} className="shrink-0" />
                      <span className="truncate">Buka Folder Google Drive</span>
                    </a>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => openEditAlbumModal(album)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-200 dark:bg-stone-700/50 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-medium transition"
                    >
                      <Edit3 size={13} />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteAlbum(album.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-medium transition"
                    >
                      <Trash2 size={13} />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 px-6 text-center rounded-2xl border-2 border-dashed border-stone-300 dark:border-stone-800 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <BookOpen size={24} />
            </div>
            <h4 className="font-bold text-sm text-stone-800 dark:text-stone-200">
              Belum Ada Kategori Album
            </h4>
            <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm">
              Tambahkan kategori seperti "Wedding Adat", "Prewedding", atau "Lamaran". Cukup tempel link folder Google Drive foto Anda.
            </p>
            <button
              type="button"
              onClick={openAddAlbumModal}
              className="mt-1 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition"
            >
              <Plus size={14} />
              <span>Tambah Album Pertama</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. MODAL ADD / EDIT ALBUM */}
      {albumModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center font-bold">
                  <BookOpen size={16} />
                </div>
                <h3 className="font-bold text-base text-stone-900 dark:text-white">
                  {editingAlbumId ? 'Edit Kategori Album' : 'Tambah Kategori Album Portofolio'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAlbumModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Category Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Nama Kategori Album *
                </label>
                <input
                  type="text"
                  value={albumTitle}
                  onChange={(e) => setAlbumTitle(e.target.value)}
                  placeholder="Contoh: Wedding Adat Sunda di Plataran"
                  className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-850 px-3.5 py-2.5 text-xs text-stone-900 dark:text-white outline-none focus:border-amber-500 transition font-medium"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Deskripsi Singkat (Opsional)
                </label>
                <input
                  type="text"
                  value={albumDesc}
                  onChange={(e) => setAlbumDesc(e.target.value)}
                  placeholder="Contoh: Momen sakral pernikahan adat dengan sentuhan sinematik."
                  className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-850 px-3.5 py-2.5 text-xs text-stone-900 dark:text-white outline-none focus:border-amber-500 transition"
                />
              </div>

              {/* Google Drive Link */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Link Folder Google Drive *
                  </label>
                  <span className="text-[11px] text-amber-500 font-medium">Bebas Kapasitas</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={albumDriveUrl}
                    onChange={(e) => setAlbumDriveUrl(e.target.value)}
                    placeholder="https://drive.google.com/drive/folders/..."
                    className="flex-1 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-850 px-3.5 py-2.5 text-xs text-stone-900 dark:text-white outline-none focus:border-amber-500 transition font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleCheckDriveFolder}
                    disabled={isCheckingDrive || !albumDriveUrl.trim()}
                    className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white text-xs font-semibold shrink-0 transition disabled:opacity-40 flex items-center gap-1.5"
                    title="Periksa folder dan muat foto sampul"
                  >
                    {isCheckingDrive ? <Loader2 size={14} className="animate-spin text-amber-400" /> : <RefreshCw size={14} />}
                    <span>Cek Drive</span>
                  </button>
                </div>
                <p className="text-[11px] text-stone-400 leading-relaxed">
                  💡 <strong>Penting:</strong> Pastikan setelan folder Google Drive sudah diubah ke <em>"Siapa saja yang memiliki link dapat melihat"</em>.
                </p>

                {driveCheckError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{driveCheckError}</span>
                  </div>
                )}
              </div>

              {/* Cover Image Selector */}
              <div className="space-y-3 pt-2 border-t border-stone-200 dark:border-stone-800">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Foto Sampul Depan Kartu
                  </label>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setCoverSource('drive')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${coverSource === 'drive' ? 'bg-amber-500 text-stone-950' : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400'}`}
                    >
                      Pilih dari Drive
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverSource('custom')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${coverSource === 'custom' ? 'bg-amber-500 text-stone-950' : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400'}`}
                    >
                      Upload Kustom
                    </button>
                  </div>
                </div>

                {/* Option 1: Drive photo grid picker */}
                {coverSource === 'drive' && (
                  <div>
                    {drivePhotos.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-[11px] text-stone-500 dark:text-stone-400">
                          Klik salah satu foto di bawah untuk dijadikan sampul kartu:
                        </p>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-44 overflow-y-auto p-1 bg-stone-100 dark:bg-stone-950 rounded-xl border border-stone-200 dark:border-stone-800">
                          {drivePhotos.map((photo) => (
                            <button
                              key={photo.id}
                              type="button"
                              onClick={() => setAlbumCoverUrl(photo.url || photo.fullUrl)}
                              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition ${albumCoverUrl === (photo.url || photo.fullUrl) ? 'border-amber-500 scale-95 shadow-md shadow-amber-500/20' : 'border-transparent opacity-70 hover:opacity-100'}`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={photo.url || photo.fullUrl} alt={photo.name} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-stone-100 dark:bg-stone-850 text-center text-xs text-stone-500 space-y-1">
                        <p>Klik tombol <strong>"Cek Drive"</strong> di atas untuk memuat foto dari Google Drive Anda.</p>
                        <p className="text-[11px] text-stone-400">Foto pertama akan otomatis menjadi sampul kartu.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Option 2: Custom upload / URL */}
                {coverSource === 'custom' && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={albumCoverUrl}
                        onChange={(e) => setAlbumCoverUrl(e.target.value)}
                        placeholder="https://... atau upload foto"
                        className="flex-1 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-850 px-3.5 py-2 text-xs text-stone-900 dark:text-white outline-none focus:border-amber-500 transition"
                      />
                      <button
                        type="button"
                        onClick={() => albumCoverInputRef.current?.click()}
                        className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white text-xs font-semibold shrink-0 transition"
                      >
                        Upload Foto
                      </button>
                    </div>
                    <input 
                      ref={albumCoverInputRef}
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleAlbumCoverFileUpload} 
                    />
                  </div>
                )}

                {/* Cover Preview */}
                {albumCoverUrl && (
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-stone-100 dark:bg-stone-850 border border-stone-200 dark:border-stone-800">
                    <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-stone-900">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={albumCoverUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-stone-900 dark:text-white">Sampul Dipilih</p>
                      <p className="text-[11px] text-stone-500 truncate">Foto ini akan menjadi thumbnail depan kartu album.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAlbumCoverUrl('')}
                      className="text-xs text-red-500 hover:underline px-2"
                    >
                      Reset
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-end gap-3 bg-stone-50 dark:bg-stone-850">
              <button
                type="button"
                onClick={() => setAlbumModalOpen(false)}
                className="px-4 py-2 rounded-xl text-stone-600 dark:text-stone-300 text-xs font-semibold hover:bg-stone-200 dark:hover:bg-stone-800 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveAlbum}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shadow-md transition active:scale-95"
              >
                {editingAlbumId ? 'Simpan Perubahan' : 'Tambahkan ke Portofolio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
