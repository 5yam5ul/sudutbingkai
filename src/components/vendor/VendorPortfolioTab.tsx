'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, ExternalLink, Copy, Check, Plus, Trash2, Edit3, 
  Image as ImageIcon, BookOpen, AlertCircle, Loader2, Save, 
  Globe, MessageCircle, RefreshCw, Upload, Eye, CheckCircle2
} from 'lucide-react';
import { UserAccount, VendorPortfolioAlbum } from '@/lib/types';
import { authFetch } from '@/lib/auth';
import { toast } from 'sonner';

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
  const [copiedLink, setCopiedLink] = useState(false);

  // Modal Add/Edit Album states
  const [albumModalOpen, setAlbumModalOpen] = useState(false);
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null);
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumDesc, setAlbumDesc] = useState('');
  const [albumDriveUrl, setAlbumDriveUrl] = useState('');
  const [albumCoverUrl, setAlbumCoverUrl] = useState('');
  const [coverSource, setCoverSource] = useState<'drive' | 'custom'>('drive');
  const [isSavingAlbum, setIsSavingAlbum] = useState(false);

  // Drive test & thumbnail picker states
  const [isCheckingDrive, setIsCheckingDrive] = useState(false);
  const [drivePhotos, setDrivePhotos] = useState<DriveSamplePhoto[]>([]);
  const [driveCheckError, setDriveCheckError] = useState<string | null>(null);

  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const albumCoverInputRef = useRef<HTMLInputElement>(null);

  // Initialize data
  useEffect(() => {
    if (vendor?.id) {
      const initialSlug = vendor.slug || (vendor.companyName || vendor.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      setSlug(initialSlug);
      if (vendor.bio) setBio(vendor.bio);
      if (vendor.coverUrl) setCoverUrl(vendor.coverUrl);
      if (vendor.whatsapp || vendor.phone) setWhatsapp(vendor.whatsapp || vendor.phone || '');
      if (vendor.website) setWebsite(vendor.website);
      if (vendor.instagram) setInstagram(vendor.instagram);
      if (Array.isArray(vendor.portfolioAlbums) && vendor.portfolioAlbums.length > 0) {
        setAlbums(vendor.portfolioAlbums);
      }
    }

    // Always fetch fresh portfolio directly from API (which reads Supabase)
    const targetUrl = vendor?.id 
      ? `/api/vendors/portfolio?vendorId=${encodeURIComponent(vendor.id)}` 
      : `/api/vendors/portfolio`;

    authFetch(targetUrl)
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
          if (Array.isArray(p.albums)) {
            setAlbums(p.albums);
          }
        }
      })
      .catch(err => console.warn('Portfolio load notice:', err));
  }, [vendor?.id]);

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
        setDriveCheckError('Folder Google Drive terdeteksi, namun belum ada file gambar foto di dalamnya.');
      } else {
        setDrivePhotos(fetchedPhotos);
        if (!albumCoverUrl && fetchedPhotos[0]) {
          setAlbumCoverUrl(fetchedPhotos[0].url || fetchedPhotos[0].fullUrl);
        }
        toast.success(`Berhasil mendeteksi ${fetchedPhotos.length} foto dari Google Drive!`);
      }
    } catch (err: any) {
      console.error('Drive check error:', err);
      setDriveCheckError(err.message || 'Kendala saat mengakses Google Drive');
      toast.error(err.message || 'Gagal mengakses Google Drive');
    } finally {
      setIsCheckingDrive(false);
    }
  };

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

  // Save all profile and albums to backend
  const persistPortfolio = async (updatedAlbums?: VendorPortfolioAlbum[]) => {
    const albumsToSave = updatedAlbums !== undefined ? updatedAlbums : albums;
    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
    if (!cleanSlug || cleanSlug.length < 2) {
      toast.error('Slug URL minimal 2 karakter (huruf, angka, strip)');
      return false;
    }

    try {
      const payload = {
        slug: cleanSlug,
        bio,
        coverUrl,
        whatsapp,
        website,
        instagram,
        albums: albumsToSave
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

      if (data.portfolio && Array.isArray(data.portfolio.albums)) {
        setAlbums(data.portfolio.albums);
      }

      if (onUpdateVendor) {
        onUpdateVendor({
          slug: cleanSlug,
          bio,
          coverUrl,
          whatsapp,
          website,
          portfolioAlbums: data.portfolio?.albums || albumsToSave
        });
      }
      return true;
    } catch (err: any) {
      console.error('Error saving portfolio:', err);
      toast.error(err.message || 'Gagal menyimpan perubahan ke server');
      return false;
    }
  };

  const handleSaveAlbum = async () => {
    if (!albumTitle.trim()) {
      toast.error('Nama kategori/album wajib diisi');
      return;
    }
    if (!albumDriveUrl.trim()) {
      toast.error('Link folder Google Drive wajib diisi');
      return;
    }

    setIsSavingAlbum(true);
    const currentCover = albumCoverUrl || (drivePhotos[0]?.url || drivePhotos[0]?.fullUrl) || '';

    let updatedAlbums: VendorPortfolioAlbum[];
    if (editingAlbumId) {
      updatedAlbums = albums.map(a => a.id === editingAlbumId ? {
        ...a,
        title: albumTitle.trim(),
        description: albumDesc.trim(),
        driveFolderUrl: albumDriveUrl.trim(),
        coverImageUrl: currentCover,
        photoCount: drivePhotos.length > 0 ? drivePhotos.length : a.photoCount
      } : a);
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
      updatedAlbums = [...albums, newAlbum];
    }

    setAlbums(updatedAlbums);

    // Auto-save immediately to database
    const saved = await persistPortfolio(updatedAlbums);
    setIsSavingAlbum(false);

    if (saved) {
      toast.success(editingAlbumId ? 'Album berhasil diperbarui dan dipublikasikan!' : 'Album berhasil ditambahkan & langsung tayang di portofolio!');
      setAlbumModalOpen(false);
    }
  };

  const handleDeleteAlbum = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus kategori album ini dari portofolio?')) {
      const updatedAlbums = albums.filter(a => a.id !== id);
      setAlbums(updatedAlbums);
      const saved = await persistPortfolio(updatedAlbums);
      if (saved) {
        toast.success('Album dihapus dari portofolio');
      }
    }
  };

  const handleSaveAllPortfolio = async () => {
    setIsSavingProfile(true);
    const saved = await persistPortfolio();
    setIsSavingProfile(false);
    if (saved) {
      toast.success('Pengaturan portofolio berhasil disimpan & dipublikasikan!');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* 1. TOP HEADER BANNER CARD (SudutBingkai Signature Glass Card) */}
      <div className="glass-card" style={{ padding: '32px', borderRadius: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
          <div style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="font-mono-film" style={{ color: '#C27803', fontSize: '11px', letterSpacing: '0.08em', fontWeight: 700 }}>
                PORTOFOLIO EKSKLUSIF VENDOR
              </span>
              <span style={{ fontSize: '11px', color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                0 Byte Server Storage
              </span>
            </div>
            
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1D1D1F', marginBottom: '8px', letterSpacing: '-0.02em' }}>
              Tampilkan Karya Terbaik Anda dengan URL Personal & Google Drive
            </h2>
            
            <p style={{ color: '#6E6E73', fontSize: '14px', lineHeight: 1.6, margin: '0 0 16px 0' }}>
              Bagikan link eksklusif ini di bio Instagram atau WhatsApp Anda. Calon klien dapat langsung menjelajahi album foto interaktif beranimasi <em>photobook slideshow</em> yang terhubung langsung ke Google Drive Anda.
            </p>

            {/* URL Pill Display */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 14px',
              borderRadius: '12px',
              background: 'rgba(194, 120, 3, 0.08)',
              border: '1px solid rgba(194, 120, 3, 0.25)',
              fontSize: '12.5px',
              fontFamily: 'var(--font-mono)',
              color: '#8C5400'
            }}>
              <Globe size={14} color="#C27803" />
              <strong>{publicPortfolioUrl}</strong>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleCopyLink}
              className="glass-pill"
              style={{
                padding: '12px 18px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#FFFFFF',
                border: '1px solid rgba(0, 0, 0, 0.12)',
                color: '#1D1D1F'
              }}
            >
              {copiedLink ? <Check size={15} color="#10B981" /> : <Copy size={15} />}
              <span>{copiedLink ? 'Tersalin' : 'Salin Link'}</span>
            </button>

            <a
              href={`/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-apple-black"
              style={{
                padding: '12px 22px',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
                cursor: 'pointer'
              }}
            >
              <Eye size={15} />
              <span>Buka Portofolio</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </div>

        {/* Workflow Highlights Steps */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '28px', paddingTop: '24px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '10px', background: 'rgba(194,120,3,0.1)', color: '#C27803', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700, fontSize: '13px' }}>1</div>
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1D1D1F', margin: '0 0 2px 0' }}>URL & Branding Eksklusif</h4>
              <p style={{ fontSize: '12px', color: '#86868B', margin: 0, lineHeight: 1.4 }}>Tentukan URL unik Anda (sudutbingkai.id/[nama-vendor]) & upload cover banner.</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '10px', background: 'rgba(194,120,3,0.1)', color: '#C27803', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700, fontSize: '13px' }}>2</div>
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1D1D1F', margin: '0 0 2px 0' }}>Hubungkan Google Drive</h4>
              <p style={{ fontSize: '12px', color: '#86868B', margin: 0, lineHeight: 1.4 }}>Paste link folder Drive per kategori (Wedding, Prewed, dll) tanpa perlu upload ulang.</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '10px', background: 'rgba(194,120,3,0.1)', color: '#C27803', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700, fontSize: '13px' }}>3</div>
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1D1D1F', margin: '0 0 2px 0' }}>Booking Langsung ke WA</h4>
              <p style={{ fontSize: '12px', color: '#86868B', margin: 0, lineHeight: 1.4 }}>Calon klien terpukau dengan slideshow dan langsung chat ke nomor WhatsApp Anda.</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PROFILE & BRANDING EDITOR CARD */}
      <div className="glass-card" style={{ padding: '32px', borderRadius: '24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '6px' }}>
            IDENTITAS & TAMPILAN LANDING PAGE
          </span>
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1D1D1F', margin: '0 0 6px 0' }}>
            Kustomisasi Profil Portofolio Anda
          </h3>
          <p style={{ color: '#6E6E73', fontSize: '13.5px', margin: 0 }}>
            Atur banner sampul profil, biodata singkat, nomor WhatsApp reservasi, dan alamat URL Anda.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          
          {/* Banner Sampul Profil */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1D1D1F', marginBottom: '8px' }}>
              Banner Sampul Profil (Cover Header)
            </label>
            <div style={{
              border: '2px dashed rgba(0, 0, 0, 0.12)',
              borderRadius: '18px',
              padding: '16px',
              background: 'rgba(255, 255, 255, 0.7)',
              position: 'relative',
              minHeight: '160px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}>
              {coverUrl ? (
                <div style={{ width: '100%', position: 'relative' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={coverUrl} 
                    alt="Cover Preview" 
                    style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '12px' }} 
                  />
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    display: 'flex',
                    gap: '8px'
                  }}>
                    <button
                      type="button"
                      onClick={() => coverFileInputRef.current?.click()}
                      className="glass-pill"
                      style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: '#FFFFFF' }}
                    >
                      Ganti Foto
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverUrl('')}
                      className="glass-pill"
                      style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: 'rgba(239, 68, 68, 0.1)', color: '#DC2626', border: 'none' }}
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => coverFileInputRef.current?.click()}
                  style={{ textAlign: 'center', cursor: 'pointer', padding: '24px 16px' }}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(194, 120, 3, 0.1)', color: '#C27803', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <Upload size={22} />
                  </div>
                  <strong style={{ display: 'block', fontSize: '13.5px', color: '#1D1D1F', marginBottom: '4px' }}>
                    Klik untuk upload foto banner sampul
                  </strong>
                  <span style={{ fontSize: '12px', color: '#86868B' }}>
                    Format JPG, PNG, WEBP hingga 5MB (rasio lanskap lebar direkomendasikan)
                  </span>
                </div>
              )}
            </div>
            <input 
              ref={coverFileInputRef}
              type="file" 
              accept="image/*" 
              style={{ display: 'none' }}
              onChange={handleCoverFileUpload} 
            />
          </div>

          {/* Grid: Slug & WhatsApp */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
            {/* Slug */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1D1D1F', marginBottom: '6px' }}>
                Alamat URL Portofolio (Slug) *
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                borderRadius: '12px',
                border: '1px solid rgba(0, 0, 0, 0.12)',
                background: '#FFFFFF',
                padding: '10px 14px'
              }}>
                <span style={{ color: '#86868B', fontSize: '13px', fontFamily: 'var(--font-mono)', userSelect: 'none' }}>
                  sudutbingkai.id/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  placeholder="nama-vendor"
                  style={{
                    border: 'none',
                    outline: 'none',
                    fontSize: '13px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                    color: '#1D1D1F',
                    width: '100%',
                    paddingLeft: '4px'
                  }}
                />
              </div>
              <span style={{ fontSize: '11.5px', color: '#86868B', marginTop: '4px', display: 'block' }}>
                Hanya huruf kecil, angka, dan tanda strip (-). Contoh: <code>aletheia-photo</code>
              </span>
            </div>

            {/* WhatsApp */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1D1D1F', marginBottom: '6px' }}>
                Nomor WhatsApp Konsultasi / Reservasi *
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                borderRadius: '12px',
                border: '1px solid rgba(0, 0, 0, 0.12)',
                background: '#FFFFFF',
                padding: '10px 14px',
                gap: '8px'
              }}>
                <MessageCircle size={16} color="#10B981" />
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="081234567890"
                  style={{
                    border: 'none',
                    outline: 'none',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#1D1D1F',
                    width: '100%'
                  }}
                />
              </div>
              <span style={{ fontSize: '11.5px', color: '#86868B', marginTop: '4px', display: 'block' }}>
                Tombol &quot;Konsultasi & Reservasi&quot; di landing page akan langsung membuka chat ke nomor ini.
              </span>
            </div>
          </div>

          {/* Bio Singkat */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1D1D1F', marginBottom: '6px' }}>
              Bio Singkat & Gaya Fotografi
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Contoh: Mengabadikan kehangatan cinta melalui sentuhan visual sinematik & candid. Berpengalaman menangani 150+ wedding di seluruh Indonesia."
              className="glass-input"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid rgba(0, 0, 0, 0.12)',
                background: '#FFFFFF',
                fontSize: '13px',
                resize: 'none',
                lineHeight: 1.5
              }}
            />
          </div>

          {/* Grid: Instagram & Website */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1D1D1F', marginBottom: '6px' }}>
                Akun Instagram Resmi
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                borderRadius: '12px',
                border: '1px solid rgba(0, 0, 0, 0.12)',
                background: '#FFFFFF',
                padding: '10px 14px',
                gap: '8px'
              }}>
                <InstagramIcon size={16} className="text-pink-500" />
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@nama.vendor"
                  style={{
                    border: 'none',
                    outline: 'none',
                    fontSize: '13px',
                    color: '#1D1D1F',
                    width: '100%'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1D1D1F', marginBottom: '6px' }}>
                Website Eksternal (Opsional)
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                borderRadius: '12px',
                border: '1px solid rgba(0, 0, 0, 0.12)',
                background: '#FFFFFF',
                padding: '10px 14px',
                gap: '8px'
              }}>
                <Globe size={16} color="#0284C7" />
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://vendoranda.com"
                  style={{
                    border: 'none',
                    outline: 'none',
                    fontSize: '13px',
                    color: '#1D1D1F',
                    width: '100%'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Save Profile Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
            <button
              type="button"
              onClick={handleSaveAllPortfolio}
              disabled={isSavingProfile}
              className="btn-apple-black"
              style={{
                padding: '12px 28px',
                fontSize: '13.5px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: isSavingProfile ? 'wait' : 'pointer',
                opacity: isSavingProfile ? 0.6 : 1
              }}
            >
              {isSavingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{isSavingProfile ? 'Menyimpan...' : 'Simpan Pengaturan Portofolio'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. ALBUMS / CATEGORIES MANAGER CARD */}
      <div className="glass-card" style={{ padding: '32px', borderRadius: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="font-mono-film" style={{ color: '#C27803', display: 'block' }}>
                KATALOG KARYA
              </span>
              <span style={{ fontSize: '11px', color: '#C27803', background: 'rgba(194, 120, 3, 0.1)', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                {albums.length} Kategori Album
              </span>
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1D1D1F', margin: '4px 0 2px 0' }}>
              Kategori Album Portofolio (Google Drive)
            </h3>
            <p style={{ color: '#6E6E73', fontSize: '13.5px', margin: 0 }}>
              Setiap kategori berisi link folder Google Drive. Foto tampil dalam kartu thumbnail estetik dan dapat dibuka sebagai slideshow buku foto.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddAlbumModal}
            className="btn-apple-black"
            style={{
              padding: '11px 20px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
          >
            <Plus size={15} />
            <span>Tambah Kategori / Album</span>
          </button>
        </div>

        {/* Albums Grid */}
        {albums.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px'
          }}>
            {albums.map((album, idx) => (
              <div 
                key={album.id}
                style={{
                  borderRadius: '18px',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  background: '#FFFFFF',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Thumbnail Preview Aspect Ratio 16:10 */}
                <div style={{
                  position: 'relative',
                  width: '100%',
                  height: '170px',
                  background: '#1D1D1F',
                  overflow: 'hidden'
                }}>
                  {album.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={album.coverImageUrl} 
                      alt={album.title} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#86868B', gap: '6px' }}>
                      <BookOpen size={28} />
                      <span style={{ fontSize: '11.5px' }}>Sampul Otomatis Drive</span>
                    </div>
                  )}

                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    padding: '3px 10px',
                    borderRadius: '8px',
                    background: 'rgba(0, 0, 0, 0.65)',
                    backdropFilter: 'blur(8px)',
                    color: '#FFFFFF',
                    fontSize: '11px',
                    fontWeight: 600
                  }}>
                    Album #{idx + 1}
                  </div>
                </div>

                {/* Details */}
                <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
                  <div>
                    <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: '#1D1D1F', margin: '0 0 4px 0' }}>
                      {album.title}
                    </h4>
                    {album.description && (
                      <p style={{ fontSize: '12.5px', color: '#6E6E73', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                        {album.description}
                      </p>
                    )}
                    <a
                      href={album.driveFolderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '11.5px',
                        color: '#C27803',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: 600
                      }}
                    >
                      <ExternalLink size={12} />
                      <span>Buka Folder Google Drive</span>
                    </a>
                  </div>

                  {/* Actions */}
                  <div style={{
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(0, 0, 0, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <button
                      type="button"
                      onClick={() => openEditAlbumModal(album)}
                      className="glass-pill"
                      style={{
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(0,0,0,0.04)',
                        border: 'none',
                        color: '#1D1D1F'
                      }}
                    >
                      <Edit3 size={12} />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteAlbum(album.id)}
                      className="glass-pill"
                      style={{
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: 'none',
                        color: '#DC2626'
                      }}
                    >
                      <Trash2 size={12} />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            padding: '48px 24px',
            textAlign: 'center',
            borderRadius: '18px',
            border: '2px dashed rgba(0, 0, 0, 0.1)',
            background: 'rgba(255, 255, 255, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: 'rgba(194, 120, 3, 0.1)',
              color: '#C27803',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <BookOpen size={26} />
            </div>
            <div>
              <strong style={{ fontSize: '15px', color: '#1D1D1F', display: 'block', marginBottom: '4px' }}>
                Belum Ada Kategori Album
              </strong>
              <p style={{ fontSize: '13px', color: '#86868B', maxWidth: '380px', margin: 0, lineHeight: 1.5 }}>
                Tambahkan kategori seperti &ldquo;Wedding Adat Jawa&rdquo;, &ldquo;Intimate Prewedding&rdquo;, atau &ldquo;Siraman&rdquo;. Cukup tempel link folder Google Drive foto Anda.
              </p>
            </div>
            <button
              type="button"
              onClick={openAddAlbumModal}
              className="btn-apple-black"
              style={{
                marginTop: '6px',
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <Plus size={14} />
              <span>Tambah Album Pertama</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. MODAL TAMBAH / EDIT ALBUM (Apple Style Dialog) */}
      {albumModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setAlbumModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
        >
          <div
            className="glass-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '540px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              padding: '30px',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(194, 120, 3, 0.1)', color: '#C27803', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#1D1D1F', margin: 0 }}>
                    {editingAlbumId ? 'Edit Kategori Album' : 'Tambah Kategori Album Portofolio'}
                  </h3>
                  <span style={{ fontSize: '11.5px', color: '#86868B' }}>Terhubung ke Google Drive Anda</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAlbumModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#86868B' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Category Title */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1D1D1F', marginBottom: '6px' }}>
                  Nama Kategori / Judul Album *
                </label>
                <input
                  type="text"
                  value={albumTitle}
                  onChange={(e) => setAlbumTitle(e.target.value)}
                  placeholder="Contoh: Wedding Adat Jawa di Plataran"
                  className="glass-input"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(0, 0, 0, 0.12)',
                    background: '#FFFFFF',
                    fontSize: '13px'
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1D1D1F', marginBottom: '6px' }}>
                  Deskripsi Singkat (Opsional)
                </label>
                <input
                  type="text"
                  value={albumDesc}
                  onChange={(e) => setAlbumDesc(e.target.value)}
                  placeholder="Contoh: Momen sakral pernikahan adat dengan sentuhan sinematik."
                  className="glass-input"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(0, 0, 0, 0.12)',
                    background: '#FFFFFF',
                    fontSize: '13px'
                  }}
                />
              </div>

              {/* Google Drive URL */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#1D1D1F' }}>
                    Link Folder Google Drive *
                  </label>
                  <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 600 }}>Bebas Kapasitas</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={albumDriveUrl}
                    onChange={(e) => setAlbumDriveUrl(e.target.value)}
                    placeholder="https://drive.google.com/drive/folders/..."
                    className="glass-input"
                    style={{
                      flex: 1,
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: '1px solid rgba(0, 0, 0, 0.12)',
                      background: '#FFFFFF',
                      fontSize: '12.5px',
                      fontFamily: 'var(--font-mono)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleCheckDriveFolder}
                    disabled={isCheckingDrive || !albumDriveUrl.trim()}
                    className="glass-pill"
                    style={{
                      padding: '0 16px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: isCheckingDrive ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#1D1D1F',
                      color: '#FFFFFF',
                      border: 'none',
                      flexShrink: 0
                    }}
                  >
                    {isCheckingDrive ? <Loader2 size={14} className="animate-spin text-amber-400" /> : <RefreshCw size={14} />}
                    <span>Cek Drive</span>
                  </button>
                </div>
                <span style={{ fontSize: '11.5px', color: '#86868B', marginTop: '6px', display: 'block', lineHeight: 1.4 }}>
                  💡 <strong>Penting:</strong> Pastikan folder Google Drive disetel ke <em>&quot;Siapa saja yang memiliki link dapat melihat&quot;</em>.
                </span>

                {driveCheckError && (
                  <div style={{
                    marginTop: '8px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'rgba(239, 68, 68, 0.08)',
                    color: '#DC2626',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <AlertCircle size={15} style={{ flexShrink: 0 }} />
                    <span>{driveCheckError}</span>
                  </div>
                )}
              </div>

              {/* Cover Image Selector */}
              <div style={{ paddingTop: '10px', borderTop: '1px solid rgba(0, 0, 0, 0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#1D1D1F' }}>
                    Foto Sampul Depan Kartu
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setCoverSource('drive')}
                      className="glass-pill"
                      style={{
                        padding: '4px 10px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: coverSource === 'drive' ? '#1D1D1F' : 'rgba(0,0,0,0.05)',
                        color: coverSource === 'drive' ? '#FFFFFF' : '#1D1D1F',
                        border: 'none'
                      }}
                    >
                      Dari Drive
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverSource('custom')}
                      className="glass-pill"
                      style={{
                        padding: '4px 10px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: coverSource === 'custom' ? '#1D1D1F' : 'rgba(0,0,0,0.05)',
                        color: coverSource === 'custom' ? '#FFFFFF' : '#1D1D1F',
                        border: 'none'
                      }}
                    >
                      Upload Kustom
                    </button>
                  </div>
                </div>

                {/* Option 1: Drive photo grid picker */}
                {coverSource === 'drive' && (
                  <div>
                    {drivePhotos.length > 0 ? (
                      <div>
                        <span style={{ fontSize: '11.5px', color: '#86868B', display: 'block', marginBottom: '8px' }}>
                          Klik salah satu foto untuk dijadikan sampul depan:
                        </span>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(5, 1fr)',
                          gap: '8px',
                          maxHeight: '160px',
                          overflowY: 'auto',
                          padding: '6px',
                          background: 'rgba(0,0,0,0.02)',
                          borderRadius: '12px',
                          border: '1px solid rgba(0,0,0,0.08)'
                        }}>
                          {drivePhotos.map((photo) => (
                            <button
                              key={photo.id}
                              type="button"
                              onClick={() => setAlbumCoverUrl(photo.url || photo.fullUrl)}
                              style={{
                                width: '100%',
                                aspectRatio: '1',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                border: albumCoverUrl === (photo.url || photo.fullUrl) ? '2px solid #C27803' : '2px solid transparent',
                                padding: 0,
                                cursor: 'pointer',
                                background: '#1D1D1F',
                                position: 'relative'
                              }}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={photo.url || photo.fullUrl} alt={photo.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(0,0,0,0.02)', textAlign: 'center', fontSize: '12px', color: '#86868B' }}>
                        Klik tombol <strong>&quot;Cek Drive&quot;</strong> di atas untuk melihat pilihan foto sampul. Foto pertama otomatis dijadikan sampul default.
                      </div>
                    )}
                  </div>
                )}

                {/* Option 2: Custom upload */}
                {coverSource === 'custom' && (
                  <div>
                    <button
                      type="button"
                      onClick={() => albumCoverInputRef.current?.click()}
                      className="glass-pill"
                      style={{
                        padding: '10px 18px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#FFFFFF',
                        border: '1px solid rgba(0,0,0,0.12)'
                      }}
                    >
                      <Upload size={14} />
                      <span>Pilih Foto Sampul dari Komputer</span>
                    </button>
                    <input 
                      ref={albumCoverInputRef}
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                      onChange={handleAlbumCoverFileUpload} 
                    />
                  </div>
                )}

                {/* Selected Cover Preview */}
                {albumCoverUrl && (
                  <div style={{
                    marginTop: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: 'rgba(194, 120, 3, 0.06)',
                    border: '1px solid rgba(194, 120, 3, 0.2)'
                  }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: '#1D1D1F' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={albumCoverUrl} alt="Cover Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ fontSize: '12.5px', color: '#1D1D1F', display: 'block' }}>Sampul Terpilih</strong>
                      <span style={{ fontSize: '11px', color: '#86868B' }}>Foto ini akan menjadi thumbnail depan kartu album</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAlbumCoverUrl('')}
                      style={{ border: 'none', background: 'none', color: '#DC2626', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Ganti
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid rgba(0, 0, 0, 0.06)' }}>
              <button
                type="button"
                onClick={() => setAlbumModalOpen(false)}
                className="glass-pill"
                style={{
                  padding: '10px 18px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: 'rgba(0,0,0,0.04)',
                  border: 'none',
                  color: '#1D1D1F'
                }}
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleSaveAlbum}
                disabled={isSavingAlbum}
                className="btn-apple-black"
                style={{
                  padding: '10px 22px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isSavingAlbum ? 'wait' : 'pointer',
                  opacity: isSavingAlbum ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isSavingAlbum && <Loader2 size={14} className="animate-spin" />}
                <span>{editingAlbumId ? 'Simpan Perubahan' : 'Tambahkan ke Portofolio'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
