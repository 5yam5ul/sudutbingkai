import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Vercel Cron Job: Supabase Keep-Alive
 * Runs on a daily schedule to keep the Supabase PostgreSQL database active
 * and prevent free-tier projects from pausing after 7 days of inactivity.
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // If CRON_SECRET is configured, enforce strict verification
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json({
        success: false,
        message: 'Supabase is not configured',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // Perform a lightweight 1-row query to refresh Supabase activity timer
    const { data, error } = await supabase
      .from('events')
      .select('id')
      .limit(1);

    if (error) {
      console.warn('Supabase keep-alive ping warning:', error.message);
      return NextResponse.json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase keep-alive ping successful. Database activity refreshed.',
      timestamp: new Date().toISOString(),
      rowCount: data?.length ?? 0
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Supabase keep-alive exception:', message);
    return NextResponse.json({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
