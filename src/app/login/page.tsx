'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, ArrowRight, UserPlus, LogIn, 
  AlertCircle, Loader2, Heart, Briefcase,
  Building2, Phone, MapPin, ShieldCheck, LogOut, CheckCircle2
} from 'lucide-react';
import { authenticateUser, setClientSession, getClientSession, clearClientSession, SYSTEM_USERS } from '@/lib/auth';
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
  
  // Portal selector: 'host' (Pengantin/Penyelenggara) vs 'vendor' (Mitra WO)
  const initialRole = searchParams.get('role') === 'vendor' ? 'vendor' : 'host';
  const [portalRole, setPortalRole] = useState<'host' | 'vendor'>(initialRole);
  
  // Auth mode: 'login' vs 'register'
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';
  const [authMode, setAuthMode] = useState<'login' | 'register'>(initialMode);
  
  // Form fields for Host
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Form fields for Vendor Registration
  const [vendorPicName, setVendorPicName] = useState('');
  const [vendorCompanyName, setVendorCompanyName] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [vendorInstagram, setVendorInstagram] = useState('');
  const [vendorCity, setVendorCity] = useState('Jakarta');

  // UI states
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [existingSession, setExistingSession] = useState<UserAccount | null>(null);

  // Sync role & mode from URL params if present
  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam === 'vendor') setPortalRole('vendor');
    else if (roleParam === 'host') setPortalRole('host');

    const modeParam = searchParams.get('mode');
    if (modeParam === 'register') setAuthMode('register');
    else if (modeParam === 'login') setAuthMode('login');
  }, [searchParams]);

  const resolveRedirectDestination = (defaultRoute: string, userRole: 'host' | 'vendor' | 'admin') => {
    if (userRole === 'admin') return '/admin';

    const redirectParam = searchParams.get('redirect');
    const packageParam = searchParams.get('package');

    if (redirectParam) {
      let dest = redirectParam;
      if (packageParam && !dest.includes('package=')) {
        dest += (dest.includes('?') ? '&' : '?') + `package=${encodeURIComponent(packageParam)}`;
      }
      return dest;
    }

    return defaultRoute;
  };

  // Inspect existing session safely without aggressive redirect loop
  useEffect(() => {
    const session = getClientSession();
    if (session) {
      setExistingSession(session);
      
      const switchParam = searchParams.get('switch');
      const roleParam = searchParams.get('role');
      
      // Only auto-redirect if NOT attempting to switch role or account
      if (switchParam !== 'true' && !roleParam) {
        if (session.role === 'admin') {
          router.push('/admin');
        } else if (session.role === 'vendor') {
          router.push(resolveRedirectDestination('/vendor', 'vendor'));
        } else {
          router.push(resolveRedirectDestination('/dashboard', 'host'));
        }
      }
    }
  }, [router, searchParams]);

  // Listen to Supabase Google OAuth callback
  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return;

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
  }, [router, portalRole, searchParams]);

  const handleSupabaseUserSession = async (user: any) => {
    const userEmail = (user.email || '').trim().toLowerCase();
    if (!userEmail) return;

    const fullName = user.user_metadata?.full_name || 
                     user.user_metadata?.name || 
                     userEmail.split('@')[0];

    // Read roleParam directly from current URL searchParams or saved role in localStorage
    const roleParam = searchParams.get('role');
    const savedRole = typeof window !== 'undefined' ? localStorage.getItem('sb_auth_role') : null;
    let assignedRole: 'host' | 'vendor' | 'admin' = (roleParam === 'vendor' || savedRole === 'vendor' || portalRole === 'vendor') ? 'vendor' : 'host';
    if (userEmail === 'admin@sudutbingkai.id') {
      assignedRole = 'admin';
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem('sb_auth_role');
    }

    if (assignedRole === 'admin') {
      const adminUser: UserAccount = {
        id: 'admin_sudutbingkai',
        name: fullName || 'Super Admin SudutBingkai',
        email: userEmail,
        role: 'admin',
        companyName: 'Sudut Bingkai HQ'
      };
      setClientSession(adminUser);
      toast.success('Selamat datang, Super Admin!');
      router.push('/admin');
      return;
    }

    if (assignedRole === 'vendor') {
      // 1. Check if vendor is already registered in DB
      let existingVendor: any = null;
      try {
        const res = await fetch('/api/vendors');
        const data = await res.json();
        if (data.success && Array.isArray(data.vendors)) {
          existingVendor = data.vendors.find((v: any) => 
            (v.email && v.email.toLowerCase() === userEmail) ||
            (v.id && (v.id === user.id || v.id === 'usr_g_' + user.id.substring(0, 10)))
          );
        }
      } catch (err) {
        console.warn('Check vendor error:', err);
      }

      if (existingVendor) {
        const sessionUser: UserAccount = {
          id: existingVendor.id,
          name: existingVendor.name || fullName,
          companyName: existingVendor.companyName || existingVendor.name || fullName,
          email: userEmail,
          role: 'vendor',
          phone: existingVendor.phone || '',
          instagram: existingVendor.instagram || '',
          city: existingVendor.city || 'Jakarta',
          partnerTier: existingVendor.partnerTier || 'regular',
          referralCode: existingVendor.referralCode,
          walletBalance: existingVendor.walletBalance || 0,
          totalEarnings: existingVendor.totalEarnings || 0,
          clientCount: existingVendor.clientCount || 0
        };
        setClientSession(sessionUser);
        toast.success(`Selamat datang kembali di Portal Mitra, ${sessionUser.companyName || fullName}!`);
        router.push(resolveRedirectDestination('/vendor', 'vendor'));
        return;
      } else {
        // 2. Auto-register new vendor using Google account metadata
        const defaultCompanyName = `${fullName} Planner`;
        const generatedRef = (fullName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'WO') + Date.now().toString().slice(-4);
        try {
          const regRes = await fetch('/api/vendors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: 'vendor_g_' + user.id.substring(0, 10),
              name: fullName,
              companyName: defaultCompanyName,
              email: userEmail,
              city: 'Jakarta',
              referralCode: generatedRef,
              partnerTier: 'regular',
              tier: 'starter',
              commissionRate: 0.12
            })
          });
          const regData = await regRes.json();
          const newV = regData.vendor || {};
          const sessionUser: UserAccount = {
            id: newV.id || ('vendor_g_' + user.id.substring(0, 10)),
            name: fullName,
            companyName: newV.companyName || defaultCompanyName,
            email: userEmail,
            role: 'vendor',
            partnerTier: 'regular',
            referralCode: generatedRef,
            walletBalance: 0,
            totalEarnings: 0
          };
          setClientSession(sessionUser);
          toast.success(`Selamat datang di Kemitraan SudutBingkai, ${sessionUser.companyName}! Anda dapat melengkapi profil brand di menu Pengaturan.`);
          router.push(resolveRedirectDestination('/vendor', 'vendor'));
          return;
        } catch (err) {
          console.warn('Auto vendor creation fallback:', err);
          const fallbackUser: UserAccount = {
            id: 'vendor_g_' + user.id.substring(0, 10),
            name: fullName,
            companyName: defaultCompanyName,
            email: userEmail,
            role: 'vendor',
            referralCode: generatedRef
          };
          setClientSession(fallbackUser);
          toast.success(`Selamat datang di Portal Mitra, ${fullName}!`);
          router.push(resolveRedirectDestination('/vendor', 'vendor'));
          return;
        }
      }
    }

    // Host / Pengantin default
    const sessionUser: UserAccount = {
      id: 'usr_g_' + user.id.substring(0, 10),
      name: fullName,
      email: userEmail,
      role: 'host'
    };

    setClientSession(sessionUser);
    toast.success(`Selamat datang, ${fullName}!`);
    router.push(resolveRedirectDestination('/dashboard', 'host'));
  };

  // Google OAuth Sign-In
  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setGoogleLoading(true);

    if (!supabase || !isSupabaseConfigured) {
      toast.error('Koneksi Supabase belum aktif. Pastikan kunci API sudah terkonfigurasi.');
      setGoogleLoading(false);
      return;
    }

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('sb_auth_role', portalRole);
      }

      const redirectParam = searchParams.get('redirect');
      const packageParam = searchParams.get('package');
      let redirectUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/login?role=${portalRole}` 
        : undefined;

      if (redirectUrl && redirectParam) {
        redirectUrl += `&redirect=${encodeURIComponent(redirectParam)}`;
      }
      if (redirectUrl && packageParam) {
        redirectUrl += `&package=${encodeURIComponent(packageParam)}`;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) throw error;
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      setErrorMsg(err.message || 'Gagal memproses login Google. Silakan coba kembali.');
      setGoogleLoading(false);
    }
  };


  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // 1. MASTER ADMIN SPECIAL HANDLER
    if (cleanEmail === 'admin@sudutbingkai.id') {
      const adminUser = authenticateUser(cleanEmail, cleanPassword, 'admin');
      if (adminUser) {
        setClientSession(adminUser);
        toast.success('Masuk sebagai Super Admin');
        router.push('/admin');
        setLoading(false);
        return;
      } else {
        setErrorMsg('Kata sandi Super Admin salah.');
        setLoading(false);
        return;
      }
    }

    // 2. VENDOR PORTAL FLOW
    if (portalRole === 'vendor') {
      if (authMode === 'register') {
        // VENDOR REGISTRATION
        if (!vendorPicName.trim() || !vendorCompanyName.trim()) {
          setErrorMsg('Nama PIC dan Nama Agensi WO wajib diisi.');
          setLoading(false);
          return;
        }

        if (cleanPassword.length < 6) {
          setErrorMsg('Kata sandi minimal 6 karakter demi keamanan akun.');
          setLoading(false);
          return;
        }

        try {
          const generatedRef = vendorCompanyName
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .slice(0, 10) || `WO${Date.now().toString().slice(-4)}`;

          const res = await fetch('/api/vendors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: vendorPicName.trim(),
              companyName: vendorCompanyName.trim(),
              email: cleanEmail,
              phone: vendorPhone.trim(),
              instagram: vendorInstagram.trim(),
              city: vendorCity.trim() || 'Jakarta',
              referralCode: generatedRef,
              partnerTier: 'regular',
              tier: 'starter',
              commissionRate: 0.12
            })
          });

          const data = await res.json();
          if (!data.success) {
            throw new Error(data.error || 'Gagal mendaftarkan vendor.');
          }

          const newVendorSession: UserAccount = {
            id: data.vendor.id,
            name: vendorCompanyName.trim(),
            email: cleanEmail,
            role: 'vendor',
            companyName: vendorCompanyName.trim(),
            phone: vendorPhone.trim(),
            instagram: vendorInstagram.trim(),
            city: vendorCity.trim(),
            partnerTier: 'regular',
            referralCode: generatedRef,
            walletBalance: 0,
            totalEarnings: 0
          };

          setClientSession(newVendorSession);
          toast.success(`Selamat datang, ${vendorCompanyName.trim()}! Kemitraan Anda telah aktif.`);
          router.push(resolveRedirectDestination('/vendor', 'vendor'));
        } catch (err: any) {
          console.error('Vendor Registration Error:', err);
          setErrorMsg(err.message || 'Gagal mendaftarkan agensi WO. Silakan coba kembali.');
        } finally {
          setLoading(false);
        }
        return;
      } else {
        // VENDOR LOGIN
        setTimeout(() => {
          const vendorUser = authenticateUser(cleanEmail, cleanPassword, 'vendor');
          if (vendorUser) {
            setClientSession(vendorUser);
            toast.success(`Selamat datang di Portal Mitra, ${vendorUser.companyName || vendorUser.name}`);
            router.push(resolveRedirectDestination('/vendor', 'vendor'));
          } else {
            setErrorMsg('Email atau kata sandi tidak cocok. Silakan periksa kembali atau daftarkan agensi baru.');
          }
          setLoading(false);
        }, 350);
        return;
      }
    }

    // 3. HOST / PENGANTIN FLOW
    if (authMode === 'register') {
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
        if (supabase && isSupabaseConfigured) {
          await supabase.auth.signUp({
            email: cleanEmail,
            password: cleanPassword,
            options: {
              data: { full_name: name.trim() }
            }
          });
        }

        const newUser: UserAccount = {
          id: 'usr_' + Date.now().toString(36),
          name: name.trim(),
          email: cleanEmail,
          role: 'host'
        };

        setClientSession(newUser);
        toast.success(`Akun berhasil dibuat! Selamat datang, ${name.trim()}.`);
        router.push(resolveRedirectDestination('/dashboard', 'host'));
      } catch (err: any) {
        console.error('Registration Error:', err);
        setErrorMsg(err.message || 'Gagal mendaftarkan akun. Silakan coba kembali.');
      } finally {
        setLoading(false);
      }
    } else {
      // HOST LOGIN
      setTimeout(() => {
        // If user typed vendor email while in host tab, smartly route to vendor
        if (cleanEmail === 'vendor@sudutbingkai.id' || cleanEmail.includes('@vowsandco')) {
          const vendorUser = authenticateUser(cleanEmail, cleanPassword, 'vendor');
          if (vendorUser) {
            setClientSession(vendorUser);
            toast.success(`Selamat datang di Portal Mitra, ${vendorUser.name}`);
            router.push(resolveRedirectDestination('/vendor', 'vendor'));
            setLoading(false);
            return;
          }
        }

        const user = authenticateUser(cleanEmail, cleanPassword, 'host');
        if (user) {
          setClientSession(user);
          toast.success(`Berhasil masuk sebagai ${user.name}`);
          router.push(resolveRedirectDestination('/dashboard', 'host'));
        } else {
          setErrorMsg('Email atau kata sandi tidak cocok. Silakan periksa kembali atau gunakan Masuk dengan Google.');
        }
        setLoading(false);
      }, 350);
    }
  };

  const handleLogoutExisting = () => {
    clearClientSession();
    setExistingSession(null);
    toast.success('Berhasil keluar. Silakan masuk dengan akun yang Anda inginkan.');
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

          <div style={{ width: '80px', textAlign: 'right' }}>
            {existingSession && (
              <button
                type="button"
                onClick={handleLogoutExisting}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#C0392B',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <LogOut size={13} />
                <span>Keluar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px 64px' }}>
        <div className="glass-card form-section-card" style={{ maxWidth: '440px', width: '100%' }}>
          
          {/* Active Session Info Banner (Eliminates Glitchy Redirect Confusion) */}
          {existingSession && (
            <div style={{
              marginBottom: '18px',
              padding: '12px 14px',
              background: 'rgba(194, 120, 3, 0.08)',
              border: '1px solid rgba(194, 120, 3, 0.25)',
              borderRadius: '14px',
              fontSize: '12.5px',
              color: '#1D1D1F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="#C27803" style={{ flexShrink: 0 }} />
                <span>
                  Masuk sebagai: <strong>{existingSession.companyName || existingSession.name}</strong> ({existingSession.role === 'admin' ? 'Super Admin' : existingSession.role === 'vendor' ? 'Mitra WO' : 'Pengantin'})
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogoutExisting}
                style={{
                  background: 'rgba(192, 57, 43, 0.1)',
                  border: '1px solid rgba(192, 57, 43, 0.2)',
                  color: '#C0392B',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '11.5px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  whiteSpace: 'nowrap'
                }}
              >
                Ganti Akun
              </button>
            </div>
          )}

          {/* Redirect Information Banner */}
          {searchParams.get('redirect') && (
            <div style={{
              marginBottom: '18px',
              padding: '12px 14px',
              background: 'linear-gradient(135deg, rgba(194, 120, 3, 0.1) 0%, rgba(255, 255, 255, 0.95) 100%)',
              border: '1.5px solid rgba(194, 120, 3, 0.35)',
              borderRadius: '14px',
              fontSize: '12.5px',
              color: '#1D1D1F',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <ArrowRight size={16} color="#C27803" style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ display: 'block', color: '#C27803', fontSize: '12px' }}>
                  Langkah 1: Masuk atau Buat Akun
                </strong>
                <span>
                  Silakan masuk atau buat akun baru untuk melanjutkan setup dan pembelian album acara Anda.
                </span>
              </div>
            </div>
          )}

          {/* ROLE SELECTOR (Pengantin vs Mitra WO) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px',
            background: 'rgba(0, 0, 0, 0.05)',
            padding: '5px',
            borderRadius: '14px',
            marginBottom: '20px'
          }}>
            <button
              type="button"
              onClick={() => { setPortalRole('host'); setErrorMsg(''); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                background: portalRole === 'host' ? '#FFFFFF' : 'transparent',
                color: portalRole === 'host' ? '#1D1D1F' : '#6E6E73',
                fontWeight: portalRole === 'host' ? 700 : 500,
                fontSize: '13px',
                boxShadow: portalRole === 'host' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <Heart size={15} color={portalRole === 'host' ? '#C27803' : '#86868B'} />
              <span>Pengantin / Klien</span>
            </button>

            <button
              type="button"
              onClick={() => { setPortalRole('vendor'); setErrorMsg(''); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                background: portalRole === 'vendor' ? '#FFFFFF' : 'transparent',
                color: portalRole === 'vendor' ? '#1D1D1F' : '#6E6E73',
                fontWeight: portalRole === 'vendor' ? 700 : 500,
                fontSize: '13px',
                boxShadow: portalRole === 'vendor' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <Briefcase size={15} color={portalRole === 'vendor' ? '#C27803' : '#86868B'} />
              <span>Mitra WO / Vendor</span>
            </button>
          </div>

          {/* Header Title Dynamically Adapts to Role */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '6px' }}>
              {portalRole === 'vendor' ? 'PORTAL MITRA RESMI WO & EVENT PLANNER' : 'PORTAL KELUARGA & PENYELENGGARA'}
            </span>
            <h1 className="font-display-serif" style={{ fontSize: 'clamp(1.5rem, 4vw, 1.85rem)', fontWeight: 700, color: '#1D1D1F' }}>
              {portalRole === 'vendor' 
                ? (authMode === 'login' ? 'Masuk Portal Mitra WO' : 'Daftar Mitra Agensi Baru')
                : (authMode === 'login' ? 'Masuk ke SudutBingkai' : 'Daftar Akun Baru')}
            </h1>
            <p style={{ color: '#6E6E73', fontSize: '13px', marginTop: '6px' }}>
              {portalRole === 'vendor'
                ? (authMode === 'login' 
                    ? 'Akses dashboard komisi, kelola paket grosir klien, dan pantau performa.' 
                    : 'Bergabung sebagai mitra Wedding Organizer resmi dan nikmati komisi hingga 20%.')
                : (authMode === 'login' 
                    ? 'Kelola album acara, pantau rol candid tamu, dan atur preset film.' 
                    : 'Mulai buat wadah foto pernikahan dan acara Anda dalam hitungan detik.')}
            </p>
          </div>

          {/* Sub-Tabs (Masuk vs Daftar) */}
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
              <span>{portalRole === 'vendor' ? 'Masuk Mitra' : 'Masuk'}</span>
            </button>

            <button
              type="button"
              onClick={() => { setAuthMode('register'); setErrorMsg(''); }}
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
              <span>{portalRole === 'vendor' ? 'Daftar Agensi' : 'Daftar Akun'}</span>
            </button>
          </div>


          {/* GOOGLE SIGN-IN / SIGN-UP BUTTON */}
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
                  <span>
                    {portalRole === 'vendor' 
                      ? (authMode === 'login' ? 'Masuk dengan Google (Akun Mitra)' : 'Daftar Agensi dengan Google')
                      : (authMode === 'login' ? 'Masuk dengan Google' : 'Daftar dengan Google')
                    }
                  </span>
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
                {authMode === 'login' 
                  ? 'atau masuk dengan email & kata sandi' 
                  : (portalRole === 'vendor' ? 'atau isi formulir pendaftaran agensi' : 'atau daftar dengan email')
                }
              </span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(0, 0, 0, 0.08)' }} />
            </div>
          </div>

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

          {/* Main Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* VENDOR REGISTRATION SPECIFIC FIELDS */}
            {portalRole === 'vendor' && authMode === 'register' && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '5px' }}>
                    Nama Lengkap PIC / Penanggung Jawab *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Sarah Pramono"
                    value={vendorPicName}
                    onChange={(e) => setVendorPicName(e.target.value)}
                    className="glass-input"
                    style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '5px' }}>
                    Nama Brand Agensi WO / Vendor *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Vows & Co. Wedding Planner"
                    value={vendorCompanyName}
                    onChange={(e) => setVendorCompanyName(e.target.value)}
                    className="glass-input"
                    style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', fontSize: '14px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '5px' }}>
                      Nomor WhatsApp *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="0812xxxxxxx"
                      value={vendorPhone}
                      onChange={(e) => setVendorPhone(e.target.value)}
                      className="glass-input"
                      style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', fontSize: '14px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '5px' }}>
                      Kota Operasional *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Jakarta / Bali / Bandung"
                      value={vendorCity}
                      onChange={(e) => setVendorCity(e.target.value)}
                      className="glass-input"
                      style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', fontSize: '14px' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '5px' }}>
                    Akun Instagram Agensi (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="@vowsandco.wo"
                    value={vendorInstagram}
                    onChange={(e) => setVendorInstagram(e.target.value)}
                    className="glass-input"
                    style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', fontSize: '14px' }}
                  />
                </div>
              </>
            )}

            {/* HOST REGISTRATION SPECIFIC FIELDS */}
            {portalRole === 'host' && authMode === 'register' && (
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '5px' }}>
                  Nama Lengkap / Pasangan Pengantin *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kevin & Cindy"
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
                {portalRole === 'vendor' ? 'Alamat Email Agensi / PIC *' : 'Alamat Email *'}
              </label>
              <input
                type="email"
                required
                placeholder={portalRole === 'vendor' ? 'partner@agensiwo.id' : 'nama@gmail.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass-input"
                style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', fontSize: '14px' }}
              />
            </div>

            {/* Field Kata Sandi */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '5px' }}>
                Kata Sandi {authMode === 'register' && '(Minimal 6 Karakter)'} *
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
                  : portalRole === 'vendor'
                    ? (authMode === 'login' ? 'Masuk ke Portal Mitra' : 'Daftarkan Agensi & Buka Portal')
                    : (authMode === 'login' ? 'Masuk ke Dashboard' : 'Daftar Akun & Mulai')}
              </span>
              <ArrowRight size={15} />
            </button>
          </form>

          {/* Sub-Switch Helper Under Form */}
          <div style={{ marginTop: '18px', textAlign: 'center', fontSize: '12.5px', color: '#6E6E73' }}>
            {authMode === 'login' ? (
              <>
                Belum punya akun?{' '}
                <button
                  type="button"
                  onClick={() => { setAuthMode('register'); setErrorMsg(''); }}
                  style={{ background: 'none', border: 'none', color: '#C27803', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  {portalRole === 'vendor' ? 'Daftar agensi baru di sini' : 'Daftar di sini'}
                </button>
              </>
            ) : (
              <>
                Sudah punya akun?{' '}
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

          {/* Footer Area: Admin Link */}
          <div style={{ marginTop: '22px', borderTop: '1px solid rgba(0, 0, 0, 0.06)', paddingTop: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '11.5px', color: '#A1A1A6' }}>
              Pengelola Sistem?{' '}
              <Link href="/admin/login" style={{ color: '#86868B', textDecoration: 'none', fontWeight: 500 }}>
                Masuk ke Panel Super Admin →
              </Link>
            </div>
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
