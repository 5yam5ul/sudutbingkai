import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const VENDORS_FILE = path.join(process.cwd(), 'data', 'vendors.json');

function getLocalVendors() {
  try {
    if (!fs.existsSync(VENDORS_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(VENDORS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalVendors(vendors: any[]) {
  try {
    const dir = path.dirname(VENDORS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(VENDORS_FILE, JSON.stringify(vendors, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Local vendors write skipped:', e);
  }
}

export async function GET() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const formatted = data.map(v => ({
          id: v.id,
          name: v.name,
          companyName: v.company_name,
          email: v.email,
          phone: v.phone,
          instagram: v.instagram,
          logoUrl: v.logo_url,
          tier: v.tier,
          clientCount: v.client_count,
          createdAt: v.created_at
        }));
        return NextResponse.json({ success: true, vendors: formatted });
      }
    } catch (e) {
      console.warn('Supabase vendors GET error:', e);
    }
  }

  const vendors = getLocalVendors();
  return NextResponse.json({ success: true, vendors });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, name, companyName, email, phone, instagram, logoUrl, tier } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Nama vendor wajib diisi' }, { status: 400 });
    }

    const vendorId = id || `vendor_${Date.now()}`;
    const vendorEmail = email || `vendor_${Date.now()}@sudutbingkai.id`;

    if (isSupabaseConfigured && supabase) {
      try {
        const record = {
          id: vendorId,
          name,
          company_name: companyName || name,
          email: vendorEmail,
          phone: phone || null,
          instagram: instagram || null,
          logo_url: logoUrl || null,
          tier: tier || 'pro',
        };

        const { error } = await supabase
          .from('vendors')
          .upsert(record);

        if (!error) {
          return NextResponse.json({ success: true, vendor: record });
        }
      } catch (e) {
        console.warn('Supabase vendors POST error:', e);
      }
    }

    // Local fallback
    const vendors = getLocalVendors();
    const existingIndex = vendors.findIndex((v: any) => v.id === vendorId);

    const updatedVendor = {
      id: vendorId,
      name,
      companyName: companyName || name,
      email: vendorEmail,
      phone: phone || '',
      instagram: instagram || '',
      logoUrl: logoUrl || '',
      tier: tier || 'pro',
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      vendors[existingIndex] = { ...vendors[existingIndex], ...updatedVendor };
    } else {
      vendors.unshift(updatedVendor);
    }

    saveLocalVendors(vendors);

    return NextResponse.json({ success: true, vendor: updatedVendor });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
