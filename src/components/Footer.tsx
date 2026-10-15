import React from 'react';
import Link from 'next/link';
import { Camera, ShieldCheck, Zap, Film, HeartHandshake, ArrowRight, MessageCircle, ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid rgba(0, 0, 0, 0.08)', background: '#F4F4F1', color: '#1D1D1F' }}>
      {/* Trust Highlights Bar */}
      <div style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.06)', background: 'rgba(255, 255, 255, 0.6)' }}>
        <div
          style={{
            maxWidth: '1120px',
            margin: '0 auto',
            padding: 'clamp(20px, 3vw, 28px) clamp(16px, 3vw, 24px)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 'clamp(16px, 2.5vw, 24px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(194, 120, 3, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#C27803',
                flexShrink: 0,
              }}
            >
              <Zap size={18} />
            </div>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 4px', color: '#1D1D1F' }}>
                Zero-App Instant Web
              </h4>
              <p style={{ fontSize: '12px', color: '#6E6E73', margin: 0, lineHeight: 1.45 }}>
                Tamu scan QR langsung membidik kamera di browser tanpa unduh aplikasi.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(194, 120, 3, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#C27803',
                flexShrink: 0,
              }}
            >
              <Film size={18} />
            </div>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 4px', color: '#1D1D1F' }}>
                8 Filter Emulasi Film
              </h4>
              <p style={{ fontSize: '12px', color: '#6E6E73', margin: 0, lineHeight: 1.45 }}>
                Warna analog Portra 400, Quicksnap & B&W klasik dengan stempel tanggal.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(194, 120, 3, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#C27803',
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={18} />
            </div>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 4px', color: '#1D1D1F' }}>
                High-Res R2 Storage
              </h4>
              <p style={{ fontSize: '12px', color: '#6E6E73', margin: 0, lineHeight: 1.45 }}>
                Seluruh arsip foto resolusi asli (ZIP) tersimpan aman di Cloudflare R2.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(194, 120, 3, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#C27803',
                flexShrink: 0,
              }}
            >
              <HeartHandshake size={18} />
            </div>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 4px', color: '#1D1D1F' }}>
                Kemitraan WO s/d 20%
              </h4>
              <p style={{ fontSize: '12px', color: '#6E6E73', margin: 0, lineHeight: 1.45 }}>
                Program bagi hasil resmi untuk Wedding Organizer dan vendor dokumentasi.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div style={{ maxWidth: '1120px', margin: '0 auto', padding: 'clamp(40px, 6vw, 64px) clamp(16px, 3vw, 24px) 36px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 'clamp(28px, 4vw, 40px)',
            marginBottom: '44px',
          }}
        >
          {/* Brand Column */}
          <div style={{ maxWidth: '320px' }}>
            <div style={{ marginBottom: '16px' }}>
              <Link href="/">
                <img
                  src="/sudut-bingkai-logo.png"
                  alt="Sudut Bingkai"
                  width={150}
                  height={36}
                  loading="lazy"
                  decoding="async"
                  style={{ height: '36px', width: 'auto', objectFit: 'contain', display: 'block' }}
                />
              </Link>
            </div>
            <p style={{ color: '#515154', fontSize: '13px', lineHeight: 1.6, marginBottom: '16px' }}>
              Platform kamera sekali pakai digital untuk pernikahan dan momen perayaan spesial. Abadikan momen candid paling jujur dari sudut pandang para tamu.
            </p>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                padding: '5px 12px',
                borderRadius: '999px',
                fontSize: '11.5px',
                color: '#059669',
                fontWeight: 600,
              }}
            >
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981' }} />
              <span>Sistem Siap untuk Acara Hari Ini</span>
            </div>

            {/* Official Social Media Links */}
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <a
                href="https://instagram.com/sudutbingkai.id"
                target="_blank"
                rel="noopener noreferrer"
                title="Instagram Resmi @sudutbingkai.id"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(0, 0, 0, 0.04)',
                  color: '#1D1D1F',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  transition: 'all 0.2s',
                  textDecoration: 'none',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </a>
              <a
                href="https://tiktok.com/@sudutbingkai.id"
                target="_blank"
                rel="noopener noreferrer"
                title="TikTok Resmi @sudutbingkai.id"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(0, 0, 0, 0.04)',
                  color: '#1D1D1F',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  transition: 'all 0.2s',
                  textDecoration: 'none',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.86.12V9.42a6.34 6.34 0 0 0-.86-.06A6.33 6.33 0 0 0 3 15.69a6.33 6.33 0 0 0 9.09 5.67 6.27 6.27 0 0 0 3.73-5.71V8.75a8.28 8.28 0 0 0 4.88 1.58V6.88a4.86 4.86 0 0 1-1.11-.19z" />
                </svg>
              </a>
              <a
                href="https://wa.me/6285782255128"
                target="_blank"
                rel="noopener noreferrer"
                title="WhatsApp Resmi 0857-8225-5128"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(0, 0, 0, 0.04)',
                  color: '#059669',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  transition: 'all 0.2s',
                  textDecoration: 'none',
                }}
              >
                <MessageCircle size={15} />
              </a>
            </div>
          </div>

          {/* Column 2: Produk & Fitur */}
          <div>
            <h4
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#1D1D1F',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '16px',
              }}
            >
              Produk & Fitur
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li>
                <Link href="/create" style={{ color: '#515154', textDecoration: 'none', fontSize: '13.5px' }}>
                  Buat Acara & Paket Harga
                </Link>
              </li>
              <li>
                <Link href="/cam/demo" style={{ color: '#515154', textDecoration: 'none', fontSize: '13.5px' }}>
                  Coba Kamera Tamu (Demo)
                </Link>
              </li>
              <li>
                <Link href="/#preset" style={{ color: '#515154', textDecoration: 'none', fontSize: '13.5px' }}>
                  8 Filter Film Analog
                </Link>
              </li>
              <li>
                <Link href="/#cara-kerja" style={{ color: '#515154', textDecoration: 'none', fontSize: '13.5px' }}>
                  Cara Kerja & Alur Tamu
                </Link>
              </li>
              <li>
                <Link href="/create" style={{ color: '#515154', textDecoration: 'none', fontSize: '13.5px' }}>
                  Live Slideshow TV Panggung
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Panduan Pernikahan */}
          <div>
            <h4
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#1D1D1F',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '16px',
              }}
            >
              Panduan & Edukasi
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li>
                <Link href="/panduan" style={{ color: '#C27803', fontWeight: 600, textDecoration: 'none', fontSize: '13.5px' }}>
                  Pusat Panduan Pernikahan
                </Link>
              </li>
              <li>
                <Link href="/panduan/souvenir-pernikahan-unik-kamera-tamu" style={{ color: '#515154', textDecoration: 'none', fontSize: '13.5px' }}>
                  Ide Souvenir Unik 2026
                </Link>
              </li>
              <li>
                <Link href="/panduan/perbedaan-photobooth-vs-disposable-camera" style={{ color: '#515154', textDecoration: 'none', fontSize: '13.5px' }}>
                  Photobooth vs Kamera Tamu
                </Link>
              </li>
              <li>
                <Link href="/panduan/cara-membuat-qr-code-foto-tamu" style={{ color: '#515154', textDecoration: 'none', fontSize: '13.5px' }}>
                  Tutorial Barcode QR Meja
                </Link>
              </li>
              <li>
                <Link href="/#faq" style={{ color: '#515154', textDecoration: 'none', fontSize: '13.5px' }}>
                  Tanya Jawab (FAQ)
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Kemitraan & Akses */}
          <div>
            <h4
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#1D1D1F',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '16px',
              }}
            >
              Kemitraan & Akun
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li>
                <Link href="/vendor" style={{ color: '#1D1D1F', fontWeight: 600, textDecoration: 'none', fontSize: '13.5px' }}>
                  Program Mitra WO (Komisi 20%)
                </Link>
              </li>
              <li>
                <Link href="/login" style={{ color: '#515154', textDecoration: 'none', fontSize: '13.5px' }}>
                  Masuk Dashboard Host / WO
                </Link>
              </li>
              <li>
                <a
                  href="https://wa.me/6285782255128?text=Halo%20SudutBingkai%2C%20saya%20tertarik%20konsultasi%20kamera%20tamu%20digital%20untuk%20acara%20saya"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#059669',
                    fontWeight: 600,
                    textDecoration: 'none',
                    fontSize: '13.5px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <MessageCircle size={14} />
                  <span>Chat WhatsApp CS (0857-8225-5128)</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Legal & Safety Bar */}
        <div
          style={{
            borderTop: '1px solid rgba(0, 0, 0, 0.08)',
            paddingTop: '28px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            fontSize: '12px',
            color: '#86868B',
          }}
        >
          <div>
            <span>© 2026 SudutBingkai. Seluruh hak cipta dilindungi. Estetika Leica & Apple Glass di Indonesia.</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={14} color="#10B981" />
              <span>Enkripsi SSL 256-bit</span>
            </span>
            <span>•</span>
            <span>Cloudflare R2 CDN</span>
            <span>•</span>
            <span>Mayar.id & QRIS Verified</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
