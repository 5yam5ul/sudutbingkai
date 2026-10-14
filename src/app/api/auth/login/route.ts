import { NextResponse } from 'next/server';
import { authenticateUser, signSessionPayload, SYSTEM_USERS } from '@/lib/auth';
import { getAllVendors, getAllEvents } from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { UserAccount } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cleanEmail = (body.email || '').trim().toLowerCase();
    const cleanPassword = (body.password || '').trim();
    const requestedRole: 'host' | 'vendor' | 'admin' = body.role || 'host';

    if (!cleanEmail || !cleanPassword) {
      return NextResponse.json(
        { success: false, error: 'Email dan kata sandi wajib diisi.' },
        { status: 400 }
      );
    }

    // 1. Check built-in system/master accounts first
    let authenticatedUser: UserAccount | null = authenticateUser(cleanEmail, cleanPassword, requestedRole);

    // 2. If not a master/demo account, verify against registered database records (NEVER allow admin fallback)
    if (!authenticatedUser && requestedRole !== 'admin') {
      if (cleanPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: 'Kata sandi minimal 6 karakter.' },
          { status: 401 }
        );
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

      // Check Host authentication via Supabase Auth or registered Host Events
      if (!authenticatedUser && requestedRole === 'host') {
        if (supabase && isSupabaseConfigured) {
          try {
            const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password: cleanPassword,
            });
            if (!authErr && authData?.user) {
              const fullName =
                authData.user.user_metadata?.full_name ||
                authData.user.user_metadata?.name ||
                cleanEmail.split('@')[0];
              authenticatedUser = {
                id: 'usr_' + authData.user.id.substring(0, 10),
                name: fullName,
                email: cleanEmail,
                role: 'host',
              };
            }
          } catch {}
        }

        if (!authenticatedUser) {
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
