'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useParams } from 'next/navigation';
import {
  Shield, DollarSign, Calendar, Camera, Users, FileText,
  Wallet, Video, Package, CheckCircle2, AlertCircle, Eye,
  EyeOff, Trash2, Download, ExternalLink, RefreshCw, Plus,
  Sliders, Search, ArrowRight, LogOut, Check, X, Flame,
  Edit, Pencil, ArrowUpRight, ArrowDownRight, Layers, CreditCard,
  Mic, Volume2, Film, Play, Clock
} from 'lucide-react';
import { getClientSession, clearClientSession, getSignedClientToken, authFetch } from '@/lib/auth';
import { EventData, PhotoRecord, InvoiceRecord, PayoutRequest, VideoTestimonialSubmission, UserAccount, EventAddonItem, FilmPresetId, EventPackageTier, VideoWishRecord, getEventRetentionInfo } from '@/lib/types';
import ConfirmModal from '@/components/ConfirmModal';
import { toast } from 'sonner';

export type AdminTab = 'overview' | 'events' | 'moderation' | 'vendors' | 'invoices' | 'payouts' | 'testimonials' | 'addons';

export const ADMIN_SLUG_MAP: Record<string, AdminTab> = {
  'overview': 'overview',
  'ringkasan': 'overview',
  'finansial': 'overview',
  'events': 'events',
  'acara': 'events',
  'moderation': 'moderation',
  'moderasi': 'moderation',
  'media': 'moderation',
  'vendors': 'vendors',
  'vendor': 'vendors',
  'mitra': 'vendors',
  'invoices': 'invoices',
  'invoice': 'invoices',
  'faktur': 'invoices',
  'payouts': 'payouts',
  'payout': 'payouts',
  'pencairan': 'payouts',
  'testimonials': 'testimonials',
  'testimoni': 'testimonials',
  'kurasi': 'testimonials',
  'addons': 'addons',
  'addon': 'addons',
  'add-on': 'addons',
  'katalog': 'addons'
};

function resolveTabFromPath(pathname?: string | null, slugParam?: string | null): AdminTab {
  if (slugParam) {
    const clean = slugParam.toLowerCase().trim();
    if (ADMIN_SLUG_MAP[clean]) return ADMIN_SLUG_MAP[clean];
  }
  if (pathname) {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length >= 2 && parts[0] === 'admin') {
      const sub = parts[1].toLowerCase().trim();
      if (ADMIN_SLUG_MAP[sub]) return ADMIN_SLUG_MAP[sub];
    }
  }
  return 'overview';
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const slugParam = typeof params?.slug === 'string' ? params.slug : undefined;

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>(() => resolveTabFromPath(pathname, slugParam));
  const [loading, setLoading] = useState(true);

  // Sync activeTab with URL path and browser Back/Forward navigation
  useEffect(() => {
    const resolved = resolveTabFromPath(pathname, slugParam);
    setActiveTab(resolved);
  }, [pathname, slugParam]);

  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        const resolved = resolveTabFromPath(window.location.pathname, null);
        setActiveTab(resolved);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToTab = (tab: AdminTab) => {
    setActiveTab(tab);
    setSearchTerm('');
    if (typeof window !== 'undefined') {
      const targetPath = `/admin/${tab}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ tab }, '', targetPath);
      }
    }
  };

  // Data collections
  const [events, setEvents] = useState<EventData[]>([]);
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [videoWishes, setVideoWishes] = useState<VideoWishRecord[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [testimonials, setTestimonials] = useState<VideoTestimonialSubmission[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [addons, setAddons] = useState<EventAddonItem[]>([]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [photoFilterEvent, setPhotoFilterEvent] = useState('all');
  const [moderationMediaType, setModerationMediaType] = useState<'photos' | 'videos' | 'voices'>('photos');

  // -------------------------------------------------------------
  // MODAL STATES
  // -------------------------------------------------------------
  // 1. Events Modal
  const [editEventModalOpen, setEditEventModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<EventData | null>(null);
  const [createEventModalOpen, setCreateEventModalOpen] = useState(false);
  const [newEventForm, setNewEventForm] = useState<Partial<EventData>>({
    title: '',
    coupleOrHost: '',
    eventDate: new Date().toISOString().substring(0, 10),
    location: '',
    packageTier: 'wedding',
    maxGuests: 300,
    shotsPerGuest: 25,
    preset: 'portra',
    revealMode: 'instant'
  });

  // 2. Vendors Modal
  const [editVendorModalOpen, setEditVendorModalOpen] = useState(false);
  const [vendorToEdit, setVendorToEdit] = useState<any | null>(null);
  const [createVendorModalOpen, setCreateVendorModalOpen] = useState(false);
  const [newVendorForm, setNewVendorForm] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    instagram: '',
    partnerTier: 'regular',
    referralCode: '',
    bankName: 'BCA',
    accountNumber: '',
    accountHolder: ''
  });

  // 3. Wallet Balance Adjustment Modal
  const [adjustWalletModalOpen, setAdjustWalletModalOpen] = useState(false);
  const [vendorToAdjust, setVendorToAdjust] = useState<any | null>(null);
  const [walletAdjustType, setWalletAdjustType] = useState<'add' | 'deduct'>('add');
  const [walletAdjustAmount, setWalletAdjustAmount] = useState<number>(100000);
  const [walletAdjustNote, setWalletAdjustNote] = useState('');

  // 4. Invoices Modal
  const [editInvoiceModalOpen, setEditInvoiceModalOpen] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState<InvoiceRecord | null>(null);
  const [createInvoiceModalOpen, setCreateInvoiceModalOpen] = useState(false);
  const [newInvoiceForm, setNewInvoiceForm] = useState<Partial<InvoiceRecord>>({
    buyerName: '',
    buyerEmail: '',
    buyerPhone: '',
    tierId: 'wedding',
    tierName: 'Wedding (300 Tamu)',
    originalPrice: 499000,
    discountAmount: 0,
    finalAmount: 499000,
    paymentMethod: 'qris',
    status: 'paid'
  });

  // 5. Add-ons Modal
  const [editAddonModalOpen, setEditAddonModalOpen] = useState(false);
  const [addonToEdit, setAddonToEdit] = useState<EventAddonItem | null>(null);
  const [createAddonModalOpen, setCreateAddonModalOpen] = useState(false);
  const [newAddonForm, setNewAddonForm] = useState<Partial<EventAddonItem>>({
    name: '',
    category: 'physical_qr',
    description: '',
    price: 350000,
    costPrice: 150000,
    unit: '1 set',
    freeShippingJabodetabek: true,
    isPopular: false,
    isActive: true
  });

  // 6. Photo Inspector Modal
  const [inspectPhotoModalOpen, setInspectPhotoModalOpen] = useState(false);
  const [photoToInspect, setPhotoToInspect] = useState<PhotoRecord | null>(null);

  // 7. Custom Confirm Modal State
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

  // Load Session and All Data on mount
  useEffect(() => {
    const session = getClientSession();
    if (!session || session.role !== 'admin') {
      router.push('/admin/login');
      return;
    }
    setCurrentUser(session);
    loadAllAdminData();
  }, [router]);

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      const [resE, resP, resI, resPay, resT, resV, resAdd, resVid, resVoi] = await Promise.allSettled([
        authFetch('/api/events').then(r => r.json()),
        authFetch('/api/photos?includeHidden=true').then(r => r.json()),
        authFetch('/api/invoices').then(r => r.json()),
        authFetch('/api/payouts').then(r => r.json()),
        authFetch('/api/testimonials').then(r => r.json()),
        authFetch('/api/vendors').then(r => r.json()),
        authFetch('/api/addons').then(r => r.json()),
        authFetch('/api/video-wishes').then(r => r.json()),
        authFetch('/api/voice-notes').then(r => r.json())
      ]);


      if (resE.status === 'fulfilled' && resE.value?.success) setEvents(resE.value.events || []);
      if (resP.status === 'fulfilled' && resP.value?.success) setPhotos(resP.value.photos || []);
      if (resI.status === 'fulfilled' && resI.value?.success) setInvoices(resI.value.invoices || []);
      if (resPay.status === 'fulfilled' && resPay.value?.success) setPayouts(resPay.value.payouts || []);
      if (resT.status === 'fulfilled' && resT.value?.success) setTestimonials(resT.value.testimonials || []);
      if (resV.status === 'fulfilled' && resV.value?.success) setVendors(resV.value.vendors || []);
      if (resAdd.status === 'fulfilled' && resAdd.value?.success) setAddons(resAdd.value.addons || []);
      if (resVid.status === 'fulfilled' && resVid.value?.success) setVideoWishes(resVid.value.videoWishes || resVid.value.wishes || []);
      if (resVoi.status === 'fulfilled' && resVoi.value?.success) setVoiceNotes(resVoi.value.voiceNotes || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearClientSession();
    router.push('/admin/login');
  };

  // -------------------------------------------------------------
  // 1. EVENT CRUD ACTIONS
  // -------------------------------------------------------------
  const handleSaveEditEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventToEdit) return;

    try {
      const res = await authFetch('/api/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...eventToEdit,
          adminAuthorized: true
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Perubahan acara "${eventToEdit.title}" berhasil disimpan!`);
        setEvents(prev => prev.map(item => item.id === eventToEdit.id ? data.event : item));
        setEditEventModalOpen(false);
      } else {
        toast.error(data.error || 'Gagal menyimpan perubahan acara.');
      }
    } catch {
      toast.error('Gagal menghubungi server.');
    }
  };

  const handleCreateNewEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventForm.title || !newEventForm.coupleOrHost) {
      toast.error('Nama acara dan penyelenggara wajib diisi.');
      return;
    }

    try {
      const res = await authFetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newEventForm, adminAuthorized: true })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Acara baru "${data.event.title}" berhasil dibuat!`);
        setEvents(prev => [data.event, ...prev]);
        setCreateEventModalOpen(false);
        setNewEventForm({
          title: '',
          coupleOrHost: '',
          eventDate: new Date().toISOString().substring(0, 10),
          location: '',
          packageTier: 'wedding',
          maxGuests: 300,
          shotsPerGuest: 25,
          preset: 'portra',
          revealMode: 'instant'
        });
      } else {
        toast.error(data.error || 'Gagal membuat acara baru.');
      }
    } catch {
      toast.error('Gagal menghubungi server.');
    }
  };

  const handleDeleteEvent = (eventId: string, title: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Acara Permanen?',
      description: `PERINGATAN KERAS: Hapus permanen acara "${title}" beserta seluruh arsip foto, pesan suara, dan video ucapan di Cloudflare R2 & database? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Hapus Permanen',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await authFetch(`/api/events?id=${encodeURIComponent(eventId)}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            toast.success(`Acara "${title}" beserta seluruh aset medianya berhasil dihapus.`);
            setEvents(prev => prev.filter(e => e.id !== eventId));
          } else {
            toast.error(data.error || 'Gagal menghapus acara.');
          }
        } catch {
          toast.error('Gagal menghapus acara.');
        }
      }
    });
  };

  const handleForceCuciRoll = (eventId: string, title: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Paksa Cuci Roll Instan?',
      description: `Paksa cuci roll & buka seluruh foto acara "${title}" sekarang juga untuk seluruh tamu?`,
      confirmText: 'Buka Roll Sekarang',
      variant: 'warning',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await authFetch('/api/events', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: eventId, revealMode: 'instant', adminAuthorized: true })
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
      }
    });
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
      const res = await authFetch('/api/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: eventId, maxGuests: newTotal, adminAuthorized: true })
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

  // -------------------------------------------------------------
  // 2. VENDOR CRUD & WALLET ACTIONS
  // -------------------------------------------------------------
  const handleSaveEditVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorToEdit) return;

    try {
      const res = await authFetch('/api/vendors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vendorToEdit)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Data mitra "${vendorToEdit.companyName || vendorToEdit.name}" berhasil diperbarui!`);
        setVendors(prev => prev.map(v => v.id === vendorToEdit.id ? data.vendor : v));
        setEditVendorModalOpen(false);
      } else {
        toast.error(data.error || 'Gagal menyimpan perubahan vendor.');
      }
    } catch {
      toast.error('Gagal menghubungi server.');
    }
  };

  const handleCreateNewVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorForm.name) {
      toast.error('Nama PIC / Vendor wajib diisi.');
      return;
    }

    try {
      const payload = {
        name: newVendorForm.name,
        companyName: newVendorForm.companyName || newVendorForm.name,
        email: newVendorForm.email,
        phone: newVendorForm.phone,
        instagram: newVendorForm.instagram,
        partnerTier: newVendorForm.partnerTier,
        referralCode: newVendorForm.referralCode,
        bankDetails: {
          bankName: newVendorForm.bankName,
          accountNumber: newVendorForm.accountNumber,
          accountHolder: newVendorForm.accountHolder || newVendorForm.name
        }
      };

      const res = await authFetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Mitra vendor "${data.vendor.companyName}" berhasil didaftarkan!`);
        setVendors(prev => [data.vendor, ...prev]);
        setCreateVendorModalOpen(false);
        setNewVendorForm({
          name: '',
          companyName: '',
          email: '',
          phone: '',
          instagram: '',
          partnerTier: 'regular',
          referralCode: '',
          bankName: 'BCA',
          accountNumber: '',
          accountHolder: ''
        });
      } else {
        toast.error(data.error || 'Gagal membuat vendor.');
      }
    } catch {
      toast.error('Gagal menghubungi server.');
    }
  };

  const handleSaveWalletAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorToAdjust) return;

    const delta = walletAdjustType === 'add' ? walletAdjustAmount : -walletAdjustAmount;
    try {
      const res = await authFetch('/api/vendors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: vendorToAdjust.id,
          adjustBalance: delta
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Saldo dompet ${vendorToAdjust.companyName} berhasil disesuaikan (${walletAdjustType === 'add' ? '+' : '-'}Rp ${walletAdjustAmount.toLocaleString('id-ID')})!`);
        setVendors(prev => prev.map(v => v.id === vendorToAdjust.id ? data.vendor : v));
        setAdjustWalletModalOpen(false);
      } else {
        toast.error(data.error || 'Gagal mengubah saldo.');
      }
    } catch {
      toast.error('Gagal memproses penyesuaian saldo.');
    }
  };

  const handleDeleteVendor = (vendorId: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Mitra Vendor?',
      description: `Hapus mitra vendor "${name}" dari sistem platform? Seluruh profil dan logo di R2 akan terhapus.`,
      confirmText: 'Hapus Mitra',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await authFetch(`/api/vendors?id=${encodeURIComponent(vendorId)}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            toast.success(`Mitra "${name}" berhasil dihapus.`);
            setVendors(prev => prev.filter(v => v.id !== vendorId));
          } else {
            toast.error(data.error || 'Gagal menghapus vendor.');
          }
        } catch {
          toast.error('Gagal menghapus vendor.');
        }
      }
    });
  };

  // -------------------------------------------------------------
  // 3. INVOICE CRUD ACTIONS
  // -------------------------------------------------------------
  const handleSaveEditInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceToEdit) return;

    try {
      const res = await authFetch('/api/invoices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceToEdit)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Invoice "${invoiceToEdit.invoiceNumber}" berhasil diperbarui!`);
        setInvoices(prev => prev.map(inv => inv.id === invoiceToEdit.id ? data.invoice : inv));
        setEditInvoiceModalOpen(false);
      } else {
        toast.error(data.error || 'Gagal menyimpan invoice.');
      }
    } catch {
      toast.error('Gagal menghubungi server.');
    }
  };

  const handleCreateNewInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvoiceForm.buyerName || !newInvoiceForm.buyerEmail) {
      toast.error('Nama dan email pembeli wajib diisi.');
      return;
    }

    try {
      const payload = {
        ...newInvoiceForm,
        buyerType: 'client',
        originalPrice: Number(newInvoiceForm.originalPrice || newInvoiceForm.finalAmount || 499000),
        finalAmount: Number(newInvoiceForm.finalAmount || newInvoiceForm.originalPrice || 499000),
        orderId: `ord_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`
      };

      const res = await authFetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Invoice baru "${data.invoice.invoiceNumber}" berhasil diterbitkan!`);
        setInvoices(prev => [data.invoice, ...prev]);
        setCreateInvoiceModalOpen(false);
        setNewInvoiceForm({
          buyerName: '',
          buyerEmail: '',
          buyerPhone: '',
          tierId: 'wedding',
          tierName: 'Wedding (300 Tamu)',
          originalPrice: 499000,
          discountAmount: 0,
          finalAmount: 499000,
          paymentMethod: 'qris',
          status: 'paid'
        });
      } else {
        toast.error(data.error || 'Gagal menerbitkan invoice.');
      }
    } catch {
      toast.error('Gagal menghubungi server.');
    }
  };

  const handleForcePaidInvoice = (invoiceId: string, invoiceNum: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Konfirmasi Pembayaran Manual?',
      description: `Konfirmasi pembayaran manual untuk Invoice ${invoiceNum}? Status akan langsung menjadi Lunas.`,
      confirmText: 'Tandai Lunas',
      variant: 'primary',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await authFetch('/api/invoices', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: invoiceId, status: 'paid', paidAt: new Date().toISOString() })
          });
          const data = await res.json();
          if (data.success) {
            toast.success(`Invoice ${invoiceNum} berhasil ditandai LUNAS!`);
            setInvoices(prev => prev.map(i => i.id === invoiceId ? { ...i, status: 'paid', paidAt: new Date().toISOString() } : i));
          } else {
            toast.error(data.error || 'Gagal memperbarui status invoice.');
          }
        } catch {
          toast.error('Gagal memperbarui status invoice.');
        }
      }
    });
  };

  const handleDeleteInvoice = (invoiceId: string, invoiceNum: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Invoice?',
      description: `Hapus invoice ${invoiceNum} secara permanen dari sistem?`,
      confirmText: 'Hapus Invoice',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await authFetch(`/api/invoices?id=${encodeURIComponent(invoiceId)}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            toast.success(`Invoice ${invoiceNum} dihapus.`);
            setInvoices(prev => prev.filter(i => i.id !== invoiceId));
          } else {
            toast.error(data.error || 'Gagal menghapus invoice.');
          }
        } catch {
          toast.error('Gagal menghapus invoice.');
        }
      }
    });
  };

  // -------------------------------------------------------------
  // 4. ADD-ON CRUD ACTIONS
  // -------------------------------------------------------------
  const handleSaveEditAddon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addonToEdit) return;

    try {
      const res = await authFetch('/api/addons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addonToEdit)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Add-on "${addonToEdit.name}" berhasil diperbarui!`);
        setAddons(prev => prev.map(a => a.id === addonToEdit.id ? data.addon : a));
        setEditAddonModalOpen(false);
      } else {
        toast.error(data.error || 'Gagal menyimpan add-on.');
      }
    } catch {
      toast.error('Gagal menghubungi server.');
    }
  };

  const handleCreateNewAddon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddonForm.name || newAddonForm.price === undefined) {
      toast.error('Nama dan harga add-on wajib diisi.');
      return;
    }

    try {
      const res = await authFetch('/api/addons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAddonForm)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Add-on baru "${data.addon.name}" berhasil ditambahkan ke katalog!`);
        setAddons(prev => [...prev, data.addon]);
        setCreateAddonModalOpen(false);
        setNewAddonForm({
          name: '',
          category: 'physical_qr',
          description: '',
          price: 350000,
          costPrice: 150000,
          unit: '1 set',
          freeShippingJabodetabek: true,
          isPopular: false,
          isActive: true
        });
      } else {
        toast.error(data.error || 'Gagal menambahkan add-on.');
      }
    } catch {
      toast.error('Gagal menghubungi server.');
    }
  };

  const handleDeleteAddon = (addonId: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Add-on?',
      description: `Hapus add-on "${name}" dari katalog platform?`,
      confirmText: 'Hapus Add-on',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await authFetch(`/api/addons?id=${encodeURIComponent(addonId)}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            toast.success(`Add-on "${name}" berhasil dihapus.`);
            setAddons(prev => prev.filter(a => a.id !== addonId));
          } else {
            toast.error(data.error || 'Gagal menghapus add-on.');
          }
        } catch {
          toast.error('Gagal menghapus add-on.');
        }
      }
    });
  };

  // -------------------------------------------------------------
  // 5. PHOTO ACTIONS & INSPECT
  // -------------------------------------------------------------
  const handleToggleHidePhoto = async (photoId: string, currentHidden: boolean) => {
    const newStatus = !currentHidden;
    try {
      const res = await authFetch('/api/photos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: photoId, isHidden: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(newStatus ? 'Foto berhasil disensor dari galeri tamu.' : 'Foto dipulihkan ke galeri tamu.');
        setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, isHidden: newStatus } : p));
        if (photoToInspect && photoToInspect.id === photoId) {
          setPhotoToInspect({ ...photoToInspect, isHidden: newStatus });
        }
      }
    } catch {
      toast.error('Gagal memoderasi foto.');
    }
  };

  const handleDeletePhoto = (photoId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Foto Permanen?',
      description: 'Hapus foto ini secara permanen dari server dan Cloudflare R2?',
      confirmText: 'Hapus Permanen',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await authFetch(`/api/photos?id=${encodeURIComponent(photoId)}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            toast.success('Foto dihapus permanen dari database & Cloudflare R2.');
            setPhotos(prev => prev.filter(p => p.id !== photoId));
            if (photoToInspect?.id === photoId) {
              setInspectPhotoModalOpen(false);
            }
          }
        } catch {
          toast.error('Gagal menghapus foto.');
        }
      }
    });
  };

  const handleDeleteVideoWish = (wishId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Video Ucapan?',
      description: 'Hapus video ucapan ini secara permanen dari server dan Cloudflare R2?',
      confirmText: 'Hapus Video',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await authFetch(`/api/video-wishes?id=${encodeURIComponent(wishId)}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            toast.success('Video ucapan berhasil dihapus dari database & Cloudflare R2.');
            setVideoWishes(prev => prev.filter(w => w.id !== wishId));
          } else {
            toast.error(data.error || 'Gagal menghapus video.');
          }
        } catch {
          toast.error('Gagal menghubungi server.');
        }
      }
    });
  };

  const handleDeleteVoiceNote = (voiceId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Pesan Suara?',
      description: 'Hapus pesan suara ini secara permanen dari server dan Cloudflare R2?',
      confirmText: 'Hapus Pesan Suara',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await authFetch(`/api/voice-notes?id=${encodeURIComponent(voiceId)}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            toast.success('Pesan suara berhasil dihapus dari database & Cloudflare R2.');
            setVoiceNotes(prev => prev.filter(v => v.id !== voiceId));
          } else {
            toast.error(data.error || 'Gagal menghapus pesan suara.');
          }
        } catch {
          toast.error('Gagal menghubungi server.');
        }
      }
    });
  };

  // -------------------------------------------------------------
  // 6. PAYOUTS & TESTIMONIALS
  // -------------------------------------------------------------
  const handleApprovePayout = (payoutId: string, vendorName: string, amount: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Setujui Pencairan Komisi?',
      description: `Setujui pencairan komisi Rp ${amount.toLocaleString('id-ID')} untuk ${vendorName}? Pastikan Anda telah mentransfer dana ke rekening yang tertera.`,
      confirmText: 'Setujui & Tandai Lunas',
      variant: 'primary',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await authFetch('/api/payouts', {
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
      }
    });
  };

  const handleRejectPayout = async (payoutId: string) => {
    const reason = prompt('Masukkan alasan penolakan pencairan dana (saldo akan otomatis dikembalikan ke dompet vendor):', 'Nomor rekening bank tidak valid / nama tidak sesuai');
    if (!reason) return;
    try {
      const res = await authFetch('/api/payouts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: payoutId, status: 'rejected', notes: reason })
      });
      const data = await res.json();
      if (data.success) {
        toast.error('Permintaan payout ditolak & saldo dikembalikan ke dompet vendor.');
        setPayouts(prev => prev.map(p => p.id === payoutId ? { ...p, status: 'rejected', notes: reason } : p));
        loadAllAdminData();
      }
    } catch {
      toast.error('Gagal menolak payout.');
    }
  };

  const handleApproveTestimonial = (testiId: string, submitterName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Setujui Video Testimoni?',
      description: `Setujui video testimoni dari ${submitterName}? Bonus komisi Rp 50.000 akan otomatis dicairkan ke saldo mitra.`,
      confirmText: 'Setujui & Cairkan Bonus',
      variant: 'primary',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await authFetch('/api/testimonials', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: testiId,
              status: 'approved',
              adminNotes: 'Video jernih, durasi memenuhi syarat minimal 60 detik.'
            })
          });
          const data = await res.json();
          if (data.success) {
            toast.success(`Testimoni disetujui! Reward Rp 50.000 dikreditkan.`);
            setTestimonials(prev => prev.map(t => t.id === testiId ? { ...t, status: 'approved', rewardPaidAt: new Date().toISOString() } : t));
            loadAllAdminData();
          }
        } catch {
          toast.error('Gagal menyetujui video testimoni.');
        }
      }
    });
  };

  const handleRejectTestimonial = async (testiId: string) => {
    const reason = prompt('Masukkan alasan penolakan kurasi:', 'Durasi video kurang dari 60 detik / visual buram');
    if (!reason) return;
    try {
      const res = await authFetch('/api/testimonials', {
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

  const handleDeletePayout = (payoutId: string, vendorName: string, amount: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Data Penarikan?',
      description: `Hapus data penarikan komisi Rp ${amount.toLocaleString('id-ID')} untuk ${vendorName}? Data akan dihapus permanen.`,
      confirmText: 'Hapus Permanen',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await authFetch(`/api/payouts?id=${encodeURIComponent(payoutId)}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            toast.success(`Data penarikan ${vendorName} berhasil dihapus.`);
            setPayouts(prev => prev.filter(p => p.id !== payoutId));
          } else {
            toast.error(data.error || 'Gagal menghapus penarikan.');
          }
        } catch {
          toast.error('Gagal menghubungi server.');
        }
      }
    });
  };

  const handleDeleteTestimonial = (testiId: string, submitterName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Video Testimoni?',
      description: `Hapus video testimoni dari ${submitterName}?`,
      confirmText: 'Hapus Testimoni',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await authFetch(`/api/testimonials?id=${encodeURIComponent(testiId)}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            toast.success(`Video testimoni dari ${submitterName} berhasil dihapus.`);
            setTestimonials(prev => prev.filter(t => t.id !== testiId));
          } else {
            toast.error(data.error || 'Gagal menghapus video testimoni.');
          }
        } catch {
          toast.error('Gagal menghubungi server.');
        }
      }
    });
  };

  // -------------------------------------------------------------
  // CALCULATIONS & METRICS
  // -------------------------------------------------------------
  const totalGMV = invoices.reduce((acc, curr) => curr.status === 'paid' ? acc + curr.finalAmount : acc, 0);
  const totalVendorPayouts = payouts.filter(p => p.status === 'approved').reduce((acc, curr) => acc + curr.amount, 0);
  const pendingPayoutsTotal = payouts.filter(p => p.status === 'pending').reduce((acc, curr) => acc + curr.amount, 0);
  const netPlatformProfit = totalGMV - totalVendorPayouts;

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

  const filteredVideos = videoWishes.filter(v => {
    if (photoFilterEvent !== 'all' && v.eventId !== photoFilterEvent) return false;
    if (!searchTerm) return true;
    return v.guestName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredVoices = voiceNotes.filter(v => {
    if (photoFilterEvent !== 'all' && v.eventId !== photoFilterEvent) return false;
    if (!searchTerm) return true;
    return v.guestName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredVendors = vendors.filter(v =>
    (v.name && v.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (v.companyName && v.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (v.email && v.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (v.referralCode && v.referralCode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredInvoices = invoices.filter(inv =>
    inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.buyerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.eventId && inv.eventId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Security guard for admin role
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src="/sudut-bingkai-logo.png" alt="Sudut Bingkai" style={{ height: '28px', width: 'auto' }} />
            </Link>
            <span style={{ color: 'rgba(0,0,0,0.15)' }}>/</span>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#1D1D1F', color: '#FFFFFF', padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em' }}>
              <Shield size={12} color="#F59E0B" />
              <span>SUPER ADMIN COMMAND CENTER</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  const fullUrl = `${window.location.origin}/admin/${activeTab}`;
                  navigator.clipboard.writeText(fullUrl);
                  toast.success(`URL halaman disalin: /admin/${activeTab}`);
                }
              }}
              title="Klik untuk menyalin URL langsung halaman ini"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(245, 158, 11, 0.12)',
                color: '#B45309',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '11.5px',
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer'
              }}
            >
              <span>/admin/{activeTab}</span>
            </button>
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
        {/* Navigation Tabs (Responsive Flex-Wrap, No Cutoff) */}
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          alignItems: 'center', 
          gap: '8px', 
          marginBottom: '28px' 
        }}>
          {[
            { id: 'overview', label: 'Ringkasan & Finansial', slug: '/admin/overview', icon: DollarSign, count: null },
            { id: 'events', label: 'Manajemen Acara', slug: '/admin/events', icon: Calendar, count: events.length },
            { id: 'moderation', label: 'Moderasi Media', slug: '/admin/moderation', icon: Camera, count: photos.length + videoWishes.length + voiceNotes.length },
            { id: 'vendors', label: 'Mitra Vendor', slug: '/admin/vendors', icon: Users, count: vendors.length },
            { id: 'invoices', label: 'Pusat Invoice', slug: '/admin/invoices', icon: FileText, count: invoices.length },
            { id: 'payouts', label: 'Pencairan Dana', slug: '/admin/payouts', icon: Wallet, count: payouts.filter(p => p.status === 'pending').length || null, alert: payouts.filter(p => p.status === 'pending').length > 0 },
            { id: 'testimonials', label: 'Kurasi Video (+50k)', slug: '/admin/testimonials', icon: Video, count: testimonials.filter(t => t.status === 'pending').length || null, alert: testimonials.filter(t => t.status === 'pending').length > 0 },
            { id: 'addons', label: 'Katalog Add-on', slug: '/admin/addons', icon: Package, count: addons.length }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => navigateToTab(tab.id as AdminTab)}
                title={`Buka ${tab.label} (${tab.slug})`}
                className="glass-pill"
                style={{
                  background: isActive ? '#1D1D1F' : 'rgba(255, 255, 255, 0.7)',
                  color: isActive ? '#FFFFFF' : '#1D1D1F',
                  padding: '8px 14px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
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
                  Margin platform: ~78%
                </span>
              </div>

              <div className="glass-card" style={{ padding: '24px', borderRadius: '20px' }}>
                <span className="font-mono-film" style={{ color: '#86868B', fontSize: '11px', display: 'block', marginBottom: '6px' }}>
                  KOMISI MITRA VENDOR
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
                  DATABASE PLATFORM
                </span>
                <strong style={{ fontSize: '28px', color: '#1D1D1F', display: 'block', marginBottom: '6px' }}>
                  {events.length} Acara • {photos.length} Foto
                </strong>
                <span style={{ fontSize: '12px', color: '#515154' }}>
                  {vendors.length} Vendor • {addons.length} Add-on Fisik
                </span>
              </div>
            </div>

            {/* Quick Action Alerts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              <div className="glass-card" style={{ padding: '26px', borderRadius: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0 }}>Antrean Pencairan Dana</h3>
                  <button onClick={() => navigateToTab('payouts')} className="glass-pill" style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}>
                    Buka Payouts
                  </button>
                </div>
                {payouts.filter(p => p.status === 'pending').length === 0 ? (
                  <p style={{ color: '#86868B', fontSize: '13px', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Check size={14} color="#10B981" /> Tidak ada permintaan penarikan yang menunggu transfer.
                  </p>
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

              <div className="glass-card" style={{ padding: '26px', borderRadius: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0 }}>Kurasi Video Testimoni (+50k)</h3>
                  <button onClick={() => navigateToTab('testimonials')} className="glass-pill" style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}>
                    Buka Kurasi
                  </button>
                </div>
                {testimonials.filter(t => t.status === 'pending').length === 0 ? (
                  <p style={{ color: '#86868B', fontSize: '13px', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Check size={14} color="#10B981" /> Seluruh video testimoni telah dikurasi.
                  </p>
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
        {/* TAB 2: EVENTS MANAGEMENT & FULL CRUD */}
        {/* ======================================================== */}
        {activeTab === 'events' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Pusat Kelola Acara ({events.length})</h2>
                <span style={{ fontSize: '13px', color: '#6E6E73' }}>Edit detail acara, ubah paket/kuota pax, cuci roll instan, dan kontrol penuh</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ position: 'relative', width: '260px' }}>
                  <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#86868B' }} />
                  <input
                    type="text"
                    placeholder="Cari acara / host / ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="glass-input"
                    style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '12px', fontSize: '13px' }}
                  />
                </div>
                <button
                  onClick={() => setCreateEventModalOpen(true)}
                  className="btn-apple-black"
                  style={{ padding: '9px 16px', fontSize: '13px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={15} />
                  <span>Buat Acara Baru</span>
                </button>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '0', borderRadius: '20px', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: '#86868B' }}>ACARA & HOST</th>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: '#86868B' }}>TANGGAL & VENUE</th>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: '#86868B' }}>PAKET & KUOTA</th>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: '#86868B' }}>STATUS ROLL</th>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: '#86868B' }}>AKSI ADMIN (CRUD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.map(e => (
                      <tr key={e.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                        <td style={{ padding: '16px 18px' }}>
                          <strong style={{ fontSize: '14px', color: '#1D1D1F', display: 'block' }}>{e.title}</strong>
                          <span style={{ fontSize: '11px', color: '#86868B' }}>ID: <code>{e.id}</code> • Host: {e.coupleOrHost}</span>
                        </td>
                        <td style={{ padding: '16px 18px' }}>
                          <span style={{ display: 'block', fontWeight: 500 }}>{new Date(e.eventDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          <span style={{ fontSize: '11px', color: '#86868B', display: 'block', marginBottom: '4px' }}>{e.location || 'Lokasi Belum Diatur'}</span>
                          {(() => {
                            const ret = getEventRetentionInfo(e.eventDate, e.packageTier);
                            return (
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                padding: '2px 7px',
                                borderRadius: '4px',
                                background: ret.badgeBg,
                                color: ret.badgeColor,
                                border: `1px solid ${ret.badgeColor}33`
                              }}>
                                {ret.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td style={{ padding: '16px 18px' }}>
                          <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{e.packageTier || 'wedding'}</span>
                          <span style={{ fontSize: '11px', color: '#86868B', display: 'block' }}>
                            {e.maxGuests} Tamu • {e.shotsPerGuest} Rol • Preset: {e.preset}
                          </span>
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => {
                                setEventToEdit({ ...e });
                                setEditEventModalOpen(true);
                              }}
                              className="glass-pill"
                              style={{ padding: '6px 10px', fontSize: '11.5px', cursor: 'pointer', color: '#000000', fontWeight: 600 }}
                              title="Edit Data Acara Lengkap"
                            >
                              <Pencil size={12} style={{ marginRight: '4px' }} />
                              Edit
                            </button>

                            <button
                              onClick={() => handleAddPax(e.id, e.maxGuests, e.title)}
                              className="glass-pill"
                              style={{ padding: '6px 10px', fontSize: '11.5px', cursor: 'pointer', color: '#2563EB' }}
                              title="Suntik kuota tamu gratis"
                            >
                              +Pax
                            </button>

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
                              Live
                            </Link>

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
        {/* TAB 3: MULTI-MEDIA MODERATION & CENSOR SHIELD */}
        {/* ======================================================== */}
        {activeTab === 'moderation' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
                  Moderasi Multi-Media ({photos.length} Foto, {videoWishes.length} Video, {voiceNotes.length} Suara)
                </h2>
                <span style={{ fontSize: '13px', color: '#6E6E73' }}>
                  Inspeksi foto resolusi penuh, video ucapan 15 detik, serta sensor atau hapus konten tidak layak
                </span>
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

            {/* Media Type Selector */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setModerationMediaType('photos')}
                className="glass-pill"
                style={{
                  padding: '7px 16px',
                  borderRadius: '999px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: moderationMediaType === 'photos' ? '#1D1D1F' : '#FFFFFF',
                  color: moderationMediaType === 'photos' ? '#FFFFFF' : '#1D1D1F',
                  border: '1px solid rgba(0,0,0,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Camera size={13} />
                <span>Foto Tamu ({filteredPhotos.length})</span>
              </button>

              <button
                onClick={() => setModerationMediaType('videos')}
                className="glass-pill"
                style={{
                  padding: '7px 16px',
                  borderRadius: '999px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: moderationMediaType === 'videos' ? '#C27803' : '#FFFFFF',
                  color: moderationMediaType === 'videos' ? '#FFFFFF' : '#1D1D1F',
                  border: '1px solid rgba(0,0,0,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Film size={13} />
                <span>Video Ucapan ({filteredVideos.length})</span>
              </button>

              <button
                onClick={() => setModerationMediaType('voices')}
                className="glass-pill"
                style={{
                  padding: '7px 16px',
                  borderRadius: '999px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: moderationMediaType === 'voices' ? '#C27803' : '#FFFFFF',
                  color: moderationMediaType === 'voices' ? '#FFFFFF' : '#1D1D1F',
                  border: '1px solid rgba(0,0,0,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Mic size={13} />
                <span>Pesan Suara ({filteredVoices.length})</span>
              </button>
            </div>

            {/* SUB-VIEW 1: PHOTOS */}
            {moderationMediaType === 'photos' && (
              filteredPhotos.length === 0 ? (
                <div className="glass-card" style={{ padding: '60px 20px', textAlign: 'center', color: '#86868B', borderRadius: '20px' }}>
                  <Camera size={44} style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <p>Belum ada foto yang cocok dengan filter ini.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                  {filteredPhotos.map(p => (
                    <div key={p.id} className="glass-card" style={{ padding: '10px', borderRadius: '16px', position: 'relative', opacity: p.isHidden ? 0.6 : 1 }}>
                      <div
                        onClick={() => {
                          setPhotoToInspect(p);
                          setInspectPhotoModalOpen(true);
                        }}
                        style={{ width: '100%', aspectRatio: '3/4', borderRadius: '12px', overflow: 'hidden', background: '#000', marginBottom: '8px', position: 'relative', cursor: 'pointer' }}
                      >
                        <img src={p.imageData} alt={p.guestName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {p.isHidden && (
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(239, 68, 68, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontWeight: 700, fontSize: '12px' }}>
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
              )
            )}

            {/* SUB-VIEW 2: VIDEO WISHES */}
            {moderationMediaType === 'videos' && (
              filteredVideos.length === 0 ? (
                <div className="glass-card" style={{ padding: '60px 20px', textAlign: 'center', color: '#86868B', borderRadius: '20px' }}>
                  <Film size={44} style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <p>Belum ada video ucapan yang cocok dengan filter ini.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
                  {filteredVideos.map(v => (
                    <div key={v.id} className="glass-card" style={{ padding: '12px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ width: '100%', aspectRatio: '9/16', maxHeight: '280px', borderRadius: '12px', overflow: 'hidden', background: '#000' }}>
                        <video
                          src={v.videoUrl}
                          controls
                          preload="metadata"
                          playsInline
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      <div style={{ fontSize: '12px' }}>
                        <strong style={{ display: 'block', color: '#1D1D1F' }}>{v.guestName}</strong>
                        <span style={{ fontSize: '10.5px', color: '#86868B' }}>Acara: {v.eventId} • {v.durationSeconds} dtk</span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <a
                          href={v.videoUrl}
                          download={`video-${v.guestName}.mp4`}
                          className="glass-pill"
                          style={{ flex: 1, padding: '6px', fontSize: '11px', textDecoration: 'none', color: '#1D1D1F', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                        >
                          <Download size={12} />
                          <span>Unduh</span>
                        </a>
                        <button
                          onClick={() => handleDeleteVideoWish(v.id)}
                          className="glass-pill"
                          style={{ padding: '6px 8px', color: '#E11D48', cursor: 'pointer' }}
                          title="Hapus Video Permanen"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* SUB-VIEW 3: VOICE NOTES */}
            {moderationMediaType === 'voices' && (
              filteredVoices.length === 0 ? (
                <div className="glass-card" style={{ padding: '60px 20px', textAlign: 'center', color: '#86868B', borderRadius: '20px' }}>
                  <Mic size={44} style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <p>Belum ada pesan suara yang cocok dengan filter ini.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {filteredVoices.map(v => (
                    <div key={v.id} className="glass-card" style={{ padding: '14px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(194, 120, 3, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Volume2 size={16} color="#C27803" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong style={{ fontSize: '13px', color: '#1D1D1F', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {v.guestName}
                          </strong>
                          <span style={{ fontSize: '10.5px', color: '#86868B' }}>Acara: {v.eventId} • {v.duration || 15} dtk</span>
                        </div>
                      </div>

                      <audio controls src={v.audioUrl} style={{ width: '100%', height: '36px', borderRadius: '8px' }} />

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <a
                          href={v.audioUrl}
                          download={`suara-${v.guestName}.webm`}
                          className="glass-pill"
                          style={{ flex: 1, padding: '6px', fontSize: '11px', textDecoration: 'none', color: '#1D1D1F', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                        >
                          <Download size={12} />
                          <span>Unduh</span>
                        </a>
                        <button
                          onClick={() => handleDeleteVoiceNote(v.id)}
                          className="glass-pill"
                          style={{ padding: '6px 8px', color: '#E11D48', cursor: 'pointer' }}
                          title="Hapus Rekaman Suara"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: VENDOR PARTNER COMMAND CENTER */}
        {/* ======================================================== */}
        {activeTab === 'vendors' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Mitra Vendor & Wedding Organizer ({vendors.length})</h2>
                <span style={{ fontSize: '13px', color: '#6E6E73' }}>Atur tier komisi (12%/15%/20%), sesuaikan saldo dompet, kuota grosir, & rekening</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ position: 'relative', width: '240px' }}>
                  <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#86868B' }} />
                  <input
                    type="text"
                    placeholder="Cari agensi / referral..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="glass-input"
                    style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '12px', fontSize: '13px' }}
                  />
                </div>
                <button
                  onClick={() => setCreateVendorModalOpen(true)}
                  className="btn-apple-black"
                  style={{ padding: '9px 16px', fontSize: '13px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={15} />
                  <span>Tambah Vendor Baru</span>
                </button>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '0', borderRadius: '20px', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: '#86868B' }}>NAMA AGENSI / WO</th>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: '#86868B' }}>KONTAK & INSTAGRAM</th>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: '#86868B' }}>TIER & REFERRAL</th>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: '#86868B' }}>SALDO & GROSIR</th>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: '#86868B' }}>AKSI ADMIN (CRUD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVendors.map(v => (
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
                          <span style={{
                            background: v.partnerTier === 'vip' ? 'rgba(234, 179, 8, 0.15)' : v.partnerTier === 'pro' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(0,0,0,0.06)',
                            color: v.partnerTier === 'vip' ? '#B45309' : v.partnerTier === 'pro' ? '#1D4ED8' : '#374151',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '999px',
                            marginRight: '6px'
                          }}>
                            {v.partnerTier === 'vip' ? 'VIP (20%)' : v.partnerTier === 'pro' ? 'Pro (15%)' : 'Regular (12%)'}
                          </span>
                          <code style={{ fontSize: '12px', fontWeight: 700 }}>{v.referralCode || 'NO-CODE'}</code>
                        </td>
                        <td style={{ padding: '16px 18px' }}>
                          <strong style={{ color: '#10B981', fontSize: '14px', display: 'block' }}>
                            Rp {(v.walletBalance || 0).toLocaleString('id-ID')}
                          </strong>
                          <span style={{ fontSize: '11px', color: '#86868B' }}>
                            Token: <strong>{v.wholesaleTokens || 0}</strong> • Total Dihasilkan: Rp {(v.totalEarnings || 0).toLocaleString('id-ID')}
                          </span>
                        </td>
                        <td style={{ padding: '16px 18px' }}>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => {
                                setVendorToEdit({ ...v });
                                setEditVendorModalOpen(true);
                              }}
                              className="glass-pill"
                              style={{ padding: '6px 10px', fontSize: '11.5px', cursor: 'pointer', color: '#000000', fontWeight: 600 }}
                              title="Edit Profil Mitra"
                            >
                              <Pencil size={12} style={{ marginRight: '4px' }} />
                              Edit
                            </button>

                            <button
                              onClick={() => {
                                setVendorToAdjust(v);
                                setWalletAdjustType('add');
                                setWalletAdjustAmount(100000);
                                setWalletAdjustNote('');
                                setAdjustWalletModalOpen(true);
                              }}
                              className="glass-pill"
                              style={{ padding: '6px 10px', fontSize: '11.5px', cursor: 'pointer', color: '#059669', borderColor: '#10B981', fontWeight: 600 }}
                              title="Sesuaikan Saldo Dompet"
                            >
                              ± Saldo
                            </button>

                            {v.phone && (
                              <a
                                href={`https://wa.me/${(v.phone || '').replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="glass-pill"
                                style={{ padding: '6px 10px', fontSize: '11.5px', textDecoration: 'none', color: '#25D366' }}
                              >
                                WA
                              </a>
                            )}

                            <button
                              onClick={() => handleDeleteVendor(v.id, v.companyName || v.name)}
                              className="glass-pill"
                              style={{ padding: '6px 8px', fontSize: '11.5px', cursor: 'pointer', color: '#E11D48' }}
                              title="Hapus Vendor"
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
        {/* TAB 5: INVOICES & RECONCILIATION */}
        {/* ======================================================== */}
        {activeTab === 'invoices' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Pusat Invoice & Tagihan ({invoices.length})</h2>
                <span style={{ fontSize: '13px', color: '#6E6E73' }}>Rekonsiliasi pembayaran, edit status tagihan, ubah nominal, dan kelola invoice</span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ position: 'relative', width: '240px' }}>
                  <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#86868B' }} />
                  <input
                    type="text"
                    placeholder="Cari no. invoice / nama..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="glass-input"
                    style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '12px', fontSize: '13px' }}
                  />
                </div>
                <button
                  onClick={() => setCreateInvoiceModalOpen(true)}
                  className="btn-apple-black"
                  style={{ padding: '9px 16px', fontSize: '13px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={15} />
                  <span>Buat Invoice Manual</span>
                </button>
              </div>
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
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: '#86868B' }}>AKSI ADMIN (CRUD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map(inv => (
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
                            <span style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <Check size={11} strokeWidth={2.5} /> LUNAS
                            </span>
                          ) : inv.status === 'cancelled' ? (
                            <span style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#DC2626', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <X size={11} strokeWidth={2.5} /> BATAL
                            </span>
                          ) : (
                            <span style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#D97706', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <Clock size={11} /> MENUNGGU
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '16px 18px' }}>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => {
                                setInvoiceToEdit({ ...inv });
                                setEditInvoiceModalOpen(true);
                              }}
                              className="glass-pill"
                              style={{ padding: '6px 10px', fontSize: '11.5px', cursor: 'pointer', color: '#000000', fontWeight: 600 }}
                              title="Edit Data Invoice"
                            >
                              <Pencil size={12} style={{ marginRight: '4px' }} />
                              Edit
                            </button>

                            {inv.status !== 'paid' && (
                              <button
                                onClick={() => handleForcePaidInvoice(inv.id, inv.invoiceNumber)}
                                className="glass-pill"
                                style={{ padding: '6px 10px', fontSize: '11.5px', cursor: 'pointer', color: '#059669', borderColor: '#10B981', fontWeight: 600 }}
                              >
                                Tandai Lunas
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

                            <button
                              onClick={() => handleDeleteInvoice(inv.id, inv.invoiceNumber)}
                              className="glass-pill"
                              style={{ padding: '6px 8px', fontSize: '11.5px', cursor: 'pointer', color: '#E11D48' }}
                              title="Hapus Invoice"
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
                            <span style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <Check size={11} strokeWidth={2.5} /> DITRANSFER
                            </span>
                          ) : p.status === 'rejected' ? (
                            <span style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#DC2626', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <X size={11} strokeWidth={2.5} /> DITOLAK
                            </span>
                          ) : (
                            <span style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#D97706', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <Clock size={11} /> MENUNGGU TRANSFER
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '16px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {p.status === 'pending' && (
                              <>
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
                              </>
                            )}
                            {p.status !== 'pending' && (
                              <span style={{ fontSize: '11.5px', color: '#86868B', marginRight: '4px' }}>
                                {p.processedAt ? new Date(p.processedAt).toLocaleDateString('id-ID') : '-'}
                              </span>
                            )}
                            <button
                              onClick={() => handleDeletePayout(p.id, p.vendorName, p.amount)}
                              className="glass-pill"
                              style={{ padding: '6px 8px', fontSize: '11.5px', cursor: 'pointer', color: '#E11D48' }}
                              title="Hapus Data Penarikan"
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
                        <span style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669', fontSize: '10.5px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <Check size={11} strokeWidth={2.5} /> Disetujui (+50k)
                        </span>
                      ) : t.status === 'rejected' ? (
                        <span style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#DC2626', fontSize: '10.5px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <X size={11} strokeWidth={2.5} /> Ditolak
                        </span>
                      ) : (
                        <span style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#D97706', fontSize: '10.5px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <Clock size={11} /> Menunggu Kurasi
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

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '14px', marginTop: 'auto', gap: '8px' }}>
                    {t.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
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
                      <div style={{ fontSize: '11px', color: '#86868B', flex: 1 }}>
                        Catatan: {t.adminNotes || 'Selesai diproses.'}
                      </div>
                    )}
                    <button
                      onClick={() => handleDeleteTestimonial(t.id, t.submitterName)}
                      className="glass-pill"
                      style={{ padding: '8px 10px', fontSize: '12px', color: '#E11D48', cursor: 'pointer' }}
                      title="Hapus Video Testimoni"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 8: PHYSICAL ADDONS FULL CRUD */}
        {/* ======================================================== */}
        {activeTab === 'addons' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Katalog Add-on Fisik ({addons.length})</h2>
                <span style={{ fontSize: '13px', color: '#6E6E73' }}>Kelola standing akrilik QR tamu, roll-up banner, dan rental hardware TV slideshow (CRUD Penuh)</span>
              </div>

              <button
                onClick={() => setCreateAddonModalOpen(true)}
                className="btn-apple-black"
                style={{ padding: '9px 16px', fontSize: '13px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={15} />
                <span>Tambah Add-on Baru</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '18px' }}>
              {addons.map(item => {
                const profitMargin = item.costPrice ? item.price - item.costPrice : null;
                return (
                  <div key={item.id} className="glass-card" style={{ padding: '24px', borderRadius: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span className="font-mono-film" style={{ color: '#C27803', fontSize: '11px', textTransform: 'uppercase' }}>
                          {item.category.replace('_', ' ')}
                        </span>
                        <span style={{
                          background: item.isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: item.isActive ? '#059669' : '#DC2626',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '999px'
                        }}>
                          {item.isActive ? 'Aktif' : 'Non-aktif'}
                        </span>
                      </div>

                      <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px' }}>{item.name}</h3>
                      <p style={{ fontSize: '12.5px', color: '#515154', lineHeight: 1.5, margin: '0 0 14px 0' }}>
                        {item.description}
                      </p>

                      <div style={{ background: 'rgba(0,0,0,0.03)', padding: '12px 14px', borderRadius: '12px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '12px', color: '#86868B' }}>Harga Jual:</span>
                          <strong style={{ fontSize: '15px', color: '#10B981' }}>{item.priceFormatted || `Rp ${item.price.toLocaleString('id-ID')}`}</strong>
                        </div>
                        {item.costPrice !== undefined && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#86868B' }}>
                            <span>Modal Cetak/Vendor:</span>
                            <span>Rp {item.costPrice.toLocaleString('id-ID')}</span>
                          </div>
                        )}
                        {profitMargin !== null && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#2563EB', fontWeight: 600, borderTop: '1px dashed rgba(0,0,0,0.08)', paddingTop: '4px', marginTop: '4px' }}>
                            <span>Margin Keuntungan:</span>
                            <span>+Rp {profitMargin.toLocaleString('id-ID')} ({Math.round((profitMargin / item.price) * 100)}%)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '14px' }}>
                      <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {item.freeShippingJabodetabek ? (
                          <>
                            <Check size={11} strokeWidth={2.5} />
                            <span>Gratis Ongkir Jabodetabek</span>
                          </>
                        ) : (
                          'Ongkir Reguler'
                        )}
                      </span>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => {
                            setAddonToEdit({ ...item });
                            setEditAddonModalOpen(true);
                          }}
                          className="glass-pill"
                          style={{ padding: '6px 12px', fontSize: '11.5px', cursor: 'pointer', fontWeight: 600 }}
                        >
                          <Pencil size={12} style={{ marginRight: '4px' }} />
                          Edit
                        </button>

                        <button
                          onClick={() => handleDeleteAddon(item.id, item.name)}
                          className="glass-pill"
                          style={{ padding: '6px 8px', color: '#E11D48', cursor: 'pointer' }}
                          title="Hapus Add-on"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* MODAL 1: EDIT EVENT */}
      {/* ======================================================== */}
      {editEventModalOpen && eventToEdit && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card" style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#FFFFFF', padding: '28px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Edit Detail Acara</h3>
                <span style={{ fontSize: '12px', color: '#86868B' }}>ID Acara: <code>{eventToEdit.id}</code></span>
              </div>
              <button onClick={() => setEditEventModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEditEvent} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Nama Acara</label>
                  <input
                    type="text"
                    required
                    value={eventToEdit.title}
                    onChange={(e) => setEventToEdit({ ...eventToEdit, title: e.target.value })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Nama Pengantin / Host</label>
                  <input
                    type="text"
                    required
                    value={eventToEdit.coupleOrHost}
                    onChange={(e) => setEventToEdit({ ...eventToEdit, coupleOrHost: e.target.value })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Tanggal Acara</label>
                  <input
                    type="date"
                    value={eventToEdit.eventDate ? eventToEdit.eventDate.substring(0, 10) : ''}
                    onChange={(e) => setEventToEdit({ ...eventToEdit, eventDate: new Date(e.target.value).toISOString() })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Lokasi / Gedung</label>
                  <input
                    type="text"
                    value={eventToEdit.location || ''}
                    onChange={(e) => setEventToEdit({ ...eventToEdit, location: e.target.value })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Paket Tier</label>
                  <select
                    value={eventToEdit.packageTier || 'wedding'}
                    onChange={(e) => setEventToEdit({ ...eventToEdit, packageTier: e.target.value as EventPackageTier })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px', background: '#FFFFFF' }}
                  >
                    <option value="starter">Starter / Gratis (5 Tamu - Rp 0)</option>
                    <option value="intimate">Intimate Party (50 Tamu - Rp 129.000)</option>
                    <option value="wedding">Wedding Resepsi (300 Tamu - Rp 499.000)</option>
                    <option value="unlimited">Grand / Unlimited (1000 Tamu - Rp 999.000)</option>
                    <option value="free">Legacy: Free Test (2 Tamu)</option>
                    <option value="mini">Legacy: Mini (25 Tamu)</option>
                    <option value="small">Legacy: Small (50 Tamu)</option>
                    <option value="party">Legacy: Party (75 Tamu)</option>
                    <option value="event">Legacy: Event (150 Tamu)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Maks Tamu (Pax)</label>
                  <input
                    type="number"
                    value={eventToEdit.maxGuests}
                    onChange={(e) => setEventToEdit({ ...eventToEdit, maxGuests: Number(e.target.value) })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Rol per Tamu</label>
                  <input
                    type="number"
                    value={eventToEdit.shotsPerGuest}
                    onChange={(e) => setEventToEdit({ ...eventToEdit, shotsPerGuest: Number(e.target.value) })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Preset Default</label>
                  <select
                    value={eventToEdit.preset || 'portra'}
                    onChange={(e) => setEventToEdit({ ...eventToEdit, preset: e.target.value as FilmPresetId })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px', background: '#FFFFFF' }}
                  >
                    <option value="portra">Kodak Portra 400 (Warm Classic)</option>
                    <option value="funsaver">Kodak FunSaver (Disposable)</option>
                    <option value="quicksnap">Fuji QuickSnap (Cool Green)</option>
                    <option value="ektar">Kodak Ektar 100 (Vivid)</option>
                    <option value="cinestill">CineStill 800T (Halation)</option>
                    <option value="ilford">Ilford HP5 (B&W Classic)</option>
                    <option value="agfa">Agfa Vista (Vintage Pop)</option>
                    <option value="trix">Kodak Tri-X (Deep Grain)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Mode Buka Foto (Cuci Roll)</label>
                  <select
                    value={eventToEdit.revealMode}
                    onChange={(e) => setEventToEdit({ ...eventToEdit, revealMode: e.target.value as any })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px', background: '#FFFFFF' }}
                  >
                    <option value="instant">Instant (Langsung Muncul di Galeri)</option>
                    <option value="delayed">Delayed (Tunggu Waktu Acara Selesai)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Fitur Ucapan Penutup Rol Tamu</label>
                  <select
                    value={eventToEdit.closingWishType || (eventToEdit.packageTier === 'wedding' || eventToEdit.packageTier === 'unlimited' ? 'video' : 'voice')}
                    onChange={(e) => setEventToEdit({ ...eventToEdit, closingWishType: e.target.value as any })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px', background: '#FFFFFF' }}
                  >
                    <option value="video">Video Ucapan 15 Detik (Eksklusif)</option>
                    <option value="voice">Rekaman Pesan Suara 15 Detik</option>
                    <option value="none">Nonaktifkan (Tanpa Ucapan)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Custom Frame URL (PNG Transparan)</label>
                  <input
                    type="text"
                    placeholder="https://.../frame.png"
                    value={eventToEdit.customFrameUrl || ''}
                    onChange={(e) => setEventToEdit({ ...eventToEdit, customFrameUrl: e.target.value })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setEditEventModalOpen(false)}
                  className="glass-pill"
                  style={{ padding: '10px 18px', fontSize: '13px', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-apple-black"
                  style={{ padding: '10px 22px', fontSize: '13px', borderRadius: '12px' }}
                >
                  Simpan Perubahan Acara
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: CREATE EVENT (MANUAL ADMIN) */}
      {/* ======================================================== */}
      {createEventModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card" style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#FFFFFF', padding: '28px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Buat Acara Baru (Manual Admin)</h3>
                <span style={{ fontSize: '12px', color: '#86868B' }}>Daftarkan acara klien/pengantin langsung tanpa lewat form checkout</span>
              </div>
              <button onClick={() => setCreateEventModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateNewEvent} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Nama Acara</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Pernikahan Kevin & Cindy"
                    value={newEventForm.title}
                    onChange={(e) => setNewEventForm({ ...newEventForm, title: e.target.value })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Penyelenggara / Pengantin</label>
                  <input
                    type="text"
                    required
                    placeholder="Kevin & Cindy"
                    value={newEventForm.coupleOrHost}
                    onChange={(e) => setNewEventForm({ ...newEventForm, coupleOrHost: e.target.value })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Tanggal Acara</label>
                  <input
                    type="date"
                    value={newEventForm.eventDate}
                    onChange={(e) => setNewEventForm({ ...newEventForm, eventDate: e.target.value })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Lokasi / Gedung</label>
                  <input
                    type="text"
                    placeholder="Grand Ballroom Kempinski, Jakarta"
                    value={newEventForm.location}
                    onChange={(e) => setNewEventForm({ ...newEventForm, location: e.target.value })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Paket</label>
                  <select
                    value={newEventForm.packageTier}
                    onChange={(e) => {
                      const tierKey = e.target.value as any;
                      const defaults: Record<string, { maxGuests: number; shotsPerGuest: number }> = {
                        starter: { maxGuests: 5, shotsPerGuest: 10 },
                        intimate: { maxGuests: 50, shotsPerGuest: 20 },
                        wedding: { maxGuests: 300, shotsPerGuest: 25 },
                        unlimited: { maxGuests: 1000, shotsPerGuest: 36 },
                      };
                      const def = defaults[tierKey];
                      setNewEventForm({
                        ...newEventForm,
                        packageTier: tierKey,
                        ...(def ? { maxGuests: def.maxGuests, shotsPerGuest: def.shotsPerGuest } : {})
                      });
                    }}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px', background: '#FFFFFF' }}
                  >
                    <option value="starter">Starter / Gratis (5 Tamu - Rp 0)</option>
                    <option value="intimate">Intimate Party (50 Tamu - Rp 129.000)</option>
                    <option value="wedding">Wedding Resepsi (300 Tamu - Rp 499.000)</option>
                    <option value="unlimited">Grand / Unlimited (1000 Tamu - Rp 999.000)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Maks Tamu (Pax)</label>
                  <input
                    type="number"
                    value={newEventForm.maxGuests}
                    onChange={(e) => setNewEventForm({ ...newEventForm, maxGuests: Number(e.target.value) })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Rol per Tamu</label>
                  <input
                    type="number"
                    value={newEventForm.shotsPerGuest}
                    onChange={(e) => setNewEventForm({ ...newEventForm, shotsPerGuest: Number(e.target.value) })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Fitur Ucapan Penutup Rol Tamu</label>
                <select
                  value={newEventForm.closingWishType || (newEventForm.packageTier === 'wedding' || newEventForm.packageTier === 'unlimited' ? 'video' : 'voice')}
                  onChange={(e) => setNewEventForm({ ...newEventForm, closingWishType: e.target.value as any })}
                  className="glass-input"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px', background: '#FFFFFF' }}
                >
                  <option value="video">Video Ucapan 15 Detik (Eksklusif Wedding/VIP)</option>
                  <option value="voice">Rekaman Pesan Suara 15 Detik (Default Party/Event)</option>
                  <option value="none">Nonaktifkan (Tanpa Ucapan)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setCreateEventModalOpen(false)}
                  className="glass-pill"
                  style={{ padding: '10px 18px', fontSize: '13px', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-apple-black"
                  style={{ padding: '10px 22px', fontSize: '13px', borderRadius: '12px' }}
                >
                  Terbitkan Acara Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: EDIT VENDOR */}
      {/* ======================================================== */}
      {editVendorModalOpen && vendorToEdit && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#FFFFFF', padding: '28px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Edit Mitra Vendor (WO)</h3>
                <span style={{ fontSize: '12px', color: '#86868B' }}>ID: <code>{vendorToEdit.id}</code></span>
              </div>
              <button onClick={() => setEditVendorModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEditVendor} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Nama Agensi / Perusahaan</label>
                  <input
                    type="text"
                    required
                    value={vendorToEdit.companyName || ''}
                    onChange={(e) => setVendorToEdit({ ...vendorToEdit, companyName: e.target.value })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Nama PIC</label>
                  <input
                    type="text"
                    required
                    value={vendorToEdit.name || ''}
                    onChange={(e) => setVendorToEdit({ ...vendorToEdit, name: e.target.value })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Email</label>
                  <input
                    type="email"
                    required
                    value={vendorToEdit.email || ''}
                    onChange={(e) => setVendorToEdit({ ...vendorToEdit, email: e.target.value })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>No. WhatsApp / Telepon</label>
                  <input
                    type="text"
                    value={vendorToEdit.phone || ''}
                    onChange={(e) => setVendorToEdit({ ...vendorToEdit, phone: e.target.value })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Level Tier Kemitraan</label>
                  <select
                    value={vendorToEdit.partnerTier || 'regular'}
                    onChange={(e) => {
                      const newTier = e.target.value;
                      const rate = newTier === 'vip' ? 0.20 : newTier === 'pro' ? 0.15 : 0.12;
                      setVendorToEdit({ ...vendorToEdit, partnerTier: newTier, commissionRate: rate });
                    }}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px', background: '#FFFFFF' }}
                  >
                    <option value="regular">Regular Partner (12% Komisi)</option>
                    <option value="pro">Pro Partner (15% Komisi)</option>
                    <option value="vip">VIP Platinum (20% Komisi)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Kode Referral (Kupon 10% Tamu)</label>
                  <input
                    type="text"
                    value={vendorToEdit.referralCode || ''}
                    onChange={(e) => setVendorToEdit({ ...vendorToEdit, referralCode: e.target.value.toUpperCase() })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px', textTransform: 'uppercase', fontWeight: 700 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Kuota Token Grosir (Acara Gratis)</label>
                  <input
                    type="number"
                    value={vendorToEdit.wholesaleTokens || 0}
                    onChange={(e) => setVendorToEdit({ ...vendorToEdit, wholesaleTokens: Number(e.target.value) })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Instagram Agensi</label>
                  <input
                    type="text"
                    value={vendorToEdit.instagram || ''}
                    onChange={(e) => setVendorToEdit({ ...vendorToEdit, instagram: e.target.value })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Bank Details */}
              <div style={{ background: 'rgba(0,0,0,0.02)', padding: '14px', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.06)' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '8px' }}>Rekening Bank Pencairan Komisi:</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Nama Bank (BCA/Mandiri)"
                    value={vendorToEdit.bankDetails?.bankName || ''}
                    onChange={(e) => setVendorToEdit({
                      ...vendorToEdit,
                      bankDetails: { ...vendorToEdit.bankDetails, bankName: e.target.value }
                    })}
                    className="glass-input"
                    style={{ padding: '8px 10px', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <input
                    type="text"
                    placeholder="No. Rekening"
                    value={vendorToEdit.bankDetails?.accountNumber || ''}
                    onChange={(e) => setVendorToEdit({
                      ...vendorToEdit,
                      bankDetails: { ...vendorToEdit.bankDetails, accountNumber: e.target.value }
                    })}
                    className="glass-input"
                    style={{ padding: '8px 10px', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <input
                    type="text"
                    placeholder="Nama Pemilik Rekening"
                    value={vendorToEdit.bankDetails?.accountHolder || ''}
                    onChange={(e) => setVendorToEdit({
                      ...vendorToEdit,
                      bankDetails: { ...vendorToEdit.bankDetails, accountHolder: e.target.value }
                    })}
                    className="glass-input"
                    style={{ padding: '8px 10px', borderRadius: '8px', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setEditVendorModalOpen(false)}
                  className="glass-pill"
                  style={{ padding: '10px 18px', fontSize: '13px', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-apple-black"
                  style={{ padding: '10px 22px', fontSize: '13px', borderRadius: '12px' }}
                >
                  Simpan Perubahan Mitra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: CREATE VENDOR */}
      {/* ======================================================== */}
      {createVendorModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#FFFFFF', padding: '28px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Daftarkan Mitra Vendor Baru</h3>
                <span style={{ fontSize: '12px', color: '#86868B' }}>Daftarkan Wedding Organizer, Event Planner, atau Fotografer rekanan</span>
              </div>
              <button onClick={() => setCreateVendorModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateNewVendor} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Nama Agensi / WO</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kinasih Wedding Planner"
                    value={newVendorForm.companyName}
                    onChange={(e) => setNewVendorForm({ ...newVendorForm, companyName: e.target.value })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Nama PIC</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Anisa Putri"
                    value={newVendorForm.name}
                    onChange={(e) => setNewVendorForm({ ...newVendorForm, name: e.target.value })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Email Resmi</label>
                  <input
                    type="email"
                    required
                    placeholder="info@kinasihwedding.com"
                    value={newVendorForm.email}
                    onChange={(e) => setNewVendorForm({ ...newVendorForm, email: e.target.value })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>No. WhatsApp</label>
                  <input
                    type="text"
                    placeholder="08123456789"
                    value={newVendorForm.phone}
                    onChange={(e) => setNewVendorForm({ ...newVendorForm, phone: e.target.value })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Tier Kemitraan Awal</label>
                  <select
                    value={newVendorForm.partnerTier}
                    onChange={(e) => setNewVendorForm({ ...newVendorForm, partnerTier: e.target.value })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px', background: '#FFFFFF' }}
                  >
                    <option value="regular">Regular Partner (12%)</option>
                    <option value="pro">Pro Partner (15%)</option>
                    <option value="vip">VIP Platinum (20%)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Kode Referral</label>
                  <input
                    type="text"
                    placeholder="KINASIHWO"
                    value={newVendorForm.referralCode}
                    onChange={(e) => setNewVendorForm({ ...newVendorForm, referralCode: e.target.value.toUpperCase() })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px', textTransform: 'uppercase' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setCreateVendorModalOpen(false)}
                  className="glass-pill"
                  style={{ padding: '10px 18px', fontSize: '13px', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-apple-black"
                  style={{ padding: '10px 22px', fontSize: '13px', borderRadius: '12px' }}
                >
                  Daftarkan Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: ADJUST VENDOR WALLET (TOP UP / DEDUCT) */}
      {/* ======================================================== */}
      {adjustWalletModalOpen && vendorToAdjust && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card" style={{ maxWidth: '440px', width: '100%', background: '#FFFFFF', padding: '28px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wallet size={20} color="#10B981" />
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0 }}>Sesuaikan Saldo Mitra</h3>
              </div>
              <button onClick={() => setAdjustWalletModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#515154', marginBottom: '16px' }}>
              Mitra: <strong>{vendorToAdjust.companyName || vendorToAdjust.name}</strong><br />
              Saldo Saat Ini: <strong style={{ color: '#10B981' }}>Rp {(vendorToAdjust.walletBalance || 0).toLocaleString('id-ID')}</strong>
            </p>

            <form onSubmit={handleSaveWalletAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Jenis Penyesuaian</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setWalletAdjustType('add')}
                    className="glass-pill"
                    style={{
                      padding: '8px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      background: walletAdjustType === 'add' ? '#10B981' : '#FFFFFF',
                      color: walletAdjustType === 'add' ? '#FFFFFF' : '#1D1D1F',
                      cursor: 'pointer'
                    }}
                  >
                    + Tambah (Kredit)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWalletAdjustType('deduct')}
                    className="glass-pill"
                    style={{
                      padding: '8px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      background: walletAdjustType === 'deduct' ? '#EF4444' : '#FFFFFF',
                      color: walletAdjustType === 'deduct' ? '#FFFFFF' : '#1D1D1F',
                      cursor: 'pointer'
                    }}
                  >
                    - Kurangi (Debit)
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Nominal (Rp)</label>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  required
                  value={walletAdjustAmount}
                  onChange={(e) => setWalletAdjustAmount(Number(e.target.value))}
                  className="glass-input"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '15px', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Catatan / Alasan Penyesuaian</label>
                <input
                  type="text"
                  placeholder="Contoh: Reward bonus event akbar / koreksi transfer"
                  value={walletAdjustNote}
                  onChange={(e) => setWalletAdjustNote(e.target.value)}
                  className="glass-input"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '12.5px' }}
                />
              </div>

              <div style={{ background: 'rgba(0,0,0,0.02)', padding: '10px 12px', borderRadius: '10px', fontSize: '12px' }}>
                Estimasi Saldo Baru: <strong>
                  Rp {Math.max(0, (vendorToAdjust.walletBalance || 0) + (walletAdjustType === 'add' ? walletAdjustAmount : -walletAdjustAmount)).toLocaleString('id-ID')}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setAdjustWalletModalOpen(false)}
                  className="glass-pill"
                  style={{ padding: '8px 14px', fontSize: '12px', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-apple-black"
                  style={{ padding: '8px 16px', fontSize: '12.5px', borderRadius: '10px' }}
                >
                  Konfirmasi Penyesuaian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 6: EDIT INVOICE */}
      {/* ======================================================== */}
      {editInvoiceModalOpen && invoiceToEdit && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card" style={{ maxWidth: '540px', width: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#FFFFFF', padding: '28px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Edit Tagihan / Invoice</h3>
                <span style={{ fontSize: '12px', color: '#86868B' }}>No: <code>{invoiceToEdit.invoiceNumber}</code></span>
              </div>
              <button onClick={() => setEditInvoiceModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEditInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Status Pembayaran</label>
                  <select
                    value={invoiceToEdit.status}
                    onChange={(e) => setInvoiceToEdit({ ...invoiceToEdit, status: e.target.value as any })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px', background: '#FFFFFF' }}
                  >
                    <option value="paid">Lunas (Paid)</option>
                    <option value="pending">Menunggu (Pending)</option>
                    <option value="cancelled">Dibatalkan (Cancelled)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Metode Pembayaran</label>
                  <select
                    value={invoiceToEdit.paymentMethod || 'qris'}
                    onChange={(e) => setInvoiceToEdit({ ...invoiceToEdit, paymentMethod: e.target.value })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px', background: '#FFFFFF' }}
                  >
                    <option value="qris">QRIS Realtime</option>
                    <option value="bca_va">BCA Virtual Account</option>
                    <option value="mandiri_va">Mandiri Virtual Account</option>
                    <option value="manual">Transfer Manual Bank</option>
                    <option value="partner_token">Token Grosir Mitra</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Total Tagihan Akhir (Rp)</label>
                  <input
                    type="number"
                    value={invoiceToEdit.finalAmount}
                    onChange={(e) => setInvoiceToEdit({ ...invoiceToEdit, finalAmount: Number(e.target.value) })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '14px', fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Potongan Diskon (Rp)</label>
                  <input
                    type="number"
                    value={invoiceToEdit.discountAmount || 0}
                    onChange={(e) => setInvoiceToEdit({ ...invoiceToEdit, discountAmount: Number(e.target.value) })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Nama Pembeli</label>
                  <input
                    type="text"
                    value={invoiceToEdit.buyerName}
                    onChange={(e) => setInvoiceToEdit({ ...invoiceToEdit, buyerName: e.target.value })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Email Pembeli</label>
                  <input
                    type="email"
                    value={invoiceToEdit.buyerEmail}
                    onChange={(e) => setInvoiceToEdit({ ...invoiceToEdit, buyerEmail: e.target.value })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setEditInvoiceModalOpen(false)}
                  className="glass-pill"
                  style={{ padding: '10px 18px', fontSize: '13px', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-apple-black"
                  style={{ padding: '10px 22px', fontSize: '13px', borderRadius: '12px' }}
                >
                  Simpan Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 7: CREATE INVOICE MANUAL */}
      {/* ======================================================== */}
      {createInvoiceModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card" style={{ maxWidth: '540px', width: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#FFFFFF', padding: '28px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Terbitkan Invoice Manual</h3>
                <span style={{ fontSize: '12px', color: '#86868B' }}>Untuk invoice B2B, transfer bank langsung, atau invoice pesanan khusus</span>
              </div>
              <button onClick={() => setCreateInvoiceModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateNewInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Nama Pembeli / WO</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Klien / Vendor"
                    value={newInvoiceForm.buyerName}
                    onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, buyerName: e.target.value })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Email</label>
                  <input
                    type="email"
                    required
                    placeholder="klien@gmail.com"
                    value={newInvoiceForm.buyerEmail}
                    onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, buyerEmail: e.target.value })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Paket</label>
                  <select
                    value={newInvoiceForm.tierId}
                    onChange={(e) => {
                      const tier = e.target.value as any;
                      const price = tier === 'party' ? 179000 : tier === 'event' ? 269000 : tier === 'wedding' ? 499000 : 999000;
                      setNewInvoiceForm({
                        ...newInvoiceForm,
                        tierId: tier,
                        tierName: tier.toUpperCase(),
                        originalPrice: price,
                        finalAmount: price
                      });
                    }}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px', background: '#FFFFFF' }}
                  >
                    <option value="party">Party (Rp 179.000)</option>
                    <option value="event">Event (Rp 269.000)</option>
                    <option value="wedding">Wedding (Rp 499.000)</option>
                    <option value="unlimited">Unlimited (Rp 999.000)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Nominal Final (Rp)</label>
                  <input
                    type="number"
                    required
                    value={newInvoiceForm.finalAmount}
                    onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, finalAmount: Number(e.target.value) })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '14px', fontWeight: 700 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Status Awal</label>
                  <select
                    value={newInvoiceForm.status}
                    onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, status: e.target.value as any })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px', background: '#FFFFFF' }}
                  >
                    <option value="paid">Langsung Lunas</option>
                    <option value="pending">Menunggu Pembayaran</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Metode</label>
                  <select
                    value={newInvoiceForm.paymentMethod}
                    onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, paymentMethod: e.target.value })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px', background: '#FFFFFF' }}
                  >
                    <option value="manual">Transfer Bank BCA Manual</option>
                    <option value="qris">QRIS</option>
                    <option value="partner_token">Token Grosir</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setCreateInvoiceModalOpen(false)}
                  className="glass-pill"
                  style={{ padding: '10px 18px', fontSize: '13px', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-apple-black"
                  style={{ padding: '10px 22px', fontSize: '13px', borderRadius: '12px' }}
                >
                  Terbitkan Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 8: EDIT ADDON */}
      {/* ======================================================== */}
      {editAddonModalOpen && addonToEdit && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card" style={{ maxWidth: '540px', width: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#FFFFFF', padding: '28px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Edit Add-on Fisik</h3>
                <span style={{ fontSize: '12px', color: '#86868B' }}>ID: <code>{addonToEdit.id}</code></span>
              </div>
              <button onClick={() => setEditAddonModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEditAddon} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Nama Add-on</label>
                <input
                  type="text"
                  required
                  value={addonToEdit.name}
                  onChange={(e) => setAddonToEdit({ ...addonToEdit, name: e.target.value })}
                  className="glass-input"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Kategori</label>
                  <select
                    value={addonToEdit.category}
                    onChange={(e) => setAddonToEdit({ ...addonToEdit, category: e.target.value })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px', background: '#FFFFFF' }}
                  >
                    <option value="physical_qr">Standing Akrilik QR Tamu</option>
                    <option value="banner">Banner Welcome Gate</option>
                    <option value="hardware_rental">Hardware / Rental TV</option>
                    <option value="custom">Paket Custom</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Satuan Unit</label>
                  <input
                    type="text"
                    value={addonToEdit.unit || '1 set'}
                    onChange={(e) => setAddonToEdit({ ...addonToEdit, unit: e.target.value })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Harga Jual Klien (Rp)</label>
                  <input
                    type="number"
                    required
                    value={addonToEdit.price}
                    onChange={(e) => setAddonToEdit({ ...addonToEdit, price: Number(e.target.value) })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '14px', fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Biaya Modal / Produksi (Rp)</label>
                  <input
                    type="number"
                    value={addonToEdit.costPrice || 0}
                    onChange={(e) => setAddonToEdit({ ...addonToEdit, costPrice: Number(e.target.value) })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Deskripsi Spesifikasi</label>
                <textarea
                  rows={3}
                  value={addonToEdit.description}
                  onChange={(e) => setAddonToEdit({ ...addonToEdit, description: e.target.value })}
                  className="glass-input"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '12.5px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={addonToEdit.freeShippingJabodetabek !== false}
                    onChange={(e) => setAddonToEdit({ ...addonToEdit, freeShippingJabodetabek: e.target.checked })}
                  />
                  <span>Gratis Ongkir Jabodetabek</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={addonToEdit.isActive !== false}
                    onChange={(e) => setAddonToEdit({ ...addonToEdit, isActive: e.target.checked })}
                  />
                  <span>Status Aktif di Katalog</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setEditAddonModalOpen(false)}
                  className="glass-pill"
                  style={{ padding: '10px 18px', fontSize: '13px', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-apple-black"
                  style={{ padding: '10px 22px', fontSize: '13px', borderRadius: '12px' }}
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 9: CREATE ADDON */}
      {/* ======================================================== */}
      {createAddonModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card" style={{ maxWidth: '540px', width: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#FFFFFF', padding: '28px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Tambah Add-on Baru</h3>
                <span style={{ fontSize: '12px', color: '#86868B' }}>Masukkan produk perlengkapan resepsi / hardware baru</span>
              </div>
              <button onClick={() => setCreateAddonModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateNewAddon} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Nama Produk Add-on</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Paket 15 Pcs Standing Akrilik QR A6 Gold Border"
                  value={newAddonForm.name}
                  onChange={(e) => setNewAddonForm({ ...newAddonForm, name: e.target.value })}
                  className="glass-input"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Kategori</label>
                  <select
                    value={newAddonForm.category}
                    onChange={(e) => setNewAddonForm({ ...newAddonForm, category: e.target.value })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px', background: '#FFFFFF' }}
                  >
                    <option value="physical_qr">Standing Akrilik QR Tamu</option>
                    <option value="banner">Banner Welcome Gate</option>
                    <option value="hardware_rental">Hardware / Rental TV</option>
                    <option value="custom">Paket Custom</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Satuan</label>
                  <input
                    type="text"
                    placeholder="15 pcs"
                    value={newAddonForm.unit}
                    onChange={(e) => setNewAddonForm({ ...newAddonForm, unit: e.target.value })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Harga Jual Klien (Rp)</label>
                  <input
                    type="number"
                    required
                    value={newAddonForm.price}
                    onChange={(e) => setNewAddonForm({ ...newAddonForm, price: Number(e.target.value) })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '14px', fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Biaya Modal Cetak (Rp)</label>
                  <input
                    type="number"
                    value={newAddonForm.costPrice}
                    onChange={(e) => setNewAddonForm({ ...newAddonForm, costPrice: Number(e.target.value) })}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Deskripsi Spesifikasi Produk</label>
                <textarea
                  rows={3}
                  placeholder="Bahan akrilik tebal 2mm, cetak laser UV tahan air dan anti gores..."
                  value={newAddonForm.description}
                  onChange={(e) => setNewAddonForm({ ...newAddonForm, description: e.target.value })}
                  className="glass-input"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '12.5px' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newAddonForm.freeShippingJabodetabek !== false}
                    onChange={(e) => setNewAddonForm({ ...newAddonForm, freeShippingJabodetabek: e.target.checked })}
                  />
                  <span>Gratis Ongkir Jabodetabek</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setCreateAddonModalOpen(false)}
                  className="glass-pill"
                  style={{ padding: '10px 18px', fontSize: '13px', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-apple-black"
                  style={{ padding: '10px 22px', fontSize: '13px', borderRadius: '12px' }}
                >
                  Tambahkan ke Katalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 10: PHOTO INSPECTOR */}
      {/* ======================================================== */}
      {inspectPhotoModalOpen && photoToInspect && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card" style={{ maxWidth: '480px', width: '100%', background: '#FFFFFF', padding: '24px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0 }}>Inspeksi Foto Tamu</h3>
                <span style={{ fontSize: '11px', color: '#86868B' }}>Oleh: <strong>{photoToInspect.guestName}</strong> • {new Date(photoToInspect.timestamp).toLocaleString('id-ID')}</span>
              </div>
              <button onClick={() => setInspectPhotoModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ width: '100%', aspectRatio: '3/4', borderRadius: '16px', overflow: 'hidden', background: '#000', marginBottom: '16px', position: 'relative' }}>
              <img src={photoToInspect.imageData} alt={photoToInspect.guestName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              {photoToInspect.isHidden && (
                <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#EF4444', color: '#FFF', padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>
                  SEDANG DISENSOR
                </div>
              )}
            </div>

            {photoToInspect.caption && (
              <p style={{ fontSize: '13px', fontStyle: 'italic', background: 'rgba(0,0,0,0.03)', padding: '10px 12px', borderRadius: '10px', margin: '0 0 16px 0' }}>
                &ldquo;{photoToInspect.caption}&rdquo;
              </p>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <a
                href={photoToInspect.imageData}
                download={`foto-${photoToInspect.guestName}-${photoToInspect.id}.jpg`}
                className="btn-apple-black"
                style={{ flex: 1, padding: '10px', fontSize: '12.5px', borderRadius: '10px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Download size={14} />
                <span>Unduh File Asli</span>
              </a>

              <button
                onClick={() => handleToggleHidePhoto(photoToInspect.id, !!photoToInspect.isHidden)}
                className="glass-pill"
                style={{ padding: '10px 14px', fontSize: '12.5px', cursor: 'pointer', fontWeight: 600 }}
              >
                {photoToInspect.isHidden ? 'Pulihkan' : 'Sensor'}
              </button>

              <button
                onClick={() => handleDeletePhoto(photoToInspect.id)}
                className="glass-pill"
                style={{ padding: '10px 12px', color: '#E11D48', cursor: 'pointer' }}
                title="Hapus Permanen"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

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
