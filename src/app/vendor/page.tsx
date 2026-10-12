'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Briefcase, Building, Plus, Users, QrCode, Camera, Download, 
  ExternalLink, ArrowRight, Check, Sliders, LogOut, 
  Upload, Image as ImageIcon, Calculator, FileText, CheckCircle2, 
  DollarSign, MessageCircle, HelpCircle, Layers, ShieldCheck, Flame, Copy, Trash2,
  CreditCard, Sparkles, Wallet, Share2, Video, Film, PlayCircle
} from 'lucide-react';
import { UserAccount, VideoTestimonialSubmission, PayoutRequest } from '@/lib/types';
import { getClientSession, setClientSession, clearClientSession, SYSTEM_USERS } from '@/lib/auth';
import ConfirmModal from '@/components/ConfirmModal';
import MayarPaymentModal from '@/components/MayarPaymentModal';
import { toast } from 'sonner';

export default function VendorPortalPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [vendor, setVendor] = useState<UserAccount>({
    id: '',
    name: '',
    email: '',
    role: 'vendor'
  });
  const [activeTab, setActiveTab] = useState<'wallet' | 'wholesale' | 'testimonials' | 'branding' | 'clients' | 'marketing'>('wallet');

  // Partner Testimonial Rewards State
  const [testimonials, setTestimonials] = useState<VideoTestimonialSubmission[]>([]);
  const [selectedTestiEvent, setSelectedTestiEvent] = useState<string>('');
  const [testiVideoUrl, setTestiVideoUrl] = useState<string>('');
  const [testiDuration, setTestiDuration] = useState<number>(65);
  const [testiCaption, setTestiCaption] = useState<string>('');
  const [isSubmittingTesti, setIsSubmittingTesti] = useState<boolean>(false);

  // Partner Wallet & Referral State
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [totalEarnings, setTotalEarnings] = useState<number>(0);
  const [referralCode, setReferralCode] = useState<string>('MITRA');
  const [partnerTier, setPartnerTier] = useState<string>('pro');
  const [bankName, setBankName] = useState<string>('BCA');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountHolder, setAccountHolder] = useState<string>('');
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState<number>(100000);
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);
  const [payoutsList, setPayoutsList] = useState<PayoutRequest[]>([]);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Referral commissions list
  const [referralHistory, setReferralHistory] = useState<any[]>([]);

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
  const [companyName, setCompanyName] = useState('');
  const [instagram, setInstagram] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isBrandingSaved, setIsBrandingSaved] = useState(false);

  // Mayar Payment State for Wholesale Packages
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [pendingPaymentData, setPendingPaymentData] = useState<{
    amount: number;
    title: string;
    description: string;
    isSimulation: boolean;
    paymentUrl?: string;
    eventsCount: number;
  } | null>(null);
  const [purchasingPlan, setPurchasingPlan] = useState<string | null>(null);
  const [voucherQuota, setVoucherQuota] = useState<number>(0);

  const handleBuyWholesalePackage = async (packageTitle: string, eventsCount: number, price: number) => {
    setPurchasingPlan(packageTitle);
    try {
      const payRes = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isWholesale: true,
          amount: price,
          wholesaleTitle: packageTitle,
          eventsCount,
          name: companyName || vendor.name,
          email: vendor.email || 'vendor@sudutbingkai.id',
          vendorId: vendor.id || 'vendor_vows_co'
        })
      });

      const payData = await payRes.json();
      if (payData.success) {
        if (!payData.isSimulation && payData.paymentUrl && !payData.paymentUrl.startsWith('/')) {
          window.location.href = payData.paymentUrl;
          return;
        }

        setPendingPaymentData({
          amount: payData.amount || price,
          title: `Paket Grosir ${packageTitle}`,
          description: `Voucher Kuota ${eventsCount} Acara untuk ${companyName}`,
          isSimulation: payData.isSimulation ?? true,
          paymentUrl: payData.paymentUrl,
          eventsCount
        });
        setPaymentModalOpen(true);
      } else {
        toast.error('Gagal memproses pembayaran: ' + (payData.error || 'Terjadi kesalahan'));
      }
    } catch (e: any) {
      toast.error('Error memulai pembayaran: ' + e.message);
    } finally {
      setPurchasingPlan(null);
    }
  };

  const handlePaymentSuccess = () => {
    setPaymentModalOpen(false);
    const addedCount = pendingPaymentData?.eventsCount || 0;
    setVoucherQuota(prev => prev + addedCount);
    
    // Update vendor session clientCount
    const updatedVendor = { ...vendor, clientCount: (vendor.clientCount || 0) + addedCount };
    setVendor(updatedVendor);
    setClientSession(updatedVendor);

    toast.success(`Pembayaran Berhasil! +${addedCount} Kuota Acara telah aktif di akun ${companyName}.`, {
      duration: 5000
    });
  };

  const handleCopyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedReferral(true);
    toast.success(`Kode promo ${referralCode} disalin! Berikan ke klien Anda untuk diskon 10%.`);
    setTimeout(() => setCopiedReferral(false), 2500);
  };

  const handleCopyReferralLink = () => {
    const link = typeof window !== 'undefined' ? `${window.location.origin}/?ref=${referralCode}` : `https://sudutbingkai.vercel.app/?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast.success('Tautan promosi mitra disalin! Siap dibagikan ke klien Anda.');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleRequestPayout = async () => {
    if (payoutAmount < 100000) {
      toast.error('Batas minimal penarikan komisi adalah Rp 100.000.');
      return;
    }
    if (payoutAmount > walletBalance) {
      toast.error('Nominal penarikan melebihi saldo komisi tersedia.');
      return;
    }

    setIsRequestingPayout(true);
    try {
      const vendorId = vendor.id || 'vendor_vows_co';
      const res = await fetch('/api/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId,
          vendorEmail: vendor.email || 'vendor@sudutbingkai.id',
          vendorName: vendor.name || 'Mitra Vendor',
          companyName: companyName || vendor.name,
          amount: Number(payoutAmount),
          bankDetails: {
            bankName,
            accountNumber,
            accountHolder
          },
          notes: `Penarikan komisi mitra ${companyName || vendor.name}`
        })
      });

      const data = await res.json();
      if (data.success) {
        setWalletBalance(prev => Math.max(0, prev - payoutAmount));
        setPayoutModalOpen(false);
        if (data.payout) {
          setPayoutsList(prev => [data.payout, ...prev]);
        }
        toast.success(
          `Permintaan penarikan Rp ${payoutAmount.toLocaleString('id-ID')} berhasil diajukan! Dana akan ditransfer ke rekening ${bankName} (${accountNumber} a/n ${accountHolder}) dalam 1x24 jam kerja.`
        );
      } else {
        toast.error(data.error || 'Gagal mengajukan penarikan');
      }
    } catch (e: any) {
      toast.error('Terjadi kesalahan jaringan: ' + (e?.message || 'Gagal terhubung'));
    } finally {
      setIsRequestingPayout(false);
    }
  };

  // Custom Wholesale Calculator State
  const [customEvents, setCustomEvents] = useState<number>(5);
  const [customPlan, setCustomPlan] = useState<'event' | 'wedding' | 'unlimited'>('wedding');
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  // Vendor Clients State (Clean real data)
  const [clients, setClients] = useState<any[]>([]);

  // Load existing vendor data, payouts & events if exists
  useEffect(() => {
    const session = getClientSession();
    if (!session || (session.role !== 'vendor' && session.role !== 'admin')) {
      router.push('/login?role=vendor');
      return;
    }

    setVendor(session);
    setVoucherQuota(session.clientCount ?? 0);
    if (session.companyName) setCompanyName(session.companyName);
    else if (session.name) setCompanyName(session.name);
    if (session.instagram) setInstagram(session.instagram);
    if (session.phone) setPhone(session.phone);

    // Check payment return from Mayar wholesale checkout
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('paid') === 'true') {
        toast.success('Pembayaran Paket Grosir Berhasil! Kuota voucher acara Anda telah aktif.');
      }
    }

    // Refresh live vendor quota & balance from database
    fetch('/api/vendors')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.vendors) {
          const fresh = data.vendors.find((v: any) => v.id === session.id || (session.email && v.email === session.email));
          if (fresh) {
            const count = fresh.wholesaleTokens || fresh.clientCount || 0;
            if (count > 0) setVoucherQuota(count);
            if (fresh.walletBalance !== undefined) setWalletBalance(fresh.walletBalance);
            if (fresh.totalEarnings !== undefined) setTotalEarnings(fresh.totalEarnings);
          }
        }
      })
      .catch(() => {});

    // If demo tester vendor account, populate sample mock stats
    if (session.id === 'vendor_vows_co' || session.email === 'vendor@sudutbingkai.id') {
      setWalletBalance(420000);
      setTotalEarnings(1260000);
      setReferralCode('VOWSANDCO');
      setAccountNumber('8730129841');
      setAccountHolder('Sarah Pramono');
      setPayoutAmount(420000);
      setReferralHistory([
        {
          id: 'ref_001',
          invoiceNumber: 'INV/SB/2026/02/0001',
          clientName: 'Sarah & Dimas',
          tierName: 'Wedding (300 Tamu)',
          date: '14 Februari 2026',
          totalPaid: 449100,
          commissionAmount: 67500,
          status: 'Lunas / Cair'
        },
        {
          id: 'ref_002',
          invoiceNumber: 'INV/SB/2026/02/0002',
          clientName: 'Anisa & Reza',
          tierName: 'Event (150 Tamu)',
          date: '28 Februari 2026',
          totalPaid: 242100,
          commissionAmount: 36000,
          status: 'Lunas / Cair'
        },
        {
          id: 'ref_003',
          invoiceNumber: 'INV/SB/2026/03/0001',
          clientName: 'Jonathan & Maya',
          tierName: 'Party (75 Tamu)',
          date: '7 Maret 2026',
          totalPaid: 161100,
          commissionAmount: 24000,
          status: 'Lunas / Cair'
        }
      ]);
    } else {
      if (session.referralCode) {
        setReferralCode(session.referralCode);
      } else if (session.name) {
        setReferralCode(session.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10));
      }
      if (session.walletBalance) setWalletBalance(session.walletBalance);
      if (session.totalEarnings) setTotalEarnings(session.totalEarnings);
      if (session.bankAccount) {
        if (session.bankAccount.bankName) setBankName(session.bankAccount.bankName);
        if (session.bankAccount.accountNumber) setAccountNumber(session.bankAccount.accountNumber);
        if (session.bankAccount.accountHolder) setAccountHolder(session.bankAccount.accountHolder);
      }
    }

    fetch('/api/vendors')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.vendors && data.vendors.length > 0) {
          const v = data.vendors.find((item: any) => 
            item.id === session?.id || 
            (session?.email && item.email?.toLowerCase() === session?.email?.toLowerCase())
          );
          if (v) {
            setCompanyName(v.companyName || v.name || session.companyName || session.name || '');
            setInstagram(v.instagram || session.instagram || '');
            setPhone(v.phone || session.phone || '');
            setLogoUrl(v.logoUrl || '');
            if (v.city) setCity(v.city);
          }
        }
      })
      .catch(console.error);

    const vendorId = session?.id || '';
    if (vendorId) {
      fetch(`/api/events?vendorId=${encodeURIComponent(vendorId)}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.events) {
            const realClients = data.events.map((ev: any) => ({
              id: ev.id,
              slug: ev.slug,
              title: ev.title,
              coupleOrHost: ev.coupleOrHost,
              date: new Date(ev.eventDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
              venue: ev.location || 'Lokasi Acara',
              guestCount: ev.maxGuests || 150,
              photoCount: 0,
              preset: ev.preset,
              status: new Date(ev.eventDate) < new Date() ? 'Selesai' : 'Aktif'
            }));
            setClients(realClients);
          }
        })
        .catch(console.error);

      // Fetch vendor payout history
      fetch(`/api/payouts?vendorId=${encodeURIComponent(vendorId)}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.payouts) {
            setPayoutsList(data.payouts);
          }
        })
        .catch(console.error);

      // Fetch vendor video testimonials
      fetch(`/api/testimonials?vendorId=${encodeURIComponent(vendorId)}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.testimonials) {
            setTestimonials(data.testimonials);
          }
        })
        .catch(console.error);
    }
  }, []);

  const handleSubmitTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTestiEvent) {
      toast.error('Silakan pilih acara klien terlebih dahulu.');
      return;
    }
    if (!testiVideoUrl.trim()) {
      toast.error('Silakan tempelkan link video testimoni (Google Drive / TikTok / IG Reels).');
      return;
    }
    if (testiDuration < 60) {
      toast.error('Durasi video testimoni minimal 60 detik (1 menit) untuk memenuhi syarat reward.');
      return;
    }

    setIsSubmittingTesti(true);
    try {
      const res = await fetch('/api/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedTestiEvent,
          submitterType: 'vendor',
          submitterId: vendor.id || 'vendor_vows_co',
          submitterName: vendor.companyName || vendor.name,
          submitterEmail: vendor.email,
          videoType: 'link',
          videoUrl: testiVideoUrl.trim(),
          durationSeconds: Number(testiDuration),
          caption: testiCaption.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Video testimoni berhasil dikirim! Tim kurasi akan memverifikasi dalam 1x24 jam & saldo Rp 50.000 otomatis dicairkan.');
        setTestimonials(prev => [data.submission, ...prev]);
        setTestiVideoUrl('');
        setTestiCaption('');
        setTestiDuration(65);
      } else {
        toast.error(data.error || 'Gagal mengirim video testimoni.');
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan.');
    } finally {
      setIsSubmittingTesti(false);
    }
  };

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
      const vendorId = vendor.id || `vendor_${Date.now()}`;
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: vendorId,
          name: companyName || vendor.name,
          companyName: companyName || vendor.name,
          email: vendor.email,
          phone,
          instagram,
          city,
          logoUrl,
          tier: vendor.tier || 'Agency Pro'
        })
      });

      const data = await res.json();
      if (data.success) {
        setIsBrandingSaved(true);
        const updated = { 
          ...vendor, 
          companyName: companyName || vendor.name, 
          name: companyName || vendor.name, 
          phone, 
          instagram, 
          city, 
          logoUrl 
        };
        setVendor(updated);
        setClientSession(updated);
        toast.success('Pengaturan profil dan identitas agensi berhasil diperbarui!');
        setTimeout(() => setIsBrandingSaved(false), 3500);
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan profil vendor.');
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
                width={130}
                height={32}
                fetchPriority="high"
                decoding="async"
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
                  {instagram} • {city} • Logo aktif di Beranda SudutBingkai, Kartu QR Tamu & Layar Proyektor
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
              <span className="font-mono-film" style={{ color: '#86868B', display: 'block', marginBottom: '4px' }}>SALDO KOMISI AKTIF</span>
              <strong style={{ fontSize: '20px', color: '#10B981' }}>Rp {walletBalance.toLocaleString('id-ID')}</strong>
            </div>

            <div>
              <span className="font-mono-film" style={{ color: '#86868B', display: 'block', marginBottom: '4px' }}>KODE PROMO KLIEN</span>
              <strong style={{ fontSize: '20px', color: '#C27803', fontFamily: 'var(--font-mono)' }}>{referralCode}</strong>
            </div>

            <div>
              <span className="font-mono-film" style={{ color: '#86868B', display: 'block', marginBottom: '4px' }}>SISA KUOTA GROSIR</span>
              <strong style={{ fontSize: '20px', color: '#1D1D1F' }}>{voucherQuota} Kuota Siap</strong>
            </div>

            <div>
              <span className="font-mono-film" style={{ color: '#86868B', display: 'block', marginBottom: '4px' }}>LEVEL KEMITRAAN</span>
              <strong style={{ fontSize: '20px', color: '#C27803' }}>🥈 Mitra Pro (15%)</strong>
            </div>
          </div>
        </div>

        {/* Tab Switcher - Horizontal Scroll on Mobile */}
        <div className="horizontal-scroll-row" style={{ gap: '10px', marginBottom: '28px', paddingBottom: '6px' }}>
          <button
            onClick={() => setActiveTab('wallet')}
            className="glass-pill"
            style={{
              background: activeTab === 'wallet' ? '#1D1D1F' : 'rgba(255, 255, 255, 0.7)',
              color: activeTab === 'wallet' ? '#FFFFFF' : '#1D1D1F',
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
            <Wallet size={14} />
            <span className="desktop-only">Dompet Komisi & Kode Promo</span>
            <span className="mobile-only">Komisi ({referralCode})</span>
          </button>

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
            <span className="desktop-only">Beli Kuota Reseller (Grosir)</span>
            <span className="mobile-only">Beli Kuota</span>
          </button>

          <button
            onClick={() => setActiveTab('testimonials')}
            className="glass-pill"
            style={{
              background: activeTab === 'testimonials' ? '#1D1D1F' : 'rgba(255, 255, 255, 0.7)',
              color: activeTab === 'testimonials' ? '#FFFFFF' : '#1D1D1F',
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
              border: activeTab === 'testimonials' ? '1px solid #F59E0B' : '1px solid rgba(245, 158, 11, 0.3)'
            }}
          >
            <Video size={14} color="#F59E0B" />
            <span className="desktop-only">Bonus Video Testimoni (+Rp 50k)</span>
            <span className="mobile-only">Bonus Video (+50k)</span>
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
            <span className="desktop-only">Daftar Klien Acara ({clients.length})</span>
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

        {/* TAB 1: DOMPET KOMISI & KODE PROMO REFERRAL */}
        {activeTab === 'wallet' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Banner Intro */}
            <div className="glass-card form-section-card" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(253, 246, 236, 0.8) 100%)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                  <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '6px' }}>
                    PROGRAM KEMITRAAN REFERRAL RESMI
                  </span>
                  <h2 style={{ fontSize: '26px', fontWeight: 700, color: '#1D1D1F', marginBottom: '6px' }}>
                    Dompet Saldo Komisi & Kode Promo Klien
                  </h2>
                  <p style={{ color: '#515154', fontSize: '14px', maxWidth: '680px', lineHeight: 1.6 }}>
                    Dapatkan komisi bersih <strong>{partnerTier === 'vip' ? '20%' : partnerTier === 'regular' ? '12%' : '15%'} per acara</strong> setiap kali klien menggunakan kode promo Anda. Klien Anda juga otomatis hemat <strong>10%</strong> di semua paket!
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: '#FFFFFF', padding: '12px 18px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#86868B', display: 'block' }}>Level Mitra Anda</span>
                    <strong style={{ fontSize: '14px', color: '#C27803' }}>🥈 Mitra Pro (15%)</strong>
                  </div>
                  <div style={{ background: '#FFFFFF', padding: '12px 18px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#86868B', display: 'block' }}>Syarat Naik Level VIP (20%)</span>
                    <strong style={{ fontSize: '14px', color: '#1D1D1F' }}>{clients.length}/15 Acara</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* 2-Column Grid: Wallet Balance vs Referral Code */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {/* Card 1: Dompet Saldo */}
              <div className="glass-card" style={{ padding: '28px', borderRadius: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span className="font-mono-film" style={{ color: '#86868B', fontSize: '11px' }}>
                      SALDO KOMISI AKTIF
                    </span>
                    <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '3px 10px', borderRadius: '999px', fontWeight: 600 }}>
                      ✓ Siap Dicairkan
                    </span>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '36px', fontWeight: 800, color: '#1D1D1F', letterSpacing: '-0.02em', margin: '0 0 4px 0' }}>
                      Rp {walletBalance.toLocaleString('id-ID')}
                    </h3>
                    <p style={{ fontSize: '12.5px', color: '#6E6E73', margin: 0 }}>
                      Total komisi terkumpul sejauh ini: <strong>Rp {totalEarnings.toLocaleString('id-ID')}</strong>
                    </p>
                  </div>

                  <div style={{ background: '#FBFBFA', borderRadius: '14px', padding: '12px 14px', border: '1px solid rgba(0,0,0,0.06)', marginBottom: '20px', fontSize: '12px', color: '#515154' }}>
                    Rekening Pencairan: <strong>{bankName} • {accountNumber}</strong> a/n <strong>{accountHolder}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPayoutModalOpen(true)}
                  disabled={walletBalance < 100000}
                  className="btn-apple-black"
                  style={{ width: '100%', padding: '12px', fontSize: '13.5px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: walletBalance >= 100000 ? 'pointer' : 'not-allowed', opacity: walletBalance >= 100000 ? 1 : 0.6 }}
                >
                  <CreditCard size={16} />
                  <span>Ajukan Penarikan Saldo (Payout)</span>
                </button>
              </div>

              {/* Card 2: Kode Voucher Klien */}
              <div className="glass-card" style={{ padding: '28px', borderRadius: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span className="font-mono-film" style={{ color: '#C27803', fontSize: '11px' }}>
                      KODE PROMO KLIEN SAYA
                    </span>
                    <span style={{ fontSize: '11px', background: 'rgba(194, 120, 3, 0.1)', color: '#C27803', padding: '3px 10px', borderRadius: '999px', fontWeight: 600 }}>
                      Diskon 10% untuk Klien
                    </span>
                  </div>

                  <div style={{ background: '#FFFDF9', border: '2px dashed #C27803', borderRadius: '18px', padding: '16px', textAlign: 'center', marginBottom: '16px' }}>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#86868B', display: 'block', marginBottom: '4px' }}>
                      KODE VOUCHER KEMITRAAN ANDA:
                    </span>
                    <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '28px', letterSpacing: '3px', color: '#C27803', display: 'block' }}>
                      {referralCode}
                    </strong>
                  </div>

                  <p style={{ fontSize: '12.5px', color: '#515154', lineHeight: 1.5, margin: '0 0 16px' }}>
                    Bagikan kode promo ini ke klien Anda. Saat mereka checkout, mereka hemat 10% dan Anda otomatis mendapatkan komisi {partnerTier === 'vip' ? '20%' : partnerTier === 'regular' ? '12%' : '15%'} dari nilai paket.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={handleCopyReferralCode}
                    className="glass-pill"
                    style={{ padding: '10px', fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
                  >
                    {copiedReferral ? <Check size={14} color="#C27803" /> : <Copy size={14} />}
                    <span>{copiedReferral ? 'Kode Tersalin!' : 'Salin Kode'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyReferralLink}
                    className="glass-pill"
                    style={{ padding: '10px', fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', borderColor: 'rgba(194, 120, 3, 0.4)', color: '#C27803' }}
                  >
                    {copiedLink ? <Check size={14} color="#C27803" /> : <Share2 size={14} />}
                    <span>{copiedLink ? 'Link Tersalin!' : 'Salin Link Promo'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Riwayat Transaksi Referral & Komisi */}
            <div className="glass-card form-section-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1D1D1F', margin: 0 }}>
                    Riwayat Komisi dari Klien Acara
                  </h3>
                  <p style={{ fontSize: '13px', color: '#6E6E73', margin: '4px 0 0' }}>
                    Daftar klien yang menggunakan kode voucher Anda dan komisi yang Anda hasilkan.
                  </p>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', color: '#86868B', fontSize: '11px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px 12px' }}>No. Invoice</th>
                      <th style={{ padding: '10px 12px' }}>Klien & Acara</th>
                      <th style={{ padding: '10px 12px' }}>Paket Acara</th>
                      <th style={{ padding: '10px 12px' }}>Tanggal Acara</th>
                      <th style={{ padding: '10px 12px' }}>Pembayaran Klien</th>
                      <th style={{ padding: '10px 12px', color: '#C27803' }}>Komisi Anda ({partnerTier === 'vip' ? '20%' : partnerTier === 'regular' ? '12%' : '15%'})</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referralHistory.length > 0 ? (
                      referralHistory.map((item) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                          <td style={{ padding: '14px 12px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                            {item.invoiceNumber}
                          </td>
                          <td style={{ padding: '14px 12px' }}>
                            <strong style={{ color: '#1D1D1F' }}>{item.clientName}</strong>
                          </td>
                          <td style={{ padding: '14px 12px', color: '#515154' }}>
                            {item.tierName}
                          </td>
                          <td style={{ padding: '14px 12px', color: '#6E6E73' }}>
                            {item.date}
                          </td>
                          <td style={{ padding: '14px 12px' }}>
                            Rp {item.totalPaid.toLocaleString('id-ID')}
                          </td>
                          <td style={{ padding: '14px 12px', fontWeight: 700, color: '#10B981' }}>
                            +Rp {item.commissionAmount.toLocaleString('id-ID')}
                          </td>
                          <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                            <Link
                              href={`/invoice/${item.invoiceNumber}`}
                              target="_blank"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 12px',
                                borderRadius: '999px',
                                background: 'rgba(0,0,0,0.04)',
                                border: '1px solid rgba(0,0,0,0.08)',
                                color: '#1D1D1F',
                                fontSize: '12px',
                                textDecoration: 'none',
                                fontWeight: 500
                              }}
                            >
                              <span>Lihat Invoice</span>
                              <ExternalLink size={12} />
                            </Link>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} style={{ padding: '36px 16px', textAlign: 'center', color: '#86868B', fontSize: '13px' }}>
                          Belum ada transaksi rujukan klien. Bagikan kode atau tautan referral Anda kepada klien untuk mulai menghasilkan komisi.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Riwayat Penarikan Saldo Komisi (Payouts) */}
            <div className="glass-card form-section-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1D1D1F', margin: 0 }}>
                    Riwayat Penarikan Saldo (Payout) ({payoutsList.length})
                  </h3>
                  <p style={{ fontSize: '13px', color: '#6E6E73', margin: '4px 0 0' }}>
                    Daftar pengajuan transfer dana komisi ke rekening bank Anda.
                  </p>
                </div>
              </div>

              {payoutsList.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: '#86868B', fontSize: '13px' }}>
                  Belum ada riwayat penarikan dana. Klik &ldquo;Ajukan Penarikan Saldo&rdquo; jika saldo komisi Anda telah mencapai minimal Rp 100.000.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', color: '#86868B', fontSize: '11px', textTransform: 'uppercase' }}>
                        <th style={{ padding: '10px 12px' }}>Tanggal Pengajuan</th>
                        <th style={{ padding: '10px 12px' }}>Nominal</th>
                        <th style={{ padding: '10px 12px' }}>Rekening Tujuan</th>
                        <th style={{ padding: '10px 12px' }}>Status</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Bukti / Catatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payoutsList.map((p) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                          <td style={{ padding: '14px 12px', color: '#6E6E73' }}>
                            {new Date(p.requestedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td style={{ padding: '14px 12px', fontWeight: 700, color: '#1D1D1F' }}>
                            Rp {p.amount.toLocaleString('id-ID')}
                          </td>
                          <td style={{ padding: '14px 12px', color: '#515154' }}>
                            <strong>{p.bankDetails?.bankName || bankName}</strong> - {p.bankDetails?.accountNumber || accountNumber}<br />
                            <span style={{ fontSize: '11px', color: '#86868B' }}>a/n {p.bankDetails?.accountHolder || accountHolder}</span>
                          </td>
                          <td style={{ padding: '14px 12px' }}>
                            {p.status === 'approved' ? (
                              <span style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#059669', fontSize: '11.5px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
                                ✓ Berhasil Ditransfer
                              </span>
                            ) : p.status === 'rejected' ? (
                              <span style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#DC2626', fontSize: '11.5px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
                                ✕ Ditolak
                              </span>
                            ) : (
                              <span style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#D97706', fontSize: '11.5px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
                                ⏳ Menunggu Transfer Admin
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                            {p.proofUrl ? (
                              <a
                                href={p.proofUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#C27803', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}
                              >
                                <ExternalLink size={12} />
                                <span>Bukti Transfer</span>
                              </a>
                            ) : (
                              <span style={{ fontSize: '11.5px', color: '#86868B' }}>{p.notes || '-'}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

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
                      <li style={{ display: 'flex', gap: '6px' }}>✓ <span>Co-branding logo WO di kartu QR tamu</span></li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleBuyWholesalePackage('3 Acara', 3, 1120000)}
                    disabled={purchasingPlan === '3 Acara'}
                    className="glass-pill"
                    style={{ textAlign: 'center', padding: '10px', fontSize: '12.5px', fontWeight: 600, width: '100%', cursor: 'pointer' }}
                  >
                    {purchasingPlan === '3 Acara' ? 'Menyiapkan...' : 'Beli Paket 3 Acara'}
                  </button>
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

                  <button
                    type="button"
                    onClick={() => handleBuyWholesalePackage('5 Acara', 5, 1745000)}
                    disabled={purchasingPlan === '5 Acara'}
                    className="glass-pill"
                    style={{ textAlign: 'center', padding: '10px', fontSize: '12.5px', fontWeight: 600, width: '100%', cursor: 'pointer' }}
                  >
                    {purchasingPlan === '5 Acara' ? 'Menyiapkan...' : 'Beli Paket 5 Acara'}
                  </button>
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

                  <button
                    type="button"
                    onClick={() => handleBuyWholesalePackage('10 Acara', 10, 2990000)}
                    disabled={purchasingPlan === '10 Acara'}
                    className="btn-apple-black"
                    style={{ textAlign: 'center', padding: '10px', fontSize: '12.5px', background: '#C27803', color: '#FFFFFF', width: '100%', cursor: 'pointer' }}
                  >
                    {purchasingPlan === '10 Acara' ? 'Menyiapkan...' : 'Beli Paket 10 Acara'}
                  </button>
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

                  <button
                    type="button"
                    onClick={() => handleBuyWholesalePackage('20 Acara', 20, 5490000)}
                    disabled={purchasingPlan === '20 Acara'}
                    className="glass-pill"
                    style={{ textAlign: 'center', padding: '10px', fontSize: '12.5px', fontWeight: 600, width: '100%', cursor: 'pointer' }}
                  >
                    {purchasingPlan === '20 Acara' ? 'Menyiapkan...' : 'Beli Paket 20 Acara'}
                  </button>
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

              {/* B2B Corporate Helper Banner */}
              <div style={{
                marginTop: '20px',
                padding: '14px 18px',
                background: 'rgba(0, 0, 0, 0.03)',
                borderRadius: '14px',
                border: '1px solid rgba(0, 0, 0, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#515154' }}>
                  <ShieldCheck size={16} color="#C27803" />
                  <span>
                    <strong>Kebutuhan Korporat:</strong> Memerlukan Faktur Pajak PT, PKS Resmi, atau Pembayaran via Giro Perusahaan?
                  </span>
                </div>
                <a
                  href={`https://wa.me/6281234567890?text=${encodeURIComponent(`Halo Tim SudutBingkai, saya dari ${companyName} ingin konsultasi kebutuhan paket B2B / Faktur Pajak PT / PKS resmi.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="glass-pill"
                  style={{ fontSize: '11.5px', padding: '6px 12px', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <MessageCircle size={13} color="#27AE60" />
                  <span>Hubungi Tim Sales via WhatsApp</span>
                </a>
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
                        Jika Anda tawarkan fasilitas kamera digital ini ke klien dengan tarif normal, Anda mengantongi <strong>margin keuntungan {profitMarginPercent}%</strong> bersih!
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => handleBuyWholesalePackage(`Custom ${customEvents} Acara (${currentPlanInfo.name})`, customEvents, wholesaleTotalPrice)}
                      disabled={purchasingPlan?.startsWith('Custom')}
                      className="btn-apple-black"
                      style={{ textAlign: 'center', padding: '12px', fontSize: '13.5px', width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      <CreditCard size={16} />
                      <span>{purchasingPlan?.startsWith('Custom') ? 'Menyiapkan Checkout...' : `Beli Paket Custom Sekarang (Rp ${formatRp(wholesaleTotalPrice)})`}</span>
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px', fontSize: '11px', color: '#86868B', marginTop: '2px' }}>
                      <span>Masa aktif: 24 Bulan • Kuota tidak hangus</span>
                      <a
                        href={`https://wa.me/6281234567890?text=${encodeURIComponent(`Halo Tim SudutBingkai, saya dari WO ${companyName}. Saya ingin konsultasi / invoice resmi untuk Paket Grosir Custom ${customEvents} Acara (${currentPlanInfo.name}) total Rp ${formatRp(wholesaleTotalPrice)}.`)}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#C27803', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <MessageCircle size={12} />
                        Minta Invoice Manual via WA
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: BONUS VIDEO TESTIMONI MITRA */}
        {activeTab === 'testimonials' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Banner Header */}
            <div className="glass-card" style={{
              padding: '32px 36px',
              borderRadius: '24px',
              border: '1.5px solid rgba(245, 158, 11, 0.3)',
              background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.45) 0%, rgba(255, 255, 255, 0.95) 100%)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'relative', zIndex: 2, maxWidth: '820px' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  background: 'rgba(217, 119, 6, 0.12)',
                  border: '1px solid rgba(217, 119, 6, 0.25)',
                  color: '#B45309',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '12px'
                }}>
                  <Sparkles size={13} />
                  <span>Program Reward Video Kreator & WO</span>
                </div>

                <h2 className="font-display-serif" style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.3rem)', fontWeight: 700, color: '#1D1D1F', marginBottom: '10px' }}>
                  Kirim 1 Video Testimoni, Dapatkan Bonus <span style={{ color: '#D97706' }}>Rp 50.000 / Acara</span>
                </h2>

                <p style={{ color: '#515154', fontSize: '14.5px', lineHeight: 1.6, marginBottom: '24px' }}>
                  Bantu ceritakan keseruan tamu saat memotret kamera analog di acara klien Anda (pernikahan, ulang tahun, gathering, dll). Rekam video minimal 1 menit (60 detik), kirimkan tautannya, dan dapatkan bonus saldo komisi yang langsung bisa ditarik ke rekening bank Anda!
                </p>

                {/* 3 Syarat Kunci */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  <div style={{ background: '#FFFFFF', padding: '16px 18px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706', marginBottom: '10px' }}>
                      <Film size={16} />
                    </div>
                    <strong style={{ fontSize: '13px', color: '#1D1D1F', display: 'block', marginBottom: '4px' }}>1. Durasi Minimal 60 Detik</strong>
                    <span style={{ fontSize: '12px', color: '#6E6E73', lineHeight: 1.5 }}>
                      Rekam suasana para tamu saat scan QR, ekspresi candid, atau tayangan layar videotron.
                    </span>
                  </div>

                  <div style={{ background: '#FFFFFF', padding: '16px 18px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB', marginBottom: '10px' }}>
                      <Video size={16} />
                    </div>
                    <strong style={{ fontSize: '13px', color: '#1D1D1F', display: 'block', marginBottom: '4px' }}>2. Format Vertikal 9:16</strong>
                    <span style={{ fontSize: '12px', color: '#6E6E73', lineHeight: 1.5 }}>
                      Video HP vertikal (TikTok/Reels/Google Drive) dengan kualitas jernih (min 720p/1080p).
                    </span>
                  </div>

                  <div style={{ background: '#FFFFFF', padding: '16px 18px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', marginBottom: '10px' }}>
                      <Wallet size={16} />
                    </div>
                    <strong style={{ fontSize: '13px', color: '#1D1D1F', display: 'block', marginBottom: '4px' }}>3. Reward Rp 50.000 Cair</strong>
                    <span style={{ fontSize: '12px', color: '#6E6E73', lineHeight: 1.5 }}>
                      Setelah kurasi tim 1x24 jam disetujui, saldo komisi otomatis bertambah dan siap ditarik.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Submission Form and History Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '28px' }}>
              {/* Form Input */}
              <div className="glass-card" style={{ padding: '32px', borderRadius: '24px' }}>
                <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '4px', fontSize: '11px' }}>
                  FORMULIR KLAIM REWARD
                </span>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1D1D1F', marginBottom: '8px' }}>
                  Kirim Tautan Video Testimoni
                </h3>
                <p style={{ color: '#6E6E73', fontSize: '13px', lineHeight: 1.5, marginBottom: '22px' }}>
                  Pastikan link video dapat diakses publik (Anyone with link / View only) jika menggunakan Google Drive.
                </p>

                <form onSubmit={handleSubmitTestimonial} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                      Pilih Acara Klien *
                    </label>
                    <select
                      value={selectedTestiEvent}
                      onChange={(e) => setSelectedTestiEvent(e.target.value)}
                      required
                      className="glass-input"
                      style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', fontSize: '14px', background: '#FFFFFF' }}
                    >
                      <option value="">-- Pilih Acara Terdaftar --</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.title} ({c.date})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                      Link Video Testimoni (Min. 1 Menit) *
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://drive.google.com/... atau link TikTok / IG Reels"
                      value={testiVideoUrl}
                      onChange={(e) => setTestiVideoUrl(e.target.value)}
                      className="glass-input"
                      style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', fontSize: '14px' }}
                    />
                    <span style={{ fontSize: '11px', color: '#86868B', marginTop: '4px', display: 'block' }}>
                      Dapat berupa link Google Drive, TikTok, Instagram Reels, atau YouTube Shorts.
                    </span>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B' }}>
                        Durasi Video (Detik) *
                      </label>
                      <span className="font-mono-film" style={{ fontSize: '13px', fontWeight: 700, color: testiDuration >= 60 ? '#10B981' : '#EF4444' }}>
                        {testiDuration} Detik {testiDuration >= 60 ? '✓ (Memenuhi Syarat)' : '⚠️ (Min. 60s)'}
                      </span>
                    </div>
                    <input
                      type="number"
                      required
                      min={60}
                      max={600}
                      value={testiDuration}
                      onChange={(e) => setTestiDuration(parseInt(e.target.value) || 60)}
                      className="glass-input"
                      style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', fontSize: '14px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                      Catatan / Cerita Keseruan Tamu (Opsional)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Contoh: Para tamu undangan heboh banget gantian foto candid, proyektor live wall bikin suasana ballroom makin hidup."
                      value={testiCaption}
                      onChange={(e) => setTestiCaption(e.target.value)}
                      className="glass-input"
                      style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', fontSize: '13.5px', resize: 'vertical' }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingTesti}
                    className="btn-apple-black"
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '14px',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      marginTop: '6px'
                    }}
                  >
                    <Video size={16} />
                    <span>{isSubmittingTesti ? 'Mengirim Data...' : 'Kirim Video & Klaim Bonus Rp 50.000'}</span>
                  </button>
                </form>
              </div>

              {/* Submission History */}
              <div className="glass-card" style={{ padding: '32px', borderRadius: '24px', display: 'flex', flexDirection: 'column' }}>
                <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '4px', fontSize: '11px' }}>
                  RIWAYAT SUBMISSION
                </span>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1D1D1F', marginBottom: '16px' }}>
                  Status Kurasi Video ({testimonials.length})
                </h3>

                {testimonials.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center', color: '#86868B' }}>
                    <Film size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                    <p style={{ fontSize: '13.5px', margin: 0 }}>Belum ada video testimoni yang diajukan.</p>
                    <span style={{ fontSize: '12px', marginTop: '4px' }}>Unggah video pertama Anda melalui formulir di samping!</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', maxHeight: '480px' }}>
                    {testimonials.map((t) => (
                      <div
                        key={t.id}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid rgba(0,0,0,0.06)',
                          borderRadius: '16px',
                          padding: '16px 18px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <div>
                            <strong style={{ fontSize: '14px', color: '#1D1D1F', display: 'block' }}>
                              {t.eventTitle}
                            </strong>
                            <span style={{ fontSize: '11.5px', color: '#86868B' }}>
                              Durasi: {t.durationSeconds} Detik • Dikirim: {new Date(t.submittedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>

                          {t.status === 'approved' ? (
                            <span style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#059669', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
                              ✓ Disetujui (+Rp 50.000)
                            </span>
                          ) : t.status === 'rejected' ? (
                            <span style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#DC2626', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
                              ✕ Perlu Revisi
                            </span>
                          ) : (
                            <span style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#D97706', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
                              ⏳ Menunggu Kurasi
                            </span>
                          )}
                        </div>

                        {t.caption && (
                          <p style={{ fontSize: '12px', color: '#515154', fontStyle: 'italic', margin: 0, background: 'rgba(0,0,0,0.02)', padding: '8px 10px', borderRadius: '8px' }}>
                            &ldquo;{t.caption}&rdquo;
                          </p>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.04)', fontSize: '12px' }}>
                          <a
                            href={t.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: '#C27803', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                          >
                            <ExternalLink size={13} />
                            <span>Tonton Video</span>
                          </a>

                          <strong style={{ color: '#10B981', fontFamily: 'var(--font-mono)' }}>
                            +Rp {t.rewardAmount.toLocaleString('id-ID')}
                          </strong>
                        </div>

                        {t.adminNotes && (
                          <div style={{ fontSize: '11.5px', color: '#6E6E73', background: 'rgba(0,0,0,0.03)', padding: '6px 10px', borderRadius: '8px' }}>
                            <strong>Catatan Tim:</strong> {t.adminNotes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
                Logo agensi Anda akan otomatis tampil di <strong>section mitra resmi di homepage SudutBingkai</strong>, serta dicetak di kartu QR tamu klien Anda.
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
                  Semua Acara Klien ({clients.length})
                </h3>
                <p style={{ color: '#6E6E73', fontSize: '13.5px' }}>
                  Kelola galeri foto, kartu QR tamu, dan tayangan proyektor untuk masing-masing acara.
                </p>
              </div>

              <Link href="/create" className="btn-apple-black" style={{ padding: '10px 18px', fontSize: '13px' }}>
                <Plus size={14} />
                <span>Tambah Acara Klien</span>
              </Link>
            </div>

            {clients.length === 0 ? (
              <div className="glass-card" style={{ padding: '60px 24px', textAlign: 'center', borderRadius: '24px' }}>
                <Users size={48} style={{ opacity: 0.25, margin: '0 auto 16px', display: 'block' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1D1D1F', marginBottom: '8px' }}>
                  Belum Ada Acara Klien
                </h3>
                <p style={{ fontSize: '13.5px', color: '#6E6E73', maxWidth: '480px', margin: '0 auto 22px', lineHeight: 1.6 }}>
                  Gunakan kuota voucher acara Anda atau buat acara baru untuk mulai membagikan kamera analog digital kepada para tamu undangan.
                </p>
                <Link href="/create" className="btn-apple-black" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontSize: '13.5px', textDecoration: 'none', margin: '0 auto' }}>
                  <Plus size={15} />
                  <span>Buat Acara Klien Pertama</span>
                </Link>
              </div>
            ) : (
              clients.map((c) => (
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
                    <Link href={`/invoice/${c.id}`} target="_blank" className="glass-pill" style={{ padding: '8px 14px', fontSize: '12.5px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <FileText size={13} />
                      <span>Invoice Resmi</span>
                    </Link>

                    <Link href={`/event/${c.id}`} className="glass-pill" style={{ padding: '8px 14px', fontSize: '12.5px', textDecoration: 'none' }}>
                      Galeri Album
                    </Link>

                    <Link href={`/event/${c.id}/print`} className="glass-pill" style={{ padding: '8px 14px', fontSize: '12.5px', textDecoration: 'none' }}>
                      Cetak Kartu QR Tamu
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
              ))
            )}
          </div>
        )}

        {/* TAB: MARKETING KIT & PANDUAN MC */}
        {activeTab === 'marketing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div className="glass-card" style={{ padding: '32px 36px', borderRadius: '24px' }}>
              <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '6px' }}>
                WEDDING & EVENT ORGANIZER TOOLKIT
              </span>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1D1D1F', marginBottom: '8px' }}>
                Marketing Kit, Script MC & Panduan Eksekusi di Hari H
              </h2>
              <p style={{ color: '#6E6E73', fontSize: '14px', lineHeight: 1.6, maxWidth: '780px' }}>
                Gunakan materi ini untuk mempermudah kru EO/WO Anda dan Master of Ceremony (MC) dalam mengarahkan para tamu undangan agar aktif memotret momen tak terduga.
              </p>
            </div>

            {/* Script MC Section */}
            <div className="glass-card" style={{ padding: '32px 36px', borderRadius: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1D1D1F' }}>
                    1. Script MC: Ajakan Scan QR Kamera Tamu (Durasi 45 Detik)
                  </h3>
                  <span style={{ fontSize: '12.5px', color: '#6E6E73' }}>
                    Bacakan saat acara dimulai atau setelah prosesi pembuka berlangsung.
                  </span>
                </div>

                <button
                  onClick={() => copyToClipboard(`"Bapak, Ibu, dan teman-teman semuanya, perhatikan kartu QR yang telah dibagikan! Hari ini ${companyName} bersama tuan rumah menyiapkan kamera analog sekali pakai digital SudutBingkai untuk kalian semua. Cukup buka kamera HP, scan kartu QR, isi nama Anda, dan langsung motret tanpa perlu download aplikasi apapun! Semua momen candid seru kalian akan langsung terabadikan di album rahasia tuan rumah. Yuk scan sekarang dan jepret momen terindah kalian!"`, 'mc1')}
                  className="glass-pill"
                  style={{ padding: '8px 14px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                >
                  <Copy size={13} />
                  <span>{copiedScript === 'mc1' ? '✓ Tersalin!' : 'Salin Teks MC'}</span>
                </button>
              </div>

              <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)', fontStyle: 'italic', fontSize: '14px', color: '#333336', lineHeight: 1.7 }}>
                &ldquo;Bapak, Ibu, dan teman-teman semuanya, perhatikan kartu QR yang telah dibagikan! Hari ini <strong>{companyName}</strong> bersama tuan rumah menyiapkan kamera analog sekali pakai digital SudutBingkai untuk kalian semua. Cukup buka kamera HP, scan kartu QR, isi nama Anda, dan langsung motret tanpa perlu download aplikasi apapun! Semua momen candid seru kalian akan langsung terabadikan di album kenangan. Yuk scan sekarang dan jepret momen terindah kalian!&rdquo;
              </div>
            </div>

            {/* Checklist Kru WO di Hari H */}
            <div className="glass-card" style={{ padding: '32px 36px', borderRadius: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1D1D1F', marginBottom: '16px' }}>
                2. Checklist Operasional Kru di Lokasi Acara
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <strong style={{ fontSize: '14px', color: '#1D1D1F', display: 'block', marginBottom: '6px' }}>
                    H-3 Acara: Cetak Kartu QR Tamu
                  </strong>
                  <p style={{ fontSize: '12.5px', color: '#6E6E73', margin: 0, lineHeight: 1.5 }}>
                    Buka tombol &ldquo;Cetak Kartu QR Tamu&rdquo; di daftar klien, unduh format siap cetak, dan siapkan untuk para tamu undangan.
                  </p>
                </div>

                <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <strong style={{ fontSize: '14px', color: '#1D1D1F', display: 'block', marginBottom: '6px' }}>
                    H-1 Jam: Cek Layar Proyektor
                  </strong>
                  <p style={{ fontSize: '12.5px', color: '#6E6E73', margin: 0, lineHeight: 1.5 }}>
                    Hubungkan laptop operator ke videotron/proyektor ballroom, buka link &ldquo;Layar Proyektor&rdquo; dengan mode Fullscreen (F11).
                  </p>
                </div>

                <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <strong style={{ fontSize: '14px', color: '#1D1D1F', display: 'block', marginBottom: '6px' }}>
                    H+1 Acara: Serahkan ZIP Foto
                  </strong>
                  <p style={{ fontSize: '12.5px', color: '#6E6E73', margin: 0, lineHeight: 1.5 }}>
                    Download seluruh foto resolusi tinggi berstempel tanggal analog via dashboard, kirimkan link Google Drive / flashdisk ke tuan rumah.
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

      {/* Mayar Payment Modal for Wholesale Quota */}
      <MayarPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSuccess={handlePaymentSuccess}
        title={pendingPaymentData?.title || 'Paket Grosir Vendor'}
        description={pendingPaymentData?.description || ''}
        amount={pendingPaymentData?.amount || 1120000}
        isSimulation={pendingPaymentData?.isSimulation}
      />

      {/* Payout Request Modal */}
      {payoutModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="glass-card" style={{
            maxWidth: '460px',
            width: '100%',
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            padding: '32px 28px',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(0, 0, 0, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#1D1D1F' }}>
                  Tarik Saldo Komisi
                </h3>
                <span style={{ fontSize: '12px', color: '#86868B' }}>
                  Saldo Tersedia: Rp {walletBalance.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: '#515154', lineHeight: 1.5, marginBottom: '20px' }}>
              Dana komisi akan ditransfer langsung ke rekening bank terdaftar Anda melalui jaringan kliring BI-FAST resmi dalam 1x24 jam kerja.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#1D1D1F', marginBottom: '6px' }}>
                Nominal Penarikan (Minimal Rp 100.000)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#86868B', fontSize: '14px' }}>
                  Rp
                </span>
                <input
                  type="number"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(Number(e.target.value))}
                  min={100000}
                  max={walletBalance}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    borderRadius: '12px',
                    border: '1px solid rgba(0,0,0,0.15)',
                    fontSize: '15px',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setPayoutAmount(walletBalance)}
                  style={{ fontSize: '11px', background: 'none', border: 'none', color: '#C27803', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                >
                  Tarik Seluruh Saldo (Rp {walletBalance.toLocaleString('id-ID')})
                </button>
              </div>
            </div>

            <div style={{ background: '#FBFBFA', borderRadius: '14px', padding: '14px', border: '1px solid rgba(0,0,0,0.06)', marginBottom: '24px', fontSize: '12.5px', color: '#515154' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#86868B', display: 'block', marginBottom: '4px' }}>
                REKENING BANK TUJUAN:
              </span>
              <strong>{bankName} • {accountNumber}</strong><br />
              Atas Nama: <strong>{accountHolder}</strong>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setPayoutModalOpen(false)}
                disabled={isRequestingPayout}
                className="glass-pill"
                style={{ padding: '11px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleRequestPayout}
                disabled={isRequestingPayout || payoutAmount < 100000 || payoutAmount > walletBalance}
                className="btn-apple-black"
                style={{ padding: '11px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}
              >
                {isRequestingPayout ? 'Memproses...' : 'Konfirmasi Tarik'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
