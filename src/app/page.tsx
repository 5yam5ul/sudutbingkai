'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Play, Camera, Check, ChevronDown, ChevronRight, Tv, Shield, Download, QrCode, Menu, X } from 'lucide-react';
import { FILM_PRESETS } from '@/lib/filters';
import { FilmPresetId } from '@/lib/types';

export default function HomePage() {
  const [activePreset, setActivePreset] = useState<FilmPresetId>('portra');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [vendors, setVendors] = useState<any[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/vendors')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.vendors) {
          setVendors(data.vendors);
        }
      })
      .catch(console.error);
  }, []);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const pricingTiers = [
    { name: 'Starter', price: 'Gratis', originalPrice: null, discountBadge: null, guests: 'Hingga 5 tamu', desc: 'Cocok untuk uji coba privat bersama keluarga dekat.', retention: '3 Hari', storage: '500 MB', popular: false, isFree: true },
    { name: 'Mini', price: 'Rp 54.000', originalPrice: 'Rp 69.000', discountBadge: 'HEMAT 20%', guests: 'Hingga 15 tamu', desc: 'Untuk pesta kecil, intimate dinner, atau bridal shower.', retention: '7 Hari (1 Minggu)', storage: '1 GB', popular: false },
    { name: 'Small', price: 'Rp 89.000', originalPrice: 'Rp 119.000', discountBadge: 'HEMAT 25%', guests: 'Hingga 35 tamu', desc: 'Cocok untuk gathering teman satu geng atau engagement.', retention: '14 Hari (2 Minggu)', storage: '2 GB', popular: false },
    { name: 'Party', price: 'Rp 179.000', originalPrice: 'Rp 219.000', discountBadge: 'HEMAT 18%', guests: 'Hingga 75 tamu', desc: 'Ulang tahun, intimate wedding, atau acara kantor.', retention: '30 Hari (1 Bulan)', storage: '5 GB', popular: false },
    { name: 'Event', price: 'Rp 269.000', originalPrice: 'Rp 329.000', discountBadge: 'HEMAT 18%', guests: 'Hingga 150 tamu', desc: 'Resepsi pernikahan sedang atau reuni akbar.', retention: '45 Hari (1.5 Bulan)', storage: '10 GB', popular: false },
    { name: 'Wedding', price: 'Rp 499.000', originalPrice: 'Rp 599.000', discountBadge: 'HEMAT 17%', guests: 'Hingga 300 tamu', desc: 'Pilihan paling populer untuk pesta pernikahan lengkap.', retention: '60 Hari (2 Bulan)', storage: '20 GB Cloud Storage', popular: true },
    { name: 'Unlimited', price: 'Rp 999.000', originalPrice: 'Rp 1.199.000', discountBadge: 'HEMAT 17%', guests: 'Tamu tanpa batas', desc: 'Festival, konser, atau wedding akbar ribuan tamu.', retention: '90 Hari (3 Bulan)', storage: '40 GB Cloud Storage', popular: false }
  ];

  const faqs = [
    {
      q: 'Berapa lama foto disimpan di web dan apa batasan penyimpanannya?',
      a: 'Masa simpan dirancang efisien dan pas agar server tetap cepat: mulai dari 3–7 hari (Starter & Mini), 14–30 hari (Small & Party), hingga 60 Hari / 2 Bulan untuk Paket Wedding (20 GB Cloud) dan 90 Hari untuk Paket Unlimited. Selama masa aktif tersebut, pengantin dan keluarga dapat mengunduh seluruh arsip foto resolusi tinggi asli (ZIP) dan pesan suara ke laptop atau Google Drive mereka secara gratis.'
    },
    {
      q: 'Apakah SudutBingkai hanya untuk acara pernikahan?',
      a: 'Sama sekali tidak. SudutBingkai dirancang fleksibel untuk segala jenis perayaan dan perkumpulan. Mayoritas pengguna kami memang pasangan pengantin yang ingin mengabadikan kehangatan meja tamu di hari pernikahan mereka, namun SudutBingkai juga sangat ramai digunakan untuk perayaan ulang tahun/sweet 17, gathering kantor, gala dinner perusahaan, reuni akbar, hingga konser dan festival komunitas.'
    },
    {
      q: 'Apa bedanya SudutBingkai dengan minta tamu kirim foto ke Google Drive atau WhatsApp?',
      a: 'Saat orang tahu fotonya langsung masuk ke grup atau drive, mereka cenderung menyeleksi atau lupa mengirimkannya sama sekali. Dengan SudutBingkai, tamu memotret langsung dengan nuansa kamera analog sekali pakai. Ada sensasi spontanitas, tanpa drama upload besok lusa yang biasanya berakhir tidak pernah terkirim.'
    },
    {
      q: 'Bagaimana kalau ada tamu yang kurang paham teknologi atau orang tua?',
      a: 'Kami sengaja merancangnya sesederhana mungkin. Tamu tidak perlu download aplikasi dari App Store atau Play Store, dan tidak ada formulir pendaftaran. Mereka cukup mengarahkan kamera HP biasa ke kartu barcode di meja makan, dan kamera langsung siap membidik.'
    },
    {
      q: 'Kapan foto-foto tersebut bisa dilihat oleh penyelenggara dan tamu?',
      a: 'Fleksibel sesuai keinginan Anda. Anda bisa membiarkannya langsung terbuka di galeri bersama seketika, atau menyimpannya dulu dengan timer cuci roll (misal baru terbuka pukul 22.00 malam saat acara usai). Membuka album bersama setelah pesta selesai rasanya seperti membuka kado kejutan yang penuh tawa.'
    },
    {
      q: 'Apakah kualitas file aslinya tetap jernih untuk dicetak?',
      a: 'Tentu. Penyelenggara acara dan seluruh tamu dapat mengunduh arsip foto dalam format resolusi tinggi asli (High-Res), lengkap dengan sentuhan warna emulsi film dan stempel tanggal nostalgia yang siap dicetak menjadi album fisik.'
    }
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FBFBFA', color: '#1D1D1F', position: 'relative' }}>
      {/* Background Ambient Radial Glow */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '1000px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(194, 120, 3, 0.05) 0%, rgba(251, 251, 250, 0) 70%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Top Banner (Luminous Glass) - Compact on Mobile */}
      <div style={{
        position: 'relative',
        zIndex: 60,
        background: 'rgba(255, 255, 255, 0.85)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
        backdropFilter: 'blur(16px)',
        padding: '8px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontSize: '12px',
        width: '100%',
        maxWidth: '100vw',
        overflow: 'hidden'
      }}>
        <Camera size={13} style={{ color: '#C27803', flexShrink: 0 }} />
        <span style={{ color: '#515154', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flexShrink: 1 }}>
          <span className="desktop-only">SudutBingkai • Kamera Sekali Pakai Digital untuk Segala Acara</span>
          <span className="mobile-only">Kamera Tamu Sekali Pakai</span>
        </span>
        <span style={{ background: '#C27803', color: '#FFFFFF', fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '999px', flexShrink: 0 }}>
          BARU
        </span>
        <Link href="/create" style={{ color: '#C27803', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
          <span>Mulai</span>
          <ArrowRight size={12} />
        </Link>
      </div>

      {/* Floating Glass Navigation (Apple style) */}
      <nav style={{ position: 'sticky', top: '12px', zIndex: 50, padding: '0 16px', marginTop: '8px' }}>
        <div className="glass-nav" style={{
          maxWidth: '1060px',
          margin: '0 auto',
          borderRadius: '20px',
          padding: '10px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <img 
              src="/sudut-bingkai-logo.png" 
              alt="Sudut Bingkai" 
              style={{ height: '34px', width: 'auto', objectFit: 'contain', display: 'block' }} 
            />
          </Link>

          {/* Desktop Navigation Links */}
          <div className="desktop-nav-links">
            <a href="#cara-kerja" style={{ color: '#6E6E73', textDecoration: 'none', fontSize: '13.5px', fontWeight: 500, transition: 'color 0.2s' }}>
              Cara Kerja
            </a>
            <a href="#preset" style={{ color: '#6E6E73', textDecoration: 'none', fontSize: '13.5px', fontWeight: 500, transition: 'color 0.2s' }}>
              Preset Film
            </a>
            <a href="#harga" style={{ color: '#6E6E73', textDecoration: 'none', fontSize: '13.5px', fontWeight: 500, transition: 'color 0.2s' }}>
              Harga
            </a>
            <Link href="/vendor" style={{ color: '#C27803', textDecoration: 'none', fontSize: '13.5px', fontWeight: 600 }}>
              Mitra Vendor / WO
            </Link>
          </div>

          {/* Right Action Buttons */}
          <div className="desktop-nav-actions">
            <Link href="/login" className="action-desktop-only" style={{ color: '#1D1D1F', textDecoration: 'none', fontSize: '13px', fontWeight: 500, padding: '7px 12px' }}>
              Masuk
            </Link>
            <Link href="/cam/demo" className="glass-pill action-desktop-only" style={{ padding: '7px 14px', fontSize: '12.5px', textDecoration: 'none' }}>
              Coba Kamera
            </Link>
            <Link href="/create" className="btn-apple-black action-desktop-only" style={{ padding: '8px 18px', fontSize: '13px' }}>
              <span>Buat album</span>
            </Link>

            {/* Mobile Menu Toggle Button */}
            <button 
              type="button" 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
              className="mobile-nav-toggle"
              aria-label="Menu Navigasi"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="glass-card" style={{
            maxWidth: '1060px',
            margin: '8px auto 0',
            borderRadius: '24px',
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: 'rgba(255, 255, 255, 0.96)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)'
          }}>
            <a 
              href="#cara-kerja" 
              onClick={() => setMobileMenuOpen(false)}
              style={{ color: '#1D1D1F', textDecoration: 'none', fontSize: '15px', fontWeight: 600, padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}
            >
              Cara Kerja
            </a>
            <a 
              href="#preset" 
              onClick={() => setMobileMenuOpen(false)}
              style={{ color: '#1D1D1F', textDecoration: 'none', fontSize: '15px', fontWeight: 600, padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}
            >
              Preset Film Analog
            </a>
            <a 
              href="#harga" 
              onClick={() => setMobileMenuOpen(false)}
              style={{ color: '#1D1D1F', textDecoration: 'none', fontSize: '15px', fontWeight: 600, padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}
            >
              Harga & Paket
            </a>
            <Link 
              href="/vendor" 
              onClick={() => setMobileMenuOpen(false)}
              style={{ color: '#C27803', textDecoration: 'none', fontSize: '15px', fontWeight: 700, padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}
            >
              Program Kemitraan WO
            </Link>
            <Link 
              href="/login" 
              onClick={() => setMobileMenuOpen(false)}
              style={{ color: '#515154', textDecoration: 'none', fontSize: '14px', fontWeight: 500, padding: '6px 0' }}
            >
              Masuk ke Acara Saya
            </Link>
            <div style={{ display: 'flex', gap: '10px', paddingTop: '6px' }}>
              <Link 
                href="/cam/demo" 
                onClick={() => setMobileMenuOpen(false)}
                className="btn-glass-secondary" 
                style={{ flex: 1, padding: '12px', fontSize: '13px', textAlign: 'center' }}
              >
                Coba Kamera Demo
              </Link>
              <Link 
                href="/create" 
                onClick={() => setMobileMenuOpen(false)}
                className="btn-apple-black" 
                style={{ flex: 1, padding: '12px', fontSize: '13px', textAlign: 'center' }}
              >
                Buat Album
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* HERO SECTION (Responsive Apple / Leica Side-by-side) */}
      <section style={{ position: 'relative', zIndex: 10, padding: '54px 20px 80px', maxWidth: '1160px', margin: '0 auto' }}>
        <div className="responsive-hero-grid">
          {/* Left Column: Bold Typography & CTAs */}
          <div>
            <div className="glass-pill" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '999px',
              marginBottom: '20px'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C27803' }} />
              <span className="font-mono-film" style={{ fontSize: '11px', color: '#C27803' }}>
                DIGITAL DISPOSABLE CAMERA
              </span>
            </div>

            <h1 className="font-display-serif" style={{
              fontSize: 'clamp(2.1rem, 5.5vw, 4.2rem)',
              fontWeight: 700,
              lineHeight: 1.08,
              marginBottom: '18px',
              letterSpacing: '-0.025em',
              color: '#1D1D1F'
            }}>
              <span>Momen paling jujur</span>
              <span style={{ display: 'block', fontStyle: 'italic', color: '#C27803' }}>
                lahir dari sudut pandang para tamu.
              </span>
            </h1>

            {/* Event Versatility Badges */}
            <div className="responsive-hero-badges" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
              <div className="desktop-only" style={{ display: 'contents' }}>
                <span style={{ fontSize: '11.5px', background: 'rgba(194, 120, 3, 0.12)', color: '#C27803', fontWeight: 700, padding: '4px 12px', borderRadius: '999px', border: '1px solid rgba(194, 120, 3, 0.25)' }}>
                  Pernikahan & Resepsi (Favorit)
                </span>
                <span style={{ fontSize: '11.5px', background: 'rgba(0, 0, 0, 0.04)', color: '#515154', fontWeight: 500, padding: '4px 12px', borderRadius: '999px', border: '1px solid rgba(0, 0, 0, 0.06)' }}>
                  Ulang Tahun & Sweet 17
                </span>
                <span style={{ fontSize: '11.5px', background: 'rgba(0, 0, 0, 0.04)', color: '#515154', fontWeight: 500, padding: '4px 12px', borderRadius: '999px', border: '1px solid rgba(0, 0, 0, 0.06)' }}>
                  Gathering Kantor & Gala
                </span>
                <span style={{ fontSize: '11.5px', background: 'rgba(0, 0, 0, 0.04)', color: '#515154', fontWeight: 500, padding: '4px 12px', borderRadius: '999px', border: '1px solid rgba(0, 0, 0, 0.06)' }}>
                  Reuni & Festival
                </span>
              </div>
              <div className="mobile-only">
                <span style={{ fontSize: '11.5px', background: 'rgba(194, 120, 3, 0.10)', color: '#C27803', fontWeight: 600, padding: '5px 14px', borderRadius: '999px', border: '1px solid rgba(194, 120, 3, 0.25)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span>Pernikahan</span> • <span>Ulang Tahun</span> • <span>Gathering</span>
                </span>
              </div>
            </div>

            <p className="responsive-hero-desc" style={{
              fontSize: '15px',
              color: '#515154',
              lineHeight: 1.65,
              marginBottom: '28px',
              maxWidth: '490px'
            }}>
              <span className="desktop-only">
                Dari resepsi pernikahan yang intim hingga perayaan ulang tahun, pesta kantor, atau reuni akbar—kamera resmi hanya bisa menangkap panggung utama. SudutBingkai memberi kamera saku analog ke tangan setiap tamu, mengabadikan tawa lepas kawan lama dan keseruan spontan di setiap meja tanpa perlu repot unduh aplikasi.
              </span>
              <span className="mobile-only">
                Kamera saku analog sekali pakai di genggaman setiap tamu. Abadikan tawa jujur dan kehangatan di setiap meja tanpa perlu download aplikasi.
              </span>
            </p>

            <div className="responsive-hero-cta" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '32px' }}>
              <Link href="/create" className="btn-apple-black" style={{ padding: '14px 30px', fontSize: '14.5px' }}>
                <span>Coba buat album gratis</span>
                <ArrowRight size={16} />
              </Link>

              <Link href="/cam/demo" className="btn-glass-secondary" style={{ padding: '14px 24px', fontSize: '14.5px' }}>
                <Play size={14} fill="currentColor" />
                <span>Coba Kamera Tamu</span>
              </Link>
            </div>

            {/* Social Proof Avatars */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              padding: '6px 14px 6px 8px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.75)',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
            }}>
              <div style={{ display: 'flex', marginLeft: '4px' }}>
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80" alt="Avatar" style={{ width: '26px', height: '26px', borderRadius: '50%', border: '2px solid #FFFFFF', objectFit: 'cover' }} />
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80" alt="Avatar" style={{ width: '26px', height: '26px', borderRadius: '50%', border: '2px solid #FFFFFF', marginLeft: '-8px', objectFit: 'cover' }} />
                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80" alt="Avatar" style={{ width: '26px', height: '26px', borderRadius: '50%', border: '2px solid #FFFFFF', marginLeft: '-8px', objectFit: 'cover' }} />
              </div>
              <span style={{ fontSize: '12.5px', color: '#515154' }}>
                <strong style={{ color: '#C27803', fontWeight: 600 }}>500+ acara</strong> memakai SudutBingkai
              </span>
            </div>
          </div>

          {/* Right Column: 3D Dual Phone Mockup (Adaptive Mobile Wrapper) */}
          <div className="responsive-mockup-wrapper">
            {/* Phone 1: Album Gallery Preview (Behind) */}
            <div className="phone-floating-left" style={{
              position: 'absolute',
              left: '10px',
              top: '20px',
              width: '270px',
              height: '480px',
              borderRadius: '40px',
              background: '#FFFFFF',
              border: '4px solid #E1E1E6',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 1
            }}>
              <div style={{ padding: '16px 16px 10px', borderBottom: '1px solid rgba(0, 0, 0, 0.06)', background: '#F8F8F7' }}>
                <span className="font-mono-film" style={{ fontSize: '9px', color: '#C27803' }}>ALBUM RESEPSI</span>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#1D1D1F' }}>Sarah & Dimas</h4>
                <p style={{ fontSize: '11px', color: '#86868B' }}>1.240 momen • 180 tamu</p>
              </div>
              <div style={{ flex: 1, padding: '10px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', overflow: 'hidden', background: '#FAFAF9' }}>
                <div style={{ aspectRatio: '3/4', borderRadius: '8px', overflow: 'hidden' }}>
                  <img src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=400&q=80" alt="Wedding" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ aspectRatio: '3/4', borderRadius: '8px', overflow: 'hidden' }}>
                  <img src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=400&q=80" alt="Wedding" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ aspectRatio: '3/4', borderRadius: '8px', overflow: 'hidden' }}>
                  <img src="https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=400&q=80" alt="Wedding" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ aspectRatio: '3/4', borderRadius: '8px', overflow: 'hidden' }}>
                  <img src="https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=400&q=80" alt="Wedding" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              </div>
            </div>

            {/* Phone 2: Live Disposable Camera Viewfinder (In Front) */}
            <div className="phone-floating-right" style={{
              position: 'absolute',
              right: '15px',
              top: '45px',
              width: '270px',
              height: '490px',
              borderRadius: '40px',
              background: '#0B0A09',
              border: '4px solid #2B2A27',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 2
            }}>
              {/* Camera Header */}
              <div style={{ padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#E2A07A', fontWeight: 600 }}>⚡ FLASH</span>
                <span className="font-mono-film" style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '2px 8px', borderRadius: '999px' }}>
                  PORTRA 400
                </span>
                <span style={{ fontSize: '11px', color: '#fff', fontFamily: 'var(--font-mono)' }}>16 SISA</span>
              </div>

              {/* Viewfinder Image */}
              <div style={{ flex: 1, margin: '0 10px', position: 'relative', borderRadius: '6px', overflow: 'hidden' }}>
                <img
                  src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=500&q=80"
                  alt="Live Camera"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  className="film-portra"
                />
                <span style={{ position: 'absolute', bottom: '8px', right: '10px', color: '#ff9900', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 'bold' }}>
                  '26 10 10
                </span>
              </div>

              {/* Shutter Ring */}
              <div style={{ padding: '16px', display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fff', border: '3px solid #141312', outline: '2px solid rgba(255,255,255,0.6)' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS STRIP (Universal proof in light theme) */}
      <section style={{ borderTop: '1px solid rgba(0, 0, 0, 0.06)', borderBottom: '1px solid rgba(0, 0, 0, 0.06)', background: 'rgba(255, 255, 255, 0.65)', backdropFilter: 'blur(20px)', padding: '36px 24px' }}>
        <div style={{ maxWidth: '1060px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span className="font-mono-film" style={{ fontSize: '11px', color: '#C27803' }}>
              TELAH DIPAKAI DI RATUSAN PERNIKAHAN, PESTA ULANG TAHUN, GATHERING & FESTIVAL
            </span>
          </div>
          <div className="responsive-stats-grid">
            <div>
              <div className="font-display-serif" style={{ fontSize: '38px', fontWeight: 700, color: '#1D1D1F' }}>500+</div>
              <div className="font-mono-film" style={{ color: '#86868B', marginTop: '4px' }}>ACARA & PERNIKAHAN</div>
            </div>
            <div>
              <div className="font-display-serif" style={{ fontSize: '38px', fontWeight: 700, color: '#1D1D1F' }}>35.000+</div>
              <div className="font-mono-film" style={{ color: '#86868B', marginTop: '4px' }}>TAMU MEMOTRET</div>
            </div>
            <div>
              <div className="font-display-serif" style={{ fontSize: '38px', fontWeight: 700, color: '#1D1D1F' }}>150.000+</div>
              <div className="font-mono-film" style={{ color: '#86868B', marginTop: '4px' }}>FOTO TERSIMPAN</div>
            </div>
            <div>
              <div className="font-display-serif" style={{ fontSize: '38px', fontWeight: 700, color: '#C27803' }}>100%</div>
              <div className="font-mono-film" style={{ color: '#86868B', marginTop: '4px' }}>TANPA APLIKASI</div>
            </div>
          </div>
        </div>
      </section>

      {/* PARTNER WEDDING & EVENT ORGANIZER SECTION (Strategic Value Proposition) */}
      <section style={{ padding: '64px 24px 72px', maxWidth: '1160px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ marginBottom: '32px' }}>
          <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '8px', letterSpacing: '0.08em' }}>
            KOLABORASI & KEMITRAAN AGENSI
          </span>
          <h3 className="font-display-serif" style={{ fontSize: 'clamp(24px, 3.5vw, 32px)', fontWeight: 700, color: '#1D1D1F' }}>
            Dirancang untuk Melengkapi Layanan <em>Wedding Organizer & Event Planner</em>
          </h3>
          <p style={{ color: '#6E6E73', fontSize: '14.5px', maxWidth: '620px', margin: '10px auto 0', lineHeight: 1.5 }}>
            Beri nilai tambah interaktif untuk calon pengantin dan klien Anda tanpa modal alat fisik, tanpa instalasi aplikasi, dan tanpa beban operasional.
          </p>
        </div>

        {/* 3 Pillar Benefit Cards for Agencies & Vendors */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          textAlign: 'left',
          marginBottom: '32px'
        }}>
          {/* Card 1 */}
          <div className="glass-card" style={{
            padding: '24px',
            borderRadius: '22px',
            background: 'rgba(255, 255, 255, 0.85)',
            border: '1px solid rgba(0, 0, 0, 0.07)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(194, 120, 3, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px',
              color: '#C27803'
            }}>
              <QrCode size={22} />
            </div>
            <strong style={{ fontSize: '16px', color: '#1D1D1F', display: 'block', marginBottom: '6px' }}>
              Add-On Eksklusif untuk Klien
            </strong>
            <p style={{ fontSize: '13px', color: '#6E6E73', lineHeight: 1.5, margin: 0 }}>
              Sertakan kamera analog digital ini sebagai bonus atau fasilitas paket wedding premium Anda. Calon pengantin mendapatkan kenangan spontan dari sudut pandang para tamu.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass-card" style={{
            padding: '24px',
            borderRadius: '22px',
            background: 'rgba(255, 255, 255, 0.85)',
            border: '1px solid rgba(0, 0, 0, 0.07)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(194, 120, 3, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px',
              color: '#C27803'
            }}>
              <Camera size={22} />
            </div>
            <strong style={{ fontSize: '16px', color: '#1D1D1F', display: 'block', marginBottom: '6px' }}>
              100% Bebas Ribet di Hari-H
            </strong>
            <p style={{ fontSize: '13px', color: '#6E6E73', lineHeight: 1.5, margin: 0 }}>
              Tamu tidak perlu antre instal aplikasi apa pun di App Store atau Play Store. Cukup letakkan barcode di meja resepsi, tamu scan dengan kamera HP bawaan dan langsung memotret.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass-card" style={{
            padding: '24px',
            borderRadius: '22px',
            background: 'rgba(255, 255, 255, 0.85)',
            border: '1px solid rgba(0, 0, 0, 0.07)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(194, 120, 3, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px',
              color: '#C27803'
            }}>
              <Shield size={22} />
            </div>
            <strong style={{ fontSize: '16px', color: '#1D1D1F', display: 'block', marginBottom: '6px' }}>
              Tarif Mitra & Branding Agensi
            </strong>
            <p style={{ fontSize: '13px', color: '#6E6E73', lineHeight: 1.5, margin: 0 }}>
              Dapatkan harga khusus agensi untuk margin usaha Anda. Nama & logo Wedding Organizer Anda dapat disematkan langsung pada template kartu cetak barcode dan album digital.
            </p>
          </div>
        </div>

        {/* Existing verified vendors row (if any exist in DB) */}
        {vendors.length > 0 && (
          <div className="responsive-partners-row" style={{ marginBottom: '28px' }}>
            {vendors.map((v: any) => (
              <div key={v.id} className="glass-card" style={{
                borderRadius: '16px',
                padding: '10px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(255, 255, 255, 0.85)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
              }}>
                {v.logoUrl && (
                  <img
                    src={v.logoUrl}
                    alt={v.name}
                    style={{ width: '32px', height: '32px', borderRadius: '10px', objectFit: 'cover', border: '1px solid rgba(0,0,0,0.06)' }}
                  />
                )}
                <div style={{ textAlign: 'left' }}>
                  <strong style={{ fontSize: '13px', color: '#1D1D1F', display: 'block' }}>{v.name}</strong>
                  <span style={{ fontSize: '11px', color: '#86868B' }}>{v.city} • {v.instagram}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Call to action for agencies */}
        <div style={{ display: 'inline-block' }}>
          <Link
            href="/vendor"
            className="btn-apple-black"
            style={{
              padding: '12px 28px',
              fontSize: '13.5px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)'
            }}
          >
            <span>Daftarkan Agensi WO / Vendor Anda & Pelajari Kemitraan</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* STEP BY STEP ALUR KERJA (Humanist & Warm) */}
      <section id="cara-kerja" style={{ padding: '100px 24px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '12px' }}>
            ALUR SEDERHANA
          </span>
          <h2 className="font-display-serif" style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 700, color: '#1D1D1F' }}>
            Mengalir alami. <em>Tanpa hambatan teknis.</em>
          </h2>
          <p style={{ color: '#6E6E73', fontSize: '15px', maxWidth: '520px', margin: '14px auto 0' }}>
            Tidak ada aplikasi yang harus diunduh dan tidak ada registrasi yang membingungkan. Tamu fokus bersenang-senang dan berbagi cerita.
          </p>
        </div>

        <div className="responsive-steps-grid">
          {/* Step 1 */}
          <div className="glass-card" style={{ padding: '36px 30px', borderRadius: '24px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(194, 120, 3, 0.12)', color: '#C27803', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '18px', marginBottom: '24px' }}>
              01
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '10px', color: '#1D1D1F' }}>Siapkan Wadah Cerita</h3>
            <p style={{ color: '#515154', fontSize: '14px', lineHeight: 1.6 }}>
              Beri nama acaramu (pernikahan, ulang tahun, gathering kantor, atau reuni), pilih karakter tone film analog yang cocok dengan tema dekorasi, dan tentukan apakah foto ingin dibuka langsung atau jadi kejutan di akhir malam.
            </p>
          </div>

          {/* Step 2 */}
          <div className="glass-card" style={{ padding: '36px 30px', borderRadius: '24px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(194, 120, 3, 0.12)', color: '#C27803', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '18px', marginBottom: '24px' }}>
              02
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '10px', color: '#1D1D1F' }}>Sebarkan Barcode Meja</h3>
            <p style={{ color: '#515154', fontSize: '14px', lineHeight: 1.6 }}>
              Cetak kartu meja berdesain elegan yang kami sediakan. Tamu cukup mengarahkan kamera HP biasa ke barcode—ponsel mereka seketika bertransformasi menjadi kamera saku analog.
            </p>
          </div>

          {/* Step 3 */}
          <div className="glass-card" style={{ padding: '36px 30px', borderRadius: '24px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(194, 120, 3, 0.12)', color: '#C27803', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '18px', marginBottom: '24px' }}>
              03
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '10px', color: '#1D1D1F' }}>Buka Kejutan Bersama</h3>
            <p style={{ color: '#515154', fontSize: '14px', lineHeight: 1.6 }}>
              Setiap bidikan terangkum dalam satu rol bersama lengkap dengan stempel tanggal retro. Nikmati kembali kehangatan hari bahagiamu melalui ratusan sudut pandang yang tulus.
            </p>
          </div>
        </div>
      </section>

      {/* ANALOG FILM PRESET SELECTOR (Humanist Warm Tone) */}
      <section id="preset" style={{ padding: '90px 24px', background: 'rgba(0, 0, 0, 0.015)', borderTop: '1px solid rgba(0, 0, 0, 0.06)', borderBottom: '1px solid rgba(0, 0, 0, 0.06)' }}>
        <div style={{ maxWidth: '1060px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '10px' }}>
              KARAKTER RASA
            </span>
            <h2 className="font-display-serif" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, color: '#1D1D1F' }}>
              Sentuhan Tone Film <em>Klasik 35mm</em>
            </h2>
            <p style={{ color: '#6E6E73', fontSize: '14.5px', maxWidth: '520px', margin: '12px auto 0' }}>
              Bukan sekadar filter instan biasa. Setiap bidikan diproses dengan tekstur grain organik dan stempel tanggal amber khas kamera saku analog '90-an.
            </p>
          </div>

          {/* Preset Buttons - Swipeable Row on Mobile */}
          <div className="responsive-presets-row">
            {Object.entries(FILM_PRESETS).map(([id, p]) => (
              <button
                key={id}
                onClick={() => setActivePreset(id as FilmPresetId)}
                className="glass-pill"
                style={{
                  background: activePreset === id ? '#000000' : 'rgba(255, 255, 255, 0.8)',
                  color: activePreset === id ? '#FFFFFF' : '#1D1D1F',
                  fontWeight: activePreset === id ? 700 : 500,
                  padding: '9px 18px',
                  borderRadius: '999px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  border: activePreset === id ? 'none' : '1px solid rgba(0, 0, 0, 0.08)'
                }}
              >
                {p.name}
              </button>
            ))}
          </div>

          {/* Live Emulation Showcase Card */}
          <div className="glass-card responsive-preset-card">
            <div style={{ aspectRatio: '3/4', borderRadius: '16px', overflow: 'hidden', position: 'relative', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }} className={`film-${activePreset}`}>
              <img
                src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=700&q=80"
                alt="Emulation preview"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <span style={{ position: 'absolute', bottom: '12px', right: '14px', color: '#ff9900', fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 'bold' }}>
                '26 10 10
              </span>
            </div>

            <div>
              <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '6px' }}>
                PROFIL TONE
              </span>
              <h3 className="font-display-serif" style={{ fontSize: '32px', fontWeight: 700, marginBottom: '12px', color: '#1D1D1F' }}>
                {FILM_PRESETS[activePreset].name}
              </h3>
              <p style={{ color: '#515154', fontSize: '14.5px', lineHeight: 1.7, marginBottom: '24px' }}>
                {FILM_PRESETS[activePreset].description}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(0, 0, 0, 0.08)', paddingTop: '20px', fontSize: '13px', color: '#6E6E73' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Sensitivitas Emulsi</span>
                  <span className="font-mono-film" style={{ color: '#1D1D1F', fontWeight: 600 }}>{FILM_PRESETS[activePreset].iso}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tipe Grain</span>
                  <span className="font-mono-film" style={{ color: '#1D1D1F', fontWeight: 600 }}>Organic 35mm Halide</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Stempel Tanggal</span>
                  <span className="font-mono-film" style={{ color: '#D97706', fontWeight: 700 }}>'90s Amber LCD</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING TIERS SECTION (Exact match to satualbum.id tiers in light theme) */}
      <section id="harga" style={{ padding: '100px 24px', maxWidth: '1180px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '12px' }}>
            HARGA & PAKET
          </span>
          <h2 className="font-display-serif" style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 700, color: '#1D1D1F' }}>
            Pilih paket sesuai <em>ukuran acaramu.</em>
          </h2>
          <p style={{ color: '#6E6E73', fontSize: '15px', maxWidth: '540px', margin: '14px auto 0' }}>
            Mulai gratis untuk hingga 5 tamu. Bayar sekali per acara tanpa langganan tersembunyi.
          </p>
        </div>

        <div className="responsive-pricing-grid">
          {pricingTiers.map((tier) => (
            <div
              key={tier.name}
              className="glass-card"
              style={{
                padding: '28px 24px',
                borderRadius: '22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                border: tier.popular ? '2px solid #C27803' : '1px solid rgba(0, 0, 0, 0.08)',
                background: tier.popular ? 'rgba(255, 255, 255, 0.95)' : undefined
              }}
            >
              {tier.popular && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#C27803',
                  color: '#FFFFFF',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 12px',
                  borderRadius: '999px',
                  letterSpacing: '0.04em'
                }}>
                  PALING POPULER
                </div>
              )}

              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1D1D1F', marginBottom: '6px' }}>
                  {tier.name}
                </h3>
                <p style={{ fontSize: '12.5px', color: '#C27803', fontWeight: 600, marginBottom: '16px' }}>
                  {tier.guests}
                </p>

                <div style={{ marginBottom: '14px' }}>
                  {tier.originalPrice && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ textDecoration: 'line-through', color: '#86868B', fontSize: '14px', fontWeight: 500 }}>
                        {tier.originalPrice}
                      </span>
                      {tier.discountBadge && (
                        <span style={{ background: 'rgba(194, 120, 3, 0.12)', color: '#C27803', fontSize: '10.5px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.04em' }}>
                          {tier.discountBadge}
                        </span>
                      )}
                    </div>
                  )}
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#1D1D1F', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                    {tier.price}
                  </div>
                </div>

                <p style={{ fontSize: '13px', color: '#6E6E73', lineHeight: 1.5, marginBottom: '24px' }}>
                  {tier.desc}
                </p>

                <div style={{ borderTop: '1px solid rgba(0, 0, 0, 0.07)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '12.5px', color: '#515154', marginBottom: '28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Check size={14} color="#C27803" />
                    <span>Masa Simpan: <strong>{tier.retention}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Check size={14} color="#C27803" />
                    <span>Penyimpanan: <strong>{tier.storage}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Check size={14} color="#C27803" />
                    <span>Preset film analog</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Check size={14} color="#C27803" />
                    <span>Layar proyektor live</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Check size={14} color="#C27803" />
                    <span>Cetak kartu meja QR</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Check size={14} color="#C27803" />
                    <span>Unduh resolusi tinggi (ZIP)</span>
                  </div>
                </div>
              </div>

              <Link
                href={`/create?package=${tier.name.toLowerCase()}`}
                className={tier.popular ? "btn-apple-black" : "btn-glass-secondary"}
                style={{ width: '100%', padding: '12px', fontSize: '13.5px', textAlign: 'center' }}
              >
                <span>{tier.isFree ? 'Mulai Gratis' : 'Pilih Paket'}</span>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ SECTION (Exact match to satualbum.id in light theme) */}
      <section id="faq" style={{ padding: '80px 24px 100px', maxWidth: '820px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '10px' }}>
            PERTANYAAN UMUM
          </span>
          <h2 className="font-display-serif" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, color: '#1D1D1F' }}>
            Kerap Ditanyakan
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="glass-card"
              style={{ borderRadius: '18px', overflow: 'hidden', cursor: 'pointer' }}
              onClick={() => toggleFaq(i)}
            >
              <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '15.5px', fontWeight: 600, color: '#1D1D1F', paddingRight: '16px' }}>
                  {faq.q}
                </h4>
                <ChevronDown
                  size={18}
                  style={{
                    color: '#86868B',
                    transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                    flexShrink: 0
                  }}
                />
              </div>

              {openFaq === i && (
                <div style={{ padding: '0 24px 22px', color: '#515154', fontSize: '14px', lineHeight: 1.7, borderTop: '1px solid rgba(0, 0, 0, 0.06)', paddingTop: '16px' }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER (Clean Light Glass) */}
      <footer style={{ borderTop: '1px solid rgba(0, 0, 0, 0.07)', background: '#F4F4F1', padding: '64px 24px 40px' }}>
        <div style={{ maxWidth: '1060px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '32px' }}>
          <div>
            <div style={{ marginBottom: '12px' }}>
              <img 
                src="/sudut-bingkai-logo.png" 
                alt="Sudut Bingkai" 
                style={{ height: '42px', width: 'auto', objectFit: 'contain', display: 'block' }} 
              />
            </div>
            <p style={{ color: '#6E6E73', fontSize: '13px', maxWidth: '360px' }}>
              Pengalaman kamera sekali pakai digital untuk momen otentik dan tak terlupakan di hari istimewa Anda.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '32px', fontSize: '13px', color: '#515154' }}>
            <Link href="/create" style={{ color: 'inherit', textDecoration: 'none' }}>Buat Album</Link>
            <Link href="/cam/demo" style={{ color: 'inherit', textDecoration: 'none' }}>Kamera Tamu</Link>
            <Link href="/event/wedding-sarah-dimas" style={{ color: 'inherit', textDecoration: 'none' }}>Galeri Acara</Link>
          </div>
        </div>

        <div style={{ maxWidth: '1060px', margin: '48px auto 0', paddingTop: '24px', borderTop: '1px solid rgba(0, 0, 0, 0.06)', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#86868B' }}>
          <span>© 2026 SudutBingkai. Hak cipta dilindungi.</span>
          <span>Dibuat dengan estetika Apple Luminous Glass & Leica.</span>
        </div>
      </footer>
    </div>
  );
}
