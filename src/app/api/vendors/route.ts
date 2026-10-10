import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const VENDORS_FILE = path.join(process.cwd(), 'data', 'vendors.json');

function getVendors() {
  if (!fs.existsSync(VENDORS_FILE)) {
    return [];
  }
  const raw = fs.readFileSync(VENDORS_FILE, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveVendors(vendors: any[]) {
  fs.writeFileSync(VENDORS_FILE, JSON.stringify(vendors, null, 2), 'utf-8');
}

export async function GET() {
  const vendors = getVendors();
  return NextResponse.json({ success: true, vendors });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, name, instagram, logoUrl, city, tier } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Nama vendor wajib diisi' }, { status: 400 });
    }

    const vendors = getVendors();
    const vendorId = id || `vendor_${Date.now()}`;
    const existingIndex = vendors.findIndex((v: any) => v.id === vendorId);

    const updatedVendor = {
      id: vendorId,
      name,
      instagram: instagram || '',
      logoUrl: logoUrl || '',
      city: city || 'Indonesia',
      tier: tier || 'Mitra WO',
      featured: true,
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      vendors[existingIndex] = { ...vendors[existingIndex], ...updatedVendor };
    } else {
      vendors.unshift(updatedVendor);
    }

    saveVendors(vendors);

    return NextResponse.json({ success: true, vendor: updatedVendor });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
