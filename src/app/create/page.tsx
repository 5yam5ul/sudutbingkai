'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, ArrowRight, Check, Calendar, MapPin, Film, Camera,
  Lock, Unlock, Clock, CheckCircle2, ShieldCheck, Heart, Users, SlidersHorizontal, Eye,
  Mail, Key, UserCheck, Tag, Percent, Wallet, Briefcase, Loader2, Star, Mic, Sparkles, ChevronRight, ChevronLeft,
  Cake, Coffee, Zap, Video
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FILM_PRESETS } from '@/lib/filters';
import { FilmPresetId, EventPackageTier, PACKAGE_TIERS, PRIMARY_PACKAGE_TIER_KEYS, UserAccount, getEventCategoryMeta } from '@/lib/types';
import { getClientSession, setClientSession, authFetch } from '@/lib/auth';
import { FrameId } from '@/lib/frames';
import FrameCustomizer from '@/components/FrameCustomizer';
import MayarPaymentModal from '@/components/MayarPaymentModal';
import { toast } from 'sonner';
import { hapticDialClick, hapticToggle, hapticLightTap } from '@/lib/haptics';

// Step Slide Animation Variants for Framer Motion
const stepVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: {
      x: { type: 'spring' as const, stiffness: 350, damping: 30 },
      opacity: { duration: 0.2 }
    }
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -40 : 40,
    opacity: 0,
    transition: {
      x: { type: 'spring' as const, stiffness: 350, damping: 30 },
      opacity: { duration: 0.15 }
    }
  })
};

// Visual Film Tone Swatch & Metadata for Step 2
const FILM_SWATCHES: Record<FilmPresetId, { gradient: string; toneName: string }> = {
  portra: { gradient: 'linear-gradient(135deg, #FFF0DB 0%, #E0A96D 50%, #C27803 100%)', toneName: 'Warm Gold' },
  funsaver: { gradient: 'linear-gradient(135deg, #FEF08A 0%, #F59E0B 50%, #D97706 100%)', toneName: 'Retro Yellow' },
  quicksnap: { gradient: 'linear-gradient(135deg, #BBF7D0 0%, #10B981 50%, #047857 100%)', toneName: 'Fresh Emerald' },
  ektar: { gradient: 'linear-gradient(135deg, #FFEDD5 0%, #F97316 50%, #C2410C 100%)', toneName: 'Vivid Amber' },
  cinestill: { gradient: 'linear-gradient(135deg, #0C4A6E 0%, #0284C7 50%, #BE123C 100%)', toneName: 'Tungsten Neon' },
  ilford: { gradient: 'linear-gradient(135deg, #F3F4F6 0%, #6B7280 50%, #111827 100%)', toneName: 'Classic B&W' },
  agfa: { gradient: 'linear-gradient(135deg, #FCE7F3 0%, #F472B6 50%, #9D174D 100%)', toneName: 'Dreamy Pastel' },
  trix: { gradient: 'linear-gradient(135deg, #E5E7EB 0%, #374151 50%, #000000 100%)', toneName: 'Deep Contrast' },
};

function CreateEventForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const packageQuery = (searchParams.get('package')?.toLowerCase() || 'wedding') as EventPackageTier;
  const initialTierKey: EventPackageTier = PACKAGE_TIERS[packageQuery] ? packageQuery : 'wedding';

  // Stepper State (1: Info Acara, 2: Gaya & Frame, 3: Kuota & Fitur, 4: Ringkasan & Bayar)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [direction, setDirection] = useState<1 | -1>(1);

  // Film Reel Carousel Ref & Drag-to-Scroll Handlers
  const filmCarouselRef = useRef<HTMLDivElement>(null);
  const isDraggingFilmRef = useRef(false);
  const filmStartXRef = useRef(0);
  const filmScrollLeftRef = useRef(0);

  const handleFilmMouseDown = (e: React.MouseEvent) => {
    if (!filmCarouselRef.current) return;
    isDraggingFilmRef.current = true;
    filmStartXRef.current = e.pageX - filmCarouselRef.current.offsetLeft;
    filmScrollLeftRef.current = filmCarouselRef.current.scrollLeft;
  };

  const handleFilmMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingFilmRef.current || !filmCarouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - filmCarouselRef.current.offsetLeft;
    const walk = (x - filmStartXRef.current) * 1.5;
    filmCarouselRef.current.scrollLeft = filmScrollLeftRef.current - walk;
  };

  const handleFilmMouseUpOrLeave = () => {
    isDraggingFilmRef.current = false;
  };

  const scrollFilm = (dir: 'left' | 'right') => {
    if (!filmCarouselRef.current) return;
    hapticLightTap();
    const offset = dir === 'left' ? -200 : 200;
    filmCarouselRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

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

  // Step 1 Form State
  const [eventType, setEventType] = useState<'wedding' | 'birthday' | 'corporate' | 'other'>('wedding');
  const [title, setTitle] = useState('');
  const [coupleOrHost, setCoupleOrHost] = useState('');
  const [slug, setSlug] = useState('');
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');

  // Step 3 Package Tier State (Freemium + Paid Tiers)
  const [selectedTier, setSelectedTier] = useState<EventPackageTier>(initialTierKey);
  const activeTier = PACKAGE_TIERS[selectedTier] || PACKAGE_TIERS.wedding;

  // Vendor Commission Calculations
  const isVendor = currentUser?.role === 'vendor';
  const rawVendorRate = Number(currentUser?.commissionRate) || 0;
  const vendorCommissionRate = rawVendorRate > 0
    ? (rawVendorRate <= 1 ? rawVendorRate : rawVendorRate / 100)
    : (currentUser?.partnerTier === 'vip' ? 0.20 : currentUser?.partnerTier === 'pro' ? 0.15 : 0.12);
  const basePackagePrice = parseInt(activeTier.price.replace(/[^0-9]/g, ''), 10) || 0;
  const vendorCommissionAmount = Math.round(basePackagePrice * vendorCommissionRate);

  // Step 2 Film Filter States
  const [primaryPreset, setPrimaryPreset] = useState<FilmPresetId>('portra');
  const [allowedPresets, setAllowedPresets] = useState<FilmPresetId[]>(['portra', 'funsaver', 'quicksnap', 'ilford']);
  const [allowGuestPresetSwitch, setAllowGuestPresetSwitch] = useState<boolean>(true);
  const [previewSample, setPreviewSample] = useState<'couple' | 'guests'>('couple');

  // Step 3 Reveal Mode & Schedule States
  const [revealMode, setRevealMode] = useState<'instant' | 'delayed'>('instant');
  const [revealTime, setRevealTime] = useState<string>('');

  // Step 2 Frame & Audio State
  const [frameId, setFrameId] = useState<FrameId>('minimal-gold');
  const [customFrameUrl, setCustomFrameUrl] = useState<string>('');
  const [frameText, setFrameText] = useState<string>('');
  const [allowGuestFrameToggle, setAllowGuestFrameToggle] = useState<boolean>(true);
  const isVideoTier = selectedTier === 'wedding' || selectedTier === 'unlimited';
  const [wishType, setWishType] = useState<'video' | 'voice' | 'none'>('video');

  // Step 4 Host Account & Dashboard Credentials
  const [hostEmail, setHostEmail] = useState<string>('');
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
    } else if (session.role === 'vendor') {
      authFetch('/api/vendors')
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.vendors)) {
            const matched = data.vendors.find(
              (v: any) => v.id === session.id || (session.email && v.email?.toLowerCase() === session.email.toLowerCase())
            );
            if (matched) {
              setCurrentUser(prev => prev ? {
                ...prev,
                companyName: matched.companyName || prev.companyName || matched.name,
                logoUrl: matched.logoUrl || prev.logoUrl,
                instagram: matched.instagram || prev.instagram,
                partnerTier: matched.partnerTier || prev.partnerTier || 'regular',
                commissionRate: matched.commissionRate ?? prev.commissionRate,
                walletBalance: typeof matched.walletBalance === 'number' ? matched.walletBalance : prev.walletBalance,
                totalEarnings: typeof matched.totalEarnings === 'number' ? matched.totalEarnings : prev.totalEarnings,
              } : prev);
            }
          }
        })
        .catch(() => {});
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
    if (!isSlugManuallyEdited) {
      if (eventType !== 'wedding' || !coupleOrHost) {
        setSlug(generateCleanSlug(val));
      }
    }
  };

  const handleHostChange = (val: string) => {
    setCoupleOrHost(val);
    if (!isSlugManuallyEdited) {
      if (eventType === 'wedding' || !title) {
        setSlug(generateCleanSlug(val));
      }
    }
  };

  // Toggle filter checkbox
  const togglePresetAllowed = (presetId: FilmPresetId) => {
    hapticToggle();
    if (allowedPresets.includes(presetId)) {
      if (allowedPresets.length <= 1) {
        toast.error('Minimal harus ada 1 filter yang aktif!');
        return;
      }
      setAllowedPresets(prev => prev.filter(p => p !== presetId));
    } else {
      if (allowedPresets.length >= activeTier.maxPresets) {
        toast.error(`Batas ${activeTier.name} maksimal ${activeTier.maxPresets} filter analog.`);
        return;
      }
      setAllowedPresets(prev => [...prev, presetId]);
    }
  };

  // Quick chips for reveal time
  const handleQuickRevealTime = (type: 'tonight' | 'midnight' | 'tomorrow_morning' | 'tomorrow_noon' | 'after_24h') => {
    hapticLightTap();
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

  // Step Navigation Validators
  const goToNextStep = () => {
    if (currentStep === 1) {
      if (!title.trim()) {
        toast.error('Silakan isi Nama Acara Anda terlebih dahulu.');
        return;
      }
      if (!coupleOrHost.trim()) {
        toast.error('Silakan isi Nama Penyelenggara / Tuan Rumah.');
        return;
      }
      if (!slug.trim()) {
        setSlug(generateCleanSlug(coupleOrHost || title));
      }
    }
    hapticDialClick();
    setDirection(1);
    setCurrentStep((prev) => Math.min(prev + 1, 4) as any);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToPrevStep = () => {
    hapticDialClick();
    setDirection(-1);
    setCurrentStep((prev) => Math.max(prev - 1, 1) as any);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const createDraftOrActiveEvent = async (paymentStatus: 'pending' | 'paid'): Promise<string | null> => {
    const cleanEmail = (hostEmail || '').trim().toLowerCase();
    const cleanSlug = generateCleanSlug(slug || coupleOrHost || title);

    const eventPayload: any = {
      eventType,
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
      customFrameUrl: frameId === 'custom' ? (customFrameUrl || undefined) : undefined,
      frameText,
      allowGuestFrameToggle,
      allowVoiceNote: wishType !== 'none',
      closingWishType: wishType,
      hostEmail: cleanEmail,
      paymentStatus,
    };

    if (isVendor && currentUser) {
      eventPayload.vendorId = currentUser.id;
      eventPayload.vendorName = currentUser.companyName || currentUser.name;
      eventPayload.vendorLogo = currentUser.logoUrl;
      eventPayload.vendorInstagram = currentUser.instagram;
      eventPayload.commissionAmount = vendorCommissionAmount;
      eventPayload.commissionStatus = paymentStatus === 'paid' ? 'available' : 'pending';
    } else {
      eventPayload.referralCodeUsed = referralDiscount?.valid ? referralCode.toUpperCase().trim() : undefined;
      eventPayload.vendorId = referralDiscount?.vendorId;
      eventPayload.vendorName = referralDiscount?.vendorName;
      eventPayload.commissionAmount = referralDiscount?.commissionAmount;
    }

    const res = await authFetch('/api/events', {
      method: createdDraftEventId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createdDraftEventId ? { id: createdDraftEventId, ...eventPayload } : eventPayload),
    });

    const data = await res.json();
    if (data.success && data.event) {
      setCreatedDraftEventId(data.event.id);
      if (!isVendor) {
        const sessionUser: UserAccount = {
          id: existingHost?.id || currentUser?.id || 'usr_' + cleanEmail.replace(/[^a-z0-9]/g, '').slice(0, 10),
          name: coupleOrHost || title || cleanEmail.split('@')[0],
          email: cleanEmail,
          role: 'host'
        };
        setClientSession(sessionUser, data.sessionToken);
      } else if (currentUser && data.sessionToken) {
        setClientSession(currentUser, data.sessionToken);
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
      const hostUrl = typeof window !== 'undefined' ? window.location.origin : 'https://sudutbingkai.id';
      const basePrice = parseInt(activeTier.price.replace(/[^0-9]/g, ''), 10) || (selectedTier === 'intimate' ? 129000 : selectedTier === 'unlimited' ? 999000 : 499000);
      const finalChargedAmount = (!isVendor && referralDiscount?.valid) ? referralDiscount.finalPrice : basePrice;
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
          referralCode: !isVendor && referralDiscount?.valid ? referralCode.toUpperCase().trim() : undefined,
          amount: finalChargedAmount,
          redirectUrl: redirectSuccessUrl
        })
      });

      const payData = await payRes.json();
      if (payData.success) {
        if (!payData.isSimulation && payData.paymentUrl && !payData.paymentUrl.startsWith('/')) {
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
        toast.error('Gagal menginisiasi pembayaran Mayar: ' + (payData.message || payData.error || 'Terjadi kesalahan'));
      }
    } catch (err: unknown) {
      toast.error('Error: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (isAuthChecking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F8F7F4', gap: '12px' }}>
        <Loader2 className="animate-spin" size={32} color="#C27803" />
        <span style={{ fontSize: '13.5px', color: '#6E6E73', fontWeight: 500 }}>
          Memeriksa status akun Anda...
        </span>
      </div>
    );
  }

  const stepsList = [
    { num: 1, title: 'Detail Acara', desc: 'Nama & Tautan' },
    { num: 2, title: 'Gaya & Frame', desc: 'Tone Analog' },
    { num: 3, title: 'Kuota & Fitur', desc: 'Kapasitas Tamu' },
    { num: 4, title: 'Konfirmasi', desc: 'Aktivasi QR' },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8F7F4', color: '#1D1D1F', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      {/* Background Soft Glow */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '900px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(194, 120, 3, 0.05) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Top Header Navigation */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'rgba(248, 247, 244, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
        padding: '14px 20px'
      }}>
        <div style={{ maxWidth: currentStep === 2 ? '1040px' : '720px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'max-width 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          <Link href={isVendor ? "/vendor?tab=clients" : "/"} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', color: '#6E6E73' }}>
            <ArrowLeft size={16} />
            <span style={{ fontSize: '13px', fontWeight: 500 }}>
              {isVendor ? 'Portal Vendor' : 'Beranda'}
            </span>
          </Link>

          <span style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-serif)', color: '#1D1D1F' }}>
            {isVendor ? 'Tambah Klien Baru' : 'Buat Album Digital'}
          </span>

          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#C27803', fontWeight: 600, background: 'rgba(194, 120, 3, 0.1)', padding: '3px 8px', borderRadius: '6px' }}>
            STEP {currentStep}/4
          </span>
        </div>

        {/* Stepper Progress Bar (Invistory Style) */}
        <div style={{ maxWidth: currentStep === 2 ? '1040px' : '720px', margin: '12px auto 0', display: 'flex', alignItems: 'center', gap: '6px', transition: 'max-width 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          {stepsList.map((s) => {
            const isActive = currentStep === s.num;
            const isCompleted = currentStep > s.num;
            return (
              <React.Fragment key={s.num}>
                <button
                  type="button"
                  onClick={() => {
                    if (isCompleted) {
                      hapticLightTap();
                      setDirection(-1);
                      setCurrentStep(s.num as any);
                    }
                  }}
                  disabled={!isCompleted && !isActive}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: isCompleted ? 'pointer' : 'default',
                    textAlign: 'left'
                  }}
                >
                  <div style={{
                    width: '100%',
                    height: '4px',
                    borderRadius: '2px',
                    background: isCompleted ? '#27AE60' : isActive ? '#C27803' : 'rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.3s ease',
                    marginBottom: '4px'
                  }} />
                  <span style={{
                    fontSize: '11px',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#C27803' : isCompleted ? '#27AE60' : '#86868B',
                  }}>
                    {s.title}
                  </span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </header>

      {/* Main Multi-Step Container */}
      <main style={{ maxWidth: currentStep === 2 ? '1040px' : '720px', margin: '0 auto', width: '100%', padding: '24px 20px 120px', position: 'relative', zIndex: 1, flex: 1, transition: 'max-width 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>

        {/* Vendor Mode Banner if Active */}
        {isVendor && currentUser && (
          <div style={{
            marginBottom: '20px',
            padding: '14px 18px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(194, 120, 3, 0.1) 0%, rgba(255, 255, 255, 0.98) 100%)',
            border: '1.5px solid rgba(194, 120, 3, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Briefcase size={20} color="#C27803" />
              <div>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#C27803', fontWeight: 700, display: 'block' }}>
                  MODE MITRA WO • KOMISI {(vendorCommissionRate * 100)}% AKTIF
                </span>
                <strong style={{ fontSize: '14px', color: '#1D1D1F' }}>
                  {currentUser.companyName || currentUser.name}
                </strong>
              </div>
            </div>
            <span style={{ fontSize: '12px', background: '#27AE60', color: '#FFF', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
              +Rp {vendorCommissionAmount.toLocaleString('id-ID')}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ width: '100%', minWidth: 0 }}>
          <AnimatePresence mode="wait" custom={direction}>
            
            {/* ============================================================== */}
            {/* STEP 1: INFORMASI & IDENTITAS ACARA                            */}
            {/* ============================================================== */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
              >
                <div>
                  <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: '#C27803', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Langkah 01 dari 04
                  </span>
                  <h1 style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-serif)', color: '#1D1D1F', margin: '4px 0 6px', letterSpacing: '-0.02em' }}>
                    Apa Nama <em>Acaramu?</em>
                  </h1>
                  <p style={{ color: '#6E6E73', fontSize: '13.5px', margin: 0, lineHeight: 1.5 }}>
                    Mulai dengan memberi identitas acara. Tamu akan melihat nama ini di kamera HP mereka.
                  </p>
                </div>

                <div className="glass-card" style={{ padding: '22px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '18px', background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 4px 20px -4px rgba(0,0,0,0.04)' }}>
                  
                  {/* Kategori Perayaan (Pill Selector) */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '8px' }}>
                      Kategori Perayaan
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                      {([
                        { id: 'wedding', label: 'Pernikahan & Resepsi', icon: Heart },
                        { id: 'birthday', label: 'Ulang Tahun & Pesta', icon: Cake },
                        { id: 'corporate', label: 'Kantor & Gathering', icon: Briefcase },
                        { id: 'other', label: 'Komunitas & Reuni', icon: Coffee }
                      ] as const).map((cat) => {
                        const IconComponent = cat.icon;
                        const isSelected = eventType === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              hapticLightTap();
                              const prevDefaultTagline = getEventCategoryMeta(eventType).defaultFrameTagline;
                              const nextDefaultTagline = getEventCategoryMeta(cat.id).defaultFrameTagline;
                              setEventType(cat.id);
                              setPreviewSample(cat.id === 'wedding' ? 'couple' : 'guests');
                              if (!frameText || frameText === prevDefaultTagline || frameText === 'The Beginning of Forever') {
                                setFrameText(nextDefaultTagline);
                              }
                            }}
                            style={{
                              padding: '12px 14px',
                              fontSize: '13px',
                              fontWeight: isSelected ? 700 : 500,
                              background: isSelected ? '#1D1D1F' : 'rgba(0, 0, 0, 0.03)',
                              color: isSelected ? '#FFFFFF' : '#1D1D1F',
                              border: isSelected ? '1.5px solid #1D1D1F' : '1px solid rgba(0, 0, 0, 0.08)',
                              borderRadius: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              textAlign: 'left',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <IconComponent size={15} style={{ color: isSelected ? '#C27803' : '#86868B', flexShrink: 0 }} />
                            <span>{cat.label}</span>
                          </button>
                        );
                      })}
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
                          ? 'Contoh: Hari Bahagia Dimas & Sarah'
                          : eventType === 'birthday'
                            ? 'Contoh: Sweet 17 Keisha'
                            : eventType === 'corporate'
                              ? 'Contoh: Gala Dinner & Townhall 2026'
                              : 'Contoh: Nongkrong Sore & Main Kartu'
                      }
                      value={title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      className="glass-input"
                      style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', fontSize: '15px', border: '1.5px solid rgba(0,0,0,0.1)' }}
                    />
                  </div>

                  {/* Penyelenggara / Tuan Rumah */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                      Penyelenggara / Tuan Rumah *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={
                        eventType === 'wedding'
                          ? 'Contoh: Dimas & Sarah'
                          : eventType === 'birthday'
                            ? 'Contoh: Keisha / Syamsul'
                            : 'Contoh: Nama Penyelenggara'
                      }
                      value={coupleOrHost}
                      onChange={(e) => handleHostChange(e.target.value)}
                      className="glass-input"
                      style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', fontSize: '15px', border: '1.5px solid rgba(0,0,0,0.1)' }}
                    />
                  </div>

                  {/* Tanggal & Lokasi (2 Kolom) */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                        Tanggal Acara
                      </label>
                      <input
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="glass-input"
                        style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', fontSize: '14px', border: '1.5px solid rgba(0,0,0,0.1)' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                        Lokasi / Kota (Opsional)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Plataran Senayan / Jakarta"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="glass-input"
                        style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', fontSize: '14px', border: '1.5px solid rgba(0,0,0,0.1)' }}
                      />
                    </div>
                  </div>

                  {/* Tautan Kustom (Custom Slug) */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                      Tautan Kustom Kamera (Ramah Ketik)
                    </label>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: '#FFFFFF',
                      border: '1.5px solid rgba(0, 0, 0, 0.12)',
                      borderRadius: '12px',
                      overflow: 'hidden'
                    }}>
                      <span style={{
                        padding: '0 12px',
                        fontSize: '12.5px',
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
                        placeholder="nama-acara-kamu"
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
                  </div>
                </div>
              </motion.div>
            )}

            {/* ============================================================== */}
            {/* STEP 2: GAYA FOTO ANALOG & BINGKAI POLAROID                   */}
            {/* ============================================================== */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', minWidth: 0, maxWidth: '100%' }}
              >
                <div>
                  <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: '#C27803', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Langkah 02 dari 04
                  </span>
                  <h1 style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-serif)', color: '#1D1D1F', margin: '4px 0 6px', letterSpacing: '-0.02em' }}>
                    Sentuhan Warna <em>& Bingkai</em>
                  </h1>
                  <p style={{ color: '#6E6E73', fontSize: '13.5px', margin: 0, lineHeight: 1.5 }}>
                    Pilih karakter film analog favorit Anda dan atur desain bingkai foto tamu.
                  </p>
                </div>

                {/* Filter Selector & Visual Swatch Carousel */}
                <div className="glass-card" style={{ padding: '20px', borderRadius: '20px', background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 4px 20px -4px rgba(0,0,0,0.04)', width: '100%', minWidth: 0, maxWidth: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Film size={16} style={{ color: '#C27803' }} />
                        <strong style={{ fontSize: '15px', color: '#1D1D1F' }}>Tone Film Analog</strong>
                      </div>
                      <span style={{ fontSize: '11.5px', color: '#86868B', marginTop: '2px', display: 'block' }}>
                        Geser untuk memilih karakter warna foto tamu
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11.5px',
                        fontFamily: 'var(--font-mono)',
                        color: '#C27803',
                        background: 'rgba(194,120,3,0.08)',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontWeight: 600
                      }}>
                        <span style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: FILM_PRESETS[primaryPreset]?.accentColor || '#C27803'
                        }} />
                        <span>{FILM_PRESETS[primaryPreset]?.name}</span>
                      </div>

                      {/* Desktop / Quick Navigation Arrows */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => scrollFilm('left')}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: 'rgba(0,0,0,0.04)',
                            border: '1px solid rgba(0,0,0,0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#1D1D1F',
                            transition: 'all 0.15s ease'
                          }}
                          title="Geser film ke kiri"
                        >
                          <ChevronLeft size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => scrollFilm('right')}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: 'rgba(0,0,0,0.04)',
                            border: '1px solid rgba(0,0,0,0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#1D1D1F',
                            transition: 'all 0.15s ease'
                          }}
                          title="Geser film ke kanan"
                        >
                          <ChevronRight size={15} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Horizontal Film Reel Carousel with Swatches */}
                  <div
                    ref={filmCarouselRef}
                    onMouseDown={handleFilmMouseDown}
                    onMouseMove={handleFilmMouseMove}
                    onMouseUp={handleFilmMouseUpOrLeave}
                    onMouseLeave={handleFilmMouseUpOrLeave}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      overflowX: 'auto',
                      width: '100%',
                      maxWidth: '100%',
                      minWidth: 0,
                      paddingBottom: '10px',
                      paddingTop: '8px',
                      paddingLeft: '4px',
                      paddingRight: '4px',
                      scrollSnapType: 'x mandatory',
                      WebkitOverflowScrolling: 'touch',
                      scrollbarWidth: 'none',
                      cursor: 'grab',
                      userSelect: 'none'
                    }}
                  >
                    {Object.values(FILM_PRESETS).map((preset) => {
                      const isPrimary = primaryPreset === preset.id;
                      const swatch = FILM_SWATCHES[preset.id];

                      return (
                        <div
                          key={preset.id}
                          onClick={() => {
                            hapticDialClick();
                            setPrimaryPreset(preset.id);
                            if (!allowedPresets.includes(preset.id)) {
                              setAllowedPresets(prev => [...prev, preset.id]);
                            }
                          }}
                          style={{
                            minWidth: '158px',
                            maxWidth: '158px',
                            cursor: 'pointer',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            scrollSnapAlign: 'start',
                            flexShrink: 0,
                            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                            transform: isPrimary ? 'translateY(-2px)' : 'none',
                          }}
                        >
                          {/* Camera Top Hardware Accents (Shutter Button & Winder Dial) */}
                          <div style={{ height: '7px', position: 'relative', width: '100%', padding: '0 10px' }}>
                            {/* Shutter Button (Left) */}
                            <div style={{
                              position: 'absolute',
                              left: '16px',
                              bottom: 0,
                              width: '24px',
                              height: '6px',
                              borderRadius: '4px 4px 0 0',
                              background: isPrimary 
                                ? 'linear-gradient(180deg, #F59E0B 0%, #B45309 100%)' 
                                : 'linear-gradient(180deg, #D1D5DB 0%, #9CA3AF 100%)',
                              boxShadow: isPrimary ? '0 -1px 4px rgba(245, 158, 11, 0.5)' : 'none',
                              border: '1px solid rgba(0,0,0,0.15)',
                              borderBottom: 'none'
                            }} />

                            {/* Film Winder Dial (Right) */}
                            <div style={{
                              position: 'absolute',
                              right: '16px',
                              bottom: 0,
                              width: '26px',
                              height: '5px',
                              borderRadius: '3px 3px 0 0',
                              background: 'repeating-linear-gradient(90deg, #374151 0px, #374151 3px, #1F2937 3px, #1F2937 5px)',
                              border: '1px solid rgba(0,0,0,0.25)',
                              borderBottom: 'none'
                            }} />
                          </div>

                          {/* Main Camera Body (Chassis) */}
                          <div style={{
                            borderRadius: '16px',
                            overflow: 'hidden',
                            background: isPrimary ? '#FFFFFF' : '#FAFAFA',
                            border: isPrimary ? '2px solid #C27803' : '1px solid rgba(0,0,0,0.1)',
                            boxShadow: isPrimary 
                              ? '0 12px 28px -6px rgba(194, 120, 3, 0.28), 0 2px 6px rgba(0,0,0,0.06)' 
                              : '0 4px 12px -2px rgba(0,0,0,0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative'
                          }}>
                            {/* Top Metallic Camera Header Plate (Viewfinder, Flash & LED) */}
                            <div style={{
                              background: 'linear-gradient(180deg, #F3F4F6 0%, #E5E7EB 100%)',
                              padding: '7px 9px 5px',
                              borderBottom: '1px solid rgba(0,0,0,0.08)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              position: 'relative'
                            }}>
                              {/* Left: Viewfinder Window */}
                              <div style={{
                                width: '18px',
                                height: '13px',
                                borderRadius: '3px',
                                background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
                                border: '1.5px solid #94A3B8',
                                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.6)',
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  height: '50%',
                                  background: 'linear-gradient(180deg, rgba(56,189,248,0.4) 0%, transparent 100%)'
                                }} />
                                <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(255,255,255,0.5)' }} />
                              </div>

                              {/* ISO Stamp in Center */}
                              <span style={{
                                fontSize: '8.5px',
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 800,
                                color: '#374151',
                                letterSpacing: '0.04em',
                                background: 'rgba(255,255,255,0.7)',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                border: '1px solid rgba(0,0,0,0.08)'
                              }}>
                                {preset.iso}
                              </span>

                              {/* Right: Flash Unit + Ready LED */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{
                                  width: '5px',
                                  height: '5px',
                                  borderRadius: '50%',
                                  background: isPrimary ? '#EF4444' : '#9CA3AF',
                                  boxShadow: isPrimary ? '0 0 6px #EF4444, 0 0 2px #F87171' : 'none',
                                  transition: 'all 0.2s ease'
                                }} title={isPrimary ? 'Flash Siap' : 'Standby'} />

                                <div style={{
                                  width: '22px',
                                  height: '13px',
                                  borderRadius: '3px',
                                  background: 'repeating-linear-gradient(45deg, #E2E8F0 0px, #E2E8F0 2px, #CBD5E1 2px, #CBD5E1 4px)',
                                  border: '1.5px solid #94A3B8',
                                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)'
                                }} />
                              </div>
                            </div>

                            {/* Center Camera Face with Iconic Lens */}
                            <div style={{
                              background: 'linear-gradient(180deg, #18181B 0%, #27272A 100%)',
                              padding: '10px 8px 8px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative',
                              overflow: 'hidden'
                            }}>
                              {/* Camera Face Texture */}
                              <div style={{
                                position: 'absolute',
                                inset: 0,
                                opacity: 0.12,
                                backgroundImage: 'radial-gradient(#FFFFFF 1px, transparent 1px)',
                                backgroundSize: '4px 4px'
                              }} />

                              {/* Circular 3D Camera Lens */}
                              <div style={{
                                width: '68px',
                                height: '68px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #71717A 0%, #27272A 50%, #09090B 100%)',
                                padding: '3px',
                                boxShadow: '0 4px 14px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.3)',
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                {/* Silver Metallic Bezel Ring */}
                                <div style={{
                                  width: '100%',
                                  height: '100%',
                                  borderRadius: '50%',
                                  background: 'conic-gradient(from 45deg, #E4E4E7, #71717A, #E4E4E7, #52525B, #E4E4E7)',
                                  padding: '2px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  {/* Black Inner Barrel */}
                                  <div style={{
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: '50%',
                                    background: '#09090B',
                                    padding: '3px',
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    {/* Optical Glass Lens (Reflecting Film Tone Gradient) */}
                                    <div style={{
                                      width: '100%',
                                      height: '100%',
                                      borderRadius: '50%',
                                      background: swatch?.gradient || preset.accentColor,
                                      boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.6)',
                                      position: 'relative',
                                      overflow: 'hidden',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}>
                                      {/* Curved Glass Highlight Reflection */}
                                      <div style={{
                                        position: 'absolute',
                                        top: '2px',
                                        left: '5px',
                                        width: '65%',
                                        height: '45%',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 80%)',
                                        transform: 'rotate(-25deg)',
                                        pointerEvents: 'none'
                                      }} />

                                      {/* Aperture Center Dot */}
                                      <div style={{
                                        width: '14px',
                                        height: '14px',
                                        borderRadius: '50%',
                                        background: 'rgba(0,0,0,0.45)',
                                        backdropFilter: 'blur(2px)',
                                        border: '1px solid rgba(255,255,255,0.25)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                      }}>
                                        <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#FFFFFF', opacity: 0.9 }} />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Lens Specs Label */}
                              <span style={{
                                marginTop: '5px',
                                fontSize: '8px',
                                fontFamily: 'var(--font-mono)',
                                color: '#A1A1AA',
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                zIndex: 1
                              }}>
                                32mm • f/2.8
                              </span>

                              {/* Selected Gold Checkmark Badge */}
                              {isPrimary && (
                                <div style={{
                                  position: 'absolute',
                                  top: '5px',
                                  right: '5px',
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '50%',
                                  background: '#C27803',
                                  color: '#FFFFFF',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                                  zIndex: 2
                                }}>
                                  <Check size={10} strokeWidth={3} />
                                </div>
                              )}
                            </div>

                            {/* Bottom Film Livery & Info Body */}
                            <div style={{
                              padding: '8px 10px 10px',
                              background: '#FFFFFF',
                              borderTop: '1px solid rgba(0,0,0,0.06)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px'
                            }}>
                              <span style={{
                                fontSize: '9px',
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                color: isPrimary ? '#C27803' : '#86868B',
                                letterSpacing: '0.04em'
                              }}>
                                {swatch?.toneName || preset.badge}
                              </span>

                              <strong style={{
                                fontSize: '11.5px',
                                color: '#1D1D1F',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {preset.name}
                              </strong>

                              <span style={{
                                fontSize: '10px',
                                color: '#6E6E73',
                                lineHeight: 1.25,
                                display: '-webkit-box',
                                WebkitLineClamp: 1,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}>
                                {preset.tagline}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination Dots Indicator */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '10px',
                    marginBottom: '4px'
                  }}>
                    {Object.values(FILM_PRESETS).map((preset) => {
                      const isPrimary = primaryPreset === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            hapticDialClick();
                            setPrimaryPreset(preset.id);
                          }}
                          style={{
                            width: isPrimary ? '18px' : '6px',
                            height: '6px',
                            borderRadius: '3px',
                            background: isPrimary ? '#C27803' : 'rgba(0,0,0,0.18)',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                          }}
                          title={preset.name}
                        />
                      );
                    })}
                  </div>

                  {/* Toggle: Izinkan Tamu Ganti Filter */}
                  <div style={{
                    marginTop: '12px',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    background: 'rgba(0,0,0,0.025)',
                    border: '1px solid rgba(0,0,0,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
                        background: allowGuestPresetSwitch ? 'rgba(194,120,3,0.1)' : 'rgba(0,0,0,0.04)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: allowGuestPresetSwitch ? '#C27803' : '#86868B'
                      }}>
                        <SlidersHorizontal size={16} />
                      </div>
                      <div>
                        <strong style={{ fontSize: '13px', color: '#1D1D1F', display: 'block' }}>
                          Izinkan Tamu Ganti Filter Analog
                        </strong>
                        <span style={{ fontSize: '11px', color: '#86868B' }}>
                          Tamu bebas memilih gaya film di kamera saat perayaan berlangsung
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={allowGuestPresetSwitch}
                      onChange={(e) => {
                        hapticToggle();
                        setAllowGuestPresetSwitch(e.target.checked);
                      }}
                      style={{ width: '20px', height: '20px', accentColor: '#C27803', cursor: 'pointer' }}
                    />
                  </div>
                </div>

                {/* Frame Customizer Component */}
                <div className="glass-card" style={{ padding: '22px', borderRadius: '20px', background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 4px 20px -4px rgba(0,0,0,0.04)', width: '100%', minWidth: 0, maxWidth: '100%' }}>
                  <div style={{ marginBottom: '14px' }}>
                    <strong style={{ fontSize: '15px', color: '#1D1D1F' }}>Desain Bingkai Polaroid</strong>
                    <span style={{ fontSize: '11.5px', color: '#86868B', display: 'block' }}>Pilih frame klasik untuk kartu foto tamu</span>
                  </div>

                  <FrameCustomizer
                    initialFrameId={frameId}
                    initialCustomFrameUrl={customFrameUrl}
                    initialCoupleName={coupleOrHost || title}
                    initialEventDate={eventDate}
                    initialTagline={frameText}
                    initialAllowGuestToggle={allowGuestFrameToggle}
                    eventType={eventType as any}
                    activeFilmPreset={primaryPreset}
                    onUpdate={(data) => {
                      if (data.frameId) setFrameId(data.frameId);
                      if (data.customFrameUrl !== undefined) setCustomFrameUrl(data.customFrameUrl);
                      if (data.tagline !== undefined) setFrameText(data.tagline);
                      if (data.allowGuestFrameToggle !== undefined) setAllowGuestFrameToggle(data.allowGuestFrameToggle);
                    }}
                  />
                </div>
              </motion.div>
            )}

            {/* ============================================================== */}
            {/* STEP 3: KUOTA TAMU & FITUR SPESIAL                            */}
            {/* ============================================================== */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
              >
                <div>
                  <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: '#C27803', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Langkah 03 dari 04
                  </span>
                  <h1 style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-serif)', color: '#1D1D1F', margin: '4px 0 6px', letterSpacing: '-0.02em' }}>
                    Kapasitas Tamu <em>& Fitur</em>
                  </h1>
                  <p style={{ color: '#6E6E73', fontSize: '13.5px', margin: 0, lineHeight: 1.5 }}>
                    Pilih perkiraan jumlah tamu acaramu. Tersedia paket gratis untuk uji coba.
                  </p>
                </div>

                {/* Pill Selector Paket Kuota (Invistory Style) */}
                <div className="glass-card" style={{ padding: '22px', borderRadius: '20px', background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 4px 20px -4px rgba(0,0,0,0.04)' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '10px' }}>
                    Pilih Kuota Tamu
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '16px' }}>
                    {PRIMARY_PACKAGE_TIER_KEYS.map((tierKey) => {
                      const tier = PACKAGE_TIERS[tierKey];
                      const isSelected = selectedTier === tier.id;
                      const tierHasVideo = tier.id === 'wedding' || tier.id === 'unlimited';

                      return (
                        <button
                          key={tier.id}
                          type="button"
                          onClick={() => {
                            hapticDialClick();
                            setSelectedTier(tier.id);
                            if (tier.maxPresets <= 1) {
                              setAllowedPresets([primaryPreset]);
                              setAllowGuestPresetSwitch(false);
                            }
                            if (tierHasVideo) {
                              if (wishType !== 'none') setWishType('video');
                            } else {
                              if (wishType === 'video') setWishType('voice');
                            }
                          }}
                          style={{
                            padding: '14px',
                            borderRadius: '14px',
                            background: isSelected ? '#1D1D1F' : 'rgba(0, 0, 0, 0.02)',
                            color: isSelected ? '#FFFFFF' : '#1D1D1F',
                            border: isSelected ? '1.5px solid #1D1D1F' : '1px solid rgba(0, 0, 0, 0.08)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            transition: 'all 0.15s ease',
                            position: 'relative'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <strong style={{ fontSize: '13.5px' }}>{tier.name}</strong>
                            {tier.isFree ? (
                              <span style={{ fontSize: '10px', background: '#27AE60', color: '#FFF', padding: '1px 6px', borderRadius: '999px', fontWeight: 700 }}>
                                FREE
                              </span>
                            ) : tierHasVideo ? (
                              <span style={{ fontSize: '9.5px', background: isSelected ? '#C27803' : 'rgba(194, 120, 3, 0.15)', color: isSelected ? '#FFF' : '#C27803', padding: '1px 6px', borderRadius: '999px', fontWeight: 700 }}>
                                VIDEO 15s
                              </span>
                            ) : null}
                          </div>
                          <span style={{ fontSize: '11.5px', opacity: 0.8 }}>
                            {tier.guestsLabel}
                          </span>
                          <span style={{ fontSize: '10.5px', color: isSelected ? 'rgba(255,255,255,0.7)' : '#6E6E73', marginTop: '2px' }}>
                            {tierHasVideo ? '🎥 Video 15s + 🎙️ Suara' : '🎙️ Pesan Suara'} • {tier.shotsPerGuest} Foto
                          </span>
                          <strong style={{ fontSize: '14px', color: isSelected ? '#C27803' : '#1D1D1F', marginTop: '4px' }}>
                            {tier.price}
                          </strong>
                        </button>
                      );
                    })}
                  </div>

                  {/* Highlight Selected Tier Details */}
                  <div style={{
                    padding: '14px 16px',
                    borderRadius: '14px',
                    background: isVideoTier ? 'rgba(194, 120, 3, 0.08)' : 'rgba(0, 0, 0, 0.03)',
                    border: isVideoTier ? '1.5px solid rgba(194, 120, 3, 0.25)' : '1px solid rgba(0, 0, 0, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12.5px', color: '#1D1D1F', fontWeight: 700 }}>
                        {activeTier.guestsLabel} • {activeTier.shotsPerGuest} Foto per Tamu
                      </span>
                      <span style={{ fontSize: '11px', color: '#27AE60', fontWeight: 700 }}>
                        Maks {activeTier.maxPresets} Filter
                      </span>
                    </div>

                    <div style={{ fontSize: '11.5px', color: '#6E6E73', lineHeight: 1.4 }}>
                      Masa Aktif: <strong>{activeTier.retentionLabel}</strong>
                    </div>

                    {/* Benefit Video Wishes vs Voice Note Highlight */}
                    {isVideoTier ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'rgba(194, 120, 3, 0.12)',
                        padding: '8px 10px',
                        borderRadius: '10px',
                        border: '1px solid rgba(194, 120, 3, 0.25)'
                      }}>
                        <Video size={16} color="#C27803" style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: '11.5px', color: '#1D1D1F', fontWeight: 600 }}>
                          Benefit Spesial Paket {activeTier.name}: Termasuk <strong>Video Ucapan 15 Detik (Reels VHS)</strong> & Pesan Suara Tamu!
                        </span>
                      </div>
                    ) : (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'rgba(0, 0, 0, 0.04)',
                        padding: '7px 10px',
                        borderRadius: '10px'
                      }}>
                        <Mic size={15} color="#C27803" style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: '11.5px', color: '#6E6E73' }}>
                          Termasuk <strong>Pesan Suara & Doa Tamu (15 Detik)</strong>. <em>(Video Ucapan 15s eksklusif di Paket Wedding & Unlimited)</em>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Fitur Spesial (Voice / Video Wish & Reveal Mode) */}
                <div className="glass-card" style={{ padding: '22px', borderRadius: '20px', background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 4px 20px -4px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <strong style={{ fontSize: '15px', color: '#1D1D1F' }}>Fitur Interaktif Acara</strong>

                  {/* Dynamic Voice / Video Wish Selector */}
                  {isVideoTier ? (
                    <div style={{
                      padding: '16px',
                      borderRadius: '16px',
                      background: 'rgba(194, 120, 3, 0.04)',
                      border: '1.5px solid rgba(194, 120, 3, 0.22)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: 'rgba(194, 120, 3, 0.12)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Video size={18} color="#C27803" />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong style={{ fontSize: '13.5px', color: '#1D1D1F' }}>
                              Format Pesan Ucapan Tamu
                            </strong>
                            <span style={{ fontSize: '10px', background: '#C27803', color: '#FFF', padding: '1px 6px', borderRadius: '6px', fontWeight: 700 }}>
                              PAKET {activeTier.name.toUpperCase()}
                            </span>
                          </div>
                          <span style={{ fontSize: '11.5px', color: '#86868B', lineHeight: 1.4, display: 'block', marginTop: '2px' }}>
                            Pilih format yang akan direkam tamu di akhir kuota roll film mereka
                          </span>
                        </div>
                      </div>

                      {/* Video vs Voice Radio Buttons */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            hapticLightTap();
                            setWishType('video');
                          }}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '12px',
                            background: wishType === 'video' ? '#1D1D1F' : '#FFFFFF',
                            color: wishType === 'video' ? '#FFFFFF' : '#1D1D1F',
                            border: wishType === 'video' ? '1.5px solid #1D1D1F' : '1px solid rgba(0,0,0,0.1)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Video size={14} color={wishType === 'video' ? '#F59E0B' : '#C27803'} />
                              <strong style={{ fontSize: '12.5px' }}>Video Ucapan</strong>
                            </div>
                            <span style={{ fontSize: '9px', background: wishType === 'video' ? '#C27803' : 'rgba(194, 120, 3, 0.1)', color: wishType === 'video' ? '#FFF' : '#C27803', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                              15s REELS
                            </span>
                          </div>
                          <span style={{ fontSize: '10.5px', opacity: 0.8 }}>
                            Video selfie 15 detik filter VHS
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            hapticLightTap();
                            setWishType('voice');
                          }}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '12px',
                            background: wishType === 'voice' ? '#1D1D1F' : '#FFFFFF',
                            color: wishType === 'voice' ? '#FFFFFF' : '#1D1D1F',
                            border: wishType === 'voice' ? '1.5px solid #1D1D1F' : '1px solid rgba(0,0,0,0.1)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Mic size={14} color={wishType === 'voice' ? '#F59E0B' : '#C27803'} />
                              <strong style={{ fontSize: '12.5px' }}>Pesan Suara</strong>
                            </div>
                            <span style={{ fontSize: '9px', background: wishType === 'voice' ? '#6E6E73' : 'rgba(0,0,0,0.06)', color: wishType === 'voice' ? '#FFF' : '#6E6E73', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                              15s AUDIO
                            </span>
                          </div>
                          <span style={{ fontSize: '10.5px', opacity: 0.8 }}>
                            Rekaman suara ucapan via mic
                          </span>
                        </button>
                      </div>

                      {/* Toggle On / Off */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid rgba(194, 120, 3, 0.15)' }}>
                        <span style={{ fontSize: '11.5px', color: '#6E6E73' }}>
                          {wishType !== 'none' ? 'Fitur ucapan tamu aktif' : 'Fitur ucapan tamu dinonaktifkan'}
                        </span>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#1D1D1F', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={wishType !== 'none'}
                            onChange={(e) => {
                              hapticToggle();
                              setWishType(e.target.checked ? 'video' : 'none');
                            }}
                            style={{ width: '18px', height: '18px', accentColor: '#C27803' }}
                          />
                          <span>{wishType !== 'none' ? 'Aktif' : 'Nonaktif'}</span>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {/* Toggle Pesan Suara */}
                      <div style={{
                        padding: '14px',
                        borderRadius: '14px',
                        background: 'rgba(0,0,0,0.02)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <Mic size={20} color="#C27803" style={{ marginTop: '2px', flexShrink: 0 }} />
                          <div>
                            <strong style={{ fontSize: '13px', color: '#1D1D1F', display: 'block' }}>
                              Pesan Suara & Doa Tamu (15 Detik)
                            </strong>
                            <span style={{ fontSize: '11.5px', color: '#86868B', lineHeight: 1.4 }}>
                              Tamu dapat merekam ucapan selamat lewat mikrofon HP mereka saat roll film habis
                            </span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={wishType !== 'none'}
                          onChange={(e) => {
                            hapticToggle();
                            setWishType(e.target.checked ? 'voice' : 'none');
                          }}
                          style={{ width: '20px', height: '20px', accentColor: '#C27803', cursor: 'pointer' }}
                        />
                      </div>

                      {/* Upgrade Banner ke Video Wishes */}
                      <div style={{
                        padding: '12px 14px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, rgba(194, 120, 3, 0.08) 0%, rgba(245, 158, 11, 0.04) 100%)',
                        border: '1px dashed rgba(194, 120, 3, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Video size={18} color="#C27803" style={{ flexShrink: 0 }} />
                          <div>
                            <strong style={{ fontSize: '12px', color: '#1D1D1F', display: 'block' }}>
                              Mau Tamu Bisa Merekam Video Ucapan 15s (Reels VHS)?
                            </strong>
                            <span style={{ fontSize: '11px', color: '#6E6E73' }}>
                              Fitur video selfie 15 detik tersedia mulai Paket Wedding (Hingga 300 Tamu).
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            hapticDialClick();
                            setSelectedTier('wedding');
                            setWishType('video');
                          }}
                          style={{
                            padding: '7px 12px',
                            borderRadius: '8px',
                            background: '#1D1D1F',
                            color: '#FFFFFF',
                            border: 'none',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Pilih Wedding
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Reveal Mode (Cuci Film Analog) */}
                  <div style={{
                    padding: '14px',
                    borderRadius: '14px',
                    background: 'rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <Film size={20} color="#C27803" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <div>
                        <strong style={{ fontSize: '13px', color: '#1D1D1F', display: 'block' }}>
                          Waktu Pengungkapan Galeri (Reveal Mode)
                        </strong>
                        <span style={{ fontSize: '11.5px', color: '#86868B', lineHeight: 1.4 }}>
                          Pilih apakah foto langsung tayang instan atau dirahasiakan seperti cuci roll film
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          hapticLightTap();
                          setRevealMode('instant');
                        }}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '10px',
                          background: revealMode === 'instant' ? '#1D1D1F' : '#FFFFFF',
                          color: revealMode === 'instant' ? '#FFFFFF' : '#1D1D1F',
                          border: revealMode === 'instant' ? '1px solid #1D1D1F' : '1px solid rgba(0,0,0,0.1)',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <Zap size={14} style={{ color: revealMode === 'instant' ? '#C27803' : '#86868B' }} />
                        <span>Tayang Instan</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          hapticLightTap();
                          setRevealMode('delayed');
                          if (!revealTime) handleQuickRevealTime('midnight');
                        }}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '10px',
                          background: revealMode === 'delayed' ? '#C27803' : '#FFFFFF',
                          color: revealMode === 'delayed' ? '#FFFFFF' : '#1D1D1F',
                          border: revealMode === 'delayed' ? '1px solid #C27803' : '1px solid rgba(0,0,0,0.1)',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <Clock size={14} style={{ color: revealMode === 'delayed' ? '#FFFFFF' : '#86868B' }} />
                        <span>Rahasia (Cuci Film)</span>
                      </button>
                    </div>

                    {revealMode === 'delayed' && (
                      <div style={{ marginTop: '8px', padding: '10px', background: '#FFFFFF', borderRadius: '10px', border: '1px solid rgba(194,120,3,0.2)' }}>
                        <span style={{ fontSize: '11px', color: '#86868B', display: 'block', marginBottom: '6px' }}>
                          Pilihan Cepat Waktu Buka:
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {[
                            { label: 'Malam Ini 22:00', type: 'tonight' as const },
                            { label: 'Tengah Malam 23:59', type: 'midnight' as const },
                            { label: 'Besok Pagi 09:00', type: 'tomorrow_morning' as const }
                          ].map((chip) => (
                            <button
                              key={chip.type}
                              type="button"
                              onClick={() => handleQuickRevealTime(chip.type)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                background: 'rgba(194,120,3,0.1)',
                                border: 'none',
                                color: '#92400E',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              {chip.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ============================================================== */}
            {/* STEP 4: RINGKASAN & KONFIRMASI PEMBAYARAN                       */}
            {/* ============================================================== */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
              >
                <div>
                  <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: '#C27803', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Langkah 04 dari 04
                  </span>
                  <h1 style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-serif)', color: '#1D1D1F', margin: '4px 0 6px', letterSpacing: '-0.02em' }}>
                    Ringkasan <em>& Aktivasi</em>
                  </h1>
                  <p style={{ color: '#6E6E73', fontSize: '13.5px', margin: 0, lineHeight: 1.5 }}>
                    Periksa kembali rincian album Anda sebelum diterbitkan.
                  </p>
                </div>

                {/* Ticket Pass Summary Card */}
                <div style={{
                  padding: '24px',
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, #1D1D1F 0%, #2D2D30 100%)',
                  color: '#FFFFFF',
                  boxShadow: '0 16px 36px -8px rgba(0, 0, 0, 0.25)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <span style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)', color: '#C27803', letterSpacing: '0.08em', fontWeight: 700 }}>
                        SUDUTBINGKAI • EVENT PASS
                      </span>
                      <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '2px 0 0' }}>
                        {title || 'Nama Acara Anda'}
                      </h2>
                      <span style={{ fontSize: '13px', opacity: 0.8 }}>
                        Oleh {coupleOrHost || 'Tuan Rumah'}
                      </span>
                    </div>

                    <span style={{ fontSize: '11px', background: activeTier.isFree ? '#27AE60' : '#C27803', color: '#FFF', padding: '3px 10px', borderRadius: '999px', fontWeight: 700 }}>
                      {activeTier.name.toUpperCase()}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '14px', marginBottom: '14px' }}>
                    <div>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', display: 'block' }}>KAPASITAS</span>
                      <strong style={{ fontSize: '13px' }}>{activeTier.guestsLabel}</strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', display: 'block' }}>FILTER UTAMA</span>
                      <strong style={{ fontSize: '13px' }}>{FILM_PRESETS[primaryPreset]?.name || 'Portra 400'}</strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', display: 'block' }}>LINK ACARA</span>
                      <strong style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#C27803' }}>
                        sudutbingkai.id/cam/{slug || 'acara'}
                      </strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', display: 'block' }}>REVEAL MODE</span>
                      <strong style={{ fontSize: '13px' }}>
                        {revealMode === 'instant' ? 'Tayang Instan' : 'Cuci Roll Film'}
                      </strong>
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', display: 'block' }}>FITUR UCAPAN TAMU</span>
                      <strong style={{ fontSize: '12.5px', color: wishType === 'video' ? '#F59E0B' : '#FFF' }}>
                        {wishType === 'video' ? '🎥 Video Ucapan 15s (Reels VHS) & Suara' : wishType === 'voice' ? '🎙️ Pesan Suara 15s' : 'Nonaktif'}
                      </strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '14px' }}>
                    <span style={{ fontSize: '13px', opacity: 0.85 }}>Total Biaya:</span>
                    <strong style={{ fontSize: '20px', color: activeTier.isFree ? '#27AE60' : '#FFF' }}>
                      {activeTier.isFree ? 'GRATIS (Rp 0)' : (referralDiscount?.valid ? `Rp ${referralDiscount.finalPrice.toLocaleString('id-ID')}` : activeTier.price)}
                    </strong>
                  </div>
                </div>

                {/* Host Email Input */}
                <div className="glass-card" style={{ padding: '20px', borderRadius: '18px', background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                    Email Akses Dashboard Anda *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="nama@gmail.com"
                    value={hostEmail}
                    onChange={(e) => setHostEmail(e.target.value)}
                    className="glass-input"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', fontSize: '14.5px', border: '1.5px solid rgba(0,0,0,0.1)' }}
                  />
                  <span style={{ fontSize: '11.5px', color: '#86868B', display: 'block', marginTop: '5px' }}>
                    Dipakai untuk login ke dashboard album Anda untuk melihat foto & mencetak kartu QR.
                  </span>
                </div>

                {/* Voucher / Referral Code (If Paid) */}
                {!activeTier.isFree && !isVendor && (
                  <div className="glass-card" style={{ padding: '20px', borderRadius: '18px', background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                      Punya Kode Voucher / Referral WO?
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Contoh: WO-DIMAS10"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                        className="glass-input"
                        style={{ flex: 1, padding: '12px 14px', borderRadius: '12px', fontSize: '14px', fontFamily: 'var(--font-mono)' }}
                      />
                      <button
                        type="button"
                        onClick={() => validateReferralCode()}
                        disabled={isValidatingReferral || !referralCode.trim()}
                        style={{
                          padding: '0 18px',
                          borderRadius: '12px',
                          background: '#1D1D1F',
                          color: '#FFFFFF',
                          border: 'none',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {isValidatingReferral ? 'Memeriksa...' : 'Pasang'}
                      </button>
                    </div>

                    {referralDiscount?.valid && (
                      <div style={{ marginTop: '10px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(39, 174, 96, 0.08)', border: '1px solid rgba(39, 174, 96, 0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#047857', fontWeight: 600 }}>
                          Voucher Berhasil! Diskon 10%
                        </span>
                        <strong style={{ fontSize: '13px', color: '#047857' }}>
                          Hemat Rp {referralDiscount.discountAmount.toLocaleString('id-ID')}
                        </strong>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </form>
      </main>

      {/* ============================================================== */}
      {/* STICKY BOTTOM THUMB-BAR (Apple & Invistory Mobile Flow)       */}
      {/* ============================================================== */}
      <footer style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: 'rgba(248, 247, 244, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(0, 0, 0, 0.08)',
        padding: '14px 20px'
      }}>
        <div style={{ maxWidth: currentStep === 2 ? '1040px' : '720px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', transition: 'max-width 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          
          {/* Back Button (Only for Step 2, 3, 4) */}
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={goToPrevStep}
              style={{
                padding: '12px 18px',
                borderRadius: '14px',
                background: '#FFFFFF',
                border: '1.5px solid rgba(0, 0, 0, 0.12)',
                color: '#1D1D1F',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <ArrowLeft size={16} />
              <span>Kembali</span>
            </button>
          ) : (
            <div style={{ fontSize: '12px', color: '#86868B' }}>
              <span>Langkah 1: Identitas</span>
            </div>
          )}

          {/* Forward / Submit Button */}
          {currentStep < 4 ? (
            <button
              type="button"
              onClick={goToNextStep}
              className="btn-apple-black"
              style={{
                flex: 1,
                maxWidth: '320px',
                padding: '14px 20px',
                borderRadius: '14px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>Lanjut ke {stepsList[currentStep].title}</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="btn-apple-black"
              style={{
                flex: 1,
                maxWidth: '360px',
                padding: '14px 20px',
                borderRadius: '14px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer',
                background: activeTier.isFree ? '#27AE60' : '#1D1D1F',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>
                {loading
                  ? 'Menerbitkan...'
                  : activeTier.isFree
                    ? 'Terbitkan Album Gratis'
                    : `Bayar ${referralDiscount?.valid ? `Rp ${referralDiscount.finalPrice.toLocaleString('id-ID')}` : activeTier.price}`}
              </span>
              {activeTier.isFree ? (
                <Sparkles size={16} />
              ) : (
                <ArrowRight size={16} />
              )}
            </button>
          )}

        </div>
      </footer>

      {/* Mayar Payment Modal */}
      <MayarPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSuccess={async () => {
          setPaymentModalOpen(false);
          toast.success('Pembayaran Terkonfirmasi!');

          let serverSignedToken: string | undefined;
          let serverWalletBalance: number | undefined;
          let serverTotalEarnings: number | undefined;
          if (createdDraftEventId) {
            try {
              const patchRes = await authFetch('/api/events', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: createdDraftEventId,
                  paymentStatus: 'paid',
                }),
              });
              const patchData = await patchRes.json();
              if (patchData?.sessionToken) {
                serverSignedToken = patchData.sessionToken;
              }
              if (typeof patchData?.walletBalance === 'number') {
                serverWalletBalance = patchData.walletBalance;
              }
              if (typeof patchData?.totalEarnings === 'number') {
                serverTotalEarnings = patchData.totalEarnings;
              }
            } catch (evErr) {
              console.warn('Failed to mark draft event as paid:', evErr);
            }
          }

          if (isVendor && currentUser) {
            const newBal = serverWalletBalance ?? ((currentUser.walletBalance || 0) + vendorCommissionAmount);
            const newEarnings = serverTotalEarnings ?? ((currentUser.totalEarnings || 0) + vendorCommissionAmount);
            const updatedUser: UserAccount = {
              ...currentUser,
              walletBalance: newBal,
              totalEarnings: newEarnings,
              clientCount: (currentUser.clientCount || 0) + 1
            };
            setClientSession(updatedUser, serverSignedToken);
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
        amount={pendingPaymentData?.amount || parseInt(activeTier.price.replace(/[^0-9]/g, ''), 10) || 499000}
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
