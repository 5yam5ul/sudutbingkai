'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

interface HeaderNavProps {
  activePath?: string;
}

export default function HeaderNav({ activePath = '/' }: HeaderNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav style={{ position: 'sticky', top: '12px', zIndex: 50, padding: '0 16px', marginTop: '8px' }}>
      <div
        className="glass-nav"
        style={{
          maxWidth: '1060px',
          margin: '0 auto',
          borderRadius: '20px',
          padding: '10px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <img
            src="/sudut-bingkai-logo.png"
            alt="Sudut Bingkai"
            width={140}
            height={34}
            fetchPriority="high"
            decoding="async"
            style={{ height: '34px', width: 'auto', objectFit: 'contain', display: 'block' }}
          />
        </Link>

        {/* Desktop Navigation Links */}
        <div className="desktop-nav-links">
          <Link
            href="/"
            style={{
              color: activePath === '/' ? '#1D1D1F' : '#6E6E73',
              textDecoration: 'none',
              fontSize: '13.5px',
              fontWeight: activePath === '/' ? 600 : 500,
            }}
          >
            Beranda
          </Link>
          <Link
            href="/#cara-kerja"
            style={{
              color: '#6E6E73',
              textDecoration: 'none',
              fontSize: '13.5px',
              fontWeight: 500,
            }}
          >
            Cara Kerja
          </Link>
          <Link
            href="/#preset"
            style={{
              color: '#6E6E73',
              textDecoration: 'none',
              fontSize: '13.5px',
              fontWeight: 500,
            }}
          >
            Preset Film
          </Link>
          <Link
            href="/#harga"
            style={{
              color: '#6E6E73',
              textDecoration: 'none',
              fontSize: '13.5px',
              fontWeight: 500,
            }}
          >
            Harga
          </Link>
          <Link
            href="/panduan"
            style={{
              color: activePath === '/panduan' ? '#C27803' : '#6E6E73',
              textDecoration: 'none',
              fontSize: '13.5px',
              fontWeight: activePath === '/panduan' ? 700 : 500,
            }}
          >
            Panduan
          </Link>
          <Link
            href="/vendor"
            style={{
              color: activePath === '/vendor' ? '#C27803' : '#C27803',
              textDecoration: 'none',
              fontSize: '13.5px',
              fontWeight: 600,
            }}
          >
            Mitra Vendor / WO
          </Link>
        </div>

        {/* Right Action Buttons */}
        <div className="desktop-nav-actions">
          <Link
            href="/login"
            className="action-desktop-only"
            style={{ color: '#1D1D1F', textDecoration: 'none', fontSize: '13px', fontWeight: 500, padding: '7px 12px' }}
          >
            Masuk
          </Link>
          <Link
            href="/cam/demo"
            className="glass-pill action-desktop-only"
            style={{ padding: '7px 14px', fontSize: '12.5px', textDecoration: 'none' }}
          >
            Coba Kamera
          </Link>
          <Link
            href="/create"
            className="btn-apple-black action-desktop-only"
            style={{ padding: '8px 18px', fontSize: '13px', textDecoration: 'none' }}
          >
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
        <div
          className="glass-card"
          style={{
            maxWidth: '1060px',
            margin: '8px auto 0',
            borderRadius: '24px',
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: 'rgba(255, 255, 255, 0.96)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
          }}
        >
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              color: '#1D1D1F',
              textDecoration: 'none',
              fontSize: '15px',
              fontWeight: 600,
              padding: '8px 0',
              borderBottom: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            Beranda
          </Link>
          <Link
            href="/#cara-kerja"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              color: '#1D1D1F',
              textDecoration: 'none',
              fontSize: '15px',
              fontWeight: 600,
              padding: '8px 0',
              borderBottom: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            Cara Kerja
          </Link>
          <Link
            href="/#preset"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              color: '#1D1D1F',
              textDecoration: 'none',
              fontSize: '15px',
              fontWeight: 600,
              padding: '8px 0',
              borderBottom: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            Preset Film Analog
          </Link>
          <Link
            href="/#harga"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              color: '#1D1D1F',
              textDecoration: 'none',
              fontSize: '15px',
              fontWeight: 600,
              padding: '8px 0',
              borderBottom: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            Harga & Paket
          </Link>
          <Link
            href="/panduan"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              color: '#C27803',
              textDecoration: 'none',
              fontSize: '15px',
              fontWeight: 700,
              padding: '8px 0',
              borderBottom: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            Panduan Pernikahan
          </Link>
          <Link
            href="/vendor"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              color: '#C27803',
              textDecoration: 'none',
              fontSize: '15px',
              fontWeight: 700,
              padding: '8px 0',
              borderBottom: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            Program Kemitraan WO
          </Link>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px' }}>
            <Link
              href="/cam/demo"
              onClick={() => setMobileMenuOpen(false)}
              className="glass-pill"
              style={{ padding: '12px', fontSize: '14px', textAlign: 'center', textDecoration: 'none' }}
            >
              Coba Kamera Tamu
            </Link>
            <Link
              href="/create"
              onClick={() => setMobileMenuOpen(false)}
              className="btn-apple-black"
              style={{ padding: '12px', fontSize: '14px', textAlign: 'center', textDecoration: 'none' }}
            >
              <span>Buat Album Acara</span>
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                color: '#6E6E73',
                fontSize: '13px',
                textAlign: 'center',
                textDecoration: 'none',
                paddingTop: '6px',
              }}
            >
              Masuk ke Akun Host / WO
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
