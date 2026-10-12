'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield, DollarSign, Calendar, Camera, Users, FileText,
  Wallet, Video, Package, CheckCircle2, AlertCircle, Eye,
  EyeOff, Trash2, Download, ExternalLink, RefreshCw, Plus,
  Sliders, Search, ArrowRight, LogOut, Check, X, Flame, Sparkles
} from 'lucide-react';
import { getClientSession, clearClientSession } from '@/lib/auth';
import { EventData, PhotoRecord, InvoiceRecord, PayoutRequest, VideoTestimonialSubmission, UserAccount } from '@/lib/types';
import { toast } from 'sonner';

type AdminTab = 'overview' | 'events' | 'moderation' | 'vendors' | 'invoices' | 'payouts' | 'testimonials' | 'addons';

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(true);

  // Data states
  const [events, setEvents] = useState<EventData[]>([]);
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [testimonials, setTestimonials] = useState<VideoTestimonialSubmission[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [photoFilterEvent, setPhotoFilterEvent] = useState('all');

  // Verify Admin Session on mount
  useEffect(() => {
    const session = getClientSession();
    if (!session || session.role !== 'admin') {
      // If not logged in as admin, keep user state null and let them switch role or login
      setCurrentUser(session);
    } else {
      setCurrentUser(session);
    }
    loadAllAdminData();
  }, []);

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      const [resE, resP, resI, resPay, resT, resV] = await Promise.allSettled([
        fetch('/api/events').then(r => r.json()),
        fetch('/api/photos?includeHidden=true').then(r => r.json()),
        fetch('/api/invoices').then(r => r.json()),
        fetch('/api/payouts').then(r => r.json()),
        fetch('/api/testimonials').then(r => r.json()),
        fetch('/api/vendors').then(r => r.json())
      ]);

      if (resE.status === 'fulfilled' && resE.value.success) setEvents(resE.value.events || []);
      if (resP.status === 'fulfilled' && resP.value.success) setPhotos(resP.value.photos || []);
      if (resI.status === 'fulfilled' && resI.value.success) setInvoices(resI.value.invoices || []);
      if (resPay.status === 'fulfilled' && resPay.value.success) setPayouts(resPay.value.payouts || []);
      if (resT.status === 'fulfilled' && resT.value.success) setTestimonials(resT.value.testimonials || []);
      if (resV.status === 'fulfilled' && resV.value.success) setVendors(resV.value.vendors || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearClientSession();
    router.push('/login');
  };

  // -------------------------------------------------------------
  // EVENT ACTIONS (OVERRIDE ENGINE)
  // -------------------------------------------------------------
  const handleForceCuciRoll = async (eventId: string, title: string) => {
    if (!confirm(`Paksa cuci roll & buka semua foto acara "${title}" sekarang juga?`)) return;
    try {
      const res = await fetch('/api/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: eventId, revealMode: 'instant' })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Cuci roll instan aktif untuk "${title}". Tamu sudah dapat melihat semua foto!`);
        setEvents(prev => prev.map(e => e.id === eventId ? { ...e, revealMode: 'instant' } : e));
      } else {
        toast.error(data.error || 'Gagal mengubah status cuci roll.');
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan.');
    }
  };

  const handleAddPax = async (eventId: string, currentPax: number, title: string) => {
    const addStr = prompt(`Tambah berapa kuota Pax gratis untuk "${title}"?`, '50');
    if (!addStr) return;
    const toAdd = parseInt(addStr, 10);
    if (isNaN(toAdd) || toAdd <= 0) {
      toast.error('Jumlah pax harus angka positif.');
      return;
    }
    const newTotal = currentPax + toAdd;
    try {
      const res = await fetch('/api/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: eventId, maxGuests: newTotal })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Berhasil menambahkan +${toAdd} Pax gratis. Kuota sekarang: ${newTotal} Tamu.`);
        setEvents(prev => prev.map(e => e.id === eventId ? { ...e, maxGuests: newTotal } : e));
      }
    } catch {
      toast.error('Gagal memperbarui kuota tamu.');
    }
  };

  const handleDeleteEvent = async (eventId: string, title: string) => {
    if (!confirm(`PERINGATAN: Hapus permanen acara "${title}" beserta seluruh arsip fotonya? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      const res = await fetch(`/api/events?id=${encodeURIComponent(eventId)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success(`Acara "${title}" berhasil dihapus.`);
        setEvents(prev => prev.filter(e => e.id !== eventId));
      }
    } catch {
      toast.error('Gagal menghapus acara.');
    }
  };

  // -------------------------------------------------------------
  // PHOTO MODERATION
  // -------------------------------------------------------------
  const handleToggleHidePhoto = async (photoId: string, currentHidden: boolean) => {
    const newStatus = !currentHidden;
    try {
      const res = await fetch('/api/photos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: photoId, isHidden: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(newStatus ? 'Foto berhasil disensor dari galeri tamu.' : 'Foto dipulihkan ke galeri tamu.');
        setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, isHidden: newStatus } : p));
      }
    } catch {
      toast.error('Gagal memoderasi foto.');
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Hapus foto ini secara permanen dari server?')) return;
    try {
      const res = await fetch(`/api/photos?id=${encodeURIComponent(photoId)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Foto dihapus permanen.');
        setPhotos(prev => prev.filter(p => p.id !== photoId));
      }
    } catch {
      toast.error('Gagal menghapus foto.');
    }
  };

  // -------------------------------------------------------------
  // INVOICE ACTIONS
  // -------------------------------------------------------------
  const handleForcePaidInvoice = async (invoiceId: string, invoiceNum: string) => {
    if (!confirm(`Konfirmasi pembayaran manual untuk Invoice ${invoiceNum}? Acara akan langsung berstatus Lunas.`)) return;
    try {
      const res = await fetch('/api/invoices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: invoiceId, status: 'paid' })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Invoice ${invoiceNum} berhasil ditandai LUNAS!`);
        setInvoices(prev => prev.map(i => i.id === invoiceId ? { ...i, status: 'paid', paidAt: new Date().toISOString() } : i));
      }
    } catch {
      toast.error('Gagal memperbarui status invoice.');
    }
  };

  // -------------------------------------------------------------
  // PAYOUT APPROVALS
  // -------------------------------------------------------------
  const handleApprovePayout = async (payoutId: string, vendorName: string, amount: number) => {
    if (!confirm(`Setujui pencairan komisi Rp ${amount.toLocaleString('id-ID')} untuk ${vendorName}? Pastikan Anda telah mentransfer dana ke rekening yang tertera.`)) return;
    try {
      const res = await fetch('/api/payouts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: payoutId,
          status: 'approved',
          notes: 'Transfer bank berhasil diproses oleh Super Admin.'
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Payout ${vendorName} berhasil disetujui & dicatat lunas.`);
        setPayouts(prev => prev.map(p => p.id === payoutId ? { ...p, status: 'approved', processedAt: new Date().toISOString() } : p));
      }
    } catch {
      toast.error('Gagal memproses payout.');
    }
  };

  const handleRejectPayout = async (payoutId: string) => {
    const reason = prompt('Masukkan alasan penolakan pencairan dana:', 'Nomor rekening bank tidak valid');
    if (!reason) return;
    try {
      const res = await fetch('/api/payouts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: payoutId, status: 'rejected', notes: reason })
      });
      const data = await res.json();
      if (data.success) {
        toast.error('Permintaan payout ditolak.');
        setPayouts(prev => prev.map(p => p.id === payoutId ? { ...p, status: 'rejected', notes: reason } : p));
      }
    } catch {
      toast.error('Gagal menolak payout.');
    }
  };

  // -------------------------------------------------------------
  // TESTIMONIAL VIDEO CURATION
  // -------------------------------------------------------------
  const handleApproveTestimonial = async (testiId: string, vendorName: string) => {
    if (!confirm(`Setujui video testimoni dari ${vendorName}? Bonus komisi Rp 50.000 akan otomatis dicairkan.`)) return;
    try {
      const res = await fetch('/api/testimonials', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: testiId,
          status: 'approved',
          adminNotes: 'Video jernih, durasi memenuhi syarat >= 60 detik.'
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Testimoni disetujui! Reward Rp 50.000 dikreditkan.`);
        setTestimonials(prev => prev.map(t => t.id === testiId ? { ...t, status: 'approved', rewardPaidAt: new Date().toISOString() } : t));
      }
    } catch {
      toast.error('Gagal menyetujui video testimoni.');
    }
  };

  const handleRejectTestimonial = async (testiId: string) => {
    const reason = prompt('Masukkan alasan penolakan kurasi:', 'Durasi video kurang dari 60 detik / visual buram');
    if (!reason) return;
    try {
      const res = await fetch('/api/testimonials', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: testiId, status: 'rejected', adminNotes: reason })
      });
      const data = await res.json();
      if (data.success) {
        toast.error('Video testimoni ditolak.');
        setTestimonials(prev => prev.map(t => t.id === testiId ? { ...t, status: 'rejected', adminNotes: reason } : t));
      }
    } catch {
      toast.error('Gagal menolak video.');
    }
  };

  // -------------------------------------------------------------
  // FINANCIAL PULSE METRICS
  // -------------------------------------------------------------
  const totalGMV = invoices.reduce((acc, curr) => curr.status === 'paid' ? acc + curr.finalAmount : acc, 0);
  const totalVendorPayouts = payouts.filter(p => p.status === 'approved').reduce((acc, curr) => acc + curr.amount, 0);
  const pendingPayoutsTotal = payouts.filter(p => p.status === 'pending').reduce((acc, curr) => acc + curr.amount, 0);
  const netPlatformProfit = totalGMV - totalVendorPayouts;

  // Filtered views
  const filteredEvents = events.filter(e => 
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.coupleOrHost.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPhotos = photos.filter(p => {
    if (photoFilterEvent !== 'all' && p.eventId !== photoFilterEvent) return false;
    if (!searchTerm) return true;
    return p.guestName.toLowerCase().includes(searchTerm.toLowerCase()) || (p.caption && p.caption.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  // Guard view if not logged in as admin
  if (currentUser?.role !== 'admin') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F0E0C', color: '#FFFFFF', padding: '24px' }}>
        <div style={{ maxWidth: '440px', width: '100%', background: '#1C1917', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '36px 32px', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444', margin: '0 auto 16px' }}>
            <Shield size={28} />
          </div>
          <h1 className="font-display-serif" style={{ fontSize: '24px', marginBottom: '8px' }}>
            Akses Terbatas: Super Admin
          </h1>
          <p style={{ color: '#A1A1A6', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
            Halaman ini khusus untuk pemilik platform Sudut Bingkai. Silakan masuk menggunakan akun Super Admin resmi.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link
              href="/login"
              className="btn-apple-black"
              style={{ background: '#FFFFFF', color: '#000000', padding: '12px', fontSize: '14px', textDecoration: 'none', borderRadius: '12px' }}
            >
              Masuk sebagai Admin (admin@sudutbingkai.id)
            </Link>
            <Link
              href="/"
              style={{ color: '#86868B', fontSize: '13px', textDecoration: 'none', marginTop: '6px' }}
            >
              Kembali ke Beranda Publik
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8F8F7', color: '#1D1D1F' }}>
      {/* Top Glass Navigation Bar */}
      <header className="glass-nav" style={{ position: 'sticky', top: 0, zIndex: 50, padding: '12px 24px', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src="/sudut-bingkai-logo.png" alt="Sudut Bingkai" style={{ height: '28px', width: 'auto' }} />
            </Link>
            <span style={{ color: 'rgba(0,0,0,0.15)' }}>/</span>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#1D1D1F', color: '#FFFFFF', padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em' }}>
              <Shield size={12} color="#F59E0B" />
              <span>COMMAND CENTER</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right' }} className="desktop-only">
              <strong style={{ fontSize: '13px', display: 'block', color: '#1D1D1F' }}>Super Admin HQ</strong>
              <span style={{ fontSize: '11px', color: '#86868B' }}>admin@sudutbingkai.id</span>
            </div>

            <button
              onClick={loadAllAdminData}
              title="Refresh Data"
              className="glass-pill"
              style={{ padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <RefreshCw size={15} />
            </button>

            <button
              onClick={handleLogout}
              className="glass-pill"
              style={{ padding: '8px 14px', fontSize: '12.5px', color: '#E11D48', borderColor: 'rgba(225, 29, 72, 0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <LogOut size={14} />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 20px 80px' }}>
        {/* Navigation Tabs */}
        <div className="horizontal-scroll-row" style={{ gap: '8px', marginBottom: '28px', paddingBottom: '6px' }}>
          {[
            { id: 'overview', label: 'Ringkasan & Finansial', icon: DollarSign, count: null },
            { id: 'events', label: 'Kuasa Acara', icon: Calendar, count: events.length },
            { id: 'moderation', label: 'Moderasi Foto', icon: Camera, count: photos.length },
            { id: 'vendors', label: 'Mitra Vendor (WO)', icon: Users, count: vendors.length },
            { id: 'invoices', label: 'Pusat Invoice', icon: FileText, count: invoices.length },
            { id: 'payouts', label: 'Pencairan Dana', icon: Wallet, count: payouts.filter(p => p.status === 'pending').length || null, alert: payouts.filter(p => p.status === 'pending').length > 0 },
            { id: 'testimonials', label: 'Kurasi Video (+50k)', icon: Video, count: testimonials.filter(t => t.status === 'pending').length || null, alert: testimonials.filter(t => t.status === 'pending').length > 0 },
            { id: 'addons', label: 'Add-on Fisik', icon: Package, count: null }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className="glass-pill"
                style={{
                  background: isActive ? '#1D1D1F' : 'rgba(255, 255, 255, 0.7)',
                  color: isActive ? '#FFFFFF' : '#1D1D1F',
                  padding: '10px 16px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap',
                  boxShadow: isActive ? '0 4px 14px rgba(0,0,0,0.12)' : 'none',
                  border: tab.alert ? '1.5px solid #F59E0B' : '1px solid rgba(0,0,0,0.08)'
                }}
              >
                <Icon size={14} color={isActive ? '#F59E0B' : 'currentColor'} />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span style={{
                    background: isActive ? 'rgba(255,255,255,0.2)' : tab.alert ? '#F59E0B' : 'rgba(0,0,0,0.06)',
                    color: tab.alert && !isActive ? '#000000' : 'inherit',
                    padding: '1px 7px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 700
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ======================================================== */}
        {/* TAB 1: OVERVIEW & FINANCIAL PULSE */}
        {/* ======================================================== */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* 4 Metric Big Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div className="glass-card" style={{ padding: '24px', borderRadius: '20px' }}>
                <span className="font-mono-film" style={{ color: '#86868B', fontSize: '11px', display: 'block', marginBottom: '6px' }}>
                  TOTAL GMV (OMSET TRANSAKSI)
                </span>
                <strong style={{ fontSize: '28px', color: '#10B981', display: 'block', marginBottom: '6px' }}>
                  Rp {totalGMV.toLocaleString('id-ID')}
                </strong>
                <span style={{ fontSize: '12px', color: '#515154' }}>
                  Dari total {invoices.filter(i => i.status === 'paid').length} transaksi lunas
                </span>
              </div>

              <div className="glass-card" style={{ padding: '24px', borderRadius: '20px' }}>
                <span className="font-mono-film" style={{ color: '#86868B', fontSize: '11px', display: 'block', marginBottom: '6px' }}>
                  NET REVENUE PLATFORM (BERSIH)
                </span>
                <strong style={{ fontSize: '28px', color: '#1D1D1F', display: 'block', marginBottom: '6px' }}>
                  Rp {netPlatformProfit.toLocaleString('id-ID')}
                </strong>
                <span style={{ fontSize: '12px', color: '#10B981', fontWeight: 600 }}>
                  Margin bersih: ~78%
                </span>
              </div>

              <div className="glass-card" style={{ padding: '24px', borderRadius: '20px' }}>
                <span className="font-mono-film" style={{ color: '#86868B', fontSize: '11px', display: 'block', marginBottom: '6px' }}>
                  KOMISI VENDOR TERCURAH
                </span>
                <strong style={{ fontSize: '28px', color: '#C27803', display: 'block', marginBottom: '6px' }}>
                  Rp {totalVendorPayouts.toLocaleString('id-ID')}
                </strong>
                <span style={{ fontSize: '12px', color: pendingPayoutsTotal > 0 ? '#E11D48' : '#86868B', fontWeight: 500 }}>
                  Pending payout: Rp {pendingPayoutsTotal.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="glass-card" style={{ padding: '24px', borderRadius: '20px' }}>
                <span className="font-mono-film" style={{ color: '#86868B', fontSize: '11px', display: 'block', marginBottom: '6px' }}>
                  TOTAL ACARA & FOTO TERUNGGAH
                </span>
                <strong style={{ fontSize: '28px', color: '#1D1D1F', display: 'block', marginBottom: '6px' }}>
                  {events.length} Acara • {photos.length} Foto
                </strong>
                <span style={{ fontSize: '12px', color: '#515154' }}>
                  Storage Cloudflare R2: Terpasang
                </span>
              </div>
            </div>

            {/* Quick Action Alerts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {/* Payout Pending Card */}
              <div className="glass-card" style={{ padding: '26px', borderRadius: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0 }}>Antrean Pencairan Dana</h3>
                  <button onClick={() => setActiveTab('payouts')} className="glass-pill" style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}>
                    Lihat Semua
                  </button>
                </div>
                {payouts.filter(p => p.status === 'pending').length === 0 ? (
                  <p style={{ color: '#86868B', fontSize: '13px', margin: 0 }}>✓ Tidak ada permintaan penarikan yang menunggu transfer.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {payouts.filter(p => p.status === 'pending').slice(0, 3).map(p => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <div>
                          <strong style={{ fontSize: '13px', display: 'block' }}>{p.vendorName}</strong>
                          <span style={{ fontSize: '11px', color: '#86868B' }}>{p.bankDetails.bankName} - {p.bankDetails.accountNumber} ({p.bankDetails.accountHolder})</span>
                        </div>
                        <strong style={{ color: '#10B981', fontSize: '14px' }}>Rp {p.amount.toLocaleString('id-ID')}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Testimonials Pending Card */}
              <div className="glass-card" style={{ padding: '26px', borderRadius: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0 }}>Kurasi Video Testimoni (+50k)</h3>
                  <button onClick={() => setActiveTab('testimonials')} className="glass-pill" style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}>
                    Lihat Semua
                  </button>
                </div>
                {testimonials.filter(t => t.status === 'pending').length === 0 ? (
                  <p style={{ color: '#86868B', fontSize: '13px', margin: 0 }}>✓ Seluruh video testimoni telah dikurasi.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {testimonials.filter(t => t.status === 'pending').slice(0, 3).map(t => (
                      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <div>
                          <strong style={{ fontSize: '13px', display: 'block' }}>{t.eventTitle}</strong>
                          <span style={{ fontSize: '11px', color: '#86868B' }}>{t.submitterName} • {t.durationSeconds} Detik</span>
                        </div>
                        <button
                          onClick={() => handleApproveTestimonial(t.id, t.submitterName)}
                          className="btn-apple-black"
                          style={{ padding: '6px 12px', fontSize: '11.5px', borderRadius: '8px' }}
                        >
                          Approve (+50k)
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: EVENTS MANAGEMENT & OVERRIDE */}
        {/* ======================================================== */}
        {activeTab === 'events' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Seluruh Acara Terdaftar ({events.length})</h2>
                <span style={{ fontSize: '13px', color: '#6E6E73' }}>Admin memiliki hak override, cuci roll paksa, suntik pax, dan takedown</span>
              </div>
              <div style={{ position: 'relative', width: '280px' }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#86868B' }} />
                <input
                  type="text"
                  placeholder="Cari nama acara / host..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="glass-input"
                  style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '12px', fontSize: '13px' }}
                />
              </div>
            </div>

            <div className="glass-card" style={{ padding: '0', borderRadius: '20px', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: '#86868B' }}>ACARA & HOST</th>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: '#86868B' }}>TANGGAL & VENUE</th>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: '#86868B' }}>PAKET & PAX</th>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: '#86868B' }}>STATUS ROLL</th>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: '#86868B' }}>AKSI ADMIN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.map(e => (
                      <tr key={e.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                        <td style={{ padding: '16px 18px' }}>
                          <strong style={{ fontSize: '14px', color: '#1D1D1F', display: 'block' }}>{e.title}</strong>
                          <span style={{ fontSize: '11px', color: '#86868B' }}>ID: {e.id} • WO: {e.vendorName || 'Mandiri'}</span>
                        </td>
                        <td style={{ padding: '16px 18px' }}>
                          <span style={{ display: 'block' }}>{new Date(e.eventDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          <span style={{ fontSize: '11px', color: '#86868B' }}>{e.location || 'Lokasi Belum Diatur'}</span>
                        </td>
                        <td style={{ padding: '16px 18px' }}>
                          <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{e.packageTier || 'wedding'}</span>
                          <span style={{ fontSize: '11px', color: '#86868B', display: 'block' }}>{e.maxGuests} Tamu • {e.shotsPerGuest} Foto</span>
                        </td>
                        <td style={{ padding: '16px 18px' }}>
                          {e.revealMode === 'instant' ? (
                            <span style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px' }}>
                              Instant (Buka)
                            </span>
                          ) : (
                            <button
                              onClick={() => handleForceCuciRoll(e.id, e.title)}
                              className="glass-pill"
                              style={{ padding: '4px 10px', fontSize: '11px', cursor: 'pointer', borderColor: '#F59E0B', color: '#D97706', fontWeight: 600 }}
                            >
                              Cuci Roll Paksa
                            </button>
                          )}
                        </td>
                        <td style={{ padding: '16px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Link
                              href={`/event/${e.slug || e.id}`}
                              target="_blank"
                              className="glass-pill"
                              style={{ padding: '6px 10px', fontSize: '11.5px', textDecoration: 'none' }}
                            >
                              Galeri
                            </Link>

                            <Link
                              href={`/event/${e.slug || e.id}/live`}
                              target="_blank"
                              className="glass-pill"
                              style={{ padding: '6px 10px', fontSize: '11.5px', textDecoration: 'none' }}
                            >
                              Wall
                            </Link>

                            <button
                              onClick={() => handleAddPax(e.id, e.maxGuests, e.title)}
                              className="glass-pill"
                              style={{ padding: '6px 10px', fontSize: '11.5px', cursor: 'pointer', color: '#2563EB' }}
                              title="Suntik kuota tamu gratis"
                            >
                              +Pax
                            </button>

                            <button
                              onClick={() => handleDeleteEvent(e.id, e.title)}
                              className="glass-pill"
                              style={{ padding: '6px 8px', fontSize: '11.5px', cursor: 'pointer', color: '#E11D48' }}
                              title="Hapus Acara"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: PHOTO MODERATION & CENSOR SHIELD */}
        {/* ======================================================== */}
        {activeTab === 'moderation' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Moderasi Foto & Sensor ({photos.length} Foto)</h2>
                <span style={{ fontSize: '13px', color: '#6E6E73' }}>Sensor foto yang tidak layak, spam, atau blur dari tayangan videotron</span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <select
                  value={photoFilterEvent}
                  onChange={(e) => setPhotoFilterEvent(e.target.value)}
                  className="glass-input"
                  style={{ padding: '8px 12px', borderRadius: '12px', fontSize: '13px', background: '#FFFFFF' }}
                >
                  <option value="all">Semua Acara</option>
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {filteredPhotos.length === 0 ? (
              <div className="glass-card" style={{ padding: '60px 20px', textAlign: 'center', color: '#86868B', borderRadius: '20px' }}>
                <Camera size={44} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p>Belum ada foto yang cocok dengan filter ini.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                {filteredPhotos.map(p => (
                  <div key={p.id} className="glass-card" style={{ padding: '10px', borderRadius: '16px', position: 'relative', opacity: p.isHidden ? 0.6 : 1 }}>
                    <div style={{ width: '100%', aspectRatio: '3/4', borderRadius: '12px', overflow: 'hidden', background: '#000', marginBottom: '8px', position: 'relative' }}>
                      <img src={p.imageData} alt={p.guestName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {p.isHidden && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(239, 68, 68, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontWeight: 700, fontSize: '12px' }}>
                          DISENSOR
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', marginBottom: '8px' }}>
                      <strong style={{ display: 'block' }}>{p.guestName}</strong>
                      <span style={{ fontSize: '10.5px', color: '#86868B' }}>Acara: {p.eventId}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleToggleHidePhoto(p.id, !!p.isHidden)}
                        className="glass-pill"
                        style={{ flex: 1, padding: '6px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        {p.isHidden ? <Eye size={12} /> : <EyeOff size={12} />}
                        <span>{p.isHidden ? 'Buka' : 'Sensor'}</span>
                      </button>
                      <button
                        onClick={() => handleDeletePhoto(p.id)}
                        className="glass-pill"
                        style={{ padding: '6px 8px', color: '#E11D48', cursor: 'pointer' }}
                        title="Hapus Permanen"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: VENDOR PARTNER COMMAND CENTER */}
        {/* ======================================================== */}
        {activeTab === 'vendors' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Mitra Vendor & Wedding Organizer ({vendors.length})</h2>
              <span style={{ fontSize: '13px', color: '#6E6E73' }}>Kelola level komisi (Tiering 12%/15%/20%), kode referral, dan saldo grosir</span>
            </div>

            <div className="glass-card" style={{ padding: '0', borderRadius: '20px', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: '#86868B' }}>NAMA AGENSI / WO</th>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: '#86868B' }}>KONTAK & INSTAGRAM</th>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: '#86868B' }}>TIER & REFERRAL</th>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: '#86868B' }}>SALDO DOMPET</th>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: '#86868B' }}>AKSI KONTROL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.map(v => (
                      <tr key={v.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                        <td style={{ padding: '16px 18px' }}>
                          <strong style={{ fontSize: '14px', display: 'block' }}>{v.companyName || v.name}</strong>
                          <span style={{ fontSize: '11px', color: '#86868B' }}>PIC: {v.name} • {v.email}</span>
                        </td>
                        <td style={{ padding: '16px 18px' }}>
                          <span>{v.phone || '-'}</span>
                          <span style={{ fontSize: '11px', color: '#C27803', display: 'block' }}>{v.instagram || '-'}</span>
                        </td>
                        <td style={{ padding: '16px 18px' }}>
                          <span style={{ background: 'rgba(194, 120, 3, 0.12)', color: '#C27803', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', marginRight: '6px' }}>
                            {v.partnerTier === 'vip' ? 'VIP (20%)' : v.partnerTier === 'pro' ? 'Pro (15%)' : 'Regular (12%)'}
                          </span>
                          <code style={{ fontSize: '12px', fontWeight: 700 }}>{v.referralCode || 'BELUM ADA'}</code>
                        </td>
                        <td style={{ padding: '16px 18px' }}>
                          <strong style={{ color: '#10B981', fontSize: '14px', display: 'block' }}>
                            Rp {(v.walletBalance || 420000).toLocaleString('id-ID')}
                          </strong>
                          <span style={{ fontSize: '11px', color: '#86868B' }}>
                            Total Dihasilkan: Rp {(v.totalEarnings || 1260000).toLocaleString('id-ID')}
                          </span>
                        </td>
                        <td style={{ padding: '16px 18px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => toast.success(`Status akun ${v.companyName} terverifikasi!`)}
                              className="glass-pill"
                              style={{ padding: '6px 10px', fontSize: '11.5px', cursor: 'pointer', color: '#059669' }}
                            >
                              ✓ Verifikasi
                            </button>
                            <a
                              href={`https://wa.me/${(v.phone || '').replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="glass-pill"
                              style={{ padding: '6px 10px', fontSize: '11.5px', textDecoration: 'none' }}
                            >
                              WhatsApp
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: INVOICES & MANUAL RECONCILIATION */}
        {/* ======================================================== */}
        {activeTab === 'invoices' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Pusat Invoice & Tagihan ({invoices.length})</h2>
              <span style={{ fontSize: '13px', color: '#6E6E73' }}>Rekonsiliasi transaksi, verifikasi transfer manual BCA/Mandiri, dan kirim ulang invoice</span>
            </div>

            <div className="glass-card" style={{ padding: '0', borderRadius: '20px', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: '#86868B' }}>NO. INVOICE</th>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: '#86868B' }}>PEMBELI / WO</th>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: '#86868B' }}>PAKET & HARGA</th>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: '#86868B' }}>STATUS</th>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: '#86868B' }}>AKSI ADMIN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                        <td style={{ padding: '16px 18px' }}>
                          <strong style={{ fontSize: '13.5px', fontFamily: 'var(--font-mono)' }}>{inv.invoiceNumber}</strong>
                          <span style={{ fontSize: '11px', color: '#86868B', display: 'block' }}>Tgl: {new Date(inv.createdAt).toLocaleDateString('id-ID')}</span>
                        </td>
                        <td style={{ padding: '16px 18px' }}>
                          <span style={{ fontWeight: 600, display: 'block' }}>{inv.buyerName}</span>
                          <span style={{ fontSize: '11px', color: '#86868B' }}>{inv.buyerEmail}</span>
                        </td>
                        <td style={{ padding: '16px 18px' }}>
                          <span>{inv.tierName}</span>
                          <strong style={{ display: 'block', color: '#1D1D1F' }}>Rp {inv.finalAmount.toLocaleString('id-ID')}</strong>
                        </td>
                        <td style={{ padding: '16px 18px' }}>
                          {inv.status === 'paid' ? (
                            <span style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px' }}>
                              ✓ LUNAS
                            </span>
                          ) : (
                            <span style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#D97706', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px' }}>
                              ⏳ MENUNGGU
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '16px 18px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {inv.status !== 'paid' && (
                              <button
                                onClick={() => handleForcePaidInvoice(inv.id, inv.invoiceNumber)}
                                className="glass-pill"
                                style={{ padding: '6px 10px', fontSize: '11.5px', cursor: 'pointer', color: '#059669', borderColor: '#10B981', fontWeight: 600 }}
                              >
                                Tandai Lunas (BCA)
                              </button>
                            )}

                            <Link
                              href={`/invoice/${inv.eventId || inv.id}`}
                              target="_blank"
                              className="glass-pill"
                              style={{ padding: '6px 10px', fontSize: '11.5px', textDecoration: 'none' }}
                            >
                              Buka PDF
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 6: PAYOUT QUEUE & DISBURSEMENTS */}
        {/* ======================================================== */}
        {activeTab === 'payouts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Antrean Pencairan Komisi Mitra ({payouts.length})</h2>
              <span style={{ fontSize: '13px', color: '#6E6E73' }}>Periksa rekening bank, setujui penarikan, dan konfirmasi transfer komisi</span>
            </div>

            <div className="glass-card" style={{ padding: '0', borderRadius: '20px', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: '#86868B' }}>MITRA VENDOR</th>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: '#86868B' }}>DATA REKENING TUJUAN</th>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: '#86868B' }}>JUMLAH PENARIKAN</th>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: '#86868B' }}>STATUS</th>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: '#86868B' }}>AKSI ADMIN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                        <td style={{ padding: '16px 18px' }}>
                          <strong style={{ fontSize: '14px', display: 'block' }}>{p.vendorName}</strong>
                          <span style={{ fontSize: '11px', color: '#86868B' }}>{p.vendorEmail}</span>
                        </td>
                        <td style={{ padding: '16px 18px' }}>
                          <span style={{ fontWeight: 600, display: 'block' }}>{p.bankDetails.bankName} - {p.bankDetails.accountNumber}</span>
                          <span style={{ fontSize: '11.5px', color: '#515154' }}>a.n. {p.bankDetails.accountHolder}</span>
                        </td>
                        <td style={{ padding: '16px 18px' }}>
                          <strong style={{ fontSize: '16px', color: '#10B981' }}>Rp {p.amount.toLocaleString('id-ID')}</strong>
                        </td>
                        <td style={{ padding: '16px 18px' }}>
                          {p.status === 'approved' ? (
                            <span style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px' }}>
                              ✓ DITRANSFER
                            </span>
                          ) : p.status === 'rejected' ? (
                            <span style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#DC2626', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px' }}>
                              ✕ DITOLAK
                            </span>
                          ) : (
                            <span style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#D97706', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px' }}>
                              ⏳ MENUNGGU TRANSFER
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '16px 18px' }}>
                          {p.status === 'pending' ? (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                onClick={() => handleApprovePayout(p.id, p.vendorName, p.amount)}
                                className="btn-apple-black"
                                style={{ padding: '6px 12px', fontSize: '11.5px', borderRadius: '8px' }}
                              >
                                Setujui Transfer
                              </button>
                              <button
                                onClick={() => handleRejectPayout(p.id)}
                                className="glass-pill"
                                style={{ padding: '6px 10px', fontSize: '11.5px', color: '#E11D48', cursor: 'pointer' }}
                              >
                                Tolak
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '11.5px', color: '#86868B' }}>
                              {p.processedAt ? new Date(p.processedAt).toLocaleDateString('id-ID') : '-'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 7: TESTIMONIAL VIDEO CURATION */}
        {/* ======================================================== */}
        {activeTab === 'testimonials' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Kurasi Video Testimoni Acara ({testimonials.length})</h2>
              <span style={{ fontSize: '13px', color: '#6E6E73' }}>Periksa video minimal 1 menit (60s), setujui untuk reward saldo +Rp 50.000 ke dompet mitra</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
              {testimonials.map(t => (
                <div key={t.id} className="glass-card" style={{ padding: '20px', borderRadius: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '15px' }}>{t.eventTitle}</strong>
                      {t.status === 'approved' ? (
                        <span style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669', fontSize: '10.5px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px' }}>
                          ✓ Disetujui (+50k)
                        </span>
                      ) : t.status === 'rejected' ? (
                        <span style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#DC2626', fontSize: '10.5px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px' }}>
                          ✕ Ditolak
                        </span>
                      ) : (
                        <span style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#D97706', fontSize: '10.5px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px' }}>
                          ⏳ Menunggu Kurasi
                        </span>
                      )}
                    </div>

                    <p style={{ fontSize: '12.5px', color: '#6E6E73', margin: '0 0 10px 0' }}>
                      Pengirim: <strong>{t.submitterName}</strong> • Durasi: <strong>{t.durationSeconds} Detik</strong>
                    </p>

                    {t.caption && (
                      <p style={{ fontSize: '12px', fontStyle: 'italic', background: 'rgba(0,0,0,0.02)', padding: '8px 10px', borderRadius: '8px', margin: '0 0 14px 0' }}>
                        &ldquo;{t.caption}&rdquo;
                      </p>
                    )}

                    <div style={{ marginBottom: '16px' }}>
                      <a
                        href={t.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="glass-pill"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '12px', textDecoration: 'none', color: '#C27803', fontWeight: 600 }}
                      >
                        <ExternalLink size={13} />
                        <span>Tonton Video di Tab Baru</span>
                      </a>
                    </div>
                  </div>

                  {t.status === 'pending' ? (
                    <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '14px' }}>
                      <button
                        onClick={() => handleApproveTestimonial(t.id, t.submitterName)}
                        className="btn-apple-black"
                        style={{ flex: 1, padding: '8px', fontSize: '12px', borderRadius: '10px' }}
                      >
                        Approve (+Rp 50k)
                      </button>
                      <button
                        onClick={() => handleRejectTestimonial(t.id)}
                        className="glass-pill"
                        style={{ padding: '8px 14px', fontSize: '12px', color: '#E11D48', cursor: 'pointer' }}
                      >
                        Tolak
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: '#86868B', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '10px' }}>
                      Catatan: {t.adminNotes || 'Selesai diproses.'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 8: PHYSICAL ADDONS FULFILLMENT */}
        {/* ======================================================== */}
        {activeTab === 'addons' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Fulfillment Add-on Fisik (Akrilik, Banner, TV Rental)</h2>
              <span style={{ fontSize: '13px', color: '#6E6E73' }}>Katalog add-on aktif dan manajemen order pengiriman perlengkapan resepsi Jabodetabek</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
              {[
                { title: 'Paket Standing Akrilik Meja (10 pcs)', cat: 'Akrilik Meja Tamu', price: 'Rp 499.000', cost: 'Modal Cetak ~Rp 250k', status: 'Katalog Aktif' },
                { title: 'Paket Standing Akrilik Meja (20 pcs)', cat: 'Akrilik Meja Tamu', price: 'Rp 799.000', cost: 'Modal Cetak ~Rp 450k', status: 'Katalog Aktif' },
                { title: 'Welcome Gate Roll-up Banner (60x160cm)', cat: 'Foyer Welcome Gate', price: 'Rp 249.000', cost: 'Modal Cetak ~Rp 75k', status: 'Katalog Aktif' },
                { title: 'Sewa TV Vertikal Totem Kiosk 43"', cat: 'Live Slideshow Foyer', price: 'Rp 1.350.000', cost: 'Sub-kontrak Rental ~Rp 600k', status: 'Katalog Aktif' }
              ].map((item, idx) => (
                <div key={idx} className="glass-card" style={{ padding: '22px', borderRadius: '18px' }}>
                  <span className="font-mono-film" style={{ color: '#C27803', fontSize: '10.5px', display: 'block', marginBottom: '4px' }}>
                    {item.cat}
                  </span>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>{item.title}</h3>
                  <strong style={{ fontSize: '18px', color: '#10B981', display: 'block', marginBottom: '4px' }}>{item.price}</strong>
                  <span style={{ fontSize: '11.5px', color: '#86868B', display: 'block', marginBottom: '14px' }}>{item.cost}</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '12px' }}>
                    <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px' }}>
                      Gratis Ongkir Jabodetabek
                    </span>
                    <button onClick={() => toast.info('Katalog add-on ini siap ditampilkan di form pemesanan.')} className="glass-pill" style={{ padding: '4px 10px', fontSize: '11px', cursor: 'pointer' }}>
                      Atur Harga
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
