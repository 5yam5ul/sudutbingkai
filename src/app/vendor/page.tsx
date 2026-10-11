'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Briefcase, Building, Plus, Users, QrCode, Camera, Download, 
  ExternalLink, ArrowRight, Check, Sliders, LogOut, 
  Upload, Image as ImageIcon, Calculator, FileText, CheckCircle2, 
  DollarSign, MessageCircle, HelpCircle, Layers, ShieldCheck, Flame, Copy, Trash2
} from 'lucide-react';
import { UserAccount } from '@/lib/types';
import { getClientSession, setClientSession, clearClientSession, SYSTEM_USERS } from '@/lib/auth';
import ConfirmModal from '@/components/ConfirmModal';
import { toast } from 'sonner';

export default function VendorPortalPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [vendor, setVendor] = useState<UserAccount>(SYSTEM_USERS['vendor']);
  const [activeTab, setActiveTab] = useState<'branding' | 'clients' | 'wholesale' | 'marketing'>('wholesale');

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

  // Vendor Branding & Logo State
  const [companyName, setCompanyName] = useState('Vows & Co. Wedding Planner');
  const [instagram, setInstagram] = useState('@vowsandco.wo');
  const [phone, setPhone] = useState('08118899001');
  const [city, setCity] = useState('Jakarta');
  const [logoUrl, setLogoUrl] = useState('https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=200&q=80');
  const [isSaving, setIsSaving] = useState(false);
  const [isBrandingSaved, setIsBrandingSaved] = useState(false);

  // Custom Wholesale Calculator State
  const [customEvents, setCustomEvents] = useState<number>(5);
  const [customPlan, setCustomPlan] = useState<'event' | 'wedding' | 'unlimited'>('wedding');
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  // Mock Vendor Clients
  const [clients, setClients] = useState([
    {
      id: 'wedding-sarah-dimas',
      title: 'Dimas & Sarah Wedding',
      date: '10 Oktober 2026',
      venue: 'Plataran Hutan Kota, Jakarta',
      guestCount: 180,
      photoCount: 42,
      preset: 'Kodak Portra 400',
      status: 'Aktif'
    },
    {
      id: 'wedding-budi-jessica',
      title: 'Budi & Jessica Reception',
      date: '24 Oktober 2026',
      venue: 'The Dharmawangsa, Jakarta',
      guestCount: 250,
      photoCount: 0,
      preset: 'CineStill 800T',
      status: 'Mendatang'
    },
    {
      id: 'wedding-kevin-natasya',
      title: 'Kevin & Natasya Bali Celebration',
      date: '14 November 2026',
      venue: 'Ayana Resort, Bali',
      guestCount: 120,
      photoCount: 0,
      preset: 'Fujifilm QuickSnap',
      status: 'Mendatang'
    }
  ]);

  // Load existing vendor data & events if exists
  useEffect(() => {
    const session = getClientSession();
    if (!session || session.role !== 'vendor') {
      router.push('/login');
      return;
    }

    setVendor(session);
    if (session.companyName) setCompanyName(session.companyName);
    if (session.instagram) setInstagram(session.instagram);
    if (session.phone) setPhone(session.phone);

    fetch('/api/vendors')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.vendors && data.vendors.length > 0) {
          const v = data.vendors.find((item: any) => item.id === (session?.id || 'vendor_vows_co')) || data.vendors[0];
          setCompanyName(v.name);
          setInstagram(v.instagram);
          setLogoUrl(v.logoUrl);
          if (v.city) setCity(v.city);
        }
      })
      .catch(console.error);

    const vendorId = session?.id || 'vendor_vows_co';
    fetch(`/api/events?vendorId=${encodeURIComponent(vendorId)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.events && data.events.length > 0) {
          const realClients = data.events.map((ev: any) => ({
            id: ev.id,
            title: ev.title,
            date: new Date(ev.eventDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
            venue: ev.location || 'Lokasi Acara',
            guestCount: ev.maxGuests || 150,
            photoCount: 0,
            preset: ev.preset,
            status: 'Aktif'
          }));
          setClients(realClients);
        }
      })
      .catch(console.error);
  }, []);

  const handleLogout = () => {
    clearClientSession();
    router.push('/login');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran file logo maksimal 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setLogoUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteClient = (clientId: string, clientTitle: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Acara Klien?',
      description: `Apakah Anda yakin ingin menghapus acara "${clientTitle}"? Seluruh arsip rol foto dan akses tamu untuk acara ini akan dihapus dari dashboard agensi Anda.`,
      confirmText: 'Hapus Acara',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setClients(prev => prev.filter(c => c.id !== clientId));
        toast.success(`Acara "${clientTitle}" berhasil dihapus.`);
        try {
          await fetch(`/api/events?id=${clientId}`, { method: 'DELETE' });
        } catch (e) {
          console.error('Gagal menghapus event klien:', e);
        }
      }
    });
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const vendorId = vendor.id || 'vendor_vows_co';
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: vendorId,
          name: companyName,
          instagram,
          city,
          logoUrl,
          tier: vendor.tier || 'Agency Pro'
        })
      });

      const data = await res.json();
      if (data.success) {
        setIsBrandingSaved(true);
        const updated = { ...vendor, companyName, name: companyName, instagram, logoUrl };
        setVendor(updated);
        setClientSession(updated);
        setTimeout(() => setIsBrandingSaved(false), 3500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Custom Wholesale Calculator Mathematics
  const planDetails = {
    event: { name: 'Paket Event (150 Tamu)', basePrice: 269000 },
    wedding: { name: 'Paket Wedding (300 Tamu)', basePrice: 499000 },
    unlimited: { name: 'Paket Unlimited Tamu', basePrice: 999000 }
  };

  const currentPlanInfo = planDetails[customPlan];
  const normalTotalPrice = customEvents * currentPlanInfo.basePrice;

  // Tiered discount based on quantity
  let discountPercent = 0;
  if (customEvents >= 20) {
    discountPercent = 45;
  } else if (customEvents >= 10) {
    discountPercent = 40;
  } else if (customEvents >= 5) {
    discountPercent = 30;
  } else if (customEvents >= 3) {
    discountPercent = 25;
  } else if (customEvents >= 2) {
    discountPercent = 15;
  } else {
    discountPercent = 0;
  }

  const wholesaleTotalPrice = Math.round(normalTotalPrice * (1 - discountPercent / 100));
  const savingsAmount = normalTotalPrice - wholesaleTotalPrice;
  const costPerEvent = customEvents > 0 ? Math.round(wholesaleTotalPrice / customEvents) : 0;
  const profitMarginPercent = costPerEvent > 0 ? Math.round((savingsAmount / wholesaleTotalPrice) * 100) : 0;

  const formatRp = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(id);
    setTimeout(() => setCopiedScript(null), 3000);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FBFBFA', color: '#1D1D1F' }}>
      {/* Top Navigation */}
      <header className="glass-nav" style={{ padding: 'calc(12px + env(safe-area-inset-top, 0px)) 20px 12px', borderBottom: '1px solid rgba(0, 0, 0, 0.06)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
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
              PORTAL MITRA VENDOR & WO
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right' }} className="desktop-only">
              <strong style={{ fontSize: '13.5px', color: '#1D1D1F', display: 'block' }}>{companyName}</strong>
              <span style={{ fontSize: '11.5px', color: '#86868B' }}>Mitra Terverifikasi • {clients.length} Klien Aktif</span>
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

      {/* Main Vendor Dashboard */}
      <main className="dashboard-main">
        {/* Vendor Header Hero */}
        <div className="glass-card form-section-card" style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              {logoUrl ? (
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '1px solid rgba(0,0,0,0.08)',
                  background: '#FFFFFF',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                  flexShrink: 0
                }}>
                  <img src={logoUrl} alt={companyName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ) : (
                <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: 'rgba(194, 120, 3, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C27803', flexShrink: 0 }}>
                  <Building size={24} />
                </div>
              )}

              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 9px', borderRadius: '999px', background: 'rgba(194, 120, 3, 0.1)', color: '#C27803', fontSize: '10.5px', fontWeight: 600, marginBottom: '6px' }}>
                  <Building size={12} />
                  <span>Wedding Organizer Partner Hub</span>
                </div>

                <h1 className="font-display-serif" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.2rem)', fontWeight: 700, color: '#1D1D1F', marginBottom: '4px' }}>
                  {companyName}
                </h1>

                <p style={{ color: '#515154', fontSize: '13.5px' }}>
                  {instagram} • {city} • Logo aktif di Beranda SudutBingkai, Kartu Meja & Layar Proyektor
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', width: '100%', maxWidth: '440px' }}>
              <Link href="/" target="_blank" className="glass-pill" style={{ padding: '10px 14px', fontSize: '12.5px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <ExternalLink size={14} />
                <span>Lihat di Beranda</span>
              </Link>

              <Link href="/create" className="btn-apple-black" style={{ padding: '10px 16px', fontSize: '12.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Plus size={15} />
                <span>Tambah Acara Klien</span>
              </Link>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="responsive-metrics-grid" style={{ marginTop: '24px', borderTop: '1px solid rgba(0, 0, 0, 0.06)', paddingTop: '20px' }}>
            <div>
              <span className="font-mono-film" style={{ color: '#86868B', display: 'block', marginBottom: '4px' }}>TOTAL PERNIKAHAN</span>
              <strong style={{ fontSize: '20px', color: '#1D1D1F' }}>{clients.length} Acara</strong>
            </div>

            <div>
              <span className="font-mono-film" style={{ color: '#86868B', display: 'block', marginBottom: '4px' }}>TOTAL FOTO KLIEN</span>
              <strong style={{ fontSize: '20px', color: '#1D1D1F' }}>42 Momen</strong>
            </div>

            <div>
              <span className="font-mono-film" style={{ color: '#86868B', display: 'block', marginBottom: '4px' }}>SISA KUOTA BUNDLE</span>
              <strong style={{ fontSize: '20px', color: '#27AE60' }}>7 Kuota Siap</strong>
            </div>

            <div>
              <span className="font-mono-film" style={{ color: '#86868B', display: 'block', marginBottom: '4px' }}>STATUS KEMITRAAN</span>
              <strong style={{ fontSize: '20px', color: '#C27803' }}>Featured Partner</strong>
            </div>
          </div>
        </div>

        {/* Tab Switcher - Horizontal Scroll on Mobile */}
        <div className="horizontal-scroll-row" style={{ gap: '10px', marginBottom: '28px', paddingBottom: '6px' }}>
          <button
            onClick={() => setActiveTab('wholesale')}
            className="glass-pill"
            style={{
              background: activeTab === 'wholesale' ? '#1D1D1F' : 'rgba(255, 255, 255, 0.7)',
              color: activeTab === 'wholesale' ? '#FFFFFF' : '#1D1D1F',
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap'
            }}
          >
            <Calculator size={14} />
            <span className="desktop-only">Paket Grosir & Custom Calculator</span>
            <span className="mobile-only">Paket Grosir</span>
          </button>

          <button
            onClick={() => setActiveTab('branding')}
            className="glass-pill"
            style={{
              background: activeTab === 'branding' ? '#1D1D1F' : 'rgba(255, 255, 255, 0.7)',
              color: activeTab === 'branding' ? '#FFFFFF' : '#1D1D1F',
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap'
            }}
          >
            <Upload size={14} />
            <span className="desktop-only">Upload Logo & Co-Branding</span>
            <span className="mobile-only">Co-Branding</span>
          </button>

          <button
            onClick={() => setActiveTab('clients')}
            className="glass-pill"
            style={{
              background: activeTab === 'clients' ? '#1D1D1F' : 'rgba(255, 255, 255, 0.7)',
              color: activeTab === 'clients' ? '#FFFFFF' : '#1D1D1F',
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap'
            }}
          >
            <Users size={14} />
            <span className="desktop-only">Daftar Klien Pengantin ({clients.length})</span>
            <span className="mobile-only">Klien ({clients.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('marketing')}
            className="glass-pill"
            style={{
              background: activeTab === 'marketing' ? '#1D1D1F' : 'rgba(255, 255, 255, 0.7)',
              color: activeTab === 'marketing' ? '#FFFFFF' : '#1D1D1F',
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap'
            }}
          >
            <FileText size={14} />
            <span className="desktop-only">Marketing Kit & Panduan MC</span>
            <span className="mobile-only">Marketing Kit</span>
          </button>
        </div>

        {/* TAB: PAKET GROSIR & CUSTOM CALCULATOR */}
        {activeTab === 'wholesale' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
            {/* Top Wholesale Intro */}
            <div className="glass-card form-section-card" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(246, 240, 230, 0.6) 100%)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                  <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '6px' }}>
                    PROGRAM RESELLER & MITRA WEDDING ORGANIZER
                  </span>
                  <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#1D1D1F', marginBottom: '8px' }}>
                    Hemat hingga 45% dengan Paket Grosir & Kuota Fleksibel
                  </h2>
                  <p style={{ color: '#515154', fontSize: '14.5px', maxWidth: '720px', lineHeight: 1.6 }}>
                    Dapatkan modal jauh lebih murah dibanding harga eceran. Masukkan SudutBingkai ke dalam proposal paket wedding Anda dan nikmati <strong>margin keuntungan 50% - 100%+</strong> setiap ada klien yang menikah!
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ background: '#FFFFFF', padding: '12px 18px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#86868B', display: 'block' }}>Masa Berlaku Kuota</span>
                    <strong style={{ fontSize: '14px', color: '#1D1D1F' }}>Fleksibel s/d 2 Tahun</strong>
                  </div>
                  <div style={{ background: '#FFFFFF', padding: '12px 18px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#86868B', display: 'block' }}>Logo Vendor</span>
                    <strong style={{ fontSize: '14px', color: '#C27803' }}>Co-Branding 100% Gratis</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 1: FIXED WHOLESALE PACKAGES */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '18px' }}>
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1D1D1F' }}>
                    Pilihan Paket Grosir Siap Pakai
                  </h3>
                  <p style={{ color: '#6E6E73', fontSize: '13px' }}>
                    Paket instan terpopuler untuk wedding organizer skala studio hingga agensi besar.
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(225px, 1fr))', gap: '16px' }}>
                {/* 3 Acara */}
                <div className="glass-card" style={{ padding: '24px', borderRadius: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <span className="font-mono-film" style={{ color: '#86868B', fontSize: '10.5px' }}>STARTER WO (3 ACARA)</span>
                    <h4 style={{ fontSize: '18px', fontWeight: 700, margin: '6px 0 2px' }}>Paket 3 Acara</h4>
                    <span style={{ fontSize: '11.5px', color: '#6E6E73' }}>Kapasitas 300 tamu/acara</span>

                    <div style={{ margin: '14px 0 8px' }}>
                      <span style={{ textDecoration: 'line-through', color: '#86868B', fontSize: '13px', display: 'block' }}>
                        Rp 1.497.000
                      </span>
                      <strong style={{ fontSize: '24px', fontWeight: 800, color: '#1D1D1F' }}>
                        Rp 1.120.000
                      </strong>
                    </div>

                    <div style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '6px', background: 'rgba(39, 174, 96, 0.1)', color: '#27AE60', fontSize: '11px', fontWeight: 600, marginBottom: '16px' }}>
                      Hemat 25% • Rp 373rb/acara
                    </div>

                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', fontSize: '12px', color: '#515154', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <li style={{ display: 'flex', gap: '6px' }}>✓ <span>3 Voucher Kuota Wedding (300 Tamu)</span></li>
                      <li style={{ display: 'flex', gap: '6px' }}>✓ <span>Masa aktif kuota 12 bulan</span></li>
                      <li style={{ display: 'flex', gap: '6px' }}>✓ <span>Co-branding logo WO di kartu meja</span></li>
                    </ul>
                  </div>

                  <a
                    href={`https://wa.me/6281234567890?text=${encodeURIComponent(`Halo SudutBingkai, saya dari WO ${companyName} ingin order Paket Grosir 3 Acara (Rp 1.120.000). Mohon info nomor rekening / invoice.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="glass-pill"
                    style={{ textAlign: 'center', padding: '10px', fontSize: '12.5px', textDecoration: 'none', fontWeight: 600 }}
                  >
                    Beli Paket 3 Acara
                  </a>
                </div>

                {/* 5 Acara */}
                <div className="glass-card" style={{ padding: '24px', borderRadius: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <span className="font-mono-film" style={{ color: '#86868B', fontSize: '10.5px' }}>STUDIO WO (5 ACARA)</span>
                    <h4 style={{ fontSize: '18px', fontWeight: 700, margin: '6px 0 2px' }}>Paket 5 Acara</h4>
                    <span style={{ fontSize: '11.5px', color: '#6E6E73' }}>Kapasitas 300 tamu/acara</span>

                    <div style={{ margin: '14px 0 8px' }}>
                      <span style={{ textDecoration: 'line-through', color: '#86868B', fontSize: '13px', display: 'block' }}>
                        Rp 2.495.000
                      </span>
                      <strong style={{ fontSize: '24px', fontWeight: 800, color: '#1D1D1F' }}>
                        Rp 1.745.000
                      </strong>
                    </div>

                    <div style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '6px', background: 'rgba(39, 174, 96, 0.1)', color: '#27AE60', fontSize: '11px', fontWeight: 600, marginBottom: '16px' }}>
                      Hemat 30% • Rp 349rb/acara
                    </div>

                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', fontSize: '12px', color: '#515154', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <li style={{ display: 'flex', gap: '6px' }}>✓ <span>5 Voucher Kuota Wedding (300 Tamu)</span></li>
                      <li style={{ display: 'flex', gap: '6px' }}>✓ <span>Masa aktif kuota 18 bulan</span></li>
                      <li style={{ display: 'flex', gap: '6px' }}>✓ <span>Logo WO tayang di homepage SudutBingkai</span></li>
                    </ul>
                  </div>

                  <a
                    href={`https://wa.me/6281234567890?text=${encodeURIComponent(`Halo SudutBingkai, saya dari WO ${companyName} ingin order Paket Grosir 5 Acara (Rp 1.745.000). Mohon info nomor rekening / invoice.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="glass-pill"
                    style={{ textAlign: 'center', padding: '10px', fontSize: '12.5px', textDecoration: 'none', fontWeight: 600 }}
                  >
                    Beli Paket 5 Acara
                  </a>
                </div>

                {/* 10 Acara (HIGHLIGHTED / POPULER) */}
                <div className="glass-card" style={{ padding: '24px', borderRadius: '20px', border: '2px solid #C27803', background: '#FFFFFF', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 8px 32px rgba(194, 120, 3, 0.08)' }}>
                  <div style={{ position: 'absolute', top: '-11px', left: '50%', transform: 'translateX(-50%)', background: '#C27803', color: '#FFFFFF', padding: '2px 10px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em' }}>
                    PALING LARIS • HEMAT 40%
                  </div>

                  <div>
                    <span className="font-mono-film" style={{ color: '#C27803', fontSize: '10.5px' }}>AGENCY PRO (10 ACARA)</span>
                    <h4 style={{ fontSize: '18px', fontWeight: 700, margin: '6px 0 2px' }}>Paket 10 Acara</h4>
                    <span style={{ fontSize: '11.5px', color: '#6E6E73' }}>Kapasitas 300 tamu/acara</span>

                    <div style={{ margin: '14px 0 8px' }}>
                      <span style={{ textDecoration: 'line-through', color: '#86868B', fontSize: '13px', display: 'block' }}>
                        Rp 4.990.000
                      </span>
                      <strong style={{ fontSize: '24px', fontWeight: 800, color: '#C27803' }}>
                        Rp 2.990.000
                      </strong>
                    </div>

                    <div style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '6px', background: 'rgba(194, 120, 3, 0.12)', color: '#C27803', fontSize: '11px', fontWeight: 600, marginBottom: '16px' }}>
                      Hanya Rp 299rb/acara (Cuan 67%+)
                    </div>

                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', fontSize: '12px', color: '#515154', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <li style={{ display: 'flex', gap: '6px' }}>✓ <span>10 Voucher Kuota Wedding (300 Tamu)</span></li>
                      <li style={{ display: 'flex', gap: '6px' }}>✓ <span>Masa aktif 24 bulan (2 tahun penuh)</span></li>
                      <li style={{ display: 'flex', gap: '6px' }}>✓ <span>Prioritas Bantuan CS WhatsApp 24/7</span></li>
                      <li style={{ display: 'flex', gap: '6px' }}>✓ <span>Featured badge di halaman Beranda</span></li>
                    </ul>
                  </div>

                  <a
                    href={`https://wa.me/6281234567890?text=${encodeURIComponent(`Halo SudutBingkai, saya dari WO ${companyName} ingin order Paket Grosir Agency 10 Acara (Rp 2.990.000). Mohon info invoice dan aktivasinya.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-apple-black"
                    style={{ textAlign: 'center', padding: '10px', fontSize: '12.5px', textDecoration: 'none', background: '#C27803', color: '#FFFFFF' }}
                  >
                    Beli Paket 10 Acara
                  </a>
                </div>

                {/* 20 Acara (ENTERPRISE) */}
                <div className="glass-card" style={{ padding: '24px', borderRadius: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <span className="font-mono-film" style={{ color: '#86868B', fontSize: '10.5px' }}>ENTERPRISE (20 ACARA)</span>
                    <h4 style={{ fontSize: '18px', fontWeight: 700, margin: '6px 0 2px' }}>Paket 20 Acara</h4>
                    <span style={{ fontSize: '11.5px', color: '#6E6E73' }}>Kapasitas 300 tamu/acara</span>

                    <div style={{ margin: '14px 0 8px' }}>
                      <span style={{ textDecoration: 'line-through', color: '#86868B', fontSize: '13px', display: 'block' }}>
                        Rp 9.980.000
                      </span>
                      <strong style={{ fontSize: '24px', fontWeight: 800, color: '#1D1D1F' }}>
                        Rp 5.490.000
                      </strong>
                    </div>

                    <div style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '6px', background: 'rgba(39, 174, 96, 0.1)', color: '#27AE60', fontSize: '11px', fontWeight: 600, marginBottom: '16px' }}>
                      Diskon 45% • Rp 274rb/acara
                    </div>

                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', fontSize: '12px', color: '#515154', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <li style={{ display: 'flex', gap: '6px' }}>✓ <span>20 Voucher Kuota Wedding (300 Tamu)</span></li>
                      <li style={{ display: 'flex', gap: '6px' }}>✓ <span><strong>Masa aktif selamanya (No Expiry)</strong></span></li>
                      <li style={{ display: 'flex', gap: '6px' }}>✓ <span>Custom branding di live proyektor</span></li>
                    </ul>
                  </div>

                  <a
                    href={`https://wa.me/6281234567890?text=${encodeURIComponent(`Halo SudutBingkai, saya dari WO ${companyName} ingin order Paket Grosir Enterprise 20 Acara (Rp 5.490.000). Mohon info invoice dan aktivasinya.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="glass-pill"
                    style={{ textAlign: 'center', padding: '10px', fontSize: '12.5px', textDecoration: 'none', fontWeight: 600 }}
                  >
                    Beli Paket 20 Acara
                  </a>
                </div>

                {/* UNLIMITED ANNUAL */}
                <div className="glass-card" style={{ padding: '24px', borderRadius: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(235, 235, 237, 0.7) 100%)' }}>
                  <div>
                    <span className="font-mono-film" style={{ color: '#1D1D1F', fontSize: '10.5px' }}>VIP ANNUAL PASS</span>
                    <h4 style={{ fontSize: '18px', fontWeight: 700, margin: '6px 0 2px' }}>Unlimited 1 Tahun</h4>
                    <span style={{ fontSize: '11.5px', color: '#6E6E73' }}>Acara Tanpa Batas</span>

                    <div style={{ margin: '14px 0 8px' }}>
                      <span style={{ fontSize: '11.5px', color: '#86868B', display: 'block' }}>
                        Berlaku 365 Hari
                      </span>
                      <strong style={{ fontSize: '24px', fontWeight: 800, color: '#1D1D1F' }}>
                        Rp 8.900.000
                      </strong>
                    </div>

                    <div style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '6px', background: 'rgba(0, 0, 0, 0.08)', color: '#1D1D1F', fontSize: '11px', fontWeight: 600, marginBottom: '16px' }}>
                      Bebas Ratusan Wedding
                    </div>

                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', fontSize: '12px', color: '#515154', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <li style={{ display: 'flex', gap: '6px' }}>✓ <span>Unlimited kuota acara selama 1 tahun</span></li>
                      <li style={{ display: 'flex', gap: '6px' }}>✓ <span>Maksimal 300 tamu per event</span></li>
                      <li style={{ display: 'flex', gap: '6px' }}>✓ <span>Dedicated Account Manager</span></li>
                    </ul>
                  </div>

                  <a
                    href={`https://wa.me/6281234567890?text=${encodeURIComponent(`Halo SudutBingkai, saya dari WO ${companyName} tertarik dengan Paket VIP Unlimited 1 Tahun (Rp 8.900.000). Mohon info lengkap dan pendaftarannya.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="glass-pill"
                    style={{ textAlign: 'center', padding: '10px', fontSize: '12.5px', textDecoration: 'none', fontWeight: 600 }}
                  >
                    Konsultasi VIP Unlimited
                  </a>
                </div>
              </div>
            </div>

            {/* SECTION 2: KALKULATOR GROSIR CUSTOM (INTERAKTIF & FLEKSIBEL) */}
            <div className="glass-card" style={{ padding: '36px', borderRadius: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(194, 120, 3, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C27803' }}>
                  <Calculator size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#1D1D1F' }}>
                    Kalkulator Paket Grosir Custom
                  </h3>
                  <span style={{ fontSize: '13px', color: '#6E6E73' }}>
                    Tentukan sendiri jumlah kuota acara sesuai jadwal wedding WO Anda. Diskon dihitung otomatis!
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px', marginTop: '28px' }}>
                {/* Left Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Select Capacity Type */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '8px' }}>
                      Pilih Kapasitas Tamu Rata-Rata Acara
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setCustomPlan('event')}
                        className="glass-card"
                        style={{
                          padding: '12px 10px',
                          borderRadius: '12px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          border: customPlan === 'event' ? '2px solid #1D1D1F' : '1px solid rgba(0,0,0,0.08)',
                          background: customPlan === 'event' ? '#FFFFFF' : 'rgba(255,255,255,0.5)'
                        }}
                      >
                        <strong style={{ display: 'block', fontSize: '13px', color: '#1D1D1F' }}>150 Tamu</strong>
                        <span style={{ fontSize: '11px', color: '#86868B' }}>Rp 269rb/acara</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCustomPlan('wedding')}
                        className="glass-card"
                        style={{
                          padding: '12px 10px',
                          borderRadius: '12px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          border: customPlan === 'wedding' ? '2px solid #C27803' : '1px solid rgba(0,0,0,0.08)',
                          background: customPlan === 'wedding' ? '#FFFFFF' : 'rgba(255,255,255,0.5)'
                        }}
                      >
                        <strong style={{ display: 'block', fontSize: '13px', color: '#C27803' }}>300 Tamu</strong>
                        <span style={{ fontSize: '11px', color: '#86868B' }}>Rp 499rb/acara</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCustomPlan('unlimited')}
                        className="glass-card"
                        style={{
                          padding: '12px 10px',
                          borderRadius: '12px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          border: customPlan === 'unlimited' ? '2px solid #1D1D1F' : '1px solid rgba(0,0,0,0.08)',
                          background: customPlan === 'unlimited' ? '#FFFFFF' : 'rgba(255,255,255,0.5)'
                        }}
                      >
                        <strong style={{ display: 'block', fontSize: '13px', color: '#1D1D1F' }}>Unlimited</strong>
                        <span style={{ fontSize: '11px', color: '#86868B' }}>Rp 999rb/acara</span>
                      </button>
                    </div>
                  </div>

                  {/* Quantity Slider */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '11.5px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B' }}>
                        Berapa Jumlah Acara yang Ingin Dibeli?
                      </label>
                      <span className="font-mono-film" style={{ fontSize: '18px', fontWeight: 800, color: '#1D1D1F' }}>
                        {customEvents} Acara
                      </span>
                    </div>

                    <input
                      type="range"
                      min="1"
                      max="40"
                      value={customEvents}
                      onChange={(e) => setCustomEvents(parseInt(e.target.value) || 1)}
                      style={{
                        width: '100%',
                        accentColor: '#C27803',
                        height: '6px',
                        cursor: 'pointer'
                      }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#86868B', marginTop: '6px' }}>
                      <span>1 Acara (Normal)</span>
                      <span>5 Acara (-30%)</span>
                      <span>10 Acara (-40%)</span>
                      <span>20+ Acara (-45%)</span>
                    </div>

                    {/* Quick Button Presets */}
                    <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
                      {[2, 4, 7, 12, 15, 25].map(qty => (
                        <button
                          key={qty}
                          type="button"
                          onClick={() => setCustomEvents(qty)}
                          className="glass-pill"
                          style={{
                            padding: '4px 10px',
                            fontSize: '11.5px',
                            background: customEvents === qty ? '#1D1D1F' : 'transparent',
                            color: customEvents === qty ? '#FFFFFF' : '#1D1D1F',
                            cursor: 'pointer'
                          }}
                        >
                          +{qty} Acara
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tier Progress Indicator */}
                  <div style={{ background: 'rgba(0,0,0,0.02)', padding: '14px 16px', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span style={{ color: '#515154' }}>Status Diskon Grosir:</span>
                      <strong style={{ color: discountPercent > 0 ? '#27AE60' : '#86868B' }}>
                        {discountPercent > 0 ? `Aktif Diskon ${discountPercent}%` : 'Belum Ada Diskon (Minimal 2 acara)'}
                      </strong>
                    </div>
                    {discountPercent < 45 && (
                      <span style={{ fontSize: '11px', color: '#86868B' }}>
                        💡 Tambah {customEvents < 5 ? 5 - customEvents : customEvents < 10 ? 10 - customEvents : 20 - customEvents} acara lagi untuk membuka diskon {customEvents < 5 ? '30%' : customEvents < 10 ? '40%' : '45%'}!
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Results & Profit Projection */}
                <div style={{
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  border: '1px solid rgba(0,0,0,0.08)',
                  padding: '24px 28px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '4px', fontSize: '11px' }}>
                      RINGKASAN BIAYA & LABA KOTOR
                    </span>
                    <h4 style={{ fontSize: '20px', fontWeight: 700, color: '#1D1D1F', marginBottom: '16px' }}>
                      Kalkulasi Grosir {customEvents} Acara
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '16px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6E6E73' }}>Harga Normal Eceran:</span>
                        <span style={{ textDecoration: 'line-through', color: '#86868B' }}>
                          Rp {formatRp(normalTotalPrice)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6E6E73' }}>Diskon Grosir Kemitraan:</span>
                        <span style={{ color: '#27AE60', fontWeight: 600 }}>
                          -Rp {formatRp(savingsAmount)} ({discountPercent}%)
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px dashed rgba(0,0,0,0.08)' }}>
                        <strong style={{ color: '#1D1D1F', fontSize: '15px' }}>Total Biaya Grosir:</strong>
                        <strong style={{ color: '#1D1D1F', fontSize: '20px', fontWeight: 800 }}>
                          Rp {formatRp(wholesaleTotalPrice)}
                        </strong>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#86868B', fontSize: '12px' }}>Biaya Netto per Acara:</span>
                        <span style={{ color: '#C27803', fontWeight: 700, fontSize: '13px' }}>
                          Rp {formatRp(costPerEvent)} / acara
                        </span>
                      </div>
                    </div>

                    {/* Profit Margin Projection Card */}
                    <div style={{ background: 'rgba(39, 174, 96, 0.08)', borderRadius: '14px', padding: '14px 16px', border: '1px solid rgba(39, 174, 96, 0.2)', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <Flame size={16} color="#27AE60" />
                        <strong style={{ fontSize: '13px', color: '#27AE60' }}>
                          Potensi Keuntungan WO: Rp {formatRp(savingsAmount)}
                        </strong>
                      </div>
                      <p style={{ fontSize: '12px', color: '#515154', lineHeight: 1.5, margin: 0 }}>
                        Jika Anda charge fasilitas kamera digital ini ke pengantin dengan tarif normal, Anda mengantongi <strong>margin keuntungan {profitMarginPercent}%</strong> bersih!
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <a
                      href={`https://wa.me/6281234567890?text=${encodeURIComponent(`Halo Tim SudutBingkai, saya dari WO ${companyName}. Saya ingin order Paket Grosir Custom ${customEvents} Acara (${currentPlanInfo.name}) dengan total grosir Rp ${formatRp(wholesaleTotalPrice)} (Hemat Rp ${formatRp(savingsAmount)}). Mohon invoice dan petunjuk pembayarannya.`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-apple-black"
                      style={{ textAlign: 'center', padding: '12px', fontSize: '13.5px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      <MessageCircle size={16} />
                      <span>Klaim Paket Custom via WhatsApp</span>
                    </a>

                    <span style={{ textAlign: 'center', fontSize: '11px', color: '#86868B' }}>
                      Masa aktif kuota custom: 24 Bulan • Kuota tidak hangus
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: UPLOAD LOGO & CO-BRANDING */}
        {activeTab === 'branding' && (
          <div className="glass-card" style={{ padding: '36px', borderRadius: '24px', maxWidth: '780px' }}>
            <div style={{ marginBottom: '24px' }}>
              <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '6px' }}>
                LOGO & IDENTITAS MITRA
              </span>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1D1D1F', marginBottom: '6px' }}>
                Upload Logo Vendor & Tampilkan di Homepage
              </h2>
              <p style={{ color: '#6E6E73', fontSize: '14px', lineHeight: 1.6 }}>
                Logo agensi Anda akan otomatis tampil di <strong>section mitra resmi di homepage SudutBingkai</strong>, serta dicetak di kartu meja QR tamu pengantin klien Anda.
              </p>
            </div>

            <form onSubmit={handleSaveBranding} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {/* Logo Uploader Box */}
              <div style={{
                border: '2px dashed rgba(0, 0, 0, 0.12)',
                borderRadius: '18px',
                padding: '24px',
                background: 'rgba(255, 255, 255, 0.7)',
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
                flexWrap: 'wrap'
              }}>
                <div style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  background: '#FFFFFF',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
                  flexShrink: 0
                }}>
                  {logoUrl ? (
                    <img src={logoUrl} alt="Preview Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <ImageIcon size={32} color="#86868B" />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: '220px' }}>
                  <strong style={{ fontSize: '14.5px', color: '#1D1D1F', display: 'block', marginBottom: '4px' }}>
                    Upload File Logo Brand WO
                  </strong>
                  <p style={{ fontSize: '12.5px', color: '#6E6E73', marginBottom: '12px' }}>
                    Format PNG transparan atau JPG persegi (rekomendasi 500x500px, maks 2MB).
                  </p>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleLogoUpload}
                    style={{ display: 'none' }}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="glass-pill"
                    style={{ padding: '8px 16px', fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                  >
                    <Upload size={13} />
                    <span>Pilih Gambar dari Komputer</span>
                  </button>
                </div>
              </div>

              {/* Form Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                    Nama Resmi Wedding Organizer *
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="glass-input"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                    Kota Domisili / Wilayah Kerja
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="glass-input"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                    Akun Instagram Resmi
                  </label>
                  <input
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    className="glass-input"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                    WhatsApp Hotline
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="glass-input"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px' }}
                  />
                </div>
              </div>

              {/* Preview on Homepage Marquee */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.02)',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                borderRadius: '16px',
                padding: '20px'
              }}>
                <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '8px' }}>
                  PREVIEW LOGO DI HOMEPAGE PARTNER STRIP
                </span>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: '#FFFFFF',
                  padding: '10px 18px',
                  borderRadius: '14px',
                  border: '1px solid rgba(0,0,0,0.06)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}>
                  {logoUrl && (
                    <img src={logoUrl} alt="Logo" style={{ width: '28px', height: '28px', borderRadius: '8px', objectFit: 'cover' }} />
                  )}
                  <div>
                    <strong style={{ fontSize: '13px', color: '#1D1D1F', display: 'block' }}>{companyName}</strong>
                    <span style={{ fontSize: '10.5px', color: '#86868B' }}>{instagram} • {city}</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="btn-apple-black"
                style={{ padding: '14px', fontSize: '14.5px', borderRadius: '12px' }}
              >
                <span>{isSaving ? 'Menyimpan & Menayangkan...' : isBrandingSaved ? '✓ Tersimpan & Tayang di Homepage!' : 'Simpan & Tayangkan Logo ke Homepage'}</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB: DAFTAR KLIEN PENGANTIN */}
        {activeTab === 'clients' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1D1D1F' }}>
                  Semua Acara Pengantin ({clients.length})
                </h3>
                <p style={{ color: '#6E6E73', fontSize: '13.5px' }}>
                  Kelola galeri foto, kartu meja QR, dan tayangan proyektor untuk masing-masing pengantin.
                </p>
              </div>

              <Link href="/create" className="btn-apple-black" style={{ padding: '10px 18px', fontSize: '13px' }}>
                <Plus size={14} />
                <span>Tambah Acara Klien</span>
              </Link>
            </div>

            {clients.map((c) => (
              <div
                key={c.id}
                className="glass-card"
                style={{
                  borderRadius: '20px',
                  padding: '24px 28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '20px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1D1D1F' }}>{c.title}</h3>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: c.status === 'Aktif' ? 'rgba(46, 204, 113, 0.12)' : 'rgba(0,0,0,0.06)',
                      color: c.status === 'Aktif' ? '#27AE60' : '#86868B'
                    }}>
                      {c.status}
                    </span>
                  </div>

                  <p style={{ fontSize: '13.5px', color: '#6E6E73' }}>
                    📅 {c.date} • 📍 {c.venue}
                  </p>

                  <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '12.5px', color: '#515154' }}>
                    <span>🎞️ Preset: <strong>{c.preset}</strong></span>
                    <span>👥 Tamu: <strong>{c.guestCount} Undangan</strong></span>
                    <span>📸 Foto: <strong>{c.photoCount} Jepretan</strong></span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <Link href={`/event/${c.id}`} className="glass-pill" style={{ padding: '8px 14px', fontSize: '12.5px', textDecoration: 'none' }}>
                    Galeri Album
                  </Link>

                  <Link href={`/event/${c.id}/print`} className="glass-pill" style={{ padding: '8px 14px', fontSize: '12.5px', textDecoration: 'none' }}>
                    Cetak QR Meja Tamu
                  </Link>

                  <Link href={`/cam/${c.id}`} className="btn-apple-black" style={{ padding: '8px 16px', fontSize: '12.5px', textDecoration: 'none' }}>
                    Kamera Tamu
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleDeleteClient(c.id, c.title)}
                    className="glass-pill"
                    style={{
                      padding: '8px 12px',
                      fontSize: '12.5px',
                      color: '#EF4444',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      background: 'rgba(239, 68, 68, 0.05)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                    title="Hapus Klien Acara"
                  >
                    <Trash2 size={13} />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB: MARKETING KIT & PANDUAN MC */}
        {activeTab === 'marketing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div className="glass-card" style={{ padding: '32px 36px', borderRadius: '24px' }}>
              <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '6px' }}>
                WEDDING ORGANIZER TOOLKIT
              </span>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1D1D1F', marginBottom: '8px' }}>
                Marketing Kit, Script MC & Panduan Eksekusi di Hari H
              </h2>
              <p style={{ color: '#6E6E73', fontSize: '14px', lineHeight: 1.6, maxWidth: '780px' }}>
                Gunakan materi ini untuk mempermudah kru WO Anda dan Master of Ceremony (MC) dalam mengarahkan ratusan tamu undangan agar aktif memotret momen tak terduga.
              </p>
            </div>

            {/* Script MC Section */}
            <div className="glass-card" style={{ padding: '32px 36px', borderRadius: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1D1D1F' }}>
                    1. Script MC: Ajakan Scan QR Meja (Durasi 45 Detik)
                  </h3>
                  <span style={{ fontSize: '12.5px', color: '#6E6E73' }}>
                    Bacakan saat tamu mulai duduk di meja santapan atau setelah prosesi masuk pengantin.
                  </span>
                </div>

                <button
                  onClick={() => copyToClipboard(`"Bapak, Ibu, dan teman-teman semuanya, perhatikan kartu kecil yang ada di tengah meja masing-masing! Hari ini ${companyName} bersama pengantin menyiapkan kamera analog sekali pakai digital SudutBingkai untuk kalian semua. Cukup buka kamera HP, scan QR barcode di kartu meja, dan langsung motret tanpa perlu download aplikasi apapun! Semua momen candid seru kalian akan langsung terabadikan di album rahasia pengantin. Yuk scan sekarang dan jepret momen terindah kalian!"`, 'mc1')}
                  className="glass-pill"
                  style={{ padding: '8px 14px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                >
                  <Copy size={13} />
                  <span>{copiedScript === 'mc1' ? '✓ Tersalin!' : 'Salin Teks MC'}</span>
                </button>
              </div>

              <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)', fontStyle: 'italic', fontSize: '14px', color: '#333336', lineHeight: 1.7 }}>
                &ldquo;Bapak, Ibu, dan teman-teman semuanya, perhatikan kartu kecil yang ada di tengah meja masing-masing! Hari ini <strong>{companyName}</strong> bersama pengantin menyiapkan kamera analog sekali pakai digital SudutBingkai untuk kalian semua. Cukup buka kamera HP, scan QR barcode di kartu meja, dan langsung motret tanpa perlu download aplikasi apapun! Semua momen candid seru kalian akan langsung terabadikan di album kenangan pengantin. Yuk scan sekarang dan jepret momen terindah kalian!&rdquo;
              </div>
            </div>

            {/* Checklist Kru WO di Hari H */}
            <div className="glass-card" style={{ padding: '32px 36px', borderRadius: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1D1D1F', marginBottom: '16px' }}>
                2. Checklist Operasional Kru WO di Lokasi Resepsi
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <strong style={{ fontSize: '14px', color: '#1D1D1F', display: 'block', marginBottom: '6px' }}>
                    H-3 Acara: Cetak Kartu Meja
                  </strong>
                  <p style={{ fontSize: '12.5px', color: '#6E6E73', margin: 0, lineHeight: 1.5 }}>
                    Buka tombol &ldquo;Kartu Meja QR&rdquo; di daftar klien, unduh PDF A6 siap cetak, masukkan ke standing frame akrilik meja tamu.
                  </p>
                </div>

                <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <strong style={{ fontSize: '14px', color: '#1D1D1F', display: 'block', marginBottom: '6px' }}>
                    H-1 Jam: Cek Layar Proyektor
                  </strong>
                  <p style={{ fontSize: '12.5px', color: '#6E6E73', margin: 0, lineHeight: 1.5 }}>
                    Hubungkan laptop operator WO ke videotron/proyektor ballroom, buka link &ldquo;Layar Proyektor&rdquo; dengan mode Fullscreen (F11).
                  </p>
                </div>

                <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <strong style={{ fontSize: '14px', color: '#1D1D1F', display: 'block', marginBottom: '6px' }}>
                    H+1 Acara: Serahkan ZIP Foto
                  </strong>
                  <p style={{ fontSize: '12.5px', color: '#6E6E73', margin: 0, lineHeight: 1.5 }}>
                    Download seluruh foto resolusi tinggi berstempel tanggal analog via dashboard, kirimkan link Google Drive / flashdisk ke pengantin.
                  </p>
                </div>
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
