import { FrameId } from './frames';

export type FilmPresetId = 'portra' | 'funsaver' | 'quicksnap' | 'ektar' | 'cinestill' | 'ilford' | 'agfa' | 'trix';

export interface FilmPreset {
  id: FilmPresetId;
  name: string;
  tagline: string;
  badge: string;
  description: string;
  accentColor: string;
  badgeColor?: string;
  iso: string;
}

export type EventPackageTier = 'starter' | 'mini' | 'small' | 'party' | 'event' | 'wedding' | 'unlimited';

export const PACKAGE_TIERS: Record<EventPackageTier, {
  id: EventPackageTier;
  name: string;
  price: string;
  originalPrice?: string | null;
  discountBadge?: string | null;
  guestsLabel: string;
  maxGuests: number;
  shotsPerGuest: number;
  maxPresets: number;
  badge: string;
  desc: string;
  retentionLabel: string;
  retentionDays: number;
  storageCapacity: string;
  maxFileSize: string;
  maxVoiceDuration: string;
  popular?: boolean;
  isFree?: boolean;
}> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 'Gratis',
    guestsLabel: 'Hingga 5 tamu',
    maxGuests: 5,
    shotsPerGuest: 10,
    maxPresets: 1,
    badge: 'GRATIS • 5 TAMU',
    desc: 'Cocok untuk uji coba privat bersama keluarga dekat.',
    retentionLabel: 'Penyimpanan 3 Hari',
    retentionDays: 3,
    storageCapacity: '500 MB Cloud',
    maxFileSize: '10 MB / foto',
    maxVoiceDuration: '15 detik / pesan suara',
    isFree: true
  },
  mini: {
    id: 'mini',
    name: 'Mini',
    price: 'Rp 54.000',
    originalPrice: 'Rp 69.000',
    discountBadge: 'HEMAT 20%',
    guestsLabel: 'Hingga 15 tamu',
    maxGuests: 15,
    shotsPerGuest: 15,
    maxPresets: 2,
    badge: 'HEMAT 20% • 15 TAMU',
    desc: 'Untuk pesta kecil, intimate dinner, atau bridal shower.',
    retentionLabel: 'Penyimpanan 7 Hari (1 Minggu)',
    retentionDays: 7,
    storageCapacity: '1 GB Cloud',
    maxFileSize: '10 MB / foto',
    maxVoiceDuration: '15 detik / pesan suara'
  },
  small: {
    id: 'small',
    name: 'Small',
    price: 'Rp 89.000',
    originalPrice: 'Rp 119.000',
    discountBadge: 'HEMAT 25%',
    guestsLabel: 'Hingga 35 tamu',
    maxGuests: 35,
    shotsPerGuest: 20,
    maxPresets: 3,
    badge: 'HEMAT 25% • 35 TAMU',
    desc: 'Cocok untuk gathering teman satu geng atau engagement.',
    retentionLabel: 'Penyimpanan 14 Hari (2 Minggu)',
    retentionDays: 14,
    storageCapacity: '2 GB Cloud',
    maxFileSize: '10 MB / foto',
    maxVoiceDuration: '15 detik / pesan suara'
  },
  party: {
    id: 'party',
    name: 'Party',
    price: 'Rp 179.000',
    originalPrice: 'Rp 219.000',
    discountBadge: 'HEMAT 18%',
    guestsLabel: 'Hingga 75 tamu',
    maxGuests: 75,
    shotsPerGuest: 25,
    maxPresets: 4,
    badge: 'HEMAT 18% • 75 TAMU',
    desc: 'Ulang tahun, intimate wedding, atau acara kantor.',
    retentionLabel: 'Penyimpanan 30 Hari (1 Bulan)',
    retentionDays: 30,
    storageCapacity: '5 GB Cloud',
    maxFileSize: '10 MB / foto',
    maxVoiceDuration: '15 detik / pesan suara'
  },
  event: {
    id: 'event',
    name: 'Event',
    price: 'Rp 269.000',
    originalPrice: 'Rp 329.000',
    discountBadge: 'HEMAT 18%',
    guestsLabel: 'Hingga 150 tamu',
    maxGuests: 150,
    shotsPerGuest: 30,
    maxPresets: 5,
    badge: 'HEMAT 18% • 150 TAMU',
    desc: 'Resepsi pernikahan sedang atau reuni akbar.',
    retentionLabel: 'Penyimpanan 45 Hari (1.5 Bulan)',
    retentionDays: 45,
    storageCapacity: '10 GB Cloud',
    maxFileSize: '10 MB / foto',
    maxVoiceDuration: '15 detik / pesan suara'
  },
  wedding: {
    id: 'wedding',
    name: 'Wedding',
    price: 'Rp 499.000',
    originalPrice: 'Rp 599.000',
    discountBadge: 'HEMAT 17%',
    guestsLabel: 'Hingga 300 tamu',
    maxGuests: 300,
    shotsPerGuest: 36,
    maxPresets: 8,
    badge: 'PALING POPULER • 300 TAMU',
    desc: 'Pilihan paling populer untuk pesta pernikahan lengkap.',
    retentionLabel: 'Penyimpanan 60 Hari (2 Bulan)',
    retentionDays: 60,
    storageCapacity: '20 GB Cloud Storage',
    maxFileSize: '10 MB / foto',
    maxVoiceDuration: '15 detik / pesan suara',
    popular: true
  },
  unlimited: {
    id: 'unlimited',
    name: 'Unlimited',
    price: 'Rp 999.000',
    originalPrice: 'Rp 1.199.000',
    discountBadge: 'HEMAT 17%',
    guestsLabel: 'Tamu tanpa batas',
    maxGuests: 2000,
    shotsPerGuest: 99,
    maxPresets: 8,
    badge: 'HEMAT 17% • TANPA BATAS',
    desc: 'Festival, konser, atau wedding akbar ribuan tamu.',
    retentionLabel: 'Penyimpanan 90 Hari (3 Bulan)',
    retentionDays: 90,
    storageCapacity: '40 GB Cloud Storage',
    maxFileSize: '10 MB / foto',
    maxVoiceDuration: '15 detik / pesan suara'
  }
};

export interface EventData {
  id: string;
  slug?: string;
  title: string;
  coupleOrHost: string;
  eventDate: string; // ISO date string
  location?: string;
  preset: FilmPresetId;
  allowedPresets?: FilmPresetId[];
  allowGuestPresetSwitch?: boolean;
  packageTier?: EventPackageTier;
  frameId?: FrameId;
  customFrameUrl?: string;
  frameText?: string;
  maxGuests: number;
  additionalPax?: number;
  shotsPerGuest: number;
  revealMode: 'instant' | 'delayed';
  revealTime?: string; // ISO date string
  allowVoiceNote?: boolean;
  allowGuestFrameToggle?: boolean;
  coverUrl?: string;
  createdAt: string;
  hostEmail?: string;
  vendorId?: string;
  vendorName?: string;
  vendorLogo?: string;
  vendorInstagram?: string;
  referralCodeUsed?: string;
  commissionAmount?: number;
  commissionStatus?: 'pending' | 'available' | 'withdrawn';
  vendorCoBranding?: {
    showLogoOnPrint?: boolean;
    showLogoOnLive?: boolean;
    showLogoOnGallery?: boolean;
    showLogoOnFrame?: boolean;
  };
}

export interface PhotoRecord {
  id: string;
  eventId: string;
  guestName: string;
  sessionId: string;
  shotNumber: number;
  imageData: string; // Base64 data URL or relative path
  timestamp: string;
  caption?: string;
  isHidden?: boolean;
  aspectRatio?: '1:1' | '3:4' | '9:16';
  frameId?: FrameId;
  voiceNoteUrl?: string;
}

export type PartnerTier = 'regular' | 'pro' | 'vip';

export interface PartnerBankAccount {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: 'host' | 'vendor' | 'admin';
  companyName?: string;
  phone?: string;
  instagram?: string;
  logoUrl?: string;
  tier?: 'starter' | 'pro' | 'agency';
  partnerTier?: PartnerTier;
  referralCode?: string;
  walletBalance?: number;
  totalEarnings?: number;
  bankAccount?: PartnerBankAccount;
  eventQuotaTokens?: Record<string, number>;
  clientCount?: number;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string; // INV/SB/2026/02/0001
  eventId?: string;
  orderId: string;
  buyerType: 'client' | 'vendor';
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  companyName?: string;
  tierId: EventPackageTier;
  tierName: string;
  originalPrice: number;
  discountAmount: number;
  discountCode?: string;
  finalAmount: number;
  paymentMethod: string; // 'qris' | 'va' | 'cc' | 'partner_token' | 'manual'
  status: 'pending' | 'paid' | 'cancelled';
  paidAt?: string;
  createdAt: string;
}

export interface PayoutRequest {
  id: string;
  vendorId: string;
  vendorEmail: string;
  vendorName: string;
  companyName?: string;
  amount: number;
  bankDetails: PartnerBankAccount;
  status: 'pending' | 'approved' | 'rejected';
  proofUrl?: string;
  notes?: string;
  requestedAt: string;
  processedAt?: string;
}

export interface VideoTestimonialSubmission {
  id: string;
  eventId: string;
  eventTitle: string;
  submitterType: 'vendor' | 'host';
  submitterId: string;
  submitterName: string;
  submitterEmail?: string;
  videoType: 'link' | 'file';
  videoUrl: string; // Google Drive, TikTok, IG Reels, or R2/Storage URL
  durationSeconds: number; // Minimal 60 seconds (1 minute)
  caption?: string;
  rewardAmount: number; // e.g. Rp 50.000
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  rewardPaidAt?: string;
  submittedAt: string;
}

export interface EventAddonItem {
  id: string;
  name: string;
  category: 'physical_qr' | 'banner' | 'hardware_rental' | 'custom' | string;
  description: string;
  price: number;
  priceFormatted?: string;
  costPrice?: number;
  unit?: string;
  freeShippingJabodetabek?: boolean;
  imagePreviewUrl?: string;
  isPopular?: boolean;
  isActive?: boolean;
  createdAt?: string;
}

