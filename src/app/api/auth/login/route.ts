import { NextResponse } from 'next/server';
import { authenticateUser, signSessionPayload, getServerSession } from '@/lib/auth';
import { getAllVendors, getAllEvents } from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { UserAccount } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cleanEmail = (body.email || '').trim().toLowerCase();
    const cleanPassword = (body.password || '').trim();
    const requestedRole: 'host' | 'vendor' | 'admin' = body.role || 'host';
    const mode: 'login' | 'register' | 'oauth' = body.mode || 'login';

    if (!cleanEmail) {
      return NextResponse.json(
        { success: false, error: 'Email wajib diisi.' },
        { status: 400 }
      );
    }

    // 1. Handle OAuth Session Signing or Authenticated Role Switch
    if (mode === 'oauth') {
      const existingSession = getServerSession(request);
      let isVerifiedIdentity = Boolean(
        existingSession && existingSession.email && existingSession.email.trim().toLowerCase() === cleanEmail
      );

      if (!isVerifiedIdentity && body.accessToken && supabase && isSupabaseConfigured) {
        try {
          const { data: oauthData, error: oauthErr } = await supabase.auth.getUser(String(body.accessToken));
          if (!oauthErr && oauthData?.user?.email?.trim().toLowerCase() === cleanEmail) {
            isVerifiedIdentity = true;
          }
        } catch {}
      }

      if (requestedRole === 'admin' || cleanEmail.includes('admin@sudutbingkai.id')) {
        const isVerifiedAdminIdentity =
          isVerifiedIdentity &&
          (existingSession?.role === 'admin' || cleanEmail === 'admin@sudutbingkai.id');
        if (!isVerifiedAdminIdentity) {
          return NextResponse.json(
            { success: false, error: 'Akses ditolak untuk peran Admin melalui OAuth.' },
            { status: 403 }
          );
        }
        const adminObj: UserAccount = {
          id: 'admin_sudutbingkai',
          name: (body.name || 'Super Admin SudutBingkai').trim(),
          email: 'admin@sudutbingkai.id',
          role: 'admin',
          companyName: 'Sudut Bingkai HQ',
        };
        const token = signSessionPayload(JSON.stringify(adminObj));
        const response = NextResponse.json({
          success: true,
          user: adminObj,
          token,
          sessionToken: token,
        });
        const maxAge = 60 * 24 * 60 * 60;
        response.cookies.set('sb_auth_session', token, {
          path: '/',
          maxAge,
          sameSite: 'lax',
          httpOnly: false,
        });
        return response;
      }

      if (!isVerifiedIdentity) {
        return NextResponse.json(
          { success: false, error: 'Sesi OAuth tidak valid atau telah kedaluwarsa. Silakan masuk kembali.' },
          { status: 401 }
        );
      }

      const allVendors = await getAllVendors();
      const matchedVendor = allVendors.find(
        (v) => v.email && v.email.trim().toLowerCase() === cleanEmail
      );

      if (requestedRole === 'vendor' && matchedVendor?.status === 'suspended') {
        return NextResponse.json(
          { success: false, error: 'Akun mitra vendor ini sedang ditangguhkan oleh Admin.' },
          { status: 403 }
        );
      }

      const userObj: UserAccount =
        requestedRole === 'vendor' && matchedVendor
          ? {
              id: matchedVendor.id,
              name: matchedVendor.name || matchedVendor.companyName || (body.name || cleanEmail.split('@')[0]).trim(),
              companyName: matchedVendor.companyName || matchedVendor.name,
              email: cleanEmail,
              role: 'vendor',
              phone: matchedVendor.phone || '',
              instagram: matchedVendor.instagram || '',
              city: matchedVendor.city || 'Jakarta',
              partnerTier: matchedVendor.partnerTier || 'regular',
              referralCode: matchedVendor.referralCode,
              walletBalance: matchedVendor.walletBalance || 0,
              totalEarnings: matchedVendor.totalEarnings || 0,
              clientCount: matchedVendor.clientCount || 0,
            }
          : {
              id: body.id || existingSession?.id || 'usr_' + cleanEmail.replace(/[^a-z0-9]/g, '').slice(0, 10),
              name: (body.name || existingSession?.name || cleanEmail.split('@')[0]).trim(),
              email: cleanEmail,
              role: requestedRole === 'vendor' ? 'vendor' : 'host',
              companyName: matchedVendor?.companyName || existingSession?.companyName,
              phone: matchedVendor?.phone || existingSession?.phone,
              instagram: matchedVendor?.instagram || existingSession?.instagram,
              city: matchedVendor?.city || existingSession?.city,
              partnerTier: matchedVendor?.partnerTier || existingSession?.partnerTier,
              referralCode: matchedVendor?.referralCode || existingSession?.referralCode,
              walletBalance: matchedVendor?.walletBalance ?? existingSession?.walletBalance ?? 0,
              totalEarnings: matchedVendor?.totalEarnings ?? existingSession?.totalEarnings ?? 0,
            };

      const token = signSessionPayload(JSON.stringify(userObj));
      const response = NextResponse.json({
        success: true,
        user: userObj,
        token,
        sessionToken: token,
      });
      const maxAge = 60 * 24 * 60 * 60;
      response.cookies.set('sb_auth_session', token, {
        path: '/',
        maxAge,
        sameSite: 'lax',
        httpOnly: false,
      });
      return response;
    }

    // 2. Handle New Host Registration (strictly non-admin)
    if (mode === 'register') {
      if (requestedRole === 'admin' || cleanEmail.includes('admin@sudutbingkai.id')) {
        return NextResponse.json(
          { success: false, error: 'Tidak dapat mendaftarkan akun Admin.' },
          { status: 403 }
        );
      }

      if (cleanPassword && cleanPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: 'Kata sandi minimal 6 karakter.' },
          { status: 400 }
        );
      }

      const [allVendors, allEvents] = await Promise.all([getAllVendors(), getAllEvents()]);
      const existingVendor = allVendors.find(
        (v) => v.email && v.email.trim().toLowerCase() === cleanEmail
      );
      const existingHostEvents = allEvents.filter(
        (ev) => ev.hostEmail && ev.hostEmail.trim().toLowerCase() === cleanEmail
      );

      if (existingVendor || existingHostEvents.length > 0) {
        // Only allow if password matches in Supabase Auth
        let passwordVerified = false;
        if (cleanPassword && supabase && isSupabaseConfigured) {
          try {
            const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password: cleanPassword,
            });
            if (!authErr && authData?.user) {
              passwordVerified = true;
            }
          } catch {}
        }
        if (!passwordVerified) {
          return NextResponse.json(
            {
              success: false,
              error: 'Email ini sudah terdaftar di sistem. Silakan masuk menggunakan kata sandi Anda.',
            },
            { status: 409 }
          );
        }
      }

      const userObj: UserAccount = {
        id: 'usr_' + cleanEmail.replace(/[^a-z0-9]/g, '').slice(0, 10),
        name: (body.name || cleanEmail.split('@')[0]).trim(),
        email: cleanEmail,
        role: 'host',
      };
      const token = signSessionPayload(JSON.stringify(userObj));
      const response = NextResponse.json({
        success: true,
        user: userObj,
        token,
        sessionToken: token,
      });
      const maxAge = 60 * 24 * 60 * 60;
      response.cookies.set('sb_auth_session', token, {
        path: '/',
        maxAge,
        sameSite: 'lax',
        httpOnly: false,
      });
      return response;
    }

    if (!cleanPassword) {
      return NextResponse.json(
        { success: false, error: 'Email dan kata sandi wajib diisi.' },
        { status: 400 }
      );
    }

    // 3. Check built-in system/master accounts first
    let authenticatedUser: UserAccount | null = authenticateUser(cleanEmail, cleanPassword, requestedRole);

    if (authenticatedUser && authenticatedUser.role === 'vendor') {
      const allVendors = await getAllVendors();
      const dbVendor = allVendors.find(
        (v) =>
          v.id === authenticatedUser!.id ||
          (v.email && v.email.trim().toLowerCase() === cleanEmail)
      );
      if (dbVendor) {
        if (dbVendor.status === 'suspended') {
          return NextResponse.json(
            { success: false, error: 'Akun mitra vendor ini sedang ditangguhkan oleh Admin.' },
            { status: 403 }
          );
        }
        authenticatedUser = {
          ...authenticatedUser,
          id: dbVendor.id,
          name: dbVendor.name || authenticatedUser.name,
          companyName: dbVendor.companyName || authenticatedUser.companyName,
          phone: dbVendor.phone || authenticatedUser.phone,
          instagram: dbVendor.instagram || authenticatedUser.instagram,
          city: dbVendor.city || authenticatedUser.city,
          partnerTier: dbVendor.partnerTier || authenticatedUser.partnerTier || 'regular',
          referralCode: dbVendor.referralCode || authenticatedUser.referralCode,
          walletBalance: typeof dbVendor.walletBalance === 'number' ? dbVendor.walletBalance : (authenticatedUser.walletBalance || 0),
          totalEarnings: typeof dbVendor.totalEarnings === 'number' ? dbVendor.totalEarnings : (authenticatedUser.totalEarnings || 0),
          clientCount: typeof dbVendor.clientCount === 'number' ? dbVendor.clientCount : (authenticatedUser.clientCount || 0),
          logoUrl: dbVendor.logoUrl || authenticatedUser.logoUrl,
          bankDetails: dbVendor.bankDetails || authenticatedUser.bankDetails,
        };
      }
    }

    // 4. If not a master/demo account, verify password via Supabase Auth before granting access to DB records
    if (!authenticatedUser && requestedRole !== 'admin') {
      if (cleanPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: 'Kata sandi minimal 6 karakter.' },
          { status: 401 }
        );
      }

      let supabaseVerifiedUser: any = null;
      if (supabase && isSupabaseConfigured) {
        try {
          const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: cleanPassword,
          });
          if (!authErr && authData?.user) {
            supabaseVerifiedUser = authData.user;
          }
        } catch {}
      }

      // Check if email belongs to a registered Vendor in DB
      const allVendors = await getAllVendors();
      const matchedVendor = allVendors.find(
        (v) => v.email && v.email.trim().toLowerCase() === cleanEmail
      );

      if (requestedRole === 'vendor' || matchedVendor) {
        if (matchedVendor) {
          if (matchedVendor.status === 'suspended') {
            return NextResponse.json(
              { success: false, error: 'Akun mitra vendor ini sedang ditangguhkan oleh Admin.' },
              { status: 403 }
            );
          }

          // Require verified Supabase credentials when Supabase is configured
          if (isSupabaseConfigured && !supabaseVerifiedUser) {
            return NextResponse.json(
              {
                success: false,
                error: 'Email atau kata sandi tidak cocok. Silakan gunakan tombol Masuk dengan Google jika Anda mendaftar melalui Google.',
              },
              { status: 401 }
            );
          }

          authenticatedUser = {
            id: matchedVendor.id,
            name: matchedVendor.name || matchedVendor.companyName || cleanEmail.split('@')[0],
            companyName: matchedVendor.companyName || matchedVendor.name,
            email: matchedVendor.email.toLowerCase(),
            role: 'vendor',
            phone: matchedVendor.phone || '',
            instagram: matchedVendor.instagram || '',
            city: matchedVendor.city || 'Jakarta',
            partnerTier: matchedVendor.partnerTier || 'regular',
            referralCode: matchedVendor.referralCode,
            walletBalance: matchedVendor.walletBalance || 0,
            totalEarnings: matchedVendor.totalEarnings || 0,
            clientCount: matchedVendor.clientCount || 0,
            logoUrl: matchedVendor.logoUrl,
            bankDetails: matchedVendor.bankDetails,
          };
        } else if (requestedRole === 'vendor') {
          return NextResponse.json(
            {
              success: false,
              error: 'Email belum terdaftar sebagai Mitra Vendor. Silakan daftar terlebih dahulu.',
            },
            { status: 401 }
          );
        }
      }

      // Check Host authentication via verified Supabase Auth or local fallback when Supabase is not configured
      if (!authenticatedUser && requestedRole === 'host') {
        if (supabaseVerifiedUser) {
          const fullName =
            supabaseVerifiedUser.user_metadata?.full_name ||
            supabaseVerifiedUser.user_metadata?.name ||
            cleanEmail.split('@')[0];
          authenticatedUser = {
            id: 'usr_' + supabaseVerifiedUser.id.substring(0, 10),
            name: fullName,
            email: cleanEmail,
            role: 'host',
          };
        } else if (!isSupabaseConfigured) {
          const allEvents = await getAllEvents();
          const hostEvents = allEvents.filter(
            (ev) => ev.hostEmail && ev.hostEmail.trim().toLowerCase() === cleanEmail
          );
          if (hostEvents.length > 0) {
            const primaryEvent = hostEvents[0] as any;
            authenticatedUser = {
              id: primaryEvent.userId || 'usr_' + cleanEmail.replace(/[^a-z0-9]/g, '').slice(0, 10),
              name: primaryEvent.coupleOrHost || primaryEvent.coupleNames || primaryEvent.title || cleanEmail.split('@')[0],
              email: cleanEmail,
              role: 'host',
            };
          }
        }
      }
    }

    if (!authenticatedUser) {
      return NextResponse.json(
        {
          success: false,
          error:
            requestedRole === 'admin'
              ? 'Kredensial Super Admin tidak valid.'
              : 'Email atau kata sandi tidak cocok, atau akun belum terdaftar.',
        },
        { status: 401 }
      );
    }

    const { password: _, ...safeUser } = authenticatedUser as UserAccount & { password?: string };
    const token = signSessionPayload(JSON.stringify(safeUser));

    const response = NextResponse.json({
      success: true,
      user: safeUser,
      token,
      sessionToken: token,
    });

    const maxAge = 60 * 24 * 60 * 60;
    response.cookies.set('sb_auth_session', token, {
      path: '/',
      maxAge,
      sameSite: 'lax',
      httpOnly: false,
    });

    return response;
  } catch (err: any) {
    console.error('[POST /api/auth/login] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat memproses autentikasi.' },
      { status: 500 }
    );
  }
}
