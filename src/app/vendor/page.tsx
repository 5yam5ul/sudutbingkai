'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Briefcase, Building, Plus, Users, QrCode, Camera, Download, 
  ExternalLink, ArrowRight, Check, Sliders, LogOut, 
  Upload, Image as ImageIcon, Calculator, FileText, CheckCircle2, 
  DollarSign, MessageCircle, HelpCircle, Layers, ShieldCheck, Flame, Copy, Trash2,
  CreditCard, Wallet, Share2, Video, Film, PlayCircle,
  Printer, Tv, Eye, Award, X, AlertTriangle, Calendar, MapPin, Mail, Lightbulb, Clock,
  Heart, ChevronDown, ChevronUp, Shield,
  Send, Smartphone, Megaphone, Target, CheckSquare, Zap, BookOpen, ThumbsUp, Mic
} from 'lucide-react';
import { UserAccount, VideoTestimonialSubmission, PayoutRequest, getEventRetentionInfo } from '@/lib/types';
import { getClientSession, setClientSession, clearClientSession, SYSTEM_USERS, authFetch, isSameVendorId } from '@/lib/auth';
import ConfirmModal from '@/components/ConfirmModal';
import { toast } from 'sonner';

const CURATED_PARTNERS = [
  {
    name: 'Vows & Co. Wedding Planner',
    city: 'Jakarta Selatan',
    instagram: '@vowsandco.wo',
    logoUrl: '/images/vendors/vows.jpg'
  },
  {
    name: 'Merajut Kisah Organizer',
    city: 'Bandung',
    instagram: '@merajutkisah.wo',
    logoUrl: '/images/vendors/merajut.jpg'
  },
  {
    name: 'Kirana Signature Wedding',
    city: 'Denpasar & Ubud, Bali',
    instagram: '@kiranaweddingbali',
    logoUrl: '/images/vendors/kirana.jpg'
  },
  {
    name: 'Cerita Kita Planner',
    city: 'Surabaya',
    instagram: '@ceritakitaplanner',
    logoUrl: '/images/vendors/cerita.jpg'
  },
  {
    name: 'Kinasih Wedding Organizer',
    city: 'Yogyakarta',
    instagram: '@kinasih.wo',
    logoUrl: '/images/vendors/kinasih.jpg'
  },
  {
    name: 'Lensa Cerita Cinema & Studio',
    city: 'Jakarta Pusat',
    instagram: '@lensacerita.id',
    logoUrl: '/images/vendors/lensa.jpg'
  }
];

export default function VendorPortalPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const unsavedLogoUploadRef = useRef<string | null>(null);

  const [vendor, setVendor] = useState<UserAccount>({
    id: '',
    name: '',
    email: '',
    role: 'vendor'
  });
  const [activeTab, setActiveTab] = useState<'wallet' | 'clients' | 'branding' | 'testimonials' | 'marketing'>('wallet');

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
    if (!accountNumber.trim() || !accountHolder.trim()) {
      toast.error('Silakan lengkapi Nomor Rekening dan Nama Pemilik Rekening Bank tujuan terlebih dahulu.');
      return;
    }

    setIsRequestingPayout(true);
    try {
      const vendorId = vendor.id || 'vendor_vows_co';
      const res = await authFetch('/api/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId,
          vendorEmail: vendor.email || 'vendor@sudutbingkai.id',
          vendorName: vendor.name || 'Mitra Vendor',
          companyName: companyName || vendor.name,
          amount: Number(payoutAmount),
          bankDetails: {
            bankName: bankName.trim() || 'BCA',
            accountNumber: accountNumber.trim(),
            accountHolder: accountHolder.trim()
          },
          notes: `Penarikan komisi mitra ${companyName || vendor.name}`
        })
      });

      const data = await res.json();
      if (data.success) {
        const nextBal = typeof data.walletBalance === 'number'
          ? data.walletBalance
          : Math.max(0, walletBalance - payoutAmount);
        setWalletBalance(nextBal);
        setPayoutAmount(nextBal);
        const updatedVendorSession: UserAccount = {
          ...vendor,
          walletBalance: nextBal
        };
        setVendor(updatedVendorSession);
        if (data.sessionToken) {
          setClientSession(updatedVendorSession, data.sessionToken);
        }
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

  // Partner Commission Calculator State
  const [customEvents, setCustomEvents] = useState<number>(5);
  const [customPlan, setCustomPlan] = useState<'event' | 'wedding' | 'unlimited'>('wedding');
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  // Marketing Kit Sub-Tabs & Interactive Pitch Customization
  const [marketingSubTab, setMarketingSubTab] = useState<'pitch' | 'mc' | 'battlecard' | 'checklist' | 'promokit' | 'faq'>('pitch');
  const [pitchClientName, setPitchClientName] = useState<string>('Sarah & Dimas');
  const [pitchEventDate, setPitchEventDate] = useState<string>('14 Februari 2026');
  const [checkedChecklistItems, setCheckedChecklistItems] = useState<Record<string, boolean>>({});
  const toggleChecklistItem = (key: string) => {
    setCheckedChecklistItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Vendor Clients State (Clean real data)
  const [clients, setClients] = useState<any[]>([]);

  // User session & landing view state
  const [currentSession, setCurrentSession] = useState<UserAccount | null>(null);
  const [isPartnerLanding, setIsPartnerLanding] = useState<boolean>(false);
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [regPicName, setRegPicName] = useState<string>('');
  const [regCompanyName, setRegCompanyName] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regCity, setRegCity] = useState<string>('Jakarta');
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Load existing vendor data, payouts & events if exists
  useEffect(() => {
    const session = getClientSession();
    setCurrentSession(session);
    if (session?.name) setRegPicName(session.name);

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('view') === 'landing') {
        setIsPartnerLanding(true);
      }
    }

    if (!session || (session.role !== 'vendor' && session.role !== 'admin')) {
      setIsPartnerLanding(true);
      return;
    }

    setIsPartnerLanding(false);
    setVendor(session);
    if (session.companyName) setCompanyName(session.companyName);
    else if (session.name) setCompanyName(session.name);
    if (session.instagram) setInstagram(session.instagram);
    if (session.phone) setPhone(session.phone);
    if (session.city) setCity(session.city);
    if (session.logoUrl) setLogoUrl(session.logoUrl);

    // If demo tester vendor account, populate initial fallback stats before DB refresh
    if (session.id === 'vendor_vows_co' || session.email === 'vendor@sudutbingkai.id') {
      const initialBal = typeof session.walletBalance === 'number' ? session.walletBalance : 420000;
      const initialEarn = typeof session.totalEarnings === 'number' ? session.totalEarnings : 1260000;
      setWalletBalance(initialBal);
      setTotalEarnings(initialEarn);
      setReferralCode(session.referralCode || 'VOWSANDCO');
      setBankName(session.bankDetails?.bankName || session.bankAccount?.bankName || 'BCA');
      setAccountNumber(session.bankDetails?.accountNumber || session.bankAccount?.accountNumber || '8730129841');
      setAccountHolder(session.bankDetails?.accountHolder || session.bankAccount?.accountHolder || 'Sarah Pramono');
      setPayoutAmount(initialBal);
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
      if (typeof session.walletBalance === 'number') {
        setWalletBalance(session.walletBalance);
        setPayoutAmount(session.walletBalance);
      }
      if (typeof session.totalEarnings === 'number') setTotalEarnings(session.totalEarnings);
      const bankObj = session.bankDetails || session.bankAccount;
      if (bankObj) {
        if (bankObj.bankName) setBankName(bankObj.bankName);
        if (bankObj.accountNumber) setAccountNumber(bankObj.accountNumber);
        if (bankObj.accountHolder) setAccountHolder(bankObj.accountHolder);
      }
    }

    // Refresh live vendor balance and profile from database
    authFetch('/api/vendors')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.vendors) {
          const fresh = data.vendors.find((v: any) => isSameVendorId(v.id, session.id) || (session.email && v.email === session.email));
          if (fresh) {
            setVendor((prev: any) => ({ ...prev, ...fresh }));
            if (typeof fresh.walletBalance === 'number') {
              setWalletBalance(fresh.walletBalance);
              setPayoutAmount(fresh.walletBalance);
            }
            if (typeof fresh.totalEarnings === 'number') setTotalEarnings(fresh.totalEarnings);
            if (fresh.referralCode) setReferralCode(fresh.referralCode);
            if (fresh.companyName) setCompanyName(fresh.companyName);
            if (fresh.instagram) setInstagram(fresh.instagram);
            if (fresh.phone) setPhone(fresh.phone);
            if (fresh.city) setCity(fresh.city);
            if (fresh.logoUrl) setLogoUrl(fresh.logoUrl);
            if (fresh.bankDetails) {
              if (fresh.bankDetails.bankName) setBankName(fresh.bankDetails.bankName);
              if (fresh.bankDetails.accountNumber) setAccountNumber(fresh.bankDetails.accountNumber);
              if (fresh.bankDetails.accountHolder) setAccountHolder(fresh.bankDetails.accountHolder);
            }
          }
        }
      })
      .catch(() => {});

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam === 'clients') {
        setActiveTab('clients');
      }
      if (urlParams.get('paid') === 'true') {
        toast.success('Pembayaran klien baru berhasil terkonfirmasi dan komisi telah masuk ke dompet Anda!');
      }
    }

    authFetch('/api/vendors')
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
            if (v.partnerTier) setPartnerTier(v.partnerTier);
            if (v.referralCode) setReferralCode(v.referralCode);
            if (v.walletBalance !== undefined) setWalletBalance(v.walletBalance);
            if (v.totalEarnings !== undefined) setTotalEarnings(v.totalEarnings);
            if (v.bankDetails) {
              if (v.bankDetails.bankName) setBankName(v.bankDetails.bankName);
              if (v.bankDetails.accountNumber) setAccountNumber(v.bankDetails.accountNumber);
              if (v.bankDetails.accountHolder) setAccountHolder(v.bankDetails.accountHolder);
            }
          }
        }
      })
      .catch(console.error);

    const vendorId = session?.id || '';
    if (vendorId) {
      authFetch(`/api/events?vendorId=${encodeURIComponent(vendorId)}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.events) {
            const realClients = data.events.map((ev: any) => {
              const retInfo = getEventRetentionInfo(ev.eventDate, ev.packageTier || 'wedding');
              return {
                id: ev.id,
                slug: ev.slug,
                title: ev.title,
                coupleOrHost: ev.coupleOrHost,
                hostEmail: ev.hostEmail,
                date: new Date(ev.eventDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
                rawEventDate: ev.eventDate,
                venue: ev.location || 'Lokasi Acara',
                guestCount: ev.maxGuests || 150,
                photoCount: 0,
                preset: ev.preset,
                packageTier: ev.packageTier || 'wedding',
                shotsPerGuest: ev.shotsPerGuest || 36,
                paymentStatus: ev.paymentStatus || 'paid',
                commissionAmount: ev.commissionAmount || 0,
                commissionStatus: ev.commissionStatus || 'available',
                retentionInfo: retInfo,
                status: retInfo.label
              };
            });
            setClients(realClients);

            // Sync live referral commission history from vendor's events
            const liveHistory = data.events
              .filter((ev: any) => (ev.commissionAmount && Number(ev.commissionAmount) > 0) || ev.referredByCode)
              .map((ev: any, idx: number) => {
                const tierLabel = ev.packageTier === 'unlimited'
                  ? 'Unlimited Tamu'
                  : ev.packageTier === 'wedding'
                    ? 'Wedding (300 Tamu)'
                    : ev.packageTier === 'event'
                      ? 'Event (150 Tamu)'
                      : 'Party (75 Tamu)';
                const approxPaid = ev.packageTier === 'unlimited'
                  ? 899100
                  : ev.packageTier === 'wedding'
                    ? 449100
                    : ev.packageTier === 'event'
                      ? 242100
                      : 161100;
                return {
                  id: ev.id || `ref_live_${idx}`,
                  invoiceNumber: `INV/SB/${new Date(ev.createdAt || ev.eventDate || Date.now()).getFullYear()}/${String(idx + 1).padStart(4, '0')}`,
                  clientName: ev.coupleOrHost || ev.title || 'Klien Acara',
                  tierName: tierLabel,
                  date: new Date(ev.eventDate || ev.createdAt || Date.now()).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
                  totalPaid: approxPaid,
                  commissionAmount: Number(ev.commissionAmount || 0),
                  status: ev.commissionStatus === 'withdrawn' ? 'Telah Ditarik' : 'Lunas / Cair'
                };
              });

            if (liveHistory.length > 0) {
              if (session.id === 'vendor_vows_co' || session.email === 'vendor@sudutbingkai.id') {
                setReferralHistory(prev => {
                  const existingIds = new Set(prev.map((item: any) => item.id));
                  const uniqueNew = liveHistory.filter((item: any) => !existingIds.has(item.id));
                  return [...uniqueNew, ...prev];
                });
              } else {
                setReferralHistory(liveHistory);
              }
            }
          }
        })
        .catch(console.error);

      // Fetch vendor payout history
      authFetch(`/api/payouts?vendorId=${encodeURIComponent(vendorId)}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.payouts) {
            setPayoutsList(data.payouts);
          }
        })
        .catch(console.error);

      // Fetch vendor video testimonials
      authFetch(`/api/testimonials?vendorId=${encodeURIComponent(vendorId)}`)
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
      const res = await authFetch('/api/testimonials', {
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

  const handleSwitchToHost = async () => {
    const session = getClientSession();
    const updated: UserAccount = {
      ...(session || vendor),
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
          email: updated.email,
          name: updated.name
        })
      });
      const data = await res.json();
      if (data.success && (data.token || data.sessionToken)) {
        signedToken = data.token || data.sessionToken;
      }
    } catch {}
    setClientSession(updated, signedToken);
    toast.success('Beralih ke Dashboard Acara Host.');
    router.push('/dashboard');
  };

  const handleExplicitRegisterVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regCompanyName.trim()) {
      toast.error('Silakan masukkan nama agensi Wedding Organizer Anda.');
      return;
    }

    setIsRegistering(true);
    try {
      const email = currentSession?.email || vendor.email || '';
      const name = regPicName.trim() || currentSession?.name || vendor.name || 'Mitra WO';
      const cleanCompany = regCompanyName.trim();
      const generatedRef = cleanCompany.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) || `WO${Date.now().toString().slice(-4)}`;

      const res = await authFetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          companyName: cleanCompany,
          email,
          phone: regPhone.trim(),
          city: regCity.trim() || 'Jakarta',
          referralCode: generatedRef,
          partnerTier: 'regular',
          tier: 'starter',
          commissionRate: 0.12
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Gagal mendaftarkan agensi.');
      }

      const resolvedRefCode = data.vendor?.referralCode || generatedRef;
      const newVendorSession: UserAccount = {
        id: data.vendor?.id || `vendor_${Date.now()}`,
        name,
        companyName: cleanCompany,
        email,
        role: 'vendor',
        phone: regPhone.trim(),
        city: regCity.trim() || 'Jakarta',
        partnerTier: 'regular',
        referralCode: resolvedRefCode,
        walletBalance: 0,
        totalEarnings: 0
      };

      setReferralCode(resolvedRefCode);
      setClientSession(newVendorSession, data.sessionToken);
      setVendor(newVendorSession);
      setCompanyName(cleanCompany);
      setCurrentSession(newVendorSession);
      setIsPartnerLanding(false);
      setShowRegisterModal(false);
      toast.success(`Selamat datang di Kemitraan SudutBingkai, ${cleanCompany}! Portal kemitraan Anda telah aktif.`);
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat pendaftaran.');
    } finally {
      setIsRegistering(false);
    }
  };

  const cleanupUnsavedLogo = React.useCallback(() => {
    const pendingUrl = unsavedLogoUploadRef.current;
    if (pendingUrl) {
      unsavedLogoUploadRef.current = null;
      authFetch(`/api/upload?url=${encodeURIComponent(pendingUrl)}`, {
        method: 'DELETE',
        keepalive: true,
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      cleanupUnsavedLogo();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      cleanupUnsavedLogo();
    };
  }, [cleanupUnsavedLogo]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'logo');
      if (unsavedLogoUploadRef.current) {
        formData.append('oldUrl', unsavedLogoUploadRef.current);
      }
      const res = await authFetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success && data.url) {
        unsavedLogoUploadRef.current = data.url;
        setLogoUrl(data.url);
        toast.success('Logo agensi berhasil diunggah!');
        return;
      }
    } catch {}

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
          const res = await authFetch(`/api/events?id=${clientId}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success && data.sessionToken) {
            const updatedVendor: UserAccount = {
              ...vendor,
              walletBalance: data.walletBalance !== undefined ? data.walletBalance : vendor.walletBalance,
              totalEarnings: data.totalEarnings !== undefined ? data.totalEarnings : vendor.totalEarnings,
            };
            setVendor(updatedVendor);
            setClientSession(updatedVendor, data.sessionToken);
          }
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
      const res = await authFetch('/api/vendors', {
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
          bankDetails: {
            bankName: bankName.trim() || 'BCA',
            accountNumber: accountNumber.trim(),
            accountHolder: accountHolder.trim() || companyName || vendor.name
          },
          tier: vendor.tier || 'Agency Pro'
        })
      });

      const data = await res.json();
      if (data.success) {
        unsavedLogoUploadRef.current = null;
        setIsBrandingSaved(true);
        const updated: UserAccount = { 
          ...vendor, 
          companyName: companyName || vendor.name, 
          name: companyName || vendor.name, 
          phone, 
          instagram, 
          city, 
          logoUrl: data.vendor?.logoUrl || logoUrl,
          bankAccount: {
            bankName: bankName.trim() || 'BCA',
            accountNumber: accountNumber.trim(),
            accountHolder: accountHolder.trim() || companyName || vendor.name
          }
        };
        setVendor(updated);
        setClientSession(updated, data.sessionToken);
        toast.success('Pengaturan profil, rekening bank, dan identitas agensi berhasil diperbarui!');
        setTimeout(() => setIsBrandingSaved(false), 3500);
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan profil vendor.');
    } finally {
      setIsSaving(false);
    }
  };

  // Partner Commission Calculator Mathematics
  const planDetails = {
    event: { name: 'Paket Event (150 Tamu)', basePrice: 269000 },
    wedding: { name: 'Paket Wedding (300 Tamu)', basePrice: 499000 },
    unlimited: { name: 'Paket Unlimited Tamu', basePrice: 999000 }
  };

  const currentPlanInfo = planDetails[customPlan];
  const normalTotalPrice = customEvents * currentPlanInfo.basePrice;
  const commissionRatePercent = customEvents >= 10 ? 20 : 15;
  const partnerTierName = customEvents >= 10 ? 'Mitra Elite (20%)' : 'Mitra Pro (15%)';
  const commissionEarned = Math.round(normalTotalPrice * (commissionRatePercent / 100));
  const commissionPerEvent = customEvents > 0 ? Math.round(commissionEarned / customEvents) : 0;

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
      {isPartnerLanding ? (
        /* PARTNER PROGRAM LANDING PAGE VIEW */
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          {/* Landing Header Navigation */}
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
                  PROGRAM KEMITRAAN WO
                </span>
              </div>

              {/* Navigation Anchors */}
              <div className="desktop-only" style={{ display: 'flex', gap: '24px', fontSize: '13px', color: '#515154' }}>
                <a href="#keuntungan" style={{ color: 'inherit', textDecoration: 'none' }}>Keuntungan</a>
                <a href="#simulasi" style={{ color: 'inherit', textDecoration: 'none' }}>Simulasi Komisi</a>
                <a href="#cara-kerja" style={{ color: 'inherit', textDecoration: 'none' }}>Cara Kerja</a>
                <a href="#faq" style={{ color: 'inherit', textDecoration: 'none' }}>FAQ</a>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {currentSession?.role === 'host' ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="btn-apple-black"
                      style={{
                        padding: '8px 16px',
                        fontSize: '12.5px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        textDecoration: 'none'
                      }}
                    >
                      <Heart size={13} color="#FFFFFF" />
                      <span>Dashboard Acara</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setShowRegisterModal(true)}
                      className="glass-pill"
                      style={{
                        padding: '8px 14px',
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        color: '#C27803',
                        background: 'rgba(194, 120, 3, 0.08)',
                        border: '1px solid rgba(194, 120, 3, 0.3)'
                      }}
                    >
                      Daftar Mitra WO
                    </button>
                  </>
                ) : currentSession?.role === 'vendor' ? (
                  <button
                    type="button"
                    onClick={() => setIsPartnerLanding(false)}
                    className="btn-apple-black"
                    style={{ padding: '8px 16px', fontSize: '12.5px', cursor: 'pointer' }}
                  >
                    Buka Dashboard Vendor
                  </button>
                ) : (
                  <>
                    <Link
                      href="/login?role=vendor&mode=login"
                      className="glass-pill"
                      style={{ padding: '8px 14px', fontSize: '12.5px', textDecoration: 'none', color: '#1D1D1F' }}
                    >
                      Masuk Portal Mitra
                    </Link>
                    <Link
                      href="/login?role=vendor&mode=register"
                      className="btn-apple-black"
                      style={{ padding: '8px 16px', fontSize: '12.5px', textDecoration: 'none' }}
                    >
                      Daftar Menjadi Mitra
                    </Link>
                  </>
                )}
              </div>
            </div>
          </header>

          <main style={{ flex: 1, padding: '40px 20px 80px', maxWidth: '1120px', margin: '0 auto', width: '100%' }}>
            {/* Host Alert Banner */}
            {currentSession?.role === 'host' && (
              <div className="glass-card" style={{
                padding: '16px 20px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(194, 120, 3, 0.1) 0%, rgba(255, 255, 255, 0.95) 100%)',
                border: '1.5px solid rgba(194, 120, 3, 0.35)',
                marginBottom: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(194, 120, 3, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#C27803',
                    flexShrink: 0
                  }}>
                    <Calendar size={18} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '14px', color: '#1D1D1F', display: 'block' }}>
                      Halo, {currentSession.name || 'Penyelenggara Acara'}! Anda saat ini masuk sebagai Host (Penyelenggara Acara).
                    </strong>
                    <span style={{ fontSize: '12.5px', color: '#6E6E73' }}>
                      Ini adalah halaman informasi Program Kemitraan Agensi & Event Planner. Seluruh album dan data acara Anda tetap aman.
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Link
                    href="/dashboard"
                    className="btn-apple-black"
                    style={{ padding: '8px 14px', fontSize: '12px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span>Dashboard Acara Saya</span>
                    <ArrowRight size={13} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowRegisterModal(true)}
                    className="glass-pill"
                    style={{ padding: '8px 14px', fontSize: '12px', cursor: 'pointer', color: '#C27803', fontWeight: 600, border: '1px solid rgba(194, 120, 3, 0.3)' }}
                  >
                    Daftar Jadi Mitra
                  </button>
                </div>
              </div>
            )}

            {/* Landing Hero */}
            <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 60px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '999px',
                background: 'rgba(194, 120, 3, 0.1)',
                color: '#C27803',
                fontSize: '11.5px',
                fontWeight: 600,
                marginBottom: '16px',
                letterSpacing: '0.04em'
              }}>
                <Building size={13} />
                <span>PROGRAM KEMITRAAN RESMI WO & EVENT PLANNER</span>
              </div>

              <h1 className="font-display-serif" style={{ fontSize: 'clamp(2rem, 4.5vw, 3rem)', fontWeight: 700, color: '#1D1D1F', lineHeight: 1.2, marginBottom: '18px' }}>
                Beri Nilai Tambah Eksklusif untuk Klien dengan Pengalaman Foto Analog Tamu
              </h1>

              <p style={{ color: '#6E6E73', fontSize: '15.5px', lineHeight: 1.6, margin: '0 auto 28px', maxWidth: '680px' }}>
                Solusi kamera sekali pakai digital untuk hari pernikahan: tanpa instalasi aplikasi di HP tamu, tanpa modal kamera fisik, dan tanpa beban kru operasional di lokasi. Dapatkan komisi pasif hingga 20% per acara klien, 100% tanpa modal, dan tanpa beli kuota.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '36px' }}>
                {currentSession?.role === 'host' ? (
                  <button
                    type="button"
                    onClick={() => setShowRegisterModal(true)}
                    className="btn-apple-black"
                    style={{ padding: '13px 28px', fontSize: '14px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                  >
                    <span>Daftarkan Agensi WO Anda</span>
                    <ArrowRight size={15} />
                  </button>
                ) : (
                  <Link
                    href="/login?role=vendor&mode=register"
                    className="btn-apple-black"
                    style={{ padding: '13px 28px', fontSize: '14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                  >
                    <span>Daftar Kemitraan Gratis</span>
                    <ArrowRight size={15} />
                  </Link>
                )}

                <a
                  href="#simulasi"
                  className="glass-pill"
                  style={{ padding: '13px 24px', fontSize: '14px', textDecoration: 'none', color: '#1D1D1F', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <Calculator size={15} color="#C27803" />
                  <span>Simulasi Potensi Komisi</span>
                </a>
              </div>

              {/* 4 Feature Badges */}
              <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <span className="glass-pill" style={{ padding: '6px 14px', fontSize: '12px', color: '#515154' }}>
                  <DollarSign size={13} color="#C27803" /> Komisi 15% - 20% Dicairkan Cepat
                </span>
                <span className="glass-pill" style={{ padding: '6px 14px', fontSize: '12px', color: '#515154' }}>
                  <Award size={13} color="#C27803" /> Tanpa Modal & Tanpa Kuota
                </span>
                <span className="glass-pill" style={{ padding: '6px 14px', fontSize: '12px', color: '#515154' }}>
                  <Camera size={13} color="#C27803" /> Branding Logo WO di Kamera Tamu
                </span>
                <span className="glass-pill" style={{ padding: '6px 14px', fontSize: '12px', color: '#515154' }}>
                  <ShieldCheck size={13} color="#C27803" /> 0 Aplikasi untuk Tamu Undangan
                </span>
              </div>
            </div>

            {/* 4 Core Pillars Grid */}
            <div id="keuntungan" style={{ marginBottom: '64px', scrollMarginTop: '80px' }}>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '8px' }}>
                  KEUNTUNGAN MITRA
                </span>
                <h2 className="font-display-serif" style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.3rem)', fontWeight: 700, color: '#1D1D1F' }}>
                  Mengapa Wedding Organizer Memilih SudutBingkai?
                </h2>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '20px'
              }}>
                <div className="glass-card" style={{ padding: '24px', borderRadius: '20px', background: 'rgba(255, 255, 255, 0.88)' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(194, 120, 3, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C27803', marginBottom: '16px' }}>
                    <DollarSign size={20} />
                  </div>
                  <strong style={{ fontSize: '16px', color: '#1D1D1F', display: 'block', marginBottom: '8px' }}>
                    Penghasilan Tambahan (Komisi Pasif)
                  </strong>
                  <p style={{ fontSize: '13px', color: '#6E6E73', lineHeight: 1.55, margin: 0 }}>
                    Raih komisi 15% - 20% untuk setiap klien acara (pernikahan, ulang tahun, gathering, reuni, dll.) yang memesan paket melalui tautan referral atau kode promo agensi Anda. Komisi masuk otomatis ke dompet digital mitra.
                  </p>
                </div>

                <div className="glass-card" style={{ padding: '24px', borderRadius: '20px', background: 'rgba(255, 255, 255, 0.88)' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(194, 120, 3, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C27803', marginBottom: '16px' }}>
                    <ShieldCheck size={20} />
                  </div>
                  <strong style={{ fontSize: '16px', color: '#1D1D1F', display: 'block', marginBottom: '8px' }}>
                    100% Tanpa Modal & Tanpa Kuota
                  </strong>
                  <p style={{ fontSize: '13px', color: '#6E6E73', lineHeight: 1.55, margin: 0 }}>
                    Tidak perlu menyetok kuota voucher atau menanggung risiko modal. Cukup rekomendasikan kode promo unik Anda kepada klien acara. Komisi 15%–20% otomatis masuk ke dompet digital Anda.
                  </p>
                </div>

                <div className="glass-card" style={{ padding: '24px', borderRadius: '20px', background: 'rgba(255, 255, 255, 0.88)' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(194, 120, 3, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C27803', marginBottom: '16px' }}>
                    <Award size={20} />
                  </div>
                  <strong style={{ fontSize: '16px', color: '#1D1D1F', display: 'block', marginBottom: '8px' }}>
                    Identitas & Branding Agensi Anda
                  </strong>
                  <p style={{ fontSize: '13px', color: '#6E6E73', lineHeight: 1.55, margin: 0 }}>
                    Logo dan nama agensi Event Planner / Wedding Organizer Anda tampil elegan di template barcode cetak meja dan antarmuka kamera web tamu, memperkuat citra profesional agensi Anda di hadapan ratusan tamu undangan.
                  </p>
                </div>

                <div className="glass-card" style={{ padding: '24px', borderRadius: '20px', background: 'rgba(255, 255, 255, 0.88)' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(194, 120, 3, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C27803', marginBottom: '16px' }}>
                    <Camera size={20} />
                  </div>
                  <strong style={{ fontSize: '16px', color: '#1D1D1F', display: 'block', marginBottom: '8px' }}>
                    100% Bebas Ribet di Hari-H
                  </strong>
                  <p style={{ fontSize: '13px', color: '#6E6E73', lineHeight: 1.55, margin: 0 }}>
                    Tamu memotret langsung lewat kamera browser ponsel tanpa instal aplikasi apa pun. Anda tidak perlu menyewa alat kamera tambahan ataupun menugaskan kru khusus di venue acara.
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive Commission Calculator */}
            <div id="simulasi" className="glass-card" style={{ padding: '36px', borderRadius: '24px', marginBottom: '64px', scrollMarginTop: '80px', background: 'rgba(255, 255, 255, 0.92)', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 12px 36px rgba(0,0,0,0.04)' }}>
              <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 28px' }}>
                <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '8px' }}>
                  KALKULATOR POTENSI KOMISI
                </span>
                <h3 className="font-display-serif" style={{ fontSize: '26px', fontWeight: 700, color: '#1D1D1F', margin: '0 0 8px' }}>
                  Simulasi Komisi Pasif Mitra Acara
                </h3>
                <p style={{ fontSize: '13.5px', color: '#6E6E73', margin: 0 }}>
                  Pilih estimasi jumlah acara klien (Pernikahan, Ulang Tahun, Gathering, Reuni, dll.) yang Anda tangani untuk melihat potensi pendapatan bersih Anda.
                </p>
              </div>

              {/* Calculator Controls */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '28px', alignItems: 'center' }}>
                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#1D1D1F', display: 'block', marginBottom: '8px' }}>
                    Jumlah Acara Klien Agensi / Mitra Anda:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '20px' }}>
                    {[3, 5, 10, 20].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setCustomEvents(num)}
                        style={{
                          padding: '10px 6px',
                          borderRadius: '12px',
                          border: customEvents === num ? '2px solid #C27803' : '1px solid rgba(0,0,0,0.1)',
                          background: customEvents === num ? 'rgba(194, 120, 3, 0.08)' : '#FFFFFF',
                          color: customEvents === num ? '#C27803' : '#1D1D1F',
                          fontWeight: 700,
                          fontSize: '13px',
                          cursor: 'pointer'
                        }}
                      >
                        {num} Acara
                      </button>
                    ))}
                  </div>

                  <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#1D1D1F', display: 'block', marginBottom: '8px' }}>
                    Tipe Paket Acara Rekomendasi:
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { id: 'event', label: 'Paket Event (150 Tamu)', price: 'Rp 269.000' },
                      { id: 'wedding', label: 'Paket Wedding (300 Tamu)', price: 'Rp 499.000' },
                      { id: 'unlimited', label: 'Paket Unlimited Tamu', price: 'Rp 999.000' }
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setCustomPlan(p.id as any)}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '12px',
                          border: customPlan === p.id ? '2px solid #C27803' : '1px solid rgba(0,0,0,0.08)',
                          background: customPlan === p.id ? 'rgba(194, 120, 3, 0.05)' : '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <span style={{ fontSize: '13px', fontWeight: customPlan === p.id ? 700 : 500, color: '#1D1D1F' }}>{p.label}</span>
                        <span style={{ fontSize: '12px', color: '#86868B' }}>{p.price} / acara</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Calculation Summary Card */}
                <div style={{ background: '#FBFBFA', borderRadius: '18px', padding: '24px', border: '1px solid rgba(0,0,0,0.07)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px', color: '#6E6E73' }}>
                    <span>Nilai Transaksi Klien ({customEvents} Acara):</span>
                    <span style={{ fontWeight: 600, color: '#1D1D1F' }}>Rp {formatRp(normalTotalPrice)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', fontSize: '13px', color: '#C27803', fontWeight: 600 }}>
                    <span>Tingkat Komisi Agensi:</span>
                    <span>{partnerTierName}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', fontSize: '12.5px', color: '#10B981', fontWeight: 600 }}>
                    <span>Modal & Risiko Mitra:</span>
                    <span>Rp 0 (100% Bebas Risiko)</span>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '14px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#1D1D1F' }}>Potensi Komisi Bersih:</span>
                      <strong style={{ fontSize: '24px', fontWeight: 800, color: '#10B981' }}>
                        Rp {formatRp(commissionEarned)}
                      </strong>
                    </div>
                    <span style={{ fontSize: '11.5px', color: '#86868B', display: 'block', marginTop: '4px' }}>
                      Rata-rata Rp {formatRp(commissionPerEvent)} per acara • Otomatis masuk dompet digital & siap ditarik ke bank
                    </span>
                  </div>

                  {currentSession?.role === 'host' ? (
                    <button
                      type="button"
                      onClick={() => setShowRegisterModal(true)}
                      className="btn-apple-black"
                      style={{ width: '100%', padding: '12px', fontSize: '13.5px', cursor: 'pointer', textAlign: 'center', borderRadius: '12px' }}
                    >
                      Daftar Jadi Mitra untuk Klaim Komisi Ini
                    </button>
                  ) : (
                    <Link
                      href="/login?role=vendor&mode=register"
                      className="btn-apple-black"
                      style={{ width: '100%', padding: '12px', fontSize: '13.5px', textDecoration: 'none', display: 'block', textAlign: 'center', borderRadius: '12px' }}
                    >
                      Daftar Jadi Mitra untuk Klaim Komisi
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Cara Kerja 3 Langkah */}
            <div id="cara-kerja" style={{ marginBottom: '64px', scrollMarginTop: '80px' }}>
              <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '8px' }}>
                  ALUR KERJA MUDAH
                </span>
                <h2 className="font-display-serif" style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.3rem)', fontWeight: 700, color: '#1D1D1F' }}>
                  3 Langkah Memulai Kemitraan Agensi
                </h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
                <div className="glass-card" style={{ padding: '24px', borderRadius: '20px', background: 'rgba(255, 255, 255, 0.88)' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#1D1D1F', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px', marginBottom: '14px' }}>
                    1
                  </div>
                  <strong style={{ fontSize: '16px', color: '#1D1D1F', display: 'block', marginBottom: '6px' }}>
                    Daftar Agensi Anda
                  </strong>
                  <p style={{ fontSize: '13px', color: '#6E6E73', lineHeight: 1.5, margin: 0 }}>
                    Buat akun mitra resmi dalam 1 menit tanpa dipungut biaya. Anda langsung mendapatkan kode promo referral dan akses ke portal mitra.
                  </p>
                </div>

                <div className="glass-card" style={{ padding: '24px', borderRadius: '20px', background: 'rgba(255, 255, 255, 0.88)' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#1D1D1F', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px', marginBottom: '14px' }}>
                    2
                  </div>
                  <strong style={{ fontSize: '16px', color: '#1D1D1F', display: 'block', marginBottom: '6px' }}>
                    Tawarkan ke Klien Acara
                  </strong>
                  <p style={{ fontSize: '13px', color: '#6E6E73', lineHeight: 1.5, margin: 0 }}>
                    Sertakan fitur kamera tamu analog ini sebagai nilai tambah paket layanan EO/WO Anda atau bagikan tautan referral Anda kepada klien.
                  </p>
                </div>

                <div className="glass-card" style={{ padding: '24px', borderRadius: '20px', background: 'rgba(255, 255, 255, 0.88)' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#1D1D1F', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px', marginBottom: '14px' }}>
                    3
                  </div>
                  <strong style={{ fontSize: '16px', color: '#1D1D1F', display: 'block', marginBottom: '6px' }}>
                    Pantau & Cairkan Komisi
                  </strong>
                  <p style={{ fontSize: '13px', color: '#6E6E73', lineHeight: 1.5, margin: 0 }}>
                    Setiap pembayaran klien otomatis tercatat transparan. Anda dapat menarik saldo komisi langsung ke rekening bank lokal Anda kapan saja.
                  </p>
                </div>
              </div>
            </div>

            {/* Verified Partners Marquee */}
            <div style={{ marginBottom: '64px' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Dipercaya oleh Puluhan Wedding Organizer & Event Planner di Seluruh Indonesia
                </span>
              </div>
              <div className="vendor-marquee-container">
                <div className="vendor-marquee-track">
                  {[...CURATED_PARTNERS, ...CURATED_PARTNERS].map((p, idx) => (
                    <div
                      key={`${p.name}-${idx}`}
                      className="glass-card"
                      style={{
                        borderRadius: '16px',
                        padding: '10px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        background: 'rgba(255, 255, 255, 0.94)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                        border: '1px solid rgba(0,0,0,0.06)',
                        flexShrink: 0,
                        minWidth: '260px'
                      }}
                    >
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        border: '1px solid rgba(0, 0, 0, 0.08)',
                        background: '#FFFFFF',
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {p.logoUrl ? (
                          <img
                            src={p.logoUrl}
                            alt={p.name}
                            width={38}
                            height={38}
                            loading="lazy"
                            decoding="async"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <Building size={16} color="#C27803" />
                        )}
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <strong style={{ fontSize: '13px', color: '#1D1D1F', display: 'block', whiteSpace: 'nowrap' }}>{p.name}</strong>
                        <span style={{ fontSize: '11px', color: '#86868B', whiteSpace: 'nowrap' }}>{p.city} • {p.instagram}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* FAQ Kemitraan */}
            <div id="faq" style={{ maxWidth: '780px', margin: '0 auto 64px', scrollMarginTop: '80px' }}>
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '8px' }}>
                  TANYA JAWAB
                </span>
                <h2 className="font-display-serif" style={{ fontSize: '26px', fontWeight: 700, color: '#1D1D1F' }}>
                  Pertanyaan Seputar Program Kemitraan
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  {
                    q: 'Apakah pendaftaran Mitra Vendor dipungut biaya?',
                    a: 'Pendaftaran kemitraan 100% gratis. Tidak ada biaya pendaftaran, biaya keanggotaan bulanan, ataupun target minimum acara.'
                  },
                  {
                    q: 'Kapan dan bagaimana komisi dapat dicairkan?',
                    a: 'Komisi 15% - 20% otomatis masuk ke saldo dompet mitra Anda segera setelah klien menyelesaikan transaksi. Anda dapat mencairkan saldo kapan saja setelah mencapai batas minimum penarikan Rp 100.000 ke seluruh rekening bank di Indonesia.'
                  },
                  {
                    q: 'Apakah saya wajib membeli kuota atau deposit modal terlebih dahulu?',
                    a: 'Sama sekali tidak! Program kemitraan ini 100% tanpa modal awal dan tanpa beban beli kuota grosir. Anda cukup merekomendasikan kode promo unik Anda kepada klien acara Anda. Setiap transaksi berhasil, komisi 15%–20% langsung otomatis masuk ke saldo dompet mitra Anda dan siap ditarik ke rekening bank Anda.'
                  },
                  {
                    q: 'Bagaimana jika saya penyelenggara acara biasa / tuan rumah dan tidak sengaja membuka halaman ini?',
                    a: 'Tidak perlu khawatir! Akun dan seluruh data galeri acara Anda (pernikahan, ulang tahun, gathering, dll.) tetap aman di sistem kami. Cukup klik tombol "Dashboard Acara Saya" di atas untuk kembali mengelola acara Anda.'
                  }
                ].map((item, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div
                      key={idx}
                      className="glass-card"
                      style={{
                        borderRadius: '16px',
                        overflow: 'hidden',
                        background: 'rgba(255, 255, 255, 0.88)',
                        border: '1px solid rgba(0,0,0,0.06)'
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        style={{
                          width: '100%',
                          padding: '16px 20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#1D1D1F'
                        }}
                      >
                        <span>{item.q}</span>
                        {isOpen ? <ChevronUp size={16} color="#86868B" /> : <ChevronDown size={16} color="#86868B" />}
                      </button>
                      {isOpen && (
                        <div style={{ padding: '0 20px 16px', fontSize: '13px', color: '#6E6E73', lineHeight: 1.55 }}>
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom CTA Banner */}
            <div style={{
              background: 'linear-gradient(135deg, #181715 0%, #232220 100%)',
              color: '#FFFFFF',
              borderRadius: '24px',
              padding: '44px 28px',
              textAlign: 'center',
              boxShadow: '0 20px 48px rgba(0,0,0,0.18)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Subtle Ambient Gold Aura */}
              <div style={{
                position: 'absolute',
                top: '-50%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '380px',
                height: '240px',
                background: 'radial-gradient(circle, rgba(194, 120, 3, 0.22) 0%, transparent 70%)',
                pointerEvents: 'none'
              }} />

              <h3 className="font-display-serif" style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.1rem)', fontWeight: 700, marginBottom: '12px', color: '#FFFFFF', position: 'relative', zIndex: 1 }}>
                Siap Memberikan Nilai Tambah Eksklusif untuk Klien Anda?
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: '14.5px', maxWidth: '580px', margin: '0 auto 26px', lineHeight: 1.6, position: 'relative', zIndex: 1 }}>
                Bergabunglah bersama puluhan Wedding Organizer & Event Planner di seluruh Indonesia. Nikmati komisi pasif hingga 20% dan kemudahan operasional foto candid tamu tanpa ribet.
              </p>
              <div style={{ position: 'relative', zIndex: 1 }}>
                {currentSession?.role === 'host' ? (
                  <button
                    type="button"
                    onClick={() => setShowRegisterModal(true)}
                    style={{
                      padding: '13px 32px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #C27803 0%, #9A5E02 100%)',
                      color: '#FFFFFF',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '14px',
                      cursor: 'pointer',
                      boxShadow: '0 8px 24px rgba(194, 120, 3, 0.4)'
                    }}
                  >
                    Daftar Sebagai Mitra Sekarang
                  </button>
                ) : (
                  <Link
                    href="/login?role=vendor&mode=register"
                    style={{
                      padding: '13px 32px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #C27803 0%, #9A5E02 100%)',
                      color: '#FFFFFF',
                      textDecoration: 'none',
                      fontWeight: 700,
                      fontSize: '14px',
                      display: 'inline-block',
                      boxShadow: '0 8px 24px rgba(194, 120, 3, 0.4)'
                    }}
                  >
                    Daftar Kemitraan Gratis Sekarang
                  </Link>
                )}
              </div>
            </div>
          </main>
        </div>
      ) : (
        /* VENDOR PORTAL DASHBOARD VIEW */
        <>
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleSwitchToHost}
                  className="glass-pill"
                  style={{
                    padding: '8px 14px',
                    fontSize: '12.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    background: 'rgba(194, 120, 3, 0.08)',
                    border: '1px solid rgba(194, 120, 3, 0.25)',
                    color: '#C27803',
                    fontWeight: 600
                  }}
                  title="Beralih ke Dashboard Acara Host"
                >
                  <Calendar size={13} />
                  <span>Mode Host / Acara</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPartnerLanding(true)}
                  className="glass-pill desktop-only"
                  style={{ padding: '8px 14px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                  title="Lihat Halaman Info Program Kemitraan"
                >
                  <Building size={13} />
                  <span>Info Program</span>
                </button>

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
              <span className="font-mono-film" style={{ color: '#86868B', display: 'block', marginBottom: '4px' }}>TOTAL ACARA KLIEN</span>
              <strong style={{ fontSize: '20px', color: '#1D1D1F' }}>{clients.length} Acara Terdaftar</strong>
            </div>

            <div>
              <span className="font-mono-film" style={{ color: '#86868B', display: 'block', marginBottom: '4px' }}>LEVEL KEMITRAAN</span>
              <strong style={{ fontSize: '20px', color: '#C27803', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Award size={18} /> Mitra Pro (15%)
              </strong>
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
                    <strong style={{ fontSize: '14px', color: '#C27803', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                      <Award size={15} /> {partnerTier === 'vip' ? 'Mitra VIP (20%)' : partnerTier === 'regular' ? 'Mitra Regular (12%)' : 'Mitra Pro (15%)'}
                    </strong>
                  </div>
                  <div style={{ background: '#FFFFFF', padding: '12px 18px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#86868B', display: 'block' }}>
                      {partnerTier === 'vip' ? 'Status Kemitraan Tertinggi' : 'Syarat Naik Level VIP (20%)'}
                    </span>
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
                    <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '3px 10px', borderRadius: '999px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={12} strokeWidth={2.5} /> Siap Dicairkan
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
                              <span style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#059669', fontSize: '11.5px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Check size={12} strokeWidth={2.5} /> Berhasil Ditransfer
                              </span>
                            ) : p.status === 'rejected' ? (
                              <span style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#DC2626', fontSize: '11.5px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <X size={12} strokeWidth={2.5} /> Ditolak
                              </span>
                            ) : (
                              <span style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#D97706', fontSize: '11.5px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={12} /> Menunggu Transfer Admin
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
                  <Flame size={13} />
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
                      <span className="font-mono-film" style={{ fontSize: '13px', fontWeight: 700, color: testiDuration >= 60 ? '#10B981' : '#EF4444', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span>{testiDuration} Detik</span>
                        {testiDuration >= 60 ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Check size={13} strokeWidth={2.5} /> (Memenuhi Syarat)</span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><AlertTriangle size={13} /> (Min. 60s)</span>
                        )}
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
                            <span style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#059669', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Check size={11} strokeWidth={2.5} /> Disetujui (+Rp 50.000)
                            </span>
                          ) : t.status === 'rejected' ? (
                            <span style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#DC2626', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <X size={11} strokeWidth={2.5} /> Perlu Revisi
                            </span>
                          ) : (
                            <span style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#D97706', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={11} /> Menunggu Kurasi
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
                    Format PNG transparan atau JPG persegi (rekomendasi 500x500px, tanpa batas ukuran file).
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

              {/* Rekening Bank Tujuan Pencairan Komisi */}
              <div style={{
                background: 'rgba(194, 120, 3, 0.04)',
                border: '1px solid rgba(194, 120, 3, 0.16)',
                borderRadius: '16px',
                padding: '20px'
              }}>
                <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '12px' }}>
                  REKENING BANK PENCAIRAN KOMISI (BI-FAST)
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                      Nama Bank
                    </label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="Contoh: BCA / Mandiri / BRI"
                      className="glass-input"
                      style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', fontSize: '13.5px', background: '#FFFFFF' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                      Nomor Rekening
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="Contoh: 8730129841"
                      className="glass-input"
                      style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', fontSize: '13.5px', background: '#FFFFFF' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                      Nama Pemilik Rekening
                    </label>
                    <input
                      type="text"
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value)}
                      placeholder="Sesuai buku tabungan"
                      className="glass-input"
                      style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', fontSize: '13.5px', background: '#FFFFFF' }}
                    />
                  </div>
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
                style={{ padding: '14px', fontSize: '14.5px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                {isBrandingSaved && <Check size={16} />}
                <span>{isSaving ? 'Menyimpan & Menayangkan...' : isBrandingSaved ? 'Tersimpan & Tayang di Homepage!' : 'Simpan & Tayangkan Logo ke Homepage'}</span>
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
                  <div style={{ flex: '1 1 320px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1D1D1F', margin: 0 }}>{c.title}</h3>
                      
                      {/* Package Tier Badge */}
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        background: '#C27803',
                        color: '#FFFFFF',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}>
                        {c.packageTier || 'WEDDING'}
                      </span>

                      {/* Commission Badge if applicable */}
                      {c.commissionAmount > 0 && (
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          background: 'rgba(39, 174, 96, 0.12)',
                          color: '#27AE60',
                          border: '1px solid rgba(39, 174, 96, 0.25)'
                        }}>
                          +Rp {c.commissionAmount.toLocaleString('id-ID')} Komisi
                        </span>
                      )}

                      {/* Status Badge */}
                      <span style={{
                        padding: '3px 9px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: c.retentionInfo?.badgeBg || (c.status === 'Aktif' ? 'rgba(46, 204, 113, 0.12)' : 'rgba(0,0,0,0.06)'),
                        color: c.retentionInfo?.badgeColor || (c.status === 'Aktif' ? '#27AE60' : '#86868B'),
                        border: `1px solid ${c.retentionInfo?.badgeColor || '#86868B'}33`
                      }}>
                        {c.retentionInfo?.label || c.status}
                      </span>

                      {c.paymentStatus === 'pending' && (
                        <span style={{
                          padding: '3px 9px',
                          borderRadius: '6px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          background: 'rgba(217, 119, 6, 0.14)',
                          color: '#D97706',
                          border: '1px solid rgba(217, 119, 6, 0.35)'
                        }}>
                          MENUNGGU PEMBAYARAN
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#6E6E73', margin: '0 0 6px', flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={13} color="#86868B" />
                        <span>{c.date}</span>
                      </span>
                      <span>•</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={13} color="#86868B" />
                        <span>{c.venue}</span>
                      </span>
                      {c.hostEmail && (
                        <>
                          <span>•</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Mail size={13} color="#86868B" />
                            <span>{c.hostEmail}</span>
                          </span>
                        </>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: '#515154', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Film size={13} color="#C27803" />
                        <span>Preset: <strong>{c.preset}</strong></span>
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={13} color="#C27803" />
                        <span>Kapasitas: <strong>{c.guestCount} Undangan</strong></span>
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Camera size={13} color="#C27803" />
                        <span>Jatah: <strong>{c.shotsPerGuest || 36} Foto/Tamu</strong></span>
                      </span>
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {c.paymentStatus === 'pending' && (
                      <Link
                        href={`/invoice/inv_${c.id}`}
                        className="btn-apple-black"
                        style={{
                          padding: '8px 14px',
                          fontSize: '12.5px',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: '#C27803',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          border: 'none'
                        }}
                      >
                        <CreditCard size={13} />
                        <span>Lunasi Tagihan</span>
                      </Link>
                    )}

                    {/* Setting Album Host Dashboard */}
                    <Link
                      href={`/dashboard?eventId=${c.slug || c.id}`}
                      className="glass-pill"
                      style={{
                        padding: '8px 14px',
                        fontSize: '12.5px',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        color: '#1D1D1F',
                        fontWeight: 600
                      }}
                      title="Atur watermark, bingkai, waktu cuci roll, dan musik album ini"
                    >
                      <Sliders size={13} color="#C27803" />
                      <span>Setting Album</span>
                    </Link>

                    {/* Cetak Barcode Meja */}
                    <Link
                      href={`/event/${c.slug || c.id}/print`}
                      target="_blank"
                      className="glass-pill"
                      style={{
                        padding: '8px 14px',
                        fontSize: '12.5px',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <Printer size={13} />
                      <span>Cetak QR Meja</span>
                    </Link>

                    {/* Live Proyektor Videotron */}
                    <Link
                      href={`/event/${c.slug || c.id}/live`}
                      target="_blank"
                      className="glass-pill"
                      style={{
                        padding: '8px 14px',
                        fontSize: '12.5px',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <Tv size={13} />
                      <span>Live Proyektor</span>
                    </Link>

                    {/* Galeri Tamu */}
                    <Link
                      href={`/event/${c.slug || c.id}`}
                      target="_blank"
                      className="glass-pill"
                      style={{
                        padding: '8px 14px',
                        fontSize: '12.5px',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <Eye size={13} />
                      <span>Galeri Tamu</span>
                    </Link>

                    {/* Bagi Link ke Klien / Penyelenggara */}
                    <button
                      type="button"
                      onClick={() => {
                        const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/event/${c.slug || c.id}` : `https://sudutbingkai.id/event/${c.slug || c.id}`;
                        navigator.clipboard.writeText(shareUrl);
                        toast.success(`Tautan galeri acara "${c.title}" berhasil disalin! Bagikan ke klien atau tuan rumah.`);
                      }}
                      className="glass-pill"
                      style={{
                        padding: '8px 14px',
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        color: '#C27803',
                        border: '1px solid rgba(194, 120, 3, 0.3)'
                      }}
                      title="Salin tautan album untuk dibagikan ke klien atau tuan rumah acara"
                    >
                      <Share2 size={13} />
                      <span>Bagi ke Klien</span>
                    </button>

                    {/* Tes Kamera */}
                    <Link
                      href={`/cam/${c.slug || c.id}`}
                      target="_blank"
                      className="btn-apple-black"
                      style={{
                        padding: '8px 16px',
                        fontSize: '12.5px',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <Camera size={13} />
                      <span>Kamera Tamu</span>
                    </Link>

                    {/* Invoice */}
                    <Link
                      href={`/invoice/${c.id}`}
                      target="_blank"
                      className="glass-pill"
                      style={{
                        padding: '8px 12px',
                        fontSize: '12px',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Unduh invoice resmi"
                    >
                      <FileText size={12} />
                      <span>Invoice</span>
                    </Link>

                    {/* Hapus Klien */}
                    <button
                      type="button"
                      onClick={() => handleDeleteClient(c.id, c.title)}
                      className="glass-pill"
                      style={{
                        padding: '8px 10px',
                        fontSize: '12px',
                        color: '#EF4444',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        background: 'rgba(239, 68, 68, 0.05)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Hapus Klien Acara"
                    >
                      <Trash2 size={12} />
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
            {/* Header Hero Card */}
            <div className="glass-card" style={{ padding: '32px 36px', borderRadius: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '6px' }}>
                    WEDDING & EVENT ORGANIZER TOOLKIT
                  </span>
                  <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1D1D1F', marginBottom: '8px' }}>
                    Marketing Kit, Script MC & Panduan Eksekusi Hari H
                  </h2>
                  <p style={{ color: '#6E6E73', fontSize: '14px', lineHeight: 1.6, maxWidth: '780px', margin: 0 }}>
                    Peralatan lengkap siap pakai untuk tim sales, kru lapangan EO/WO, dan Master of Ceremony (MC). Tingkatkan konversi penjualan paket Anda dan pastikan eksekusi di hari H berjalan sempurna.
                  </p>
                </div>

                <div style={{
                  padding: '8px 16px',
                  borderRadius: '14px',
                  background: 'rgba(194, 120, 3, 0.08)',
                  border: '1px solid rgba(194, 120, 3, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Award size={16} color="#C27803" />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#1D1D1F' }}>
                    Mitra Resmi: {companyName || 'Sudut Bingkai Partner'}
                  </span>
                </div>
              </div>

              {/* Sub-Navigation Pills */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                {[
                  { id: 'pitch', label: 'Template Chat WhatsApp', icon: MessageCircle, badge: '4 Template' },
                  { id: 'mc', label: 'Script MC Panggung', icon: Mic, badge: '5 Skenario' },
                  { id: 'battlecard', label: 'Battlecard vs Photobooth', icon: Target, badge: 'Lembar Jualan' },
                  { id: 'checklist', label: 'SOP & Checklist Hari H', icon: CheckSquare, badge: 'H-7 s/d H+1' },
                  { id: 'promokit', label: 'Panduan Cetak & Medsos', icon: Printer, badge: 'Aset Visual' },
                  { id: 'faq', label: 'Penanganan Keraguan (FAQ)', icon: HelpCircle, badge: '6 Jawaban' },
                ].map((tab) => {
                  const IconComp = tab.icon;
                  const isActive = marketingSubTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setMarketingSubTab(tab.id as any)}
                      className="glass-pill"
                      style={{
                        padding: '9px 16px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: isActive ? '#1D1D1F' : 'rgba(255,255,255,0.7)',
                        color: isActive ? '#FFFFFF' : '#1D1D1F',
                        border: isActive ? '1px solid #1D1D1F' : '1px solid rgba(0,0,0,0.08)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <IconComp size={13} color={isActive ? '#FFFFFF' : '#C27803'} />
                      <span>{tab.label}</span>
                      <span style={{
                        fontSize: '10px',
                        padding: '1px 6px',
                        borderRadius: '6px',
                        background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)',
                        color: isActive ? '#FFFFFF' : '#86868B',
                        fontWeight: 500
                      }}>
                        {tab.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SUB-TAB 1: TEMPLATE CHAT WHATSAPP (CLIENT PITCH SUITE) */}
            {marketingSubTab === 'pitch' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Dynamic Personalization Toolbar */}
                <div className="glass-card" style={{ padding: '20px 24px', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(253, 246, 236, 0.8) 100%)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Zap size={16} color="#C27803" />
                    <strong style={{ fontSize: '14px', color: '#1D1D1F' }}>
                      Personalisasi Otomatis Template Penawaran Klien
                    </strong>
                  </div>
                  <p style={{ fontSize: '12.5px', color: '#6E6E73', margin: '0 0 14px 0' }}>
                    Ketik nama calon pengantin / klien di bawah ini. Semua pesan WhatsApp siap kirim akan langsung disesuaikan dengan nama mereka dan kode promo Anda <strong>({referralCode})</strong>!
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#86868B', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Nama Klien / Calon Pengantin
                      </label>
                      <input
                        type="text"
                        value={pitchClientName}
                        onChange={(e) => setPitchClientName(e.target.value)}
                        placeholder="Contoh: Sarah & Dimas"
                        className="glass-input"
                        style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '10px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#86868B', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Tanggal Rencana Acara
                      </label>
                      <input
                        type="text"
                        value={pitchEventDate}
                        onChange={(e) => setPitchEventDate(e.target.value)}
                        placeholder="Contoh: 14 Februari 2026"
                        className="glass-input"
                        style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '10px' }}
                      />
                    </div>
                  </div>
                </div>

                {/* 4 Pitch Templates */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                  {/* Template 1: Add-On Hangat & Solutif */}
                  {(() => {
                    const text1 = `Halo Kak ${pitchClientName || 'Calon Pengantin'}! 📸\n\nMau sharing ide seru buat momen resepsi pernikahan kalian tanggal ${pitchEventDate || 'nanti'} nih.\n\nBiasanya di acara wedding, tamu seringkali cuma duduk di meja atau antre lama di photobooth. Nah, bareng tim ${companyName || 'kami'}, kita bisa siapkan fitur *Sudut Bingkai — Kamera Analog Sekali Pakai Digital* untuk semua tamu undangan kalian!\n\n*Gimana cara kerjanya?*\n1. Di setiap meja tamu disediakan kartu barcode estetik berbingkai nama kalian.\n2. Tamu cukup scan pakai kamera HP (tanpa download aplikasi apapun!).\n3. Tamu langsung bisa motret momen candid seru & rekam video ucapan selamat 15 detik.\n4. Semua foto bisa langsung tayang live di videotron ballroom panggung, dan kalian bakal dapet album kenangan lengkap beresolusi tinggi dengan stempel tanggal analog retro!\n\nKalian bisa dapatkan diskon 10% dengan kode partner kami: *${referralCode}*.\n\nBoleh dicoba simulasi tes kameranya di sini ya Kak: https://sudutbingkai.id/cam/demo\n\nKira-kira gimana Kak ${pitchClientName || ''}, tertarik kita masukkan ke rundown resepsinya?`;
                    return (
                      <div className="glass-card" style={{ padding: '24px', borderRadius: '20px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <div>
                            <span style={{ fontSize: '10.5px', background: 'rgba(194, 120, 3, 0.1)', color: '#C27803', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                              REKOMENDASI UTAMA • TINGGI RESPON
                            </span>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1D1D1F', margin: '6px 0 2px' }}>
                              1. Penawaran Add-On Hangat & Anti-Bosan
                            </h3>
                            <span style={{ fontSize: '12px', color: '#86868B' }}>
                              Cocok dikirim saat tahap penawaran paket atau diskusi rundown.
                            </span>
                          </div>
                        </div>

                        <div style={{
                          background: '#FFFFFF',
                          padding: '16px',
                          borderRadius: '14px',
                          border: '1px solid rgba(0,0,0,0.06)',
                          fontSize: '12.5px',
                          color: '#333336',
                          lineHeight: 1.6,
                          whiteSpace: 'pre-wrap',
                          maxHeight: '260px',
                          overflowY: 'auto',
                          marginBottom: '16px'
                        }}>
                          {text1}
                        </div>

                        <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(text1, 'pitch1')}
                            className="glass-pill"
                            style={{ flex: 1, padding: '9px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
                          >
                            {copiedScript === 'pitch1' ? <Check size={14} color="#27AE60" /> : <Copy size={14} />}
                            <span>{copiedScript === 'pitch1' ? 'Tersalin!' : 'Salin Pesan'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(text1)}`, '_blank')}
                            className="btn-apple-black"
                            style={{ padding: '9px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', background: '#25D366', color: '#FFFFFF', border: 'none' }}
                          >
                            <Send size={13} />
                            <span>Buka WA</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Template 2: Proposal Edukatif (Hemat Jutaan vs Photobooth) */}
                  {(() => {
                    const text2 = `Hai Kak ${pitchClientName || 'Calon Pengantin'}! 🤍\n\nUntuk hiburan tamu dan dokumentasi resepsi pernikahan kalian, tim ${companyName || 'kami'} sangat menyarankan fitur *Sudut Bingkai* dibanding sewa photobooth fisik konvensional. Ini beberapa perbandingannya:\n\n💰 *Hemat Jutaan Rupiah*: Sewa photobooth biasa Rp 3-6 Juta untuk 2-3 jam saja. Sudut Bingkai aktif seharian penuh hanya Rp 499rb.\n🚫 *Bebas Antrean Berdiri*: Tamu gak perlu antre berjubel di depan backdrop. Mereka bisa motret langsung dari meja makan atau saat salaman.\n📸 *Ratusan Sudut Pandang*: Menangkap senyum dan tawa candid jujur dari mata para sahabat, bukan pose kaku di photobooth.\n📺 *Live Videotron Ballroom*: Foto tamu langsung tampil estetik di layar proyektor panggung secara real-time.\n🎙️ *Video Ucapan 15 Detik*: Tamu bisa merekam doa dan ucapan selamat langsung dari kamera HP mereka.\n\nKhusus klien ${companyName || 'kami'}, ada potongan diskon dengan kode promo: *${referralCode}*.\n\nKira-kira mau kami siapkan simulasinya untuk acara kalian? 🙏`;
                    return (
                      <div className="glass-card" style={{ padding: '24px', borderRadius: '20px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <div>
                            <span style={{ fontSize: '10.5px', background: 'rgba(39, 174, 96, 0.1)', color: '#27AE60', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                              SOLUSI BUDGET • TINGGI KONVERSI
                            </span>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1D1D1F', margin: '6px 0 2px' }}>
                              2. Komparasi Hemat vs Sewa Photobooth Rp 5 Jt
                            </h3>
                            <span style={{ fontSize: '12px', color: '#86868B' }}>
                              Sangat ampuh untuk klien yang mempertimbangkan budget photobooth.
                            </span>
                          </div>
                        </div>

                        <div style={{
                          background: '#FFFFFF',
                          padding: '16px',
                          borderRadius: '14px',
                          border: '1px solid rgba(0,0,0,0.06)',
                          fontSize: '12.5px',
                          color: '#333336',
                          lineHeight: 1.6,
                          whiteSpace: 'pre-wrap',
                          maxHeight: '260px',
                          overflowY: 'auto',
                          marginBottom: '16px'
                        }}>
                          {text2}
                        </div>

                        <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(text2, 'pitch2')}
                            className="glass-pill"
                            style={{ flex: 1, padding: '9px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
                          >
                            {copiedScript === 'pitch2' ? <Check size={14} color="#27AE60" /> : <Copy size={14} />}
                            <span>{copiedScript === 'pitch2' ? 'Tersalin!' : 'Salin Pesan'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(text2)}`, '_blank')}
                            className="btn-apple-black"
                            style={{ padding: '9px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', background: '#25D366', color: '#FFFFFF', border: 'none' }}
                          >
                            <Send size={13} />
                            <span>Buka WA</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Template 3: Follow-Up Pasca Konsultasi / Rapat Rundown */}
                  {(() => {
                    const text3 = `Halo Kak ${pitchClientName || 'Calon Pengantin'}, terima kasih banyak untuk sesi konsultasi persiapan acara kemarin bersama tim ${companyName || 'kami'} ya! 🙏\n\nMengingatkan kembali, slot reservasi untuk paket kamera tamu Sudut Bingkai masih tersedia untuk tanggal ${pitchEventDate || 'acara kalian'}.\n\nJika ingin kami masukkan ke dalam susunan rundown dan layout penataan kartu barcode di meja resepsi, kabari kami ya Kak agar tim kami bisa mulai menyiapkan kustomisasi bingkai foto dan pilihan filter filmnya lebih awal.\n\nBisa langsung daftar dengan kode promo diskon kami: *${referralCode}* di https://sudutbingkai.id/create?ref=${referralCode}\n\nTerima kasih dan sehat selalu ya Kak ${pitchClientName || ''}! 🌸`;
                    return (
                      <div className="glass-card" style={{ padding: '24px', borderRadius: '20px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <div>
                            <span style={{ fontSize: '10.5px', background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                              FOLLOW-UP CEPAT • RAMAH
                            </span>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1D1D1F', margin: '6px 0 2px' }}>
                              3. Follow-Up Pasca Konsultasi / Meeting WO
                            </h3>
                            <span style={{ fontSize: '12px', color: '#86868B' }}>
                              Kirimkan H+1 atau H+2 setelah sesi konsultasi atau meeting persiapan.
                            </span>
                          </div>
                        </div>

                        <div style={{
                          background: '#FFFFFF',
                          padding: '16px',
                          borderRadius: '14px',
                          border: '1px solid rgba(0,0,0,0.06)',
                          fontSize: '12.5px',
                          color: '#333336',
                          lineHeight: 1.6,
                          whiteSpace: 'pre-wrap',
                          maxHeight: '260px',
                          overflowY: 'auto',
                          marginBottom: '16px'
                        }}>
                          {text3}
                        </div>

                        <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(text3, 'pitch3')}
                            className="glass-pill"
                            style={{ flex: 1, padding: '9px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
                          >
                            {copiedScript === 'pitch3' ? <Check size={14} color="#27AE60" /> : <Copy size={14} />}
                            <span>{copiedScript === 'pitch3' ? 'Tersalin!' : 'Salin Pesan'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(text3)}`, '_blank')}
                            className="btn-apple-black"
                            style={{ padding: '9px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', background: '#25D366', color: '#FFFFFF', border: 'none' }}
                          >
                            <Send size={13} />
                            <span>Buka WA</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Template 4: Event Korporat, Gathering, & Birthday Party */}
                  {(() => {
                    const text4 = `Halo Rekan Panitia ${pitchClientName || 'Event'}! 🎉\n\nUntuk memeriahkan agenda acara gathering / anniversary perusahaan kalian tanggal ${pitchEventDate || 'mendatang'}, tim ${companyName || 'kami'} merekomendasikan media interaktif tamu: *Sudut Bingkai Digital Disposable Camera*.\n\nKeunggulan untuk event gathering:\n1. Peserta cukup scan QR tanpa download aplikasi apapun.\n2. Setiap foto otomatis diberi watermark / logo perusahaan & nama event kalian.\n3. Foto langsung tayang interaktif di layar videotron / proyektor panggung secara real-time.\n4. Panitia bisa mengunduh seluruh file foto resolusi tinggi dalam 1 file ZIP pasca acara untuk dokumentasi resmi.\n\nDapatkan penawaran khusus mitra dengan kode: *${referralCode}*.\n\nBoleh kami kirimkan proposal teknisnya untuk dipelajari bersama tim panitia? Terima kasih!`;
                    return (
                      <div className="glass-card" style={{ padding: '24px', borderRadius: '20px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <div>
                            <span style={{ fontSize: '10.5px', background: 'rgba(107, 114, 128, 0.1)', color: '#4B5563', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                              NON-WEDDING • GATHERING & CORPORATE
                            </span>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1D1D1F', margin: '6px 0 2px' }}>
                              4. Penawaran Event Perusahaan & Gathering
                            </h3>
                            <span style={{ fontSize: '12px', color: '#86868B' }}>
                              Khusus untuk event corporate, gathering kantor, ulang tahun, & reuni.
                            </span>
                          </div>
                        </div>

                        <div style={{
                          background: '#FFFFFF',
                          padding: '16px',
                          borderRadius: '14px',
                          border: '1px solid rgba(0,0,0,0.06)',
                          fontSize: '12.5px',
                          color: '#333336',
                          lineHeight: 1.6,
                          whiteSpace: 'pre-wrap',
                          maxHeight: '260px',
                          overflowY: 'auto',
                          marginBottom: '16px'
                        }}>
                          {text4}
                        </div>

                        <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(text4, 'pitch4')}
                            className="glass-pill"
                            style={{ flex: 1, padding: '9px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
                          >
                            {copiedScript === 'pitch4' ? <Check size={14} color="#27AE60" /> : <Copy size={14} />}
                            <span>{copiedScript === 'pitch4' ? 'Tersalin!' : 'Salin Pesan'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(text4)}`, '_blank')}
                            className="btn-apple-black"
                            style={{ padding: '9px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', background: '#25D366', color: '#FFFFFF', border: 'none' }}
                          >
                            <Send size={13} />
                            <span>Buka WA</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* SUB-TAB 2: SCRIPT MC PANGGUNG (5 SKENARIO) */}
            {marketingSubTab === 'mc' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="glass-card" style={{ padding: '20px 24px', borderRadius: '20px', background: 'rgba(194, 120, 3, 0.04)', border: '1px solid rgba(194, 120, 3, 0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Mic size={16} color="#C27803" />
                    <strong style={{ fontSize: '14px', color: '#1D1D1F' }}>
                      Panduan Master of Ceremony (MC) Saat Resepsi Berlangsung
                    </strong>
                  </div>
                  <p style={{ fontSize: '12.5px', color: '#6E6E73', margin: 0, lineHeight: 1.5 }}>
                    Berikan salinan teks ini kepada MC acara. Terdapat 5 skenario pembacaan yang dirancang agar para tamu aktif memotret tanpa mengganggu alur sakral prosesi pernikahan.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {[
                    {
                      id: 'mc1',
                      title: 'Skenario 1: Pembukaan Acara / Setelah Prosesi Masuk Pelaminan',
                      duration: '~45 Detik',
                      cue: 'Dibacakan saat kedua mempelai telah duduk di pelaminan dan seluruh tamu duduk nyaman di meja masing-masing.',
                      script: `"Bapak, Ibu, dan teman-teman semuanya, perhatikan kartu barcode cantik yang ada di tengah meja Anda masing-masing! Hari ini ${companyName || 'tim Wedding Organizer'} bersama kedua mempelai menyiapkan kamera analog digital Sudut Bingkai khusus untuk kalian semua. Cukup buka kamera HP, arahkan dan scan kartu barcode di meja, isi nama Anda, dan Anda bisa langsung memotret tanpa perlu download aplikasi apapun! Semua momen candid seru kalian akan langsung terabadikan di album kenangan kedua mempelai. Yuk ambil HP kalian sekarang, scan QR-nya, dan jepret momen terindah kalian!"`
                    },
                    {
                      id: 'mc2',
                      title: 'Skenario 2: Saat Jam Santap Malam & Suasana Meja Santai',
                      duration: '~40 Detik',
                      cue: 'Dibacakan saat para tamu sedang menikmati hidangan utama untuk memicu interaksi foto antar sahabat semeja.',
                      script: `"Sambil menikmati santap malam yang lezat, jangan biarkan tawa manis di meja kalian terlewatkan begitu saja! Buat teman-teman yang belum scan barcode Sudut Bingkai di meja, yuk buka kamera HP sekarang. Jepret foto candid teman semeja kalian, wefie seru, atau tawa bahagia malam ini. Ingat ya, kuota roll filmnya terbatas seperti kamera analog klasik, jadi pastikan setiap jepretan Anda penuh momen berharga!"`
                    },
                    {
                      id: 'mc3',
                      title: 'Skenario 3: Sorotan Layar Proyektor / Videotron Panggung',
                      duration: '~35 Detik',
                      cue: 'Dibacakan saat foto-foto candid tamu mulai bermunculan di layar videotron / proyektor ballroom.',
                      script: `"Wah, luar biasa sekali! Coba kita lihat bersama ke layar videotron utama di depan panggung! Foto-foto candid dari teman-teman yang baru saja motret lewat barcode meja sudah mulai bermunculan nih. Keren banget tone warnanya khas roll film analog. Yang fotonya belum muncul di layar, jangan mau kalah! Scan barcode di meja kalian sekarang, dan buat foto kalian tampil megah di panggung resepsi malam ini!"`
                    },
                    {
                      id: 'mc4',
                      title: 'Skenario 4: Pengingat Kuota & Rekaman Video Ucapan Penutup 15 Detik',
                      duration: '~40 Detik',
                      cue: 'Dibacakan 30-45 menit sebelum acara berakhir untuk mendorong tamu menggunakan jatah video ucapan penutup.',
                      script: `"Teman-teman semuanya, sebelum acara yang berbahagia ini kita akhiri, pastikan jatah roll kamera kalian sudah dipakai semua ya! Dan buat kalian yang kuota fotonya sudah habis, ada fitur spesial: kalian bisa merekam Video Ucapan 15 detik langsung dari kamera HP kalian untuk kedua mempelai! Rekam doa terbaik, ucapan selamat, atau pesan kocak kalian. Video ini akan disimpan selamanya di memori manis kedua mempelai. Yuk rekam video ucapan kalian sekarang!"`
                    },
                    {
                      id: 'mc5',
                      title: 'Skenario 5: Pengumuman Hitung Mundur Sensasi Cuci Roll (Delayed Mode)',
                      duration: '~30 Detik',
                      cue: 'Khusus untuk acara yang menggunakan mode Delayed Reveal (album foto serentak terbuka jam tertentu).',
                      script: `"Pasti penasaran kan sama hasil jepretan kamera analog kalian malam ini? Khusus resepsi malam ini, kita menggunakan fitur Sensasi Cuci Roll! Semua foto masih dirahasiakan dan akan serentak diungkapkan ke galeri bersama tepat jam 10 malam nanti! Jangan lupa simpan tautan galerinya, dan bersiaplah bernostalgia melihat tawa dan momen tak terduga kita semua malam ini!"`
                    }
                  ].map((item, idx) => (
                    <div key={item.id} className="glass-card" style={{ padding: '24px 28px', borderRadius: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', background: 'rgba(194, 120, 3, 0.1)', color: '#C27803', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                              DURASI: {item.duration}
                            </span>
                            <span style={{ fontSize: '11.5px', color: '#86868B' }}>
                              • {item.cue}
                            </span>
                          </div>
                          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1D1D1F', margin: 0 }}>
                            {item.title}
                          </h3>
                        </div>

                        <button
                          type="button"
                          onClick={() => copyToClipboard(item.script, item.id)}
                          className="glass-pill"
                          style={{ padding: '8px 14px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                        >
                          {copiedScript === item.id ? <Check size={13} color="#27AE60" /> : <Copy size={13} />}
                          <span>{copiedScript === item.id ? 'Tersalin!' : 'Salin Script MC'}</span>
                        </button>
                      </div>

                      <div style={{
                        background: '#FFFFFF',
                        padding: '18px 22px',
                        borderRadius: '16px',
                        border: '1px solid rgba(0,0,0,0.06)',
                        fontStyle: 'italic',
                        fontSize: '13.5px',
                        color: '#2C2C2E',
                        lineHeight: 1.7,
                        borderLeft: '4px solid #C27803'
                      }}>
                        {item.script}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUB-TAB 3: SALES BATTLECARD (VS PHOTOBOOTH BIASA) */}
            {marketingSubTab === 'battlecard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="glass-card" style={{ padding: '24px 28px', borderRadius: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
                    <div>
                      <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '4px' }}>
                        SALES ONE-PAGER COMPARISON
                      </span>
                      <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1D1D1F', margin: 0 }}>
                        Perbandingan Nilai: Sudut Bingkai vs Photobooth Konvensional
                      </h3>
                      <p style={{ fontSize: '13px', color: '#6E6E73', margin: '4px 0 0' }}>
                        Gunakan tabel perbandingan ini saat calon pengantin ragu atau membandingkan biaya dengan vendor photobooth cetak fisik.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const summaryText = `*MENGAPA SUDUT BINGKAI LEBIH UNGGUL DIBANDING PHOTOBOOTH BIASA?*\n\n1. Biaya: Mulai Rp 499rb vs Photobooth fisik Rp 3-6 Juta (Hemat hingga 85%).\n2. Antrean: Nol antrean! Tamu motret santai dari meja masing-masing.\n3. Jangkauan: 100-300+ tamu aktif motret vs hanya 50 orang yang mau antre.\n4. Kebutuhan Ruang: 0 m² vs butuh area 3x3m + kabel listrik.\n5. Hasil: Foto candid jujur & natural + video ucapan 15s + live videotron ballroom.\n\nCek demonya di: https://sudutbingkai.id/cam/demo`;
                        copyToClipboard(summaryText, 'battlecard');
                        toast.success('Ringkasan battlecard disalin!');
                      }}
                      className="glass-pill"
                      style={{ padding: '8px 16px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                    >
                      {copiedScript === 'battlecard' ? <Check size={13} color="#27AE60" /> : <Copy size={13} />}
                      <span>{copiedScript === 'battlecard' ? 'Tersalin!' : 'Salin Ringkasan Battlecard'}</span>
                    </button>
                  </div>

                  {/* Comparison Table */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.08)' }}>
                          <th style={{ padding: '14px 16px', color: '#86868B', fontWeight: 600, width: '22%' }}>Parameter</th>
                          <th style={{ padding: '14px 16px', color: '#E11D48', fontWeight: 700, width: '38%', background: 'rgba(225, 29, 72, 0.03)', borderRadius: '12px 12px 0 0' }}>
                            Photobooth Cetak Fisik
                          </th>
                          <th style={{ padding: '14px 16px', color: '#C27803', fontWeight: 700, width: '40%', background: 'rgba(194, 120, 3, 0.08)', borderRadius: '12px 12px 0 0' }}>
                            Sudut Bingkai (Digital Disposable Cam)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          {
                            param: 'Estimasi Biaya Sewa',
                            old: 'Rp 3.000.000 – Rp 6.000.000+ (hanya untuk 2-3 jam)',
                            sb: 'Mulai Rp 499.000 (Hemat hingga 85%, aktif seharian)',
                            winner: true
                          },
                          {
                            param: 'Antrean Tamu',
                            old: 'Antrean panjang & berjubel berdiri di depan backdrop',
                            sb: 'Nol antrean! Tamu motret santai dari meja & pelaminan',
                            winner: true
                          },
                          {
                            param: 'Kapasitas & Partisipasi',
                            old: 'Terbatas (hanya 50-80 orang yang rela antre)',
                            sb: 'Menjangkau 100 – 300+ tamu di seluruh sudut ballroom',
                            winner: true
                          },
                          {
                            param: 'Kebutuhan Area / Ruang',
                            old: 'Memakan tempat 3x3 meter + kabel listrik berseliweran',
                            sb: '0 m² ruang fisik! Cukup letakkan kartu barcode di meja',
                            winner: true
                          },
                          {
                            param: 'Instalasi & Akses Tamu',
                            old: 'Kertas cetak foto kecil rawan tertekuk, basah & hilang',
                            sb: 'Tanpa install app, langsung via kamera bawaan smartphone',
                            winner: true
                          },
                          {
                            param: 'Karakter & Sudut Pandang',
                            old: 'Pose kaku & formal di depan latar belakang yang sama',
                            sb: 'Ratusan ekspresi candid jujur dari mata para sahabat',
                            winner: true
                          },
                          {
                            param: 'Integrasi Panggung Utama',
                            old: 'Terisolasi di pojok pintu masuk, tidak terlihat panggung',
                            sb: 'Terhubung live real-time ke Videotron & Proyektor panggung',
                            winner: true
                          },
                          {
                            param: 'Pesan Suara & Video Ucapan',
                            old: 'Tidak ada (hanya lembaran cetak foto bisu)',
                            sb: 'Rekaman Voice Note & Video Ucapan 15 detik dari tamu',
                            winner: true
                          },
                          {
                            param: 'Penyimpanan & File Asli',
                            old: 'Hardcopy terbatas, file digital sering harus bayar lagi',
                            sb: 'Album cloud awet + Download ZIP resolusi asli penuh',
                            winner: true
                          }
                        ].map((row, rIdx) => (
                          <tr key={rIdx} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                            <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1D1D1F' }}>
                              {row.param}
                            </td>
                            <td style={{ padding: '14px 16px', color: '#6E6E73', background: 'rgba(225, 29, 72, 0.02)' }}>
                              {row.old}
                            </td>
                            <td style={{ padding: '14px 16px', color: '#1D1D1F', fontWeight: 600, background: 'rgba(194, 120, 3, 0.04)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <CheckCircle2 size={15} color="#27AE60" style={{ flexShrink: 0 }} />
                                <span>{row.sb}</span>
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

            {/* SUB-TAB 4: SOP & CHECKLIST HARI H (INTERACTIVE) */}
            {marketingSubTab === 'checklist' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="glass-card" style={{ padding: '24px 28px', borderRadius: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                    <div>
                      <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '4px' }}>
                        STANDARD OPERATING PROCEDURE
                      </span>
                      <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1D1D1F', margin: 0 }}>
                        SOP & Checklist Operasional Kru WO di Hari H
                      </h3>
                      <p style={{ fontSize: '13px', color: '#6E6E73', margin: '4px 0 0' }}>
                        Centang setiap tahapan di bawah ini selama persiapan hingga penutupan acara untuk memastikan eksekusi tanpa cela.
                      </p>
                    </div>

                    {/* Progress Indicator */}
                    {(() => {
                      const totalItems = 7;
                      const completedCount = Object.values(checkedChecklistItems).filter(Boolean).length;
                      const pct = Math.round((completedCount / totalItems) * 100);
                      return (
                        <div style={{
                          padding: '8px 16px',
                          borderRadius: '14px',
                          background: pct === 100 ? 'rgba(39, 174, 96, 0.1)' : 'rgba(194, 120, 3, 0.08)',
                          border: pct === 100 ? '1px solid #27AE60' : '1px solid rgba(194, 120, 3, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}>
                          <CheckSquare size={16} color={pct === 100 ? '#27AE60' : '#C27803'} />
                          <div>
                            <strong style={{ fontSize: '13px', color: '#1D1D1F', display: 'block' }}>
                              {completedCount} dari {totalItems} Langkah Siap ({pct}%)
                            </strong>
                            <span style={{ fontSize: '11px', color: '#86868B' }}>
                              {pct === 100 ? 'Kru siap tempur di Hari H!' : 'Selesaikan seluruh persiapan'}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      {
                        key: 'h7',
                        phase: 'H-7 Acara',
                        title: 'Konfirmasi Tema, Filter & Kustomisasi Bingkai Foto',
                        desc: 'Buka menu "Setting Album" di daftar klien. Tentukan Signature Film (Portra, Fuji, dll), sesuaikan teks watermark nama pengantin & tanggal, serta tentukan mode pembukaan (Langsung Terbuka atau Sensasi Cuci Roll).'
                      },
                      {
                        key: 'h3',
                        phase: 'H-3 Acara',
                        title: 'Cetak Kartu Barcode Meja Tamu (Tent Card / Akrilik)',
                        desc: 'Gunakan tombol "Cetak QR Meja" di dashboard vendor. Cetak dalam format Tent Card A6 atau standing akrilik bening 2R/3R. Lakukan uji scan lewat kamera smartphone iPhone & Android untuk memastikan QR tajam.'
                      },
                      {
                        key: 'h1',
                        phase: 'H-1 Acara',
                        title: 'Gladi Resik & Uji Coba Layar Videotron / Proyektor Venue',
                        desc: 'Sambungkan laptop kru operator ke proyektor / videotron ballroom. Buka link "Live Proyektor" acara tersebut, tekan F11 untuk mode layar penuh. Pastikan tampilan horizontal atau vertikal sesuai orientasi layar panggung.'
                      },
                      {
                        key: 'd0_pre',
                        phase: 'Hari H (Sebelum Open Gate)',
                        title: 'Penataan Kartu Meja & Briefing MC Utama',
                        desc: 'Letakkan 1-2 kartu QR di setiap meja bundar atau meja panjang tamu. Serahkan lembar Script MC kepada Master of Ceremony, tandai 5 skenario waktu pembacaan pada rundown resmi.'
                      },
                      {
                        key: 'd0_live',
                        phase: 'Hari H (Saat Acara Berlangsung)',
                        title: 'Monitoring Layar Proyektor & Moderasi Foto',
                        desc: 'Operator videotron sesekali memantau feed foto masuk. Jika ada foto tamu yang blur parah atau tidak pantas, gunakan fitur moderasi 1-klik "Sembunyikan Foto" via dashboard host/vendor.'
                      },
                      {
                        key: 'd0_close',
                        phase: 'Hari H (30 Menit Sebelum Penutupan)',
                        title: 'Trigger Rekaman Video Ucapan Penutup Tamu',
                        desc: 'Instruksikan MC membacakan Skenario 4 untuk mengajak tamu yang kuota fotonya telah habis merekam video ucapan penutup 15 detik sebagai kado manis untuk kedua mempelai.'
                      },
                      {
                        key: 'd1_post',
                        phase: 'H+1 Pasca Acara',
                        title: 'Unduh Master ZIP Foto Resolusi Penuh & Serahkan ke Pengantin',
                        desc: 'Buka dashboard host atau vendor, klik "Unduh Semua (ZIP Resolusi Asli Penuh)". Kirimkan tautan unduhan atau Google Drive kepada pengantin sebagai hadiah penutup profesional dari WO Anda.'
                      }
                    ].map((step) => {
                      const isDone = !!checkedChecklistItems[step.key];
                      return (
                        <div
                          key={step.key}
                          onClick={() => toggleChecklistItem(step.key)}
                          style={{
                            padding: '16px 20px',
                            borderRadius: '16px',
                            background: isDone ? 'rgba(39, 174, 96, 0.05)' : '#FFFFFF',
                            border: isDone ? '1px solid rgba(39, 174, 96, 0.3)' : '1px solid rgba(0,0,0,0.06)',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isDone}
                            onChange={() => {}} // handled by parent onClick
                            style={{ width: '18px', height: '18px', accentColor: '#27AE60', cursor: 'pointer', marginTop: '2px' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: isDone ? '#27AE60' : '#C27803' }}>
                                {step.phase}
                              </span>
                              <strong style={{ fontSize: '14px', color: '#1D1D1F', textDecoration: isDone ? 'line-through' : 'none' }}>
                                {step.title}
                              </strong>
                            </div>
                            <p style={{ fontSize: '12.5px', color: '#6E6E73', margin: 0, lineHeight: 1.5 }}>
                              {step.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 5: PANDUAN CETAK MEJA & MEDSOS */}
            {marketingSubTab === 'promokit' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Print Specs */}
                <div className="glass-card" style={{ padding: '24px 28px', borderRadius: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '4px' }}>
                        SPESIFIKASI MEDIA CETAK
                      </span>
                      <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1D1D1F', margin: 0 }}>
                        Panduan Ukuran Cetak Kartu Barcode Meja Tamu
                      </h3>
                      <p style={{ fontSize: '13px', color: '#6E6E73', margin: '4px 0 0' }}>
                        Rekomendasi jenis bahan dan ukuran agar kartu barcode meja terlihat elegan dan mewah di atas meja dekorasi.
                      </p>
                    </div>

                    <Link
                      href="/create"
                      className="glass-pill"
                      style={{ padding: '8px 16px', fontSize: '12.5px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Plus size={13} />
                      <span>Buat Acara Baru</span>
                    </Link>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                    <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)' }}>
                      <span style={{ fontSize: '11px', background: 'rgba(194, 120, 3, 0.1)', color: '#C27803', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                        PALING POPULER
                      </span>
                      <strong style={{ fontSize: '14px', color: '#1D1D1F', display: 'block', margin: '8px 0 4px' }}>
                        Tent Card Meja Segitiga (A6)
                      </strong>
                      <p style={{ fontSize: '12px', color: '#6E6E73', margin: '0 0 10px 0', lineHeight: 1.5 }}>
                        Ukuran terbuka A5 (14.8 x 21 cm), lipat 2 berdiri menjadi A6 (10.5 x 14.8 cm).
                      </p>
                      <span style={{ fontSize: '11px', color: '#1D1D1F', fontWeight: 600, display: 'block' }}>
                        Bahan: Art Carton 260 / 310 gsm + Laminasi Doff
                      </span>
                    </div>

                    <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)' }}>
                      <span style={{ fontSize: '11px', background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                        ELEGAN & MEWAH
                      </span>
                      <strong style={{ fontSize: '14px', color: '#1D1D1F', display: 'block', margin: '8px 0 4px' }}>
                        Standing Akrilik Bening (2R / 3R)
                      </strong>
                      <p style={{ fontSize: '12px', color: '#6E6E73', margin: '0 0 10px 0', lineHeight: 1.5 }}>
                        Cetak kartu foto ukuran 2R (6 x 9 cm) atau 3R (8.9 x 12.7 cm) lalu masukkan ke standing akrilik transparan meja.
                      </p>
                      <span style={{ fontSize: '11px', color: '#1D1D1F', fontWeight: 600, display: 'block' }}>
                        Bahan: Kertas Foto Silky / Luster 230 gsm
                      </span>
                    </div>

                    <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)' }}>
                      <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                        AREA FOYER / ENTRANCE
                      </span>
                      <strong style={{ fontSize: '14px', color: '#1D1D1F', display: 'block', margin: '8px 0 4px' }}>
                        Roll-Up / X-Banner (60 x 160 cm)
                      </strong>
                      <p style={{ fontSize: '12px', color: '#6E6E73', margin: '0 0 10px 0', lineHeight: 1.5 }}>
                        Diletakkan di dekat meja penerima tamu / buku tamu dengan barcode besar agar tamu langsung paham sebelum masuk ballroom.
                      </p>
                      <span style={{ fontSize: '11px', color: '#1D1D1F', fontWeight: 600, display: 'block' }}>
                        Bahan: Albatros Doff / Flexi Korea High-Res
                      </span>
                    </div>
                  </div>
                </div>

                {/* Social Media Caption Templates */}
                <div className="glass-card" style={{ padding: '24px 28px', borderRadius: '20px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '4px' }}>
                      KONTEN MEDIA SOSIAL MITRA
                    </span>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1D1D1F', margin: 0 }}>
                      Caption Siap Pakai untuk Instagram & TikTok Portofolio Anda
                    </h3>
                    <p style={{ fontSize: '13px', color: '#6E6E73', margin: '4px 0 0' }}>
                      Pamerkan bahwa tim WO/Fotografi Anda modern dan selalu menghadirkan pengalaman resepsi interaktif terkini.
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
                    {/* Caption 1 */}
                    {(() => {
                      const cap1 = `Gak ada lagi cerita tamu bosan cuma duduk nunggu giliran salaman! 📸\n\nDi wedding klien kami kemarin, setiap meja disediakan kartu barcode kamera analog sekali pakai digital @sudutbingkai.id. Tamu tinggal scan pakai kamera HP (tanpa download aplikasi!), motret candid sesuka hati, dan fotonya langsung muncul live di videotron ballroom!\n\nPengantin dapet ratusan foto candid jujur & pesan video ucapan yang super hangat dari sahabat-sahabat mereka. Lebih hemat jutaan rupiah dibanding sewa photobooth biasa lho!\n\nMau resepsi pernikahanmu seseru ini? Konsultasikan bareng tim @${companyName ? companyName.toLowerCase().replace(/[^a-z0-9]/g, '') : 'weddingorganizer'} sekarang! 🤍\n\n#WeddingOrganizer #WeddingHacks #SudutBingkai #WeddingInspiration #IdeWedding #PhotoboothWedding #WeddingReception`;
                      return (
                        <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <strong style={{ fontSize: '13.5px', color: '#1D1D1F' }}>
                              Caption A: Showcase Portofolio WO Modern
                            </strong>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(cap1, 'cap1')}
                              className="glass-pill"
                              style={{ padding: '5px 12px', fontSize: '11.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              {copiedScript === 'cap1' ? <Check size={12} color="#27AE60" /> : <Copy size={12} />}
                              <span>{copiedScript === 'cap1' ? 'Tersalin!' : 'Salin Caption'}</span>
                            </button>
                          </div>
                          <div style={{ fontSize: '12px', color: '#555', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: '180px', overflowY: 'auto' }}>
                            {cap1}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Caption 2 */}
                    {(() => {
                      const cap2 = `Tips Wedding: Cara hemat budget jutaan rupiah tapi tamu resepsi tetap happy dan terhibur! 💡\n\nDaripada sewa photobooth fisik yang antreannya panjang dan cuma aktif 2-3 jam, sekarang pengantin cerdas beralih ke kamera digital tamu @sudutbingkai.id.\n\nKenapa pengantin kami suka banget:\n✅ Tamu motret dari mana saja tanpa antre\n✅ Foto bernuansa retro film analog langsung tayang di proyektor panggung\n✅ Ada rekaman video ucapan penutup 15 detik\n✅ Hasil ratusan foto candid asli langsung bisa diunduh penuh\n\nSpesial untuk calon pengantin kami, ada voucher diskon dengan kode: ${referralCode}.\n\nHubungi tim kami di bio untuk info lengkapnya ya! 💍\n\n#TipsPernikahan #WeddingTips #BridesStory #WeddingPlanner #VendorWedding`;
                      return (
                        <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <strong style={{ fontSize: '13.5px', color: '#1D1D1F' }}>
                              Caption B: Tips Hemat & Edukasi Calon Pengantin
                            </strong>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(cap2, 'cap2')}
                              className="glass-pill"
                              style={{ padding: '5px 12px', fontSize: '11.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              {copiedScript === 'cap2' ? <Check size={12} color="#27AE60" /> : <Copy size={12} />}
                              <span>{copiedScript === 'cap2' ? 'Tersalin!' : 'Salin Caption'}</span>
                            </button>
                          </div>
                          <div style={{ fontSize: '12px', color: '#555', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: '180px', overflowY: 'auto' }}>
                            {cap2}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 6: PENANGANAN KERAGUAN KLIEN (OBJECTION HANDLING FAQ) */}
            {marketingSubTab === 'faq' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="glass-card" style={{ padding: '24px 28px', borderRadius: '20px' }}>
                  <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '4px' }}>
                    SALES OBJECTION HANDLING
                  </span>
                  <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1D1D1F', margin: 0 }}>
                    Jawaban Tuntas untuk 6 Pertanyaan Kritis Calon Pengantin
                  </h3>
                  <p style={{ fontSize: '13px', color: '#6E6E73', margin: '4px 0 16px 0' }}>
                    Klien ragu atau punya kekhawatiran teknis? Gunakan jawaban profesional di bawah ini untuk meyakinkan mereka dengan cepat.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      {
                        q: 'Apakah tamu undangan harus mengunduh aplikasi terlebih dahulu?',
                        a: 'Sama sekali tidak! Tamu cukup membuka kamera bawaan smartphone (iPhone maupun Android), arahkan ke kartu QR di meja, dan web kamera Sudut Bingkai akan langsung terbuka instan di browser HP. Tanpa perlu download dari App Store atau Play Store, tanpa login akun rumit, dan sangat ramah bahkan untuk tamu orang tua.'
                      },
                      {
                        q: 'Bagaimana jika sinyal internet di dalam gedung atau ballroom pernikahan kurang kuat?',
                        a: 'Sudut Bingkai dirancang sangat ringan dengan ukuran aset di bawah 1MB dan dilengkapi teknologi Offline Resilience Shield. Jika sinyal sempat terputus, kamera tetap dapat memotret dan foto akan tersimpan aman di memori lokal ponsel tamu, lalu otomatis terunggah begitu ponsel kembali mendeteksi sinyal internet.'
                      },
                      {
                        q: 'Bagaimana jika ada tamu yang iseng mengunggah foto blur atau tidak pantas?',
                        a: 'Tenang saja, tuan rumah dan tim WO memegang kendali penuh. Di dashboard host terdapat tombol Moderasi Real-Time 1-Klik ("Sembunyikan Foto"). Jika ada foto yang tidak diinginkan, cukup klik ikon mata dan foto tersebut otomatis langsung hilang dari galeri tamu dan layar videotron panggung secara instan.'
                      },
                      {
                        q: 'Apakah foto yang dihasilkan bisa diunduh dengan kualitas resolusi asli tinggi?',
                        a: 'Pasti! Berbeda dengan foto yang dikirim lewat WhatsApp yang biasanya terkompresi pecah, seluruh jepretan tamu di Sudut Bingkai disimpan dalam resolusi tinggi asli (lengkap dengan stempel tanggal analog retro). Pengantin dapat mengunduh seluruh master file foto sekaligus dalam 1 berkas ZIP via tombol unduh di dashboard.'
                      },
                      {
                        q: 'Berapa lama album foto kami tersimpan aman di Sudut Bingkai?',
                        a: 'Foto tersimpan aman di server awan berkecepatan tinggi selama 30 hingga 90 hari pasca acara (sesuai paket yang dipilih). Pengantin dan tamu memiliki waktu yang sangat leluasa untuk melihat-lihat, bernostalgia, dan mengunduh seluruh foto favorit mereka.'
                      },
                      {
                        q: 'Apakah desain bingkai foto dan filter film bisa disesuaikan dengan tema dekorasi kami?',
                        a: 'Sangat bisa! Host dan vendor dapat memilih dari 10 template bingkai polaroid/retro premium, menambahkan teks nama pasangan dan tanggal acara, atau bahkan mengunggah frame PNG karya desainer grafis Anda sendiri dengan tema dan palet warna dekorasi pernikahan Anda.'
                      }
                    ].map((item, fIdx) => (
                      <div key={fIdx} style={{ background: '#FFFFFF', padding: '18px 22px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                          <strong style={{ fontSize: '14px', color: '#1D1D1F' }}>
                            {fIdx + 1}. &ldquo;{item.q}&rdquo;
                          </strong>
                          <button
                            type="button"
                            onClick={() => {
                              copyToClipboard(item.a, `faq_${fIdx}`);
                              toast.success('Jawaban disalin!');
                            }}
                            className="glass-pill"
                            style={{ padding: '4px 10px', fontSize: '11.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}
                          >
                            {copiedScript === `faq_${fIdx}` ? <Check size={12} color="#27AE60" /> : <Copy size={12} />}
                            <span>{copiedScript === `faq_${fIdx}` ? 'Tersalin!' : 'Salin Jawaban'}</span>
                          </button>
                        </div>
                        <p style={{ fontSize: '13px', color: '#555', margin: 0, lineHeight: 1.6 }}>
                          {item.a}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
      </>
      )}

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
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#86868B', display: 'block', marginBottom: '10px', fontWeight: 600 }}>
                REKENING BANK TUJUAN:
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#86868B', marginBottom: '3px' }}>Nama Bank</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Contoh: BCA / Mandiri / BRI"
                    style={{ width: '100%', padding: '8px 11px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '12.5px', background: '#FFFFFF' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#86868B', marginBottom: '3px' }}>Nomor Rekening *</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Masukkan nomor rekening bank"
                    style={{ width: '100%', padding: '8px 11px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '12.5px', background: '#FFFFFF' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#86868B', marginBottom: '3px' }}>Nama Pemilik Rekening *</label>
                  <input
                    type="text"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    placeholder="Nama sesuai buku tabungan"
                    style={{ width: '100%', padding: '8px 11px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '12.5px', background: '#FFFFFF' }}
                  />
                </div>
              </div>
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
                disabled={isRequestingPayout || payoutAmount < 100000 || payoutAmount > walletBalance || !accountNumber.trim() || !accountHolder.trim()}
                className="btn-apple-black"
                style={{ padding: '11px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}
              >
                {isRequestingPayout ? 'Memproses...' : 'Konfirmasi Tarik'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Explicit Registration Modal for Logged-In Hosts */}
      {showRegisterModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div className="glass-card" style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            padding: '32px',
            maxWidth: '460px',
            width: '100%',
            boxShadow: '0 20px 48px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building size={18} color="#C27803" />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1D1D1F' }}>
                  Daftar Kemitraan Agensi WO
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#86868B' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#6E6E73', lineHeight: 1.5, marginBottom: '20px' }}>
              Silakan lengkapi profil agensi Anda. Data akun dan acara pernikahan Anda yang ada saat ini tetap tersimpan aman.
            </p>

            <form onSubmit={handleExplicitRegisterVendor} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#1D1D1F', display: 'block', marginBottom: '5px' }}>
                  Nama PIC / Pengelola Agensi:
                </label>
                <input
                  type="text"
                  value={regPicName}
                  onChange={(e) => setRegPicName(e.target.value)}
                  placeholder="Contoh: Sarah Pramono"
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#1D1D1F', display: 'block', marginBottom: '5px' }}>
                  Nama Brand Agensi Wedding Organizer:
                </label>
                <input
                  type="text"
                  value={regCompanyName}
                  onChange={(e) => setRegCompanyName(e.target.value)}
                  placeholder="Contoh: Vows & Co. Wedding Planner"
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#1D1D1F', display: 'block', marginBottom: '5px' }}>
                  Kota Domisili Agensi:
                </label>
                <input
                  type="text"
                  value={regCity}
                  onChange={(e) => setRegCity(e.target.value)}
                  placeholder="Contoh: Jakarta / Bandung / Bali"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#1D1D1F', display: 'block', marginBottom: '5px' }}>
                  Nomor WhatsApp Agensi:
                </label>
                <input
                  type="text"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="Contoh: 08123456789"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  disabled={isRegistering}
                  className="glass-pill"
                  style={{ padding: '10px', fontSize: '13px', cursor: 'pointer', textAlign: 'center' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="btn-apple-black"
                  style={{ padding: '10px', fontSize: '13px', cursor: 'pointer', textAlign: 'center' }}
                >
                  {isRegistering ? 'Mendaftarkan...' : 'Aktifkan Kemitraan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
