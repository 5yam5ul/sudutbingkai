'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Shield, Heart, Briefcase, Check, AlertCircle } from 'lucide-react';
import { authenticateUser, setClientSession, getClientSession } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<'host' | 'vendor' | 'admin'>('host');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const existing = getClientSession();
    if (existing) {
      if (existing.role === 'admin') {
        router.push('/admin');
      } else if (existing.role === 'vendor') {
        router.push('/vendor');
      } else {
        router.push('/dashboard');
      }
    }
  }, [router]);

  const handleRoleChange = (newRole: 'host' | 'vendor' | 'admin') => {
    setRole(newRole);
    setErrorMsg('');
    setEmail('');
    setPassword('');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    setTimeout(() => {
      const user = authenticateUser(email, password, role);
      if (user) {
        setClientSession(user);
        if (user.role === 'admin') {
          router.push('/admin');
        } else if (user.role === 'vendor') {
          router.push('/vendor');
        } else {
          router.push('/dashboard');
        }
      } else {
        setErrorMsg('Email atau kata sandi tidak cocok. Silakan gunakan kredensial resmi tertera di bawah.');
      }
      setLoading(false);
    }, 350);
  };

  const handleFillCredentials = () => {
    setErrorMsg('');
    if (role === 'admin') {
      setEmail('admin@sudutbingkai.id');
      setPassword('admin123');
    } else if (role === 'host') {
      setEmail('pengantin@sudutbingkai.id');
      setPassword('pengantin123');
    } else {
      setEmail('vendor@sudutbingkai.id');
      setPassword('vendor123');
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FBFBFA', color: '#1D1D1F', display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar */}
      <header className="glass-nav" style={{ padding: 'calc(12px + env(safe-area-inset-top, 0px)) 16px 12px', borderBottom: '1px solid rgba(0, 0, 0, 0.06)' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', color: '#515154' }}>
            <ArrowLeft size={16} />
            <span style={{ fontSize: '13px', fontWeight: 500 }}>Beranda</span>
          </Link>

          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <img 
              src="/sudut-bingkai-logo.png" 
              alt="Sudut Bingkai" 
              style={{ height: '30px', width: 'auto', objectFit: 'contain', display: 'block' }} 
            />
          </Link>

          <div style={{ width: '80px', visibility: 'hidden' }} aria-hidden="true" />
        </div>
      </header>

      {/* Main Login Card */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px 60px' }}>
        <div className="glass-card form-section-card" style={{ maxWidth: '440px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '6px' }}>
              PORTAL MASUK
            </span>
            <h1 className="font-display-serif" style={{ fontSize: 'clamp(1.5rem, 4vw, 1.85rem)', fontWeight: 700, color: '#1D1D1F' }}>
              Masuk ke Dashboard
            </h1>
            <p style={{ color: '#6E6E73', fontSize: '13.5px', marginTop: '6px' }}>
              Pilih peran Anda untuk masuk ke akun kendali.
            </p>
          </div>

          {/* Role Switcher Tabs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '6px',
            background: 'rgba(0, 0, 0, 0.04)',
            padding: '4px',
            borderRadius: '14px',
            marginBottom: '20px'
          }}>
            <button
              type="button"
              onClick={() => handleRoleChange('host')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '10px 6px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                background: role === 'host' ? '#FFFFFF' : 'transparent',
                color: role === 'host' ? '#1D1D1F' : '#6E6E73',
                fontWeight: role === 'host' ? 700 : 500,
                fontSize: '11px',
                boxShadow: role === 'host' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <Heart size={13} color={role === 'host' ? '#C27803' : 'currentColor'} />
              <span>Host / Klien</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleChange('vendor')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '10px 6px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                background: role === 'vendor' ? '#FFFFFF' : 'transparent',
                color: role === 'vendor' ? '#1D1D1F' : '#6E6E73',
                fontWeight: role === 'vendor' ? 700 : 500,
                fontSize: '11px',
                boxShadow: role === 'vendor' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <Briefcase size={13} color={role === 'vendor' ? '#C27803' : 'currentColor'} />
              <span>Mitra Vendor</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleChange('admin')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '10px 6px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                background: role === 'admin' ? '#1D1D1F' : 'transparent',
                color: role === 'admin' ? '#FFFFFF' : '#6E6E73',
                fontWeight: role === 'admin' ? 700 : 500,
                fontSize: '12px',
                boxShadow: role === 'admin' ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <Shield size={13} color={role === 'admin' ? '#F59E0B' : 'currentColor'} />
              <span>Admin</span>
            </button>
          </div>

          {/* Official Account Credentials Helper */}
          <div style={{
            background: role === 'admin' ? 'rgba(30, 27, 75, 0.05)' : 'rgba(194, 120, 3, 0.06)',
            border: role === 'admin' ? '1px solid rgba(79, 70, 229, 0.3)' : '1px solid rgba(194, 120, 3, 0.22)',
            borderRadius: '14px',
            padding: '12px 14px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="font-mono-film" style={{ fontSize: '10px', color: role === 'admin' ? '#4F46E5' : '#C27803' }}>
                {role === 'admin' ? 'AKUN SUPER ADMIN' : 'AKUN UJI COBA RESMI'}
              </span>
              <button
                type="button"
                onClick={handleFillCredentials}
                style={{
                  background: '#FFFFFF',
                  border: role === 'admin' ? '1px solid rgba(79, 70, 229, 0.4)' : '1px solid rgba(194, 120, 3, 0.35)',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: role === 'admin' ? '#4F46E5' : '#C27803',
                  cursor: 'pointer'
                }}
              >
                Gunakan Akun Ini
              </button>
            </div>
            <div style={{ fontSize: '12px', color: '#1D1D1F', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div>Email: <strong>{role === 'admin' ? 'admin@sudutbingkai.id' : role === 'host' ? 'pengantin@sudutbingkai.id' : 'vendor@sudutbingkai.id'}</strong></div>
              <div>Password: <strong>{role === 'admin' ? 'admin123' : role === 'host' ? 'pengantin123' : 'vendor123'}</strong></div>
            </div>
          </div>

          {errorMsg && (
            <div style={{
              background: 'rgba(231, 76, 60, 0.1)',
              border: '1px solid rgba(231, 76, 60, 0.3)',
              color: '#C0392B',
              borderRadius: '12px',
              padding: '10px 14px',
              fontSize: '12.5px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                Email {role === 'vendor' ? 'Mitra Vendor' : role === 'admin' ? 'Super Admin' : 'Host / Penyelenggara'}
              </label>
              <input
                type="email"
                required
                placeholder={role === 'vendor' ? 'vendor@sudutbingkai.id' : role === 'admin' ? 'admin@sudutbingkai.id' : 'pengantin@sudutbingkai.id'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass-input"
                style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '16px' }}
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
                style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '16px' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-apple-black"
              style={{ width: '100%', padding: '14px', borderRadius: '12px', fontSize: '15px', marginTop: '6px' }}
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
