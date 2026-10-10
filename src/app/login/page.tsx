'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Shield, Heart, Briefcase, Check } from 'lucide-react';
import { DEMO_USERS, setClientSession } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<'host' | 'vendor'>('host');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      if (role === 'vendor') {
        const user = DEMO_USERS['vendor'];
        setClientSession(user);
        router.push('/vendor');
      } else {
        const user = DEMO_USERS['pengantin'];
        setClientSession(user);
        router.push('/dashboard');
      }
      setLoading(false);
    }, 400);
  };

  const loginAsDemo = (demoRole: 'host' | 'vendor') => {
    if (demoRole === 'vendor') {
      setClientSession(DEMO_USERS['vendor']);
      router.push('/vendor');
    } else {
      setClientSession(DEMO_USERS['pengantin']);
      router.push('/dashboard');
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FBFBFA', color: '#1D1D1F', display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar */}
      <header className="glass-nav" style={{ padding: '16px 24px', borderBottom: '1px solid rgba(0, 0, 0, 0.06)' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', color: '#515154' }}>
            <ArrowLeft size={16} />
            <span style={{ fontSize: '13.5px', fontWeight: 500 }}>Kembali ke Beranda</span>
          </Link>

          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <img 
              src="/sudut-bingkai-logo.png" 
              alt="Sudut Bingkai" 
              style={{ height: '34px', width: 'auto', objectFit: 'contain', display: 'block' }} 
            />
          </Link>

          <div style={{ width: '80px' }} />
        </div>
      </header>

      {/* Main Login Card */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px 80px' }}>
        <div className="glass-card" style={{ maxWidth: '440px', width: '100%', borderRadius: '28px', padding: '36px 32px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '6px' }}>
              PORTAL MASUK
            </span>
            <h1 className="font-display-serif" style={{ fontSize: '28px', fontWeight: 700, color: '#1D1D1F' }}>
              Selamat Datang Kembali
            </h1>
            <p style={{ color: '#6E6E73', fontSize: '13.5px', marginTop: '6px' }}>
              Pilih peran Anda untuk masuk ke dashboard kendali.
            </p>
          </div>

          {/* Role Switcher Tabs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '6px',
            background: 'rgba(0, 0, 0, 0.04)',
            padding: '4px',
            borderRadius: '14px',
            marginBottom: '24px'
          }}>
            <button
              type="button"
              onClick={() => setRole('host')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                background: role === 'host' ? '#FFFFFF' : 'transparent',
                color: role === 'host' ? '#1D1D1F' : '#6E6E73',
                fontWeight: role === 'host' ? 700 : 500,
                fontSize: '13px',
                boxShadow: role === 'host' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <Heart size={14} color={role === 'host' ? '#C27803' : 'currentColor'} />
              <span>Pengantin (Host)</span>
            </button>

            <button
              type="button"
              onClick={() => setRole('vendor')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                background: role === 'vendor' ? '#FFFFFF' : 'transparent',
                color: role === 'vendor' ? '#1D1D1F' : '#6E6E73',
                fontWeight: role === 'vendor' ? 700 : 500,
                fontSize: '13px',
                boxShadow: role === 'vendor' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <Briefcase size={14} color={role === 'vendor' ? '#C27803' : 'currentColor'} />
              <span>Mitra Vendor / WO</span>
            </button>
          </div>

          {/* Quick Demo Access Bar */}
          <div style={{
            background: 'rgba(194, 120, 3, 0.08)',
            border: '1px solid rgba(194, 120, 3, 0.2)',
            borderRadius: '14px',
            padding: '12px 14px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: '12px', color: '#1D1D1F', fontWeight: 500 }}>
              Uji coba instan tanpa password:
            </span>
            <button
              onClick={() => loginAsDemo(role)}
              style={{
                background: '#C27803',
                color: '#fff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Masuk Demo →
            </button>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                Email {role === 'vendor' ? 'Mitra WO' : 'Pengantin'}
              </label>
              <input
                type="email"
                required
                placeholder={role === 'vendor' ? 'arya@vowsandco.id' : 'sarah@sudutbingkai.id'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass-input"
                style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                Kata Sandi
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-input"
                style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-apple-black"
              style={{ width: '100%', padding: '14px', borderRadius: '12px', fontSize: '14.5px', marginTop: '6px' }}
            >
              <span>{loading ? 'Memverifikasi...' : 'Masuk ke Dashboard'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: '#6E6E73' }}>
            Belum punya album acara?{' '}
            <Link href="/create" style={{ color: '#C27803', fontWeight: 600, textDecoration: 'none' }}>
              Buat sekarang
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
