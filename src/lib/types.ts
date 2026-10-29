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

export type EventPackageTier = 'starter' | 'intimate' | 'wedding' | 'unlimited' | 'mini' | 'small' | 'party' | 'event';

export const PRIMARY_PACKAGE_TIER_KEYS: EventPackageTier[] = ['starter', 'intimate', 'wedding', 'unlimited'];

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
  storageCapacity?: string;
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
    desc: 'Ideal untuk acara privat & kumpul keluarga inti.',
    retentionLabel: '3 Hari (Uji Coba)',
    retentionDays: 3,
    storageCapacity: 'Resolusi Asli Penuh',
    maxFileSize: 'Tanpa Batas Ukuran',
    maxVoiceDuration: '15 detik / pesan suara',
    isFree: true
  },
  intimate: {
    id: 'intimate',
    name: 'Intimate Party',
    price: 'Rp 129.000',
    originalPrice: 'Rp 169.000',
    discountBadge: 'HEMAT 24%',
    guestsLabel: 'Hingga 50 tamu',
    maxGuests: 50,
    shotsPerGuest: 20,
    maxPresets: 3,
    badge: 'HEMAT 24% • 50 TAMU',
    desc: 'Ulang tahun, bridal shower, tunangan, arisan, atau gathering intimate.',
    retentionLabel: '14 Hari Pasca Acara (2 Minggu)',
    retentionDays: 14,
    storageCapacity: 'Resolusi Asli Penuh',
    maxFileSize: 'Tanpa Batas Ukuran',
    maxVoiceDuration: '15 detik / pesan suara'
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
    retentionLabel: '7 Hari Pasca Acara',
    retentionDays: 7,
    storageCapacity: 'Resolusi Asli Penuh',
    maxFileSize: 'Tanpa Batas Ukuran',
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
    retentionLabel: '14 Hari Pasca Acara',
    retentionDays: 14,
    storageCapacity: 'Resolusi Asli Penuh',
    maxFileSize: 'Tanpa Batas Ukuran',
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
    retentionLabel: '30 Hari Pasca Acara (1 Bulan)',
    retentionDays: 30,
    storageCapacity: 'Resolusi Asli Penuh',
    maxFileSize: 'Tanpa Batas Ukuran',
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
    retentionLabel: '30 Hari Pasca Acara (1 Bulan)',
    retentionDays: 30,
    storageCapacity: 'Resolusi Asli Penuh',
    maxFileSize: 'Tanpa Batas Ukuran',
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
    retentionLabel: '30 Hari Pasca Acara (1 Bulan Penuh)',
    retentionDays: 30,
    storageCapacity: 'Resolusi Asli Penuh',
    maxFileSize: 'Tanpa Batas Ukuran',
    maxVoiceDuration: '15 detik / video ucapan (Reels VHS)',
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
    retentionLabel: '30 Hari Pasca Acara (1 Bulan Penuh)',
    retentionDays: 30,
    storageCapacity: 'Resolusi Asli Penuh',
    maxFileSize: 'Tanpa Batas Ukuran',
    maxVoiceDuration: '15 detik / video ucapan (Reels VHS)'
  }
};

export interface EventRetentionInfo {
  status: 'upcoming' | 'active' | 'grace' | 'expired';
  label: string;
  daysRemaining: number;
  badgeColor: string;
  badgeBg: string;
  description: string;
}

export function getEventRetentionInfo(eventDateStr?: string, tierKey: EventPackageTier = 'wedding'): EventRetentionInfo {
  const tier = PACKAGE_TIERS[tierKey] || PACKAGE_TIERS.wedding;
  const retentionDays = tier.retentionDays || 30;

  if (!eventDateStr) {
    return {
      status: 'active',
      label: `Aktif (${retentionDays} Hari)`,
      daysRemaining: retentionDays,
      badgeColor: '#27AE60',
      badgeBg: 'rgba(39, 174, 96, 0.12)',
      description: `Masa simpan ${retentionDays} hari pasca acara.`
    };
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDateObj = new Date(eventDateStr);
  const eventDate = new Date(eventDateObj.getFullYear(), eventDateObj.getMonth(), eventDateObj.getDate());

  const msPerDay = 1000 * 60 * 60 * 24;
  const diffDaysFromEvent = Math.floor((today.getTime() - eventDate.getTime()) / msPerDay);

  if (diffDaysFromEvent < 0) {
    // Acara belum berlangsung (Masa Persiapan)
    const daysUntilEvent = Math.abs(diffDaysFromEvent);
    return {
      status: 'upcoming',
      label: `Persiapan (H-${daysUntilEvent})`,
      daysRemaining: retentionDays,
      badgeColor: '#C27803',
      badgeBg: 'rgba(194, 120, 3, 0.12)',
      description: `Acara dalam ${daysUntilEvent} hari. Timer ${retentionDays} hari masa simpan baru mulai berjalan setelah hari-H.`
    };
  } else if (diffDaysFromEvent <= retentionDays) {
    // Acara sedang berlangsung atau dalam masa simpan 30 hari
    const daysLeft = retentionDays - diffDaysFromEvent;
    return {
      status: 'active',
      label: daysLeft === 0 ? 'Hari Terakhir Simpan' : `Sisa ${daysLeft} Hari Simpan`,
      daysRemaining: daysLeft,
      badgeColor: daysLeft <= 3 ? '#E74C3C' : '#27AE60',
      badgeBg: daysLeft <= 3 ? 'rgba(231, 76, 60, 0.12)' : 'rgba(39, 174, 96, 0.12)',
      description: `Arsip foto aktif dan dapat diunduh bebas selama ${daysLeft} hari ke depan.`
    };
  } else if (diffDaysFromEvent <= retentionDays + 14) {
    // Grace period (lewat masa simpan hingga +14 hari)
    const graceLeft = (retentionDays + 14) - diffDaysFromEvent;
    return {
      status: 'grace',
      label: `Masa Tenggang (${graceLeft} Hari)`,
      daysRemaining: graceLeft,
      badgeColor: '#E67E22',
      badgeBg: 'rgba(230, 126, 34, 0.12)',
      description: 'Masa aktif publik telah selesai. Segera unduh cadangan ZIP sebelum arsip dibersihkan.'
    };
  } else {
    // Lewat grace period
    return {
      status: 'expired',
      label: 'Masa Aktif Selesai',
      daysRemaining: 0,
      badgeColor: '#86868B',
      badgeBg: 'rgba(0, 0, 0, 0.08)',
      description: 'Masa aktif album telah selesai.'
    };
  }
}

export type EventCategoryType = 'wedding' | 'birthday' | 'corporate' | 'other';

export interface EventCategoryMeta {
  type: EventCategoryType;
  badgeLabel: string;
  heroBadgeText: string;
  defaultTitle: string;
  defaultCoverUrl: string;
  defaultTagline: string;
  defaultFrameTagline: string;
  hostLabel: string;
  coverAltText: string;
  emptyGalleryPrompt: string;
}

export function getEventCategoryMeta(type: EventCategoryType = 'wedding'): EventCategoryMeta {
  switch (type) {
    case 'birthday':
      return {
        type: 'birthday',
        badgeLabel: 'Ulang Tahun',
        heroBadgeText: 'BIRTHDAY CELEBRATION OF',
        defaultTitle: 'Album Ulang Tahun',
        defaultCoverUrl: '/samples/dummy-guests.jpg',
        defaultTagline: 'Cheers to Another Year',
        defaultFrameTagline: 'Cheers to Another Year',
        hostLabel: 'Tuan Rumah',
        coverAltText: 'Foto Sampul Ulang Tahun',
        emptyGalleryPrompt: 'Abadikan senyum, kejutan seru, dan momen hangat perayaan ulang tahun ini sekarang juga.',
      };
    case 'corporate':
      return {
        type: 'corporate',
        badgeLabel: 'Kantor & Gala',
        heroBadgeText: 'SPECIAL GATHERING & EVENT',
        defaultTitle: 'Album Gathering & Acara',
        defaultCoverUrl: '/samples/dummy-guests.jpg',
        defaultTagline: 'Together We Celebrate',
        defaultFrameTagline: 'Together We Celebrate',
        hostLabel: 'Penyelenggara',
        coverAltText: 'Foto Sampul Acara',
        emptyGalleryPrompt: 'Abadikan kebersamaan, keseruan tim, dan momen berkesan di acara ini sekarang juga.',
      };
    case 'other':
      return {
        type: 'other',
        badgeLabel: 'Acara Spesial',
        heroBadgeText: 'SPECIAL MOMENTS OF',
        defaultTitle: 'Album Momen Spesial',
        defaultCoverUrl: '/samples/dummy-guests.jpg',
        defaultTagline: 'Captured Memories',
        defaultFrameTagline: 'Captured Memories',
        hostLabel: 'Tuan Rumah',
        coverAltText: 'Foto Sampul Acara',
        emptyGalleryPrompt: 'Abadikan tawa, keseruan, dan momen kebersamaan kita di acara ini sekarang juga.',
      };
    case 'wedding':
    default:
      return {
        type: 'wedding',
        badgeLabel: 'Pernikahan',
        heroBadgeText: 'THE WEDDING CELEBRATION OF',
        defaultTitle: 'Album Pernikahan',
        defaultCoverUrl: '/samples/dummy-couple.jpg',
        defaultTagline: 'The Beginning of Forever',
        defaultFrameTagline: 'The Beginning of Forever',
        hostLabel: 'Pengantin',
        coverAltText: 'Foto Pengantin',
        emptyGalleryPrompt: 'Abadikan senyum, tawa bahagia, dan momen hangat untuk pasangan pengantin sekarang juga.',
      };
  }
}

export function resolveEventCategory(event?: Partial<EventData> | null): EventCategoryType {
  if (!event) return 'wedding';
  if (
    event.eventType === 'wedding' ||
    event.eventType === 'birthday' ||
    event.eventType === 'corporate' ||
    event.eventType === 'other'
  ) {
    return event.eventType;
  }

  const titleAndSlug = `${event.title || ''} ${event.slug || ''}`.toLowerCase();
  const hostText = (event.coupleOrHost || '').toLowerCase();
  const frameText = (event.frameText || '').toLowerCase();

  if (/(ultah|ulang\s*tahun|birthday|bday|b'day|sweet\s*17|milad|\b\d+\s*(tahun|thn)\b|\bhbd\b)/i.test(titleAndSlug) ||
      /(still\s*young|happy\s*birthday|cheers\s*to\s*another\s*year)/i.test(frameText)) {
    return 'birthday';
  }

  if (/(gathering|corporate|kantor|company|gala|townhall|seminar|workshop|outbond|outing|conference|summit)/i.test(titleAndSlug)) {
    return 'corporate';
  }

  if (/(reuni|konser|festival|main|nongki|ngopi|bukber|arisan|party|pesta|liburan|trip|graduation|wisuda|halal\s*bihalal|syukuran|khitan|aqiqah)/i.test(titleAndSlug)) {
    return 'other';
  }

  if (/(wedding|nikah|pernikahan|resepsi|akad|pawiwahan|ngunduh\s*mantu|pengantin|&|\bdan\b)/i.test(`${titleAndSlug} ${hostText}`)) {
    return 'wedding';
  }

  return 'other';
}

export interface EventData {
  id: string;
  slug?: string;
  eventType?: EventCategoryType;
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
  closingWishType?: 'voice' | 'video' | 'none';
  allowGuestFrameToggle?: boolean;
  coverUrl?: string;
  createdAt: string;
  hostEmail?: string;
  paymentStatus?: 'pending' | 'paid';
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
  addons?: string[];
}

export interface VideoWishRecord {
  id: string;
  eventId: string;
  sessionId?: string;
  guestName: string;
  tableNumber?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  durationSeconds: number;
  aspectRatio: '9:16' | '3:4';
  timestamp: string;
}

export interface VoiceNoteRecord {
  id: string;
  eventId: string;
  sessionId?: string;
  guestName: string;
  audioUrl: string;
  duration: number;
  timestamp: string;
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
  deviceId?: string;
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
  city?: string;
  instagram?: string;
  logoUrl?: string;
  tier?: 'starter' | 'pro' | 'agency';
  partnerTier?: PartnerTier;
  commissionRate?: number;
  referralCode?: string;
  walletBalance?: number;
  totalEarnings?: number;
  bankAccount?: PartnerBankAccount;
  bankDetails?: PartnerBankAccount;
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

export interface ProofingSelectedItem {
  id: string;
  name: string;
  folderName?: string;
  url?: string;
  note?: string;
  notes?: string;
}

export interface VendorProofingSession {
  id: string;
  vendorId: string;
  vendorSlug?: string;
  clientSlug?: string;
  vendorName?: string;
  vendorLogo?: string;
  vendorWhatsapp?: string;
  vendorInstagram?: string;
  referralCode?: string;
  clientName: string;
  slug: string;
  gdriveFolderId: string;
  quotaLimit: number;
  deadlineAt?: string;
  status: 'selecting' | 'submitted' | 'completed';
  selectedPhotos: ProofingSelectedItem[];
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}


