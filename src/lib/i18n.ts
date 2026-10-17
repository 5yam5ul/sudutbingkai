export type Language = 'id' | 'en';

export interface Translations {
  // Common
  langName: string;
  close: string;
  cancel: string;
  continue: string;
  loading: string;
  success: string;
  error: string;

  // Guest Camera (/cam/[id])
  cam: {
    welcomeTitle: string;
    welcomeSubtitle: string;
    enterNamePlaceholder: string;
    startShootingBtn: string;
    demoBanner: string;
    shotsRemaining: string;
    shotsExhaustedTitle: string;
    shotsExhaustedDesc: string;
    viewGalleryBtn: string;
    backCamera: string;
    frontCamera: string;
    flashOff: string;
    flashScreen: string;
    flashTorch: string;
    shutterTooltip: string;
    capturedToast: string;
    offlineSavedToast: string;
    processingPhoto: string;
    lockedNotice: string;
    lockedSubNotice: string;
    leaveVideoWish: string;
    leaveAudioWish: string;
    framesOption: string;
    filmPresetOption: string;
    tapToFocus: string;
    retakeNotice: string; // "Tanpa preview & tanpa hapus — tiap momen berharga"
  };

  // Gallery & Reveal (/event/[id])
  gallery: {
    title: string;
    subtitle: string;
    lockedTitle: string;
    lockedDesc: string;
    countdownHours: string;
    countdownMinutes: string;
    countdownSeconds: string;
    allPhotos: string;
    filterByGuest: string;
    downloadAllZip: string;
    downloadPhoto: string;
    shareLink: string;
    copiedLink: string;
    emptyGallery: string;
    byGuest: string;
  };

  // Pricing & Value
  pricing: {
    badge: string;
    headline: string;
    perGuestLabel: string;
    shotsPerGuest: string;
    createEventBtn: string;
    freeTestBtn: string;
    currencyNote: string;
  };
}

export const DICTIONARY: Record<Language, Translations> = {
  id: {
    langName: 'Indonesia',
    close: 'Tutup',
    cancel: 'Batal',
    continue: 'Lanjutkan',
    loading: 'Memuat...',
    success: 'Berhasil',
    error: 'Terjadi kesalahan',

    cam: {
      welcomeTitle: 'Kamera Disposable Digital',
      welcomeSubtitle: 'Abadikan momen jujur tanpa filter aplikasi. Jatah terbatas, tanpa preview!',
      enterNamePlaceholder: 'Tulis nama panggilanmu...',
      startShootingBtn: 'Mulai Motret',
      demoBanner: 'Mode Simulasi / Demo Kamera',
      shotsRemaining: 'sisa jepretan',
      shotsExhaustedTitle: 'Jatah Jepretan Habis!',
      shotsExhaustedDesc: 'Terima kasih telah mengabadikan momen spesial ini. Semua foto akan terbuka di galeri bersama setelah acara selesai.',
      viewGalleryBtn: 'Lihat Galeri Acara',
      backCamera: 'Kamera Belakang',
      frontCamera: 'Kamera Depan (Selfie)',
      flashOff: 'Flash Mati',
      flashScreen: 'Flash Layar',
      flashTorch: 'Flash Lampu',
      shutterTooltip: 'Tekan untuk menjepret',
      capturedToast: 'Momen tersimpan! Rol film tergulung.',
      offlineSavedToast: 'Sinyal lemah: Foto disimpan ke antrean offline.',
      processingPhoto: 'Mencuci frame film...',
      lockedNotice: 'Semua foto baru terbuka setelah acara selesai.',
      lockedSubNotice: 'Nikmati kebersamaan bersama pasangan & tamu lainnya.',
      leaveVideoWish: 'Kirim Pesan Video',
      leaveAudioWish: 'Rekam Pesan Suara',
      framesOption: 'Bingkai',
      filmPresetOption: 'Filter Film',
      tapToFocus: 'Ketuk layar untuk fokus',
      retakeNotice: 'Tanpa preview & tanpa hapus — setiap frame jujur apa adanya.'
    },

    gallery: {
      title: 'Galeri Bersama',
      subtitle: 'Semua momen berharga yang ditangkap dari mata para tamu.',
      lockedTitle: 'Rol Film Masih Dicuci...',
      lockedDesc: 'Galeri bersama akan terbuka serentak setelah acara selesai.',
      countdownHours: 'Jam',
      countdownMinutes: 'Menit',
      countdownSeconds: 'Detik',
      allPhotos: 'Semua Foto',
      filterByGuest: 'Filter Tamu',
      downloadAllZip: 'Download Satu Album (ZIP)',
      downloadPhoto: 'Simpan Foto',
      shareLink: 'Bagikan Tautan',
      copiedLink: 'Tautan galeri berhasil disalin!',
      emptyGallery: 'Belum ada foto yang diabadikan.',
      byGuest: 'Difoto oleh'
    },

    pricing: {
      badge: 'PAKET & HARGA FLEKSIBEL',
      headline: 'Berapa tamu yang hadir di acaramu?',
      perGuestLabel: 'per tamu',
      shotsPerGuest: 'jepretan / tamu',
      createEventBtn: 'Buat Acaramu Sekarang',
      freeTestBtn: 'Coba Gratis (5 Tamu)',
      currencyNote: 'Ditagihkan dalam IDR melalui Kartu Kredit Internasional / QRIS'
    }
  },

  en: {
    langName: 'English',
    close: 'Close',
    cancel: 'Cancel',
    continue: 'Continue',
    loading: 'Loading...',
    success: 'Success',
    error: 'An error occurred',

    cam: {
      welcomeTitle: 'Digital Disposable Camera',
      welcomeSubtitle: 'Capture authentic moments without filters. Limited shots, zero preview!',
      enterNamePlaceholder: 'Enter your nickname...',
      startShootingBtn: 'Start Shooting',
      demoBanner: 'Simulation / Demo Mode',
      shotsRemaining: 'shots left',
      shotsExhaustedTitle: 'Film Roll Finished!',
      shotsExhaustedDesc: 'Thank you for capturing these special moments. All photos will be revealed in the shared gallery once the event concludes.',
      viewGalleryBtn: 'Open Event Gallery',
      backCamera: 'Rear Camera',
      frontCamera: 'Front Camera (Selfie)',
      flashOff: 'Flash Off',
      flashScreen: 'Screen Flash',
      flashTorch: 'Torch Light',
      shutterTooltip: 'Tap to capture',
      capturedToast: 'Moment captured! Film roll advanced.',
      offlineSavedToast: 'Weak signal: Photo safely queued offline.',
      processingPhoto: 'Developing film frame...',
      lockedNotice: 'Photos will be revealed once the event ends.',
      lockedSubNotice: 'Be present and celebrate with friends & family.',
      leaveVideoWish: 'Leave a Video Wish',
      leaveAudioWish: 'Record Voice Note',
      framesOption: 'Frames',
      filmPresetOption: 'Film Look',
      tapToFocus: 'Tap screen to focus',
      retakeNotice: 'No preview, no delete — authentic moments as they happen.'
    },

    gallery: {
      title: 'Shared Gallery',
      subtitle: 'Memories captured through the eyes of every guest.',
      lockedTitle: 'Film Still in the Lab...',
      lockedDesc: 'The shared album will automatically reveal once the event ends.',
      countdownHours: 'Hours',
      countdownMinutes: 'Mins',
      countdownSeconds: 'Secs',
      allPhotos: 'All Photos',
      filterByGuest: 'Filter by Guest',
      downloadAllZip: 'Download Full Album (ZIP)',
      downloadPhoto: 'Save Photo',
      shareLink: 'Share Link',
      copiedLink: 'Gallery link copied!',
      emptyGallery: 'No photos captured yet.',
      byGuest: 'Snapped by'
    },

    pricing: {
      badge: 'FLEXIBLE EVENT TIERS',
      headline: 'How many guests are attending?',
      perGuestLabel: 'per guest',
      shotsPerGuest: 'shots / guest',
      createEventBtn: 'Create Your Event Now',
      freeTestBtn: 'Try Free (5 Guests)',
      currencyNote: 'Billed in IDR via International Credit Card (Visa/Mastercard) / QRIS'
    }
  }
};

/**
 * Get active language from browser or stored preference
 */
export function getStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'id';
  try {
    const saved = localStorage.getItem('sb_preferred_lang') as Language;
    if (saved === 'id' || saved === 'en') return saved;
    // Auto-detect browser language if English
    if (navigator.language && navigator.language.startsWith('en')) {
      return 'en';
    }
  } catch {}
  return 'id';
}

export function setStoredLanguage(lang: Language): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('sb_preferred_lang', lang);
  } catch {}
}
