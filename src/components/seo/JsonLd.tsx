import React from 'react';

interface JsonLdProps {
  baseUrl?: string;
}

export default function JsonLd({ baseUrl = 'https://sudutbingkai.vercel.app' }: JsonLdProps) {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'SudutBingkai',
    url: baseUrl,
    logo: `${baseUrl}/logo-full.png`,
    description: 'Platform kamera sekali pakai digital untuk pernikahan dan perayaan spesial di Indonesia.',
    sameAs: [
      'https://instagram.com/sudutbingkai.id',
      'https://tiktok.com/@sudutbingkai.id'
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+62-857-8225-5128',
      contactType: 'customer service',
      areaServed: 'ID',
      availableLanguage: ['Indonesian', 'English']
    }
  };

  const webSiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'SudutBingkai',
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${baseUrl}/event/{search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  };

  const softwareApplicationSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'SudutBingkai',
    applicationCategory: 'PhotographyApplication',
    operatingSystem: 'Any (iOS, Android, Windows, macOS via Web Browser)',
    browserRequirements: 'Requires modern web browser with camera support (Chrome, Safari, Edge, Firefox)',
    url: baseUrl,
    description: 'Kamera analog sekali pakai digital untuk pernikahan dan acara spesial. Tamu memotret langsung lewat scan QR di meja tanpa install aplikasi.',
    offers: [
      {
        '@type': 'Offer',
        name: 'Paket Starter',
        price: '0',
        priceCurrency: 'IDR',
        description: 'Gratis coba untuk 5 tamu & 10 foto per tamu'
      },
      {
        '@type': 'Offer',
        name: 'Paket Intimate',
        price: '129000',
        priceCurrency: 'IDR',
        description: 'Kapasitas 50 tamu, 15 foto per tamu, pesan suara & 2 filter film'
      },
      {
        '@type': 'Offer',
        name: 'Paket Wedding',
        price: '499000',
        priceCurrency: 'IDR',
        description: 'Paket terfavorit untuk 300 tamu, 36 foto rol penuh, 8 filter film analog & reels video 15 detik'
      },
      {
        '@type': 'Offer',
        name: 'Paket Unlimited',
        price: '999000',
        priceCurrency: 'IDR',
        description: 'Kapasitas hingga 1.000 tamu, bingkai kustom nama pengantin & 50 foto per tamu'
      }
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '184',
      bestRating: '5',
      worstRating: '1'
    }
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Kapan masa simpan foto mulai dihitung dan bagaimana penyimpanannya?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Masa simpan baru mulai berjalan setelah tanggal acara (hari-H) berlangsung, bukan dari tanggal pembelian paket. Penyelenggara bebas membuat album dan mencetak kartu QR meja jauh-jauh hari tanpa takut masa aktif berkurang. Setelah acara selesai, album aktif selama 30 hari penuh, di mana seluruh arsip foto resolusi asli (ZIP), video ucapan, serta pesan suara dapat diunduh bebas dan gratis.'
        }
      },
      {
        '@type': 'Question',
        name: 'Apakah SudutBingkai hanya untuk acara pernikahan?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Sama sekali tidak. SudutBingkai dirancang fleksibel untuk segala jenis perayaan: pernikahan, ulang tahun (sweet 17), gathering kantor, gala dinner perusahaan, reuni akbar, hingga konser dan festival komunitas.'
        }
      },
      {
        '@type': 'Question',
        name: 'Apa bedanya SudutBingkai dengan meminta tamu kirim foto ke Google Drive atau WhatsApp?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Tamu memotret langsung dengan nuansa kamera analog sekali pakai. Ada sensasi spontanitas dan nostalgia, tanpa drama upload besok lusa yang biasanya berakhir tidak pernah terkirim.'
        }
      },
      {
        '@type': 'Question',
        name: 'Bagaimana kalau ada tamu yang kurang paham teknologi atau orang tua?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Tamu tidak perlu download aplikasi dari App Store atau Play Store dan tidak ada pendaftaran akun. Cukup mengarahkan kamera HP biasa ke barcode di meja makan, dan kamera langsung siap membidik.'
        }
      },
      {
        '@type': 'Question',
        name: 'Kapan foto-foto tersebut bisa dilihat oleh penyelenggara dan tamu?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Fleksibel sesuai keinginan. Anda bisa mengaktifkan mode langsung terbuka (instant reveal) atau timer cuci rol delayed (misal baru terbuka pukul 22.00 malam saat acara usai untuk sensasi kado kejutan bersama).'
        }
      },
      {
        '@type': 'Question',
        name: 'Apakah kualitas file aslinya tetap jernih untuk dicetak?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Tentu. Penyelenggara acara dan seluruh tamu dapat mengunduh arsip foto dalam format resolusi tinggi asli (High-Res QHD), lengkap dengan warna emulsi film dan stempel tanggal nostalgia yang siap dicetak ke album fisik.'
        }
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}
