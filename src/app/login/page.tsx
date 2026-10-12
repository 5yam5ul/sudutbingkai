'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, ArrowRight, Shield, Heart, Briefcase, Check, 
  AlertCircle, UserPlus, LogIn, ChevronDown, ChevronUp, Loader2 
} from 'lucide-react';
import { authenticateUser, setClientSession, getClientSession } from '@/lib/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { UserAccount } from '@/lib/types';
import { toast } from 'sonner';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.66-5.17 3.66-9.12z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.28 21.43 7.34 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.17 0 10.03 0 12s.45 3.83 1.25 5.42l4.03-3.13z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.28 2.57 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
      />
    </svg>
  );
}

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Auth state
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<'host' | 'vendor' | 'admin'>('host');
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showDemoBox, setShowDemoBox] = useState(false);

  // Check URL query param ?mode=register
  useEffect(() => {
    const modeParam = searchParams.get('mode');
    if (modeParam === 'register') {
      setAuthMode('register');
    }
  }, [searchParams]);

  // Check existing session
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

  // Listen to Supabase Google OAuth callback
  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return;

    // Check current session from Supabase (e.g. after OAuth redirect)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handleSupabaseUserSession(session.user);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
        handleSupabaseUserSession(session.user);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [router]);

  const handleSupabaseUserSession = (user: any) => {
    const userEmail = user.email;
    if (!userEmail) return;

    const fullName = user.user_metadata?.full_name || 
                     user.user_metadata?.name || 
                     userEmail.split('@')[0];

    const sessionUser: UserAccount = {
      id: 'usr_g_' + user.id.substring(0, 10),
      name: fullName,
      email: userEmail,
      role: 'host'
    };

    setClientSession(sessionUser);
    toast.success(`Selamat datang, ${fullName}!`);
    router.push('/dashboard');
  };

  const handleRoleChange = (newRole: 'host' | 'vendor' | 'admin') => {
    setRole(newRole);
    setErrorMsg('');
    setEmail('');
    setPassword('');
    setName('');
  };

  // 1. Google OAuth Sign-In
  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setGoogleLoading(true);

    if (!supabase || !isSupabaseConfigured) {
      toast.error('Koneksi Supabase belum aktif. Pastikan kunci API sudah terkonfigurasi.');
      setGoogleLoading(false);
      return;
    }

    try {
      const redirectUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/login` 
        : undefined;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        throw error;
      }
      // Browser will redirect to Google login screen
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      setErrorMsg(err.message || 'Gagal memproses login Google. Silakan coba kembali.');
      setGoogleLoading(false);
    }
  };

  // 2. Email & Password Submission (Login / Register)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (authMode === 'register') {
      // REGISTRATION FLOW
      if (!name.trim()) {
        setErrorMsg('Silakan masukkan nama lengkap atau nama pengantin.');
        setLoading(false);
        return;
      }

      if (cleanPassword.length < 6) {
        setErrorMsg('Kata sandi minimal 6 karakter demi keamanan akun.');
        setLoading(false);
        return;
      }

      try {
        // Sign up with Supabase if configured
        if (supabase && isSupabaseConfigured) {
          await supabase.auth.signUp({
            email: cleanEmail,
            password: cleanPassword,
            options: {
              data: { full_name: name.trim() }
            }
          });
        }

        // Set local session for instant access
        const newUser: UserAccount = {
          id: 'usr_' + Date.now().toString(36),
          name: name.trim(),
          email: cleanEmail,
          role: role === 'vendor' ? 'vendor' : 'host'
        };

        setClientSession(newUser);
        toast.success(`Akun berhasil dibuat! Selamat datang, ${name.trim()}.`);
        
        if (role === 'vendor') {
          router.push('/vendor');
        } else {
          router.push('/dashboard');
        }
      } catch (err: any) {
        console.error('Registration Error:', err);
        setErrorMsg(err.message || 'Gagal mendaftarkan akun. Silakan coba kembali.');
      } finally {
        setLoading(false);
      }
    } else {
      // LOGIN FLOW
      setTimeout(() => {
        const user = authenticateUser(cleanEmail, cleanPassword, role);
        if (user) {
          setClientSession(user);
          toast.success(`Berhasil masuk sebagai ${user.name}`);
          if (user.role === 'admin') {
            router.push('/admin');
          } else if (user.role === 'vendor') {
            router.push('/vendor');
          } else {
            router.push('/dashboard');
          }
        } else {
          setErrorMsg('Email atau kata sandi tidak cocok. Silakan periksa kembali atau gunakan login Google.');
        }
        setLoading(false);
      }, 350);
    }
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

      {/* Main Container */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '28px 16px 60px' }}>
        <div className="glass-card form-section-card" style={{ maxWidth: '440px', width: '100%' }}>
          
          {/* Header Title */}
          <div style={{ textAlign: 'center', marginBottom: '22px' }}>
            <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '6px' }}>
              PORTAL AKUN SUDUTBINGKAI
            </span>
            <h1 className="font-display-serif" style={{ fontSize: 'clamp(1.5rem, 4vw, 1.85rem)', fontWeight: 700, color: '#1D1D1F' }}>
              {authMode === 'login' ? 'Masuk ke Dashboard' : 'Daftar Akun Baru'}
            </h1>
            <p style={{ color: '#6E6E73', fontSize: '13px', marginTop: '6px' }}>
              {authMode === 'login' 
                ? 'Kelola album acara, pantau rol candid tamu, dan atur preset film.'
                : 'Mulai buat wadah foto pernikahan dan acara Anda dalam hitungan detik.'}
            </p>
          </div>

          {/* Mode Switcher Tab (Masuk vs Daftar) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4px',
            background: 'rgba(0, 0, 0, 0.05)',
            padding: '4px',
            borderRadius: '12px',
            marginBottom: '18px'
          }}>
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setErrorMsg(''); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '9px 12px',
                borderRadius: '9px',
                border: 'none',
                cursor: 'pointer',
                background: authMode === 'login' ? '#FFFFFF' : 'transparent',
                color: authMode === 'login' ? '#1D1D1F' : '#6E6E73',
                fontWeight: authMode === 'login' ? 700 : 500,
                fontSize: '13px',
                boxShadow: authMode === 'login' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <LogIn size={14} />
              <span>Masuk</span>
            </button>

            <button
              type="button"
              onClick={() => { 
                setAuthMode('register'); 
                setErrorMsg('');
                if (role === 'admin') setRole('host');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '9px 12px',
                borderRadius: '9px',
                border: 'none',
                cursor: 'pointer',
                background: authMode === 'register' ? '#FFFFFF' : 'transparent',
                color: authMode === 'register' ? '#1D1D1F' : '#6E6E73',
                fontWeight: authMode === 'register' ? 700 : 500,
                fontSize: '13px',
                boxShadow: authMode === 'register' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <UserPlus size={14} />
              <span>Daftar Akun</span>
            </button>
          </div>

          {/* Role Switcher Tabs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: authMode === 'register' ? '1fr 1fr' : 'repeat(3, 1fr)',
            gap: '6px',
            background: 'rgba(0, 0, 0, 0.03)',
            padding: '4px',
            borderRadius: '12px',
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
                padding: '8px 6px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: role === 'host' ? '#FFFFFF' : 'transparent',
                color: role === 'host' ? '#1D1D1F' : '#6E6E73',
                fontWeight: role === 'host' ? 700 : 500,
                fontSize: '11.5px',
                boxShadow: role === 'host' ? '0 1px 4px rgba(0,0,0,0.05)' : 'none',
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
                padding: '8px 6px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: role === 'vendor' ? '#FFFFFF' : 'transparent',
                color: role === 'vendor' ? '#1D1D1F' : '#6E6E73',
                fontWeight: role === 'vendor' ? 700 : 500,
                fontSize: '11.5px',
                boxShadow: role === 'vendor' ? '0 1px 4px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <Briefcase size={13} color={role === 'vendor' ? '#C27803' : 'currentColor'} />
              <span>Mitra Vendor</span>
            </button>

            {authMode === 'login' && (
              <button
                type="button"
                onClick={() => handleRoleChange('admin')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  padding: '8px 6px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  background: role === 'admin' ? '#1D1D1F' : 'transparent',
                  color: role === 'admin' ? '#FFFFFF' : '#6E6E73',
                  fontWeight: role === 'admin' ? 700 : 500,
                  fontSize: '11.5px',
                  boxShadow: role === 'admin' ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                <Shield size={13} color={role === 'admin' ? '#F59E0B' : 'currentColor'} />
                <span>Admin</span>
              </button>
            )}
          </div>

          {/* GOOGLE SIGN-IN BUTTON (For Host / Vendor) */}
          {role !== 'admin' && (
            <div style={{ marginBottom: '18px' }}>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(0, 0, 0, 0.12)',
                  background: '#FFFFFF',
                  color: '#1D1D1F',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: googleLoading ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  transition: 'all 0.15s ease'
                }}
              >
                {googleLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" color="#C27803" />
                    <span>Menghubungkan ke Google...</span>
                  </>
                ) : (
                  <>
                    <GoogleIcon />
                    <span>{authMode === 'login' ? 'Masuk dengan Google' : 'Daftar dengan Google'}</span>
                  </>
                )}
              </button>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                margin: '18px 0 14px',
                color: '#86868B',
                fontSize: '11.5px'
              }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(0, 0, 0, 0.08)' }} />
                <span style={{ padding: '0 12px' }}>
                  {authMode === 'login' ? 'atau masuk dengan email' : 'atau daftar dengan email'}
                </span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(0, 0, 0, 0.08)' }} />
              </div>
            </div>
          )}

          {/* Error Message Alert */}
          {errorMsg && (
            <div style={{
              background: 'rgba(231, 76, 60, 0.08)',
              border: '1px solid rgba(231, 76, 60, 0.25)',
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

          {/* Main Email/Password Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Field Nama (Hanya saat Register) */}
            {authMode === 'register' && (
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '5px' }}>
                  {role === 'vendor' ? 'Nama Agensi / Vendor WO' : 'Nama Penyelenggara / Pengantin'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={role === 'vendor' ? 'Contoh: Vows & Co. Organizer' : 'Contoh: Sarah & Dimas'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="glass-input"
                  style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', fontSize: '14px' }}
                />
              </div>
            )}

            {/* Field Email */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '5px' }}>
                Email {role === 'vendor' ? 'Mitra Vendor' : role === 'admin' ? 'Super Admin' : 'Host / Penyelenggara'}
              </label>
              <input
                type="email"
                required
                placeholder={role === 'vendor' ? 'vendor@sudutbingkai.id' : role === 'admin' ? 'admin@sudutbingkai.id' : 'pengantin@sudutbingkai.id'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass-input"
                style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', fontSize: '14px' }}
              />
            </div>

            {/* Field Kata Sandi */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '5px' }}>
                Kata Sandi {authMode === 'register' && '(Minimal 6 Karakter)'}
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-input"
                style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', fontSize: '14px' }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-apple-black"
              style={{ width: '100%', padding: '13px', borderRadius: '12px', fontSize: '14px', marginTop: '6px' }}
            >
              <span>
                {loading 
                  ? 'Memproses...' 
                  : authMode === 'login' 
                    ? 'Masuk ke Dashboard' 
                    : 'Daftar Akun & Mulai'}
              </span>
              <ArrowRight size={15} />
            </button>
          </form>

          {/* Toggle Helper Under Form */}
          <div style={{ marginTop: '18px', textAlign: 'center', fontSize: '12.5px', color: '#6E6E73' }}>
            {authMode === 'login' ? (
              <>
                Belum punya akun?{' '}
                <button
                  type="button"
                  onClick={() => { setAuthMode('register'); setErrorMsg(''); }}
                  style={{ background: 'none', border: 'none', color: '#C27803', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  Daftar Akun Baru
                </button>
              </>
            ) : (
              <>
                Sudah memiliki akun?{' '}
                <button
                  type="button"
                  onClick={() => { setAuthMode('login'); setErrorMsg(''); }}
                  style={{ background: 'none', border: 'none', color: '#C27803', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  Masuk di sini
                </button>
              </>
            )}
          </div>

          <div style={{ marginTop: '8px', textAlign: 'center', fontSize: '12px', color: '#86868B' }}>
            Belum punya album acara?{' '}
            <Link href="/create" style={{ color: '#1D1D1F', fontWeight: 600, textDecoration: 'underline' }}>
              Buat langsung (Gratis)
            </Link>
          </div>

          {/* Collapsible Demo / Tester Credentials */}
          <div style={{ marginTop: '22px', borderTop: '1px solid rgba(0, 0, 0, 0.06)', paddingTop: '14px' }}>
            <button
              type="button"
              onClick={() => setShowDemoBox(!showDemoBox)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'none',
                border: 'none',
                padding: '4px 0',
                cursor: 'pointer',
                color: '#86868B',
                fontSize: '11px',
                fontWeight: 600
              }}
            >
              <span>{showDemoBox ? 'Sembunyikan Akun Pengujian (Demo)' : 'Buka Akun Pengujian (Demo Tester)'}</span>
              {showDemoBox ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {showDemoBox && (
              <div style={{
                marginTop: '10px',
                background: role === 'admin' ? 'rgba(30, 27, 75, 0.04)' : 'rgba(194, 120, 3, 0.05)',
                border: role === 'admin' ? '1px solid rgba(79, 70, 229, 0.25)' : '1px solid rgba(194, 120, 3, 0.2)',
                borderRadius: '12px',
                padding: '10px 12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span className="font-mono-film" style={{ fontSize: '9.5px', color: role === 'admin' ? '#4F46E5' : '#C27803' }}>
                    {role === 'admin' ? 'KREDENSIAL SUPER ADMIN' : 'KREDENSIAL DEMO'}
                  </span>
                  <button
                    type="button"
                    onClick={handleFillCredentials}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid rgba(0,0,0,0.1)',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      color: role === 'admin' ? '#4F46E5' : '#C27803',
                      cursor: 'pointer'
                    }}
                  >
                    Gunakan Akun Ini
                  </button>
                </div>
                <div style={{ fontSize: '11.5px', color: '#1D1D1F', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div>Email: <strong>{role === 'admin' ? 'admin@sudutbingkai.id' : role === 'host' ? 'pengantin@sudutbingkai.id' : 'vendor@sudutbingkai.id'}</strong></div>
                  <div>Password: <strong>{role === 'admin' ? 'admin123' : role === 'host' ? 'pengantin123' : 'vendor123'}</strong></div>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FBFBFA' }}>
        <Loader2 className="animate-spin" size={24} color="#C27803" />
      </div>
    }>
      <LoginFormContent />
    </Suspense>
  );
}
