import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface HeaderNavProps {
  activePath?: string;
}

export default function HeaderNav({ activePath = '/' }: HeaderNavProps) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(251, 251, 250, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
      }}
    >
      <div
        style={{
          maxWidth: '1120px',
          margin: '0 auto',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <img
            src="/sudut-bingkai-logo.png"
            alt="Sudut Bingkai"
            width={140}
            height={34}
            loading="eager"
            decoding="async"
            style={{ height: '34px', width: 'auto', objectFit: 'contain', display: 'block' }}
          />
        </Link>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
          <Link
            href="/"
            style={{
              color: activePath === '/' ? '#1D1D1F' : '#6E6E73',
              fontWeight: activePath === '/' ? 600 : 500,
              textDecoration: 'none',
              fontSize: '13.5px',
            }}
          >
            Beranda
          </Link>
          <Link
            href="/#cara-kerja"
            style={{
              color: '#6E6E73',
              fontWeight: 500,
              textDecoration: 'none',
              fontSize: '13.5px',
            }}
          >
            Cara Kerja
          </Link>
          <Link
            href="/panduan"
            style={{
              color: activePath === '/panduan' ? '#C27803' : '#6E6E73',
              fontWeight: activePath === '/panduan' ? 700 : 500,
              textDecoration: 'none',
              fontSize: '13.5px',
            }}
          >
            Panduan
          </Link>
          <Link
            href="/vendor"
            style={{
              color: activePath === '/vendor' ? '#C27803' : '#6E6E73',
              fontWeight: activePath === '/vendor' ? 700 : 500,
              textDecoration: 'none',
              fontSize: '13.5px',
            }}
          >
            Mitra WO
          </Link>
        </nav>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link
            href="/cam/demo"
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#1D1D1F',
              backgroundColor: '#FFFFFF',
              border: '1px solid rgba(0, 0, 0, 0.12)',
              padding: '7px 16px',
              borderRadius: '999px',
              textDecoration: 'none',
            }}
          >
            Coba Kamera
          </Link>
          <Link
            href="/create"
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#FFFFFF',
              backgroundColor: '#1D1D1F',
              padding: '7px 16px',
              borderRadius: '999px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Buat Acara
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </header>
  );
}
