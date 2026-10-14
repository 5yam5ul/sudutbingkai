'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, ArrowRight, ArrowLeft, Lock, AlertCircle, KeyRound, CheckCircle2 } from 'lucide-react';
import { authenticateUser, setClientSession, getClientSession } from '@/lib/auth';
import { toast } from 'sonner';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const session = getClientSession();
    if (session && session.role === 'admin') {
      router.push('/admin');
    }
  }, [router]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPass, role: 'admin' }),
      });
      const data = await res.json();

      if (res.ok && data.success && data.user && data.user.role === 'admin') {
        setClientSession(data.user, data.token);
        toast.success('Otentikasi Super Admin Berhasil!');
        router.push('/admin');
        return;
      }

      const fallbackAdmin = authenticateUser(cleanEmail, cleanPass, 'admin');
      if (fallbackAdmin && fallbackAdmin.role === 'admin') {
        setClientSession(fallbackAdmin);
        toast.success('Otentikasi Super Admin Berhasil!');
        router.push('/admin');
      } else {
        setErrorMsg(data.error || 'Kredensial Super Admin tidak valid atau tidak memiliki hak akses.');
      }
    } catch {
      const fallbackAdmin = authenticateUser(cleanEmail, cleanPass, 'admin');
      if (fallbackAdmin && fallbackAdmin.role === 'admin') {
        setClientSession(fallbackAdmin);
        toast.success('Otentikasi Super Admin Berhasil!');
        router.push('/admin');
      } else {
        setErrorMsg('Kredensial Super Admin tidak valid atau tidak memiliki hak akses.');
      }
    } finally {
      setLoading(false);
    }
  };



  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0F0F11',
      color: '#FBFBFA',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      fontFamily: 'var(--font-sans)'
    }}>
      {/* Background Security Grid Effect */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(rgba(245, 158, 11, 0.08) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        pointerEvents: 'none',
        opacity: 0.8
      }} />

      {/* Top Header */}
      <header style={{
        position: 'relative',
        zIndex: 10,
        padding: '16px 24px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', color: '#A1A1A6', fontSize: '13px' }}>
          <ArrowLeft size={16} />
          <span>Kembali ke Web Publik</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={16} color="#F59E0B" />
          <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', color: '#F59E0B', textTransform: 'uppercase' }}>
            Restricted Admin Area
          </span>
        </div>
      </header>

      {/* Center Console Card */}
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px 64px',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{
          maxWidth: '420px',
          width: '100%',
          background: 'rgba(26, 26, 30, 0.85)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          padding: '32px 28px',
          boxShadow: '0 24px 64px -12px rgba(0, 0, 0, 0.6)'
        }}>
          
          {/* Logo / Badge */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.05) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Shield size={26} color="#F59E0B" />
            </div>

            <span style={{
              fontSize: '10.5px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#F59E0B',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)'
            }}>
              SUDUTBINGKAI HQ CONTROL
            </span>

            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#FFFFFF', marginTop: '6px', marginBottom: '6px' }}>
              Portal Super Admin
            </h1>

            <p style={{ color: '#8E8E93', fontSize: '13px' }}>
              Masuk dengan akun pengelola resmi untuk mengakses moderasi foto, data vendor, dan keuangan.
            </p>
          </div>



          {/* Error Message */}
          {errorMsg && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#FCA5A5',
              borderRadius: '12px',
              padding: '10px 14px',
              fontSize: '12.5px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#A1A1A6', marginBottom: '6px' }}>
                Email Super Admin
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@sudutbingkai.id"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#A1A1A6', marginBottom: '6px' }}>
                Master Kata Sandi
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: '12px',
                background: '#F59E0B',
                color: '#12110F',
                border: 'none',
                fontWeight: 700,
                fontSize: '14px',
                cursor: loading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '8px',
                boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3)',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{loading ? 'Mengotentikasi...' : 'Masuk ke Dashboard Admin'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

        </div>
      </main>
    </div>
  );
}
