import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { isR2Configured } from '@/lib/r2';
import { isMayarConfigured } from '@/lib/mayar';

export async function GET(request: Request) {
  try {
    const session = getServerSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Akses ditolak: Sesi Super Admin diperlukan' }, { status: 403 });
    }

    const hasServiceRoleKey = Boolean(
      typeof process !== 'undefined' &&
      process.env?.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY.length > 20
    );

    let dbLatencyMs = 0;
    let isDbHealthy = isSupabaseConfigured;

    if (isSupabaseConfigured && supabase) {
      try {
        const start = Date.now();
        const { error } = await supabase.from('events').select('id').limit(1);
        dbLatencyMs = Date.now() - start;
        if (error) isDbHealthy = false;
      } catch {
        isDbHealthy = false;
      }
    }

    return NextResponse.json({
      success: true,
      health: {
        database: {
          configured: isSupabaseConfigured,
          healthy: isDbHealthy,
          latencyMs: dbLatencyMs,
          label: isDbHealthy ? 'Supabase Terhubung' : 'Local Fallback'
        },
        serviceRoleKey: {
          active: hasServiceRoleKey,
          label: hasServiceRoleKey ? 'Bypass RLS Aktif' : 'Anon Key (RLS Terkunci)'
        },
        storage: {
          configured: isR2Configured,
          label: isR2Configured ? 'Cloudflare R2 Aktif' : 'Local Disk Fallback'
        },
        paymentGateway: {
          configured: isMayarConfigured,
          label: isMayarConfigured ? 'Mayar Live Production' : 'Sandbox Simulator'
        }
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
