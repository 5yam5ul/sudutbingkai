'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, ArrowRight, Check, Calendar, MapPin, Film, Camera,
  Lock, Unlock, Clock, CheckCircle2, ShieldCheck, Heart, Users, SlidersHorizontal, Eye,
  Mail, Key, UserCheck, Tag, Percent, Wallet, Briefcase, Loader2, Star, Mic
} from 'lucide-react';
import { FILM_PRESETS } from '@/lib/filters';
import { FilmPresetId, EventPackageTier, PACKAGE_TIERS, PRIMARY_PACKAGE_TIER_KEYS, UserAccount } from '@/lib/types';
import { getClientSession, setClientSession, authFetch } from '@/lib/auth';
import { FrameId } from '@/lib/frames';
import FrameCustomizer from '@/components/FrameCustomizer';
import MayarPaymentModal from '@/components/MayarPaymentModal';
import { toast } from 'sonner';

function CreateEventForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const packageQuery = (searchParams.get('package')?.toLowerCase() || 'wedding') as EventPackageTier;
  const initialTierKey: EventPackageTier = PACKAGE_TIERS[packageQuery] ? packageQuery : 'wedding';

  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [createdDraftEventId, setCreatedDraftEventId] = useState<string | null>(null);
  const [pendingPaymentData, setPendingPaymentData] = useState<{
    amount: number;
    title: string;
    description: string;
    isSimulation: boolean;
    paymentUrl?: string;
  } | null>(null);

  // Referral / Promo Code State
  const [referralCode, setReferralCode] = useState<string>('');
  const [referralDiscount, setReferralDiscount] = useState<{
    valid: boolean;
    discountPercent: number;
    discountAmount: number;
    finalPrice: number;
    commissionAmount?: number;
    vendorId?: string;
    vendorName?: string;
    message?: string;
  } | null>(null);
  const [isValidatingReferral, setIsValidatingReferral] = useState(false);

  // Form State
  const [eventType, setEventType] = useState<'wedding' | 'birthday' | 'corporate' | 'other'>('wedding');
  const [title, setTitle] = useState('');
  const [coupleOrHost, setCoupleOrHost] = useState('');
  const [slug, setSlug] = useState('');
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');

  // 1. Package Tier (Automatically locked from purchase / query param)
  const [selectedTier, setSelectedTier] = useState<EventPackageTier>(initialTierKey);
  const [showPackageUpgradeModal, setShowPackageUpgradeModal] = useState(false);
  const activeTier = PACKAGE_TIERS[selectedTier] || PACKAGE_TIERS.wedding;

  // Vendor Commission Calculations
  const isVendor = currentUser?.role === 'vendor';
  const vendorCommissionRate = currentUser?.partnerTier === 'vip' ? 0.20 : currentUser?.partnerTier === 'pro' ? 0.15 : 0.15;
  const basePackagePrice = parseInt(activeTier.price.replace(/[^0-9]/g, ''), 10) || 0;
  const vendorCommissionAmount = Math.round(basePackagePrice * vendorCommissionRate);

  // 2. Film Filter States
  const [primaryPreset, setPrimaryPreset] = useState<FilmPresetId>('portra');
  const [allowedPresets, setAllowedPresets] = useState<FilmPresetId[]>(['portra', 'funsaver', 'quicksnap', 'ilford']);
  const [allowGuestPresetSwitch, setAllowGuestPresetSwitch] = useState<boolean>(true);
  const [previewSample, setPreviewSample] = useState<'couple' | 'guests'>('couple');

  // 3. Reveal Mode & Schedule States
  const [revealMode, setRevealMode] = useState<'instant' | 'delayed'>('instant');
  const [revealTime, setRevealTime] = useState<string>('');

  // 4. Frame & Voice Note State
  const [frameId, setFrameId] = useState<FrameId>('minimal-gold');
  const [customFrameUrl, setCustomFrameUrl] = useState<string>('');
  const [frameText, setFrameText] = useState<string>('');
  const [allowGuestFrameToggle, setAllowGuestFrameToggle] = useState<boolean>(true);
  const [allowVoiceNote, setAllowVoiceNote] = useState<boolean>(true);

  // 5. Host Account & Dashboard Credentials
  const [hostEmail, setHostEmail] = useState<string>('');
  const [hostPin, setHostPin] = useState<string>('');
  const [existingHost, setExistingHost] = useState<UserAccount | null>(null);

  // Check mandatory session & referral code on mount
  useEffect(() => {
    const session = getClientSession();
    if (!session) {
      const redirectUrl = `/create?package=${selectedTier}`;
      router.replace(`/login?redirect=${encodeURIComponent(redirectUrl)}&package=${selectedTier}`);
      return;
    }

    setCurrentUser(session);
    setIsAuthChecking(false);

    if (session.role === 'host' && session.email) {
      setExistingHost(session);
      setHostEmail(session.email);
      if (session.name) {
        setCoupleOrHost(prev => prev || session.name);
      }
    }

    // Check URL searchParams or localStorage for partner referral
    const paramRef = searchParams.get('ref');
    const storedRef = typeof window !== 'undefined' ? localStorage.getItem('sb_client_ref') : null;
    const initialRef = (paramRef || storedRef || '').trim();
    if (initialRef && session.role !== 'vendor') {
      setReferralCode(initialRef.toUpperCase());
    }
  }, [searchParams, router, selectedTier]);

  // Auto-slug generator from host or title
  const generateCleanSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isSlugManuallyEdited && !coupleOrHost) {
      setSlug(generateCleanSlug(val));
    }
  };

  const handleHostChange = (val: string) => {
    setCoupleOrHost(val);
    if (!isSlugManuallyEdited) {
      setSlug(generateCleanSlug(val));
    }
  };

  // Toggle filter checkbox
  const togglePresetAllowed = (presetId: FilmPresetId) => {
    if (allowedPresets.includes(presetId)) {
      if (allowedPresets.length <= 1) {
        toast.error('Minimal harus ada 1 filter yang aktif!');
        return;
      }
      setAllowedPresets(prev => prev.filter(p => p !== presetId));
    } else {
      if (allowedPresets.length >= activeTier.maxPresets) {
        toast.error(`Batas ${activeTier.name} maksimal ${activeTier.maxPresets} filter analog. Silakan upgrade paket jika ingin menambah filter.`);
        return;
      }
      setAllowedPresets(prev => [...prev, presetId]);
    }
  };

  // Quick chips for reveal time
  const handleQuickRevealTime = (type: 'tonight' | 'midnight' | 'tomorrow_morning' | 'tomorrow_noon' | 'after_24h') => {
    const baseDate = eventDate ? new Date(eventDate) : new Date();
    const target = new Date(baseDate);

    if (type === 'tonight') {
      target.setHours(22, 0, 0, 0);
    } else if (type === 'midnight') {
      target.setHours(23, 59, 0, 0);
    } else if (type === 'tomorrow_morning') {
      target.setDate(target.getDate() + 1);
      target.setHours(9, 0, 0, 0);
    } else if (type === 'tomorrow_noon') {
      target.setDate(target.getDate() + 1);
      target.setHours(12, 0, 0, 0);
    } else if (type === 'after_24h') {
      target.setDate(target.getDate() + 1);
    }

    setRevealTime(target.toISOString());
  };

  const validateReferralCode = async (codeToTest?: string) => {
    const code = (codeToTest || referralCode || '').trim().toUpperCase();
    if (!code) {
      setReferralDiscount(null);
      return;
    }
    setIsValidatingReferral(true);
    try {
      const basePrice = parseInt(activeTier.price.replace(/[^0-9]/g, ''), 10) || 0;
      const res = await fetch('/api/referral/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, price: basePrice })
      });
      const data = await res.json();
      if (data.success && data.valid) {
        setReferralDiscount({
          valid: true,
          discountPercent: data.discountPercent,
          discountAmount: data.discountAmount,
          finalPrice: data.finalPrice,
          commissionAmount: data.commissionAmount,
          vendorId: data.vendorId,
          vendorName: data.vendorName,
          message: data.message
        });
        toast.success(`Kode voucher ${code} aktif! Diskon 10% berhasil dipasang.`);
      } else {
        setReferralDiscount(null);
        toast.error(data.error || 'Kode voucher tidak valid');
      }
    } catch {
      setReferralDiscount(null);
      toast.error('Gagal memvalidasi kode promo.');
    } finally {
      setIsValidatingReferral(false);
    }
  };

  const createDraftOrActiveEvent = async (paymentStatus: 'pending' | 'paid'): Promise<string | null> => {
    const cleanEmail = (hostEmail || '').trim().toLowerCase();
    const cleanSlug = generateCleanSlug(slug || coupleOrHost || title);

    const eventPayload: any = {
      title,
      coupleOrHost,
      slug: cleanSlug || undefined,
      eventDate: eventDate || new Date().toISOString(),
      location,
      preset: primaryPreset,
      allowedPresets,
      allowGuestPresetSwitch,
      packageTier: selectedTier,
      maxGuests: activeTier.maxGuests,
      shotsPerGuest: activeTier.shotsPerGuest,
      revealMode,
      revealTime: revealMode === 'delayed' ? revealTime : undefined,
      frameId,
      customFrameUrl: customFrameUrl || undefined,
      frameText,
      allowGuestFrameToggle,
      allowVoiceNote,
      closingWishType: (selectedTier === 'wedding' || selectedTier === 'unlimited') ? 'video' : (allowVoiceNote ? 'voice' : 'none'),
      hostEmail: cleanEmail,
      paymentStatus,
    };

    if (isVendor && currentUser) {
      eventPayload.vendorId = currentUser.id;
      eventPayload.vendorName = currentUser.companyName || currentUser.name;
      eventPayload.vendorLogo = currentUser.logoUrl;
      eventPayload.vendorInstagram = currentUser.instagram;
      eventPayload.referralCodeUsed = currentUser.referralCode;
      eventPayload.commissionAmount = vendorCommissionAmount;
      eventPayload.commissionStatus = paymentStatus === 'paid' ? 'available' : 'pending';
    } else {
      eventPayload.referralCodeUsed = referralDiscount?.valid ? referralCode.toUpperCase().trim() : undefined;
      eventPayload.vendorId = referralDiscount?.vendorId;
      eventPayload.vendorName = referralDiscount?.vendorName;
      eventPayload.commissionAmount = referralDiscount?.commissionAmount;
    }

    const res = await authFetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventPayload),
    });

    const data = await res.json();
    if (data.success && data.event) {
      setCreatedDraftEventId(data.event.id);
      if (!isVendor) {
        // Auto-login session for the host with server-signed token
        const sessionUser: UserAccount = {
          id: existingHost?.id || currentUser?.id || 'usr_' + cleanEmail.replace(/[^a-z0-9]/g, '').slice(0, 10),
          name: coupleOrHost || title || cleanEmail.split('@')[0],
          email: cleanEmail,
          role: 'host'
        };
        setClientSession(sessionUser, data.sessionToken);
      }
      return data.event.id;
    } else {
      throw new Error(data.error || 'Gagal menyimpan draft acara');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = (hostEmail || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      toast.error('Silakan isi email aktif untuk akses dashboard album Anda.');
      return;
    }

    setLoading(true);

    try {
      // 1. If starter (free), directly create event
      if (activeTier.isFree) {
        const eventId = await createDraftOrActiveEvent('paid');
        if (eventId) {
          if (isVendor && currentUser) {
            toast.success(`Klien "${coupleOrHost || title}" berhasil ditambahkan ke portofolio Anda!`);
            router.push(`/vendor?tab=clients&newClient=${eventId}`);
          } else {
            toast.success('Album gratis Anda berhasil diterbitkan!');
            router.push(`/dashboard?created=true&eventId=${eventId}&paid=true`);
          }
        }
        return;
      }

      // 2. For paid packages, ALWAYS save draft event first so data is never lost
      const eventId = await createDraftOrActiveEvent('pending');
      if (!eventId) {
        throw new Error('Gagal mencatat rincian album sebelum pembayaran.');
      }

      // 3. Initiate Mayar Checkout with accurate canonical eventId & server-validated price
      const hostUrl = typeof window !== 'undefined' ? window.location.origin : 'https://sudutbingkai.vercel.app';
      const basePackagePrice = parseInt(activeTier.price.replace(/[^0-9]/g, ''), 10) || 349000;
      const finalChargedAmount = referralDiscount?.valid ? referralDiscount.finalPrice : basePackagePrice;
      const redirectSuccessUrl = isVendor
        ? `${hostUrl}/vendor?tab=clients&newClient=${eventId}&paid=true`
        : `${hostUrl}/dashboard?eventId=${eventId}&paid=true`;

      const payRes = await authFetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageTier: selectedTier,
          name: coupleOrHost || title,
          email: cleanEmail,
          eventId,
          referralCode: isVendor ? currentUser?.referralCode : (referralDiscount?.valid ? referralCode.toUpperCase().trim() : undefined),
          amount: finalChargedAmount,
          redirectUrl: redirectSuccessUrl
        })
      });

      const payData = await payRes.json();
      if (payData.success) {
        if (!payData.isSimulation && payData.paymentUrl && !payData.paymentUrl.startsWith('/')) {
          // Live Mayar redirect - draft album is already safely in database!
          window.location.href = payData.paymentUrl;
          return;
        }

        // Sandbox / Simulator Mode
        setPendingPaymentData({
          amount: payData.amount || finalChargedAmount,
          title: `Paket ${activeTier.name} (${activeTier.guestsLabel})`,
          description: `Wadah Album Digital SudutBingkai untuk ${coupleOrHost || title}`,
          isSimulation: payData.isSimulation ?? true,
          paymentUrl: payData.paymentUrl
        });
        setPaymentModalOpen(true);
      } else {
        toast.error('Gagal menginisiasi pembayaran Mayar: ' + (payData.error || 'Terjadi kesalahan'));
      }
    } catch (err: unknown) {
      toast.error('Error: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (isAuthChecking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#FBFBFA', gap: '12px' }}>
        <Loader2 className="animate-spin" size={32} color="#C27803" />
        <span style={{ fontSize: '13.5px', color: '#6E6E73', fontWeight: 500 }}>
          Memeriksa status akun Anda...
        </span>
      </div>
    );
  }

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
        background: 'radial-gradient(circle, rgba(194, 120, 3, 0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Top Glass Navigation */}
      <header className="glass-nav" style={{
        position: 'relative',
        zIndex: 50,
        padding: '16px 24px',
        borderBottom: '1px solid rgba(0, 0, 0, 0.06)'
      }}>
        <div style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href={isVendor ? "/vendor?tab=clients" : "/"} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', color: '#515154' }}>
            <ArrowLeft size={16} />
            <span style={{ fontSize: '13.5px', fontWeight: 500 }}>
              {isVendor ? 'Kembali ke Portal Mitra' : 'Kembali'}
            </span>
          </Link>

          <span style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-serif)', color: '#1D1D1F' }}>
            {isVendor ? 'Tambah Klien Baru (Vendor)' : 'Buat Album Acara'}
          </span>

          <div style={{ width: '70px', visibility: 'hidden' }} aria-hidden="true" />
        </div>
      </header>

      {/* Main Content */}
      <main style={{ position: 'relative', zIndex: 10, padding: '28px 16px 80px', maxWidth: '780px', margin: '0 auto' }}>
        
        {/* VENDOR MODE BANNER */}
        {isVendor && currentUser && (
          <div style={{
            marginBottom: '28px',
            padding: '20px 24px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(194, 120, 3, 0.12) 0%, rgba(255, 255, 255, 0.98) 100%)',
            border: '1.5px solid rgba(194, 120, 3, 0.4)',
            boxShadow: '0 8px 24px -4px rgba(194, 120, 3, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: '#C27803',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 14px rgba(194, 120, 3, 0.35)'
              }}>
                <Briefcase size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                  <span className="font-mono-film" style={{ fontSize: '11px', color: '#C27803', fontWeight: 700 }}>
                    MODE MITRA VENDOR / WO
                  </span>
                  <span style={{ fontSize: '10.5px', background: '#27AE60', color: '#FFFFFF', fontWeight: 700, padding: '2px 8px', borderRadius: '999px' }}>
                    KOMISI {(vendorCommissionRate * 100)}% AKTIF
                  </span>
                </div>
                <h3 style={{ fontSize: '16.5px', fontWeight: 800, color: '#1D1D1F', margin: 0 }}>
                  {currentUser.companyName || currentUser.name} — Menambahkan Klien Baru
                </h3>
                <p style={{ fontSize: '12.5px', color: '#6E6E73', margin: '3px 0 0' }}>
                  Anda bebas memilih paket untuk klien ini dengan harga normal. Setiap transaksi klien akan otomatis mencairkan komisi ke saldo dompet Anda.
                </p>
              </div>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '8px' }}>
            SETUP ALBUM DIGITAL
          </span>
          <h1 className="font-display-serif" style={{ fontSize: '32px', fontWeight: 700, marginBottom: '10px', color: '#1D1D1F' }}>
            Siapkan Wadah <em>Kenangan Acaramu</em>
          </h1>
          <p style={{ color: '#6E6E73', fontSize: '14px', maxWidth: '520px', margin: '0 auto' }}>
            Atur nama acara, konfirmasi kuota paket yang sudah dibeli, pilih karakter warna film analog, dan dapatkan kartu barcode QR tamu seketika.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* SECTION 1: INFORMASI ACARA & STATUS PAKET PEMBELIAN TERVERIFIKASI */}
          <div className="glass-card form-section-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              <span className="font-mono-film" style={{ color: '#C27803', fontSize: '11px' }}>
                01 • DETAIL ACARA & PAKET AKTIF
              </span>
              <span style={{ fontSize: '11.5px', color: '#86868B' }}>
                Otomatis terkunci sesuai paket
              </span>
            </div>
            <h2 style={{ fontSize: '19px', fontWeight: 700, marginBottom: '20px', color: '#1D1D1F' }}>
              Informasi Acara
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                      onClick={() => setEventType(cat)}
                      className="glass-pill"
                      style={{
                        padding: '7px 14px',
                        fontSize: '12.5px',
                        fontWeight: eventType === cat ? 700 : 500,
                        background: eventType === cat ? (cat === 'wedding' ? '#C27803' : '#1D1D1F') : 'rgba(255, 255, 255, 0.7)',
                        color: eventType === cat ? '#FFFFFF' : '#1D1D1F',
                        cursor: 'pointer'
                      }}
                    >
                      {cat === 'wedding' && 'Pernikahan & Resepsi (Favorit)'}
                      {cat === 'birthday' && 'Ulang Tahun & Sweet 17'}
                      {cat === 'corporate' && 'Gathering Kantor & Gala'}
                      {cat === 'other' && 'Reuni, Konser & Festival'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nama Acara */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                  Nama Acara *
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    eventType === 'wedding'
                      ? 'Contoh: Hari Pernikahan Dimas & Sarah'
                      : 'Contoh: Sweet 17 Keisha Azzahra'
                  }
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="glass-input"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14.5px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                    Penyelenggara / Tuan Rumah *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Dimas & Sarah"
                    value={coupleOrHost}
                    onChange={(e) => handleHostChange(e.target.value)}
                    className="glass-input"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14.5px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                    Tanggal Acara
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="glass-input"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14.5px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                  Lokasi / Venue Acara
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Plataran Hutan Kota, Senayan, Jakarta"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="glass-input"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14.5px' }}
                />
              </div>

              {/* TAUTAN KUSTOM / CUSTOM SLUG (Point 2: Custom URL Ramah Ketik) */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                  Tautan Kustom / Link Acara (Custom Slug) *
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#FFFFFF',
                  border: '1.5px solid rgba(0, 0, 0, 0.12)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s ease'
                }}>
                  <span style={{
                    padding: '0 12px',
                    fontSize: '13px',
                    color: '#86868B',
                    background: 'rgba(0,0,0,0.03)',
                    borderRight: '1px solid rgba(0,0,0,0.08)',
                    height: '46px',
                    display: 'flex',
                    alignItems: 'center',
                    fontFamily: 'var(--font-mono)',
                    whiteSpace: 'nowrap'
                  }}>
                    sudutbingkai.id/cam/
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="sarah-dimas"
                    value={slug}
                    onChange={(e) => {
                      setIsSlugManuallyEdited(true);
                      setSlug(generateCleanSlug(e.target.value));
                    }}
                    style={{
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      padding: '12px 14px',
                      fontSize: '14px',
                      fontFamily: 'var(--font-mono)',
                      color: '#C27803',
                      fontWeight: 600,
                      width: '100%'
                    }}
                  />
                </div>
                <span style={{ fontSize: '11.5px', color: '#86868B', display: 'block', marginTop: '5px' }}>
                  Tautan ramah ketik yang dicetak di kartu QR fisik, proyektor, atau undangan.
                </span>
              </div>

              {/* STATUS PAKET PEMBELIAN AKTIF (OTOMATIS TERVERIFIKASI TANPA PILIH MANUAL) */}
              <div style={{
                marginTop: '12px',
                padding: '20px 22px',
                borderRadius: '18px',
                background: 'linear-gradient(135deg, rgba(194, 120, 3, 0.08) 0%, rgba(255, 255, 255, 0.98) 100%)',
                border: '1.5px solid rgba(194, 120, 3, 0.35)',
                boxShadow: '0 8px 24px -4px rgba(194, 120, 3, 0.08)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: '#C27803',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(194, 120, 3, 0.3)'
                    }}>
                      <ShieldCheck size={22} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <span className="font-mono-film" style={{ fontSize: '10.5px', color: '#C27803' }}>
                          PAKET PEMBELIAN ANDA
                        </span>
                        <span style={{ fontSize: '10px', background: '#27AE60', color: '#FFFFFF', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Check size={11} strokeWidth={3} /> AKTIF & TERVERIFIKASI
                        </span>
                      </div>
                      <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#1D1D1F', margin: 0 }}>
                        Paket {activeTier.name} ({activeTier.guestsLabel})
                      </h3>
                    </div>
                  </div>

                  {/* Switch/Upgrade button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setShowPackageUpgradeModal(!showPackageUpgradeModal)}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid rgba(194, 120, 3, 0.3)',
                        color: '#C27803',
                        padding: '7px 14px',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <span>Ganti / Beralih Paket</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>

                {/* Active Quotas Locked Display */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                  <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <span style={{ fontSize: '10.5px', color: '#86868B', display: 'block', marginBottom: '2px' }}>KAPASITAS TAMU</span>
                    <strong style={{ fontSize: '14px', color: '#1D1D1F' }}>{activeTier.guestsLabel}</strong>
                  </div>

                  <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <span style={{ fontSize: '10.5px', color: '#86868B', display: 'block', marginBottom: '2px' }}>JATAH FOTO</span>
                    <strong style={{ fontSize: '14px', color: '#C27803' }}>{activeTier.shotsPerGuest} Foto / Tamu</strong>
                  </div>

                  <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <span style={{ fontSize: '10.5px', color: '#86868B', display: 'block', marginBottom: '2px' }}>KUOTA FILTER FILM</span>
                    <strong style={{ fontSize: '14px', color: '#1D1D1F' }}>Maks {activeTier.maxPresets} Filter</strong>
                  </div>

                  <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <span style={{ fontSize: '10.5px', color: '#86868B', display: 'block', marginBottom: '2px' }}>MASA SIMPAN ARSIP</span>
                    <strong style={{ fontSize: '14px', color: '#27AE60' }}>{activeTier.retentionLabel}</strong>
                  </div>
                </div>

                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '7px', fontSize: '11px', color: '#515154', background: 'rgba(39, 174, 96, 0.06)', padding: '8px 12px', borderRadius: '10px', border: '1px solid rgba(39, 174, 96, 0.18)' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#27AE60', flexShrink: 0 }} />
                  <span>Masa simpan {activeTier.retentionDays} hari baru mulai dihitung mundur <strong>setelah tanggal hari-H acara selesai</strong>. Anda bebas mempersiapkan album & cetak kartu QR meja dari sekarang tanpa takut masa aktif berkurang.</span>
                </div>

                {/* Quick Switch Dropdown */}
                {showPackageUpgradeModal && (
                  <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(194, 120, 3, 0.2)' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#1D1D1F', display: 'block', marginBottom: '8px' }}>
                      Pilih paket yang sudah Anda beli di website:
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                      {PRIMARY_PACKAGE_TIER_KEYS.map((tierKey) => {
                        const tier = PACKAGE_TIERS[tierKey];
                        const isCurrent = selectedTier === tier.id;
                        return (
                          <button
                            key={tier.id}
                            type="button"
                            onClick={() => {
                              setSelectedTier(tier.id);
                              if (tier.maxPresets <= 1) {
                                setAllowedPresets([primaryPreset]);
                                setAllowGuestPresetSwitch(false);
                              } else if (allowedPresets.length > tier.maxPresets) {
                                setAllowedPresets(allowedPresets.slice(0, tier.maxPresets));
                              }
                              setShowPackageUpgradeModal(false);
                            }}
                            style={{
                              padding: '8px 10px',
                              borderRadius: '10px',
                              background: isCurrent ? '#C27803' : '#FFFFFF',
                              color: isCurrent ? '#FFFFFF' : '#1D1D1F',
                              border: isCurrent ? '1.5px solid #C27803' : '1px solid rgba(0,0,0,0.1)',
                              cursor: 'pointer',
                              textAlign: 'left'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ fontSize: '12px' }}>{tier.name}</strong>
                              {isCurrent && <Check size={12} />}
                            </div>
                            <span style={{ fontSize: '10px', opacity: 0.85, display: 'block' }}>{tier.guestsLabel}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* VENDOR COMMISSION EARNINGS PREVIEW */}
                {isVendor && !activeTier.isFree && (
                  <div style={{
                    marginTop: '14px',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'rgba(39, 174, 96, 0.08)',
                    border: '1.5px solid rgba(39, 174, 96, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Wallet size={16} color="#27AE60" />
                      <span style={{ fontSize: '13px', color: '#1D1D1F' }}>
                        <strong>Komisi Mitra WO ({(vendorCommissionRate * 100)}%):</strong>
                      </span>
                    </div>
                    <strong style={{ fontSize: '14.5px', color: '#27AE60' }}>
                      +Rp {vendorCommissionAmount.toLocaleString('id-ID')} (Masuk ke Dompet)
                    </strong>
                  </div>
                )}

                <span style={{ fontSize: '11px', color: '#6E6E73', display: 'block', marginTop: '10px', fontStyle: 'italic' }}>
                  {isVendor 
                    ? `* Paket klien ini ditagihkan dengan harga normal (${activeTier.price}). Komisi mitra akan otomatis masuk ke dompet Anda.`
                    : '* Jatah foto dan kapasitas tamu di atas telah otomatis terkunci sesuai paket yang Anda beli.'}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2: KARAKTER WARNA FILM ANALOG (PREVIEW FOTO NYATA) */}
          <div className="glass-card form-section-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="font-mono-film" style={{ color: '#C27803', fontSize: '11px' }}>
                02 • KARAKTER WARNA FILM ANALOG (PREVIEW NYATA)
              </span>
              <span style={{ fontSize: '11.5px', color: '#86868B' }}>
                Filter aktif ({allowedPresets.length}/{activeTier.maxPresets})
              </span>
            </div>

            <h2 style={{ fontSize: '19px', fontWeight: 700, marginBottom: '6px', color: '#1D1D1F' }}>
              Pilih Emulasi Film Analog & Izin Tamu
            </h2>
            <p style={{ color: '#6E6E73', fontSize: '13.5px', marginBottom: '20px' }}>
              Lihat pratinjau visual di bawah. Tentukan <strong>Filter Utama</strong> sebagai signature tone acara Anda, dan centang filter tambahan yang bisa dipilih tamu di kamera mereka.
            </p>

            {/* Model Sample Switcher */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              padding: '10px 14px',
              background: 'rgba(0, 0, 0, 0.03)',
              borderRadius: '14px',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={15} color="#C27803" />
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#1D1D1F' }}>
                  Lihat Preview Tone Pada Model Foto:
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setPreviewSample('couple')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: previewSample === 'couple' ? 700 : 500,
                    background: previewSample === 'couple' ? '#C27803' : '#FFFFFF',
                    color: previewSample === 'couple' ? '#FFFFFF' : '#1D1D1F',
                    border: previewSample === 'couple' ? 'none' : '1px solid rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    boxShadow: previewSample === 'couple' ? '0 2px 8px rgba(194, 120, 3, 0.3)' : 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Heart size={13} />
                  <span>Foto Utama / Host</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewSample('guests')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: previewSample === 'guests' ? 700 : 500,
                    background: previewSample === 'guests' ? '#C27803' : '#FFFFFF',
                    color: previewSample === 'guests' ? '#FFFFFF' : '#1D1D1F',
                    border: previewSample === 'guests' ? 'none' : '1px solid rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    boxShadow: previewSample === 'guests' ? '0 2px 8px rgba(194, 120, 3, 0.3)' : 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Camera size={13} />
                  <span>Selfie Para Tamu</span>
                </button>
              </div>
            </div>

            {/* Presets Visual Grid with Photo Previews */}
            <div className="presets-grid-responsive">
              {Object.entries(FILM_PRESETS).map(([id, p]) => {
                const presetId = id as FilmPresetId;
                const isPrimary = primaryPreset === presetId;
                const isAllowed = allowedPresets.includes(presetId);

                return (
                  <div
                    key={id}
                    style={{
                      padding: '12px',
                      borderRadius: '18px',
                      background: isPrimary ? 'rgba(194, 120, 3, 0.08)' : 'rgba(255, 255, 255, 0.9)',
                      border: isPrimary ? '2px solid #C27803' : isAllowed ? '1.5px solid rgba(194, 120, 3, 0.45)' : '1px solid rgba(0, 0, 0, 0.08)',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: isPrimary ? '0 8px 24px -4px rgba(194, 120, 3, 0.2)' : '0 2px 8px rgba(0,0,0,0.03)'
                    }}
                  >
                    <div>
                      {/* Visual Photo Preview with Analog Filter Applied */}
                      <div style={{
                        width: '100%',
                        aspectRatio: '4/3',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        position: 'relative',
                        marginBottom: '10px',
                        background: '#12110F',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}>
                        <img
                          src={previewSample === 'couple' ? '/samples/dummy-couple.jpg' : '/samples/dummy-guests.jpg'}
                          alt={p.name}
                          className={`film-${presetId}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />

                        {/* Retro Amber Date Stamp */}
                        <span style={{
                          position: 'absolute',
                          bottom: '6px',
                          right: '8px',
                          color: '#ff9900',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '9.5px',
                          fontWeight: 'bold',
                          textShadow: '0 1px 3px rgba(0,0,0,0.9)'
                        }}>
                          '26 10 11
                        </span>

                        {/* Primary Signature Pill */}
                        {isPrimary && (
                          <span style={{
                            position: 'absolute',
                            top: '6px',
                            left: '6px',
                            background: '#C27803',
                            color: '#FFFFFF',
                            fontSize: '9px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                            letterSpacing: '0.04em',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}>
                            <Star size={10} fill="#FFFFFF" /> UTAMA
                          </span>
                        )}
                      </div>

                      {/* Header / Info */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: p.accentColor, display: 'inline-block' }} />
                          <strong style={{ fontSize: '13.5px', color: '#1D1D1F' }}>
                            {p.name}
                          </strong>
                        </div>
                        <span style={{ fontSize: '9.5px', fontFamily: 'var(--font-mono)', color: '#86868B', fontWeight: 600 }}>
                          {p.iso}
                        </span>
                      </div>

                      <span style={{ fontSize: '11px', color: '#6E6E73', display: 'block', lineHeight: 1.35, marginBottom: '10px' }}>
                        {p.tagline} • {p.description}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setPrimaryPreset(presetId);
                          if (!allowedPresets.includes(presetId)) {
                            togglePresetAllowed(presetId);
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          fontSize: '11.5px',
                          fontWeight: isPrimary ? 700 : 500,
                          borderRadius: '8px',
                          border: 'none',
                          background: isPrimary ? '#C27803' : 'rgba(0,0,0,0.05)',
                          color: isPrimary ? '#FFF' : '#1D1D1F',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px'
                        }}
                      >
                        {isPrimary ? (
                          <>
                            <Check size={12} strokeWidth={2.5} />
                            <span>Filter Utama Acara</span>
                          </>
                        ) : (
                          'Jadikan Filter Utama'
                        )}
                      </button>

                      {allowGuestPresetSwitch && activeTier.maxPresets > 1 && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#515154', cursor: 'pointer', padding: '2px 0' }}>
                          <input
                            type="checkbox"
                            checked={isAllowed}
                            onChange={() => togglePresetAllowed(presetId)}
                            style={{ accentColor: '#C27803', cursor: 'pointer', width: '15px', height: '15px' }}
                          />
                          <span style={{ fontWeight: isAllowed ? 600 : 400 }}>Aktif di kamera tamu</span>
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* STRATEGI GAYA FILTER DUA MODE (Point 2: Preset Terkunci vs Kebebasan Memilih Filter) */}
            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className="font-mono-film" style={{ fontSize: '11px', color: '#C27803' }}>
                  STRATEGI GAYA VISUAL ALBUM
                </span>
                <span style={{ fontSize: '10px', background: 'rgba(194,120,3,0.12)', color: '#C27803', padding: '1px 7px', borderRadius: '999px', fontWeight: 700 }}>
                  KENDALI PENUH HOST
                </span>
              </div>
              <h3 style={{ fontSize: '16.5px', fontWeight: 700, color: '#1D1D1F', marginBottom: '12px' }}>
                Pilih Mode Kamera Tamu di Acara Anda
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                {/* Mode A: Kurasi Terkunci (Satu Suasana) */}
                <div
                  onClick={() => setAllowGuestPresetSwitch(false)}
                  style={{
                    padding: '16px',
                    borderRadius: '16px',
                    border: !allowGuestPresetSwitch ? '2px solid #C27803' : '1px solid rgba(0,0,0,0.1)',
                    background: !allowGuestPresetSwitch ? 'rgba(194, 120, 3, 0.05)' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: !allowGuestPresetSwitch ? '0 4px 16px rgba(194,120,3,0.15)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: !allowGuestPresetSwitch ? '#C27803' : 'rgba(0,0,0,0.05)', color: !allowGuestPresetSwitch ? '#FFF' : '#86868B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Lock size={15} />
                      </div>
                      <strong style={{ fontSize: '14px', color: '#1D1D1F' }}>Mode Kurasi Seragam</strong>
                    </div>
                    {!allowGuestPresetSwitch && <Check size={16} color="#C27803" />}
                  </div>
                  <p style={{ fontSize: '12px', color: '#6E6E73', margin: 0, lineHeight: 1.45 }}>
                    Kunci seluruh kamera tamu pada <strong>{FILM_PRESETS[primaryPreset]?.name || 'Filter Utama'}</strong>. Album foto pernikahan akan seragam dan estetik layaknya kurasi fotografer profesional.
                  </p>
                </div>

                {/* Mode B: Bebas Berkreasi (Eksplorasi) */}
                <div
                  onClick={() => {
                    if (activeTier.maxPresets <= 1) {
                      toast.info(`Paket ${activeTier.name} hanya menyertakan 1 filter analog utama. Silakan pilih paket berbayar untuk mode eksplorasi tamu.`);
                      setShowPackageUpgradeModal(true);
                      return;
                    }
                    setAllowGuestPresetSwitch(true);
                  }}
                  style={{
                    padding: '16px',
                    borderRadius: '16px',
                    border: allowGuestPresetSwitch && activeTier.maxPresets > 1 ? '2px solid #C27803' : '1px solid rgba(0,0,0,0.1)',
                    background: allowGuestPresetSwitch && activeTier.maxPresets > 1 ? 'rgba(194, 120, 3, 0.05)' : '#FFFFFF',
                    cursor: activeTier.maxPresets <= 1 ? 'not-allowed' : 'pointer',
                    opacity: activeTier.maxPresets <= 1 ? 0.65 : 1,
                    transition: 'all 0.2s ease',
                    boxShadow: allowGuestPresetSwitch && activeTier.maxPresets > 1 ? '0 4px 16px rgba(194,120,3,0.15)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: allowGuestPresetSwitch && activeTier.maxPresets > 1 ? '#C27803' : 'rgba(0,0,0,0.05)', color: allowGuestPresetSwitch && activeTier.maxPresets > 1 ? '#FFF' : '#86868B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Unlock size={15} />
                      </div>
                      <strong style={{ fontSize: '14px', color: '#1D1D1F' }}>Mode Bebas Eksplorasi</strong>
                      {activeTier.maxPresets <= 1 && (
                        <span style={{ fontSize: '10px', background: '#F3F4F6', color: '#6B7280', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                          Upgrade Diperlukan
                        </span>
                      )}
                    </div>
                    {allowGuestPresetSwitch && activeTier.maxPresets > 1 && <Check size={16} color="#C27803" />}
                  </div>
                  <p style={{ fontSize: '12px', color: '#6E6E73', margin: 0, lineHeight: 1.45 }}>
                    {activeTier.maxPresets <= 1 
                      ? `Fitur multi-filter tamu membutuhkan paket berbayar (hingga ${activeTier.maxPresets > 1 ? activeTier.maxPresets : 8} filter aktif).`
                      : `Bebaskan tamu memutar dan mencoba ${allowedPresets.length} filter analog aktif di ponsel mereka. Sangat seru dan interaktif untuk pesta dan momen kasual!`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: DESAIN BINGKAI FOTO (DUMMY NYATA + 10 BINGKAI MEWAH) */}
          <div className="glass-card form-section-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="font-mono-film" style={{ color: '#C27803', fontSize: '11px' }}>
                03 • DESAIN BINGKAI FOTO MEWAH
              </span>
              <span style={{ fontSize: '11.5px', color: '#86868B' }}>
                Preview Foto Nyata
              </span>
            </div>

            <h2 style={{ fontSize: '19px', fontWeight: 700, marginBottom: '6px', color: '#1D1D1F' }}>
              Pilih Template Bingkai & Kustomisasi Teks
            </h2>
            <p style={{ color: '#6E6E73', fontSize: '13.5px', marginBottom: '24px' }}>
              Tersedia 10 desain bingkai mewah bertekstur, opsi foto RAW murni, atau unggah PNG transparan buatan Anda sendiri.
            </p>

            <FrameCustomizer
              initialFrameId={frameId}
              initialCustomFrameUrl={customFrameUrl}
              initialCoupleName={coupleOrHost || 'Nama Acara'}
              initialEventDate={eventDate}
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

          {/* SECTION 4: ATURAN KAMERA & WAKTU BUKA ALBUM (CUCI ROLL) */}
          <div className="glass-card form-section-card">
            <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '8px' }}>
              04 • ATURAN KAMERA & PENGUNGKAPAN
            </span>
            <h2 style={{ fontSize: '19px', fontWeight: 700, marginBottom: '20px', color: '#1D1D1F' }}>
              Waktu Buka Album & Pesan Suara Tamu
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {/* Reveal Mode Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '8px' }}>
                  Kapan Foto Diungkapkan (Revealed)?
                </label>
                <div className="responsive-two-col">
                  <div
                    onClick={() => setRevealMode('instant')}
                    style={{
                      padding: '16px',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      background: revealMode === 'instant' ? 'rgba(194, 120, 3, 0.08)' : 'rgba(255, 255, 255, 0.8)',
                      border: revealMode === 'instant' ? '2px solid #C27803' : '1px solid rgba(0, 0, 0, 0.08)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <Unlock size={16} color={revealMode === 'instant' ? '#C27803' : '#86868B'} />
                      <strong style={{ fontSize: '14px', color: '#1D1D1F' }}>Langsung Terbuka</strong>
                    </div>
                    <p style={{ fontSize: '12px', color: '#6E6E73', lineHeight: 1.4 }}>
                      Tamu dan pengantin bisa langsung melihat foto sesaat setelah dijepret.
                    </p>
                  </div>

                  <div
                    onClick={() => setRevealMode('delayed')}
                    style={{
                      padding: '16px',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      background: revealMode === 'delayed' ? 'rgba(194, 120, 3, 0.08)' : 'rgba(255, 255, 255, 0.8)',
                      border: revealMode === 'delayed' ? '2px solid #C27803' : '1px solid rgba(0, 0, 0, 0.08)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <Lock size={16} color={revealMode === 'delayed' ? '#C27803' : '#86868B'} />
                      <strong style={{ fontSize: '14px', color: '#1D1D1F' }}>Sensasi Cuci Roll (Ditunda)</strong>
                    </div>
                    <p style={{ fontSize: '12px', color: '#6E6E73', lineHeight: 1.4 }}>
                      Foto disimpan rahasia sampai acara selesai, lalu terbuka serentak bersama.
                    </p>
                  </div>
                </div>
              </div>

              {/* JIKA MEMILIH CUCI ROLL: PANEL JADWAL FLEKSIBEL + OPSI BUKA SEKARANG */}
              {revealMode === 'delayed' && (
                <div style={{ padding: '20px', background: 'rgba(194, 120, 3, 0.06)', borderRadius: '16px', border: '1px solid rgba(194, 120, 3, 0.25)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <Clock size={16} color="#C27803" />
                    <strong style={{ fontSize: '13px', color: '#1D1D1F' }}>
                      Atur Waktu Pengungkapan Roll Film
                    </strong>
                  </div>
                  <p style={{ fontSize: '12px', color: '#6E6E73', marginBottom: '14px' }}>
                    Pilih jalan pintas jam acara selesai atau tentukan tanggal & jam bebas sesuka Anda:
                  </p>

                  {/* Quick Preset Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                    {[
                      { label: 'Malam Ini 22:00', type: 'tonight' as const },
                      { label: 'Tengah Malam 23:59', type: 'midnight' as const },
                      { label: 'Besok Pagi 09:00', type: 'tomorrow_morning' as const },
                      { label: 'Besok Siang 12:00', type: 'tomorrow_noon' as const },
                      { label: '+24 Jam Dari Sekarang', type: 'after_24h' as const }
                    ].map((chip) => (
                      <button
                        key={chip.type}
                        type="button"
                        onClick={() => handleQuickRevealTime(chip.type)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: '#FFFFFF',
                          border: '1px solid rgba(194, 120, 3, 0.35)',
                          color: '#C27803',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                  {/* Manual Datetime Picker */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                      Atau Tentukan Tanggal & Jam Spesifik:
                    </label>
                    <input
                      type="datetime-local"
                      value={revealTime ? new Date(revealTime).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setRevealTime(e.target.value ? new Date(e.target.value).toISOString() : '')}
                      className="glass-input"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '14px' }}
                    />
                  </div>

                  {/* Jaminan Opsi Buka Sekarang */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    background: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid rgba(0, 0, 0, 0.08)'
                  }}>
                    <Unlock size={20} color="#C27803" style={{ flexShrink: 0 }} />
                    <div style={{ fontSize: '11.5px', color: '#515154' }}>
                      <strong style={{ color: '#1D1D1F' }}>Fleksibel: Opsi "Buka Sekarang" Selalu Tersedia.</strong>
                      <span style={{ display: 'block', marginTop: '2px', color: '#86868B' }}>
                        Walaupun jadwal telah diatur, Anda tetap bisa membuka album secara instan kapan saja melalui Dashboard tanpa menunggu hitung mundur habis.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Closing Wish Toggle (Video Wish for Wedding/Unlimited, Voice Note for Party/Event) */}
              <div
                style={{
                  padding: '16px 18px',
                  borderRadius: '16px',
                  background: (selectedTier === 'wedding' || selectedTier === 'unlimited') ? 'linear-gradient(135deg, rgba(194, 120, 3, 0.08), rgba(255, 0, 85, 0.05))' : 'rgba(0,0,0,0.03)',
                  border: (selectedTier === 'wedding' || selectedTier === 'unlimited') ? '1px solid rgba(194, 120, 3, 0.3)' : '1px solid rgba(0,0,0,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '14px', color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {(selectedTier === 'wedding' || selectedTier === 'unlimited') ? (
                        <>
                          <Film size={15} color="#C27803" />
                          <span>Video Ucapan Tamu 15 Detik (Otomatis Aktif)</span>
                        </>
                      ) : (
                        <>
                          <Mic size={15} color="#C27803" />
                          <span>Pesan Suara & Doa Tamu (Voice Note 15 Detik)</span>
                        </>
                      )}
                    </strong>
                    {(selectedTier === 'wedding' || selectedTier === 'unlimited') && (
                      <span style={{ fontSize: '10px', background: 'linear-gradient(135deg, #FF0055, #7928CA)', color: '#FFF', padding: '2px 8px', borderRadius: '999px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <Star size={10} fill="#FFF" /> EKSKLUSIF {activeTier.name.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '12px', color: '#6E6E73', lineHeight: 1.45, display: 'block' }}>
                    {(selectedTier === 'wedding' || selectedTier === 'unlimited')
                      ? 'Saat jatah rol foto tamu habis, kamera langsung beralih ke Camcorder VHS 15 detik untuk merekam pesan video live (menggantikan voice note biasa) yang otomatis tampil sebagai Reels video di album.'
                      : 'Saat jatah foto tamu habis, izinkan mereka merekam ucapan selamat & pesan suara penutup 15 detik untuk Anda. (Fitur Video Ucapan tersedia di paket Wedding/Unlimited).'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={allowVoiceNote}
                  onChange={(e) => setAllowVoiceNote(e.target.checked)}
                  style={{ width: '22px', height: '22px', accentColor: '#C27803', cursor: 'pointer', flexShrink: 0 }}
                />
              </div>
            </div>
          </div>

          {/* SECTION 5: AKUN PENYELENGGARA & AKSES DASHBOARD */}
          <div className="glass-card form-section-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              <span className="font-mono-film" style={{ color: '#C27803', fontSize: '11px' }}>
                05 • {isVendor ? 'DATA KLIEN & AKSES PENGANTIN' : 'AKUN PENYELENGGARA & AKSES DASHBOARD'}
              </span>
              <span style={{ fontSize: '11.5px', color: '#2ECC71', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                <ShieldCheck size={14} /> {isVendor ? 'Akses Mitra Terverifikasi' : 'Bebas Login Ribet'}
              </span>
            </div>
            <h2 style={{ fontSize: '19px', fontWeight: 700, marginBottom: '6px', color: '#1D1D1F' }}>
              {isVendor ? 'Data Klien & Akses Pengantin' : 'Kredensial Kendali Acara'}
            </h2>
            <p style={{ fontSize: '13px', color: '#6E6E73', marginBottom: '20px', lineHeight: 1.5 }}>
              {isVendor 
                ? 'Masukkan email pengantin agar mereka dapat melihat galeri foto dan mengunduh foto kenangan. Sebagai mitra vendor, Anda tetap dapat mengatur & memoderasi album ini kapan saja melalui Dashboard Mitra.'
                : 'Akun ini digunakan untuk membuka Dashboard, mengunduh seluruh foto tamu dalam arsip ZIP kualitas tinggi, memoderasi foto, serta mencetak kartu QR tamu.'}
            </p>

            {isVendor ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  padding: '14px 16px',
                  background: 'rgba(194, 120, 3, 0.08)',
                  border: '1px solid rgba(194, 120, 3, 0.25)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <Briefcase size={18} color="#C27803" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '12.5px', color: '#1D1D1F' }}>
                    Mitra WO Penanggung Jawab: <strong>{currentUser?.companyName || currentUser?.name}</strong> ({currentUser?.email})
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                      <Mail size={13} color="#C27803" />
                      Email Klien / Pengantin *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="contoh: pengantin@gmail.com"
                      value={hostEmail}
                      onChange={(e) => setHostEmail(e.target.value)}
                      className="glass-input"
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14.5px' }}
                    />
                    <span style={{ fontSize: '11.5px', color: '#86868B', display: 'block', marginTop: '4px' }}>
                      Pengantin dapat mengakses galeri & album mereka dengan email ini.
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                      <Key size={13} color="#C27803" />
                      PIN Akses Klien (Opsional)
                    </label>
                    <input
                      type="password"
                      placeholder="Contoh: 123456 (opsional)"
                      value={hostPin}
                      onChange={(e) => setHostPin(e.target.value)}
                      className="glass-input"
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14.5px' }}
                    />
                    <span style={{ fontSize: '11.5px', color: '#86868B', display: 'block', marginTop: '4px' }}>
                      PIN pengaman untuk pengantin saat membuka dashboard pribadi.
                    </span>
                  </div>
                </div>
              </div>
            ) : existingHost ? (
              <div style={{
                padding: '16px',
                background: 'rgba(194, 120, 3, 0.08)',
                border: '1px solid rgba(194, 120, 3, 0.25)',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: '#C27803',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <UserCheck size={18} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '13.5px', color: '#1D1D1F', display: 'block' }}>
                      Terhubung sebagai: {existingHost.name || 'Penyelenggara'} ({existingHost.email})
                    </strong>
                    <span style={{ fontSize: '12px', color: '#86868B' }}>
                      Album baru ini akan langsung tersimpan & tampil di Dashboard Anda.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setExistingHost(null);
                    setHostEmail('');
                  }}
                  className="glass-pill"
                  style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}
                >
                  Gunakan Email Lain
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                    <Mail size={13} color="#C27803" />
                    Email Anda (Host / Penyelenggara) *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="contoh: host@gmail.com"
                    value={hostEmail}
                    onChange={(e) => setHostEmail(e.target.value)}
                    className="glass-input"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14.5px' }}
                  />
                  <span style={{ fontSize: '11.5px', color: '#86868B', display: 'block', marginTop: '4px' }}>
                    Dashboard Anda otomatis aktif & dapat diakses dengan email ini.
                  </span>
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                    <Key size={13} color="#C27803" />
                    PIN / Kata Sandi Dashboard
                  </label>
                  <input
                    type="password"
                    placeholder="Contoh: 123456 (opsional)"
                    value={hostPin}
                    onChange={(e) => setHostPin(e.target.value)}
                    className="glass-input"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14.5px' }}
                  />
                  <span style={{ fontSize: '11.5px', color: '#86868B', display: 'block', marginTop: '4px' }}>
                    Untuk masuk kembali jika membuka dari HP pasangan atau laptop.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* REFERRAL / PROMO VOUCHER CARD */}
          {!activeTier.isFree && (
            isVendor ? (
              <div style={{
                background: 'linear-gradient(135deg, rgba(39, 174, 96, 0.08) 0%, rgba(255, 255, 255, 0.98) 100%)',
                borderRadius: '16px',
                padding: '18px 22px',
                border: '1.5px solid rgba(39, 174, 96, 0.35)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Wallet size={20} color="#27AE60" style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ fontSize: '14px', color: '#1D1D1F', display: 'block' }}>
                      Status Kemitraan WO: {currentUser?.companyName || currentUser?.name}
                    </strong>
                    <span style={{ fontSize: '12.5px', color: '#27AE60', fontWeight: 600 }}>
                      Komisi Mitra {(vendorCommissionRate * 100)}% (+Rp {vendorCommissionAmount.toLocaleString('id-ID')}) otomatis masuk ke dompet Anda saat pembayaran selesai.
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#FFFFFF', background: '#27AE60', padding: '4px 12px', borderRadius: '999px' }}>
                  KOMISI OTOMATIS
                </span>
              </div>
            ) : (
              <div style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '16px 20px',
                border: referralDiscount?.valid ? '1px solid #10B981' : '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Tag size={16} color={referralDiscount?.valid ? '#10B981' : '#C27803'} />
                    <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#1D1D1F' }}>
                      Punya Kode Voucher Kemitraan / Promo WO?
                    </span>
                  </div>
                  {referralDiscount?.valid && (
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#047857', background: 'rgba(16,185,129,0.12)', padding: '3px 8px', borderRadius: '12px' }}>
                      HEMAT 10%
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Masukkan kode promo (misal: VOWSANDCO)"
                    value={referralCode}
                    onChange={(e) => {
                      setReferralCode(e.target.value.toUpperCase());
                      if (referralDiscount) setReferralDiscount(null);
                    }}
                    className="glass-input"
                    style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', fontSize: '13.5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  />
                  <button
                    type="button"
                    onClick={() => validateReferralCode()}
                    disabled={isValidatingReferral || !referralCode.trim()}
                    className="glass-pill"
                    style={{
                      padding: '10px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: (isValidatingReferral || !referralCode.trim()) ? 'not-allowed' : 'pointer',
                      background: referralDiscount?.valid ? '#10B981' : '#1D1D1F',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '10px'
                    }}
                  >
                    {isValidatingReferral ? 'Mengecek...' : referralDiscount?.valid ? 'Terpasang' : 'Terapkan'}
                  </button>
                </div>

                {referralDiscount?.valid && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(16,185,129,0.06)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#047857', display: 'block' }}>
                        Voucher Kemitraan: {referralDiscount.vendorName}
                      </span>
                      <span style={{ fontSize: '11px', color: '#065F46' }}>
                        Hemat Rp {referralDiscount.discountAmount.toLocaleString('id-ID')} ({referralDiscount.discountPercent}%)
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '11px', color: '#86868B', textDecoration: 'line-through', display: 'block' }}>
                        {activeTier.price}
                      </span>
                      <strong style={{ fontSize: '14px', color: '#047857' }}>
                        Rp {referralDiscount.finalPrice.toLocaleString('id-ID')}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          {/* SUBMIT BUTTON */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
            <button
              type="submit"
              disabled={loading}
              className="btn-apple-black"
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '16px',
                fontWeight: 600,
                borderRadius: '16px',
                cursor: loading ? 'wait' : 'pointer'
              }}
            >
              <span>
                {loading
                  ? 'Menyiapkan Album Digital...'
                  : isVendor
                    ? (activeTier.isFree
                        ? 'Tambahkan Klien & Terbitkan Album (Gratis)'
                        : `Lanjut ke Pembayaran Mayar (${activeTier.price} • Komisi +Rp ${vendorCommissionAmount.toLocaleString('id-ID')})`)
                    : activeTier.isFree
                      ? 'Terbitkan Album & Unduh Kartu QR Tamu (Gratis)'
                      : referralDiscount?.valid
                        ? `Lanjut ke Pembayaran Mayar (Rp ${referralDiscount.finalPrice.toLocaleString('id-ID')})`
                        : `Lanjut ke Pembayaran Mayar (${activeTier.price})`}
              </span>
              <ArrowRight size={18} />
            </button>
            <span style={{ fontSize: '12px', color: '#86868B' }}>
              {isVendor 
                ? 'Album klien akan langsung aktif dan terhubung ke daftar klien dashboard vendor Anda.'
                : 'Album Anda akan langsung aktif dan kartu QR tamu siap dicetak seketika.'}
            </span>
          </div>

        </form>
      </main>

      {/* Mayar Payment Modal (Sandbox Simulator or Live Checkout) */}
      <MayarPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSuccess={async () => {
          setPaymentModalOpen(false);
          toast.success('Pembayaran Terkonfirmasi!');

          if (createdDraftEventId) {
            try {
              await authFetch('/api/events', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: createdDraftEventId,
                  paymentStatus: 'paid',
                }),
              });
            } catch (evErr) {
              console.warn('Failed to mark draft event as paid:', evErr);
            }
          }

          if (isVendor && currentUser) {
            const newBal = (currentUser.walletBalance || 0) + vendorCommissionAmount;
            const newEarnings = (currentUser.totalEarnings || 0) + vendorCommissionAmount;
            const updatedUser: UserAccount = {
              ...currentUser,
              walletBalance: newBal,
              totalEarnings: newEarnings,
              clientCount: (currentUser.clientCount || 0) + 1
            };
            setClientSession(updatedUser);
            setCurrentUser(updatedUser);

            toast.success(`Komisi sebesar Rp ${vendorCommissionAmount.toLocaleString('id-ID')} berhasil masuk ke saldo dompet Anda!`);
            router.push(`/vendor?tab=clients&newClient=${createdDraftEventId || ''}&paid=true`);
          } else {
            if (createdDraftEventId) {
              router.push(`/dashboard?created=true&eventId=${createdDraftEventId}&paid=true`);
            } else {
              router.push('/dashboard?paid=true');
            }
          }
        }}
        title={pendingPaymentData?.title || `Paket ${activeTier.name}`}
        description={pendingPaymentData?.description || ''}
        amount={pendingPaymentData?.amount || 349000}
        isSimulation={pendingPaymentData?.isSimulation}
      />
    </div>
  );
}

export default function CreateEventPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#86868B' }}>Memuat formulir album...</div>}>
      <CreateEventForm />
    </Suspense>
  );
}
